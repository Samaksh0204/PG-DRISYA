import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export function LoginScreen() {
  const nav = useNavigation<Nav>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>PG Drisya</Text>
          <Text style={styles.subtitle}>Welcome back</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.ink[400]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter password"
              placeholderTextColor={colors.ink[400]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
              <Text style={styles.eyeText}>{showPass ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>or</Text>
            <View style={styles.divLine} />
          </View>

          <TouchableOpacity style={styles.registerBtn} onPress={() => nav.navigate('Register')}>
            <Text style={styles.registerBtnText}>Create an account</Text>
          </TouchableOpacity>
        </View>

        {/* Seed hint — only visible in development */}
        {__DEV__ && (
          <View style={styles.hint}>
            <Text style={styles.hintTitle}>Test Accounts (dev only)</Text>
            <Text style={styles.hintText}>Tenant: priya@example.com</Text>
            <Text style={styles.hintText}>Owner: anjali@example.com</Text>
            <Text style={styles.hintText}>Password: password123</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing['2xl'] },

  header: { alignItems: 'center', marginBottom: spacing['3xl'] },
  logo: { fontSize: 32, fontWeight: '800', color: colors.coral[500] },
  subtitle: { fontSize: 16, color: colors.ink[500], marginTop: spacing.sm },

  form: {},
  label: { fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: spacing.xs, marginTop: spacing.lg },
  input: {
    borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: 14, fontSize: 15, color: colors.ink[900],
    backgroundColor: colors.ink[50],
  },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyeBtn: { paddingHorizontal: spacing.md },
  eyeText: { fontSize: 13, color: colors.coral[600], fontWeight: '600' },

  loginBtn: {
    backgroundColor: colors.coral[500], borderRadius: radius.lg,
    paddingVertical: 16, alignItems: 'center', marginTop: spacing['2xl'],
  },
  loginBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xl },
  divLine: { flex: 1, height: 1, backgroundColor: colors.ink[200] },
  divText: { marginHorizontal: spacing.md, color: colors.ink[400], fontSize: 13 },

  registerBtn: {
    borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  registerBtnText: { color: colors.ink[700], fontSize: 15, fontWeight: '600' },

  hint: { marginTop: spacing['3xl'], padding: spacing.lg, backgroundColor: colors.ink[50], borderRadius: radius.lg },
  hintTitle: { fontSize: 12, fontWeight: '700', color: colors.ink[600], marginBottom: spacing.xs },
  hintText: { fontSize: 12, color: colors.ink[500], lineHeight: 18 },
});
