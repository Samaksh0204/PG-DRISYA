import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Linking } from 'react-native';
import { WEB_URL } from '../services/api';
import { isEmail, passwordProblem } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

export function RegisterScreen() {
  const nav = useNavigation();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'tenant' | 'owner'>('tenant');
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Error', 'Name, email, and password are required');
      return;
    }
    if (!isEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    const pwProblem = passwordProblem(password);
    if (pwProblem) {
      Alert.alert('Error', pwProblem);
      return;
    }
    if (!acceptTerms) {
      Alert.alert('Error', 'Please accept the Terms of Service and Privacy Policy');
      return;
    }
    setLoading(true);
    try {
      await register({ fullName: fullName.trim(), email: email.trim().toLowerCase(), password, phone: phone.trim(), role, acceptTerms });
      Alert.alert('Welcome!', 'We sent a confirmation link to your email. Please confirm it before requesting a booking.');
      // Close Register + Login and return to the app.
      (nav as any).popToTop?.();
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>PG Drisya</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <View style={styles.form}>
          {/* Role selector */}
          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleRow}>
            {(['tenant', 'owner'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                  {r === 'tenant' ? '🏠 Tenant' : '🔑 Owner'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} placeholder="Your full name" placeholderTextColor={colors.ink[400]}
            value={fullName} onChangeText={setFullName} autoCapitalize="words" />

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={colors.ink[400]}
            value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Phone (optional)</Text>
          <TextInput style={styles.input} placeholder="9876543210" placeholderTextColor={colors.ink[400]}
            value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="8+ characters, letters and numbers" placeholderTextColor={colors.ink[400]}
            value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: acceptTerms }} onPress={() => setAcceptTerms(!acceptTerms)} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.lg, gap: 8 }}>
            <Text style={{ fontSize: 18 }}>{acceptTerms ? '☑️' : '⬜'}</Text>
            <Text style={{ flex: 1, fontSize: 13, color: colors.ink[600] }}>
              I agree to the{' '}
              <Text style={{ color: colors.brand[600], fontWeight: '600' }} onPress={() => WEB_URL && Linking.openURL(`${WEB_URL}/#/terms`)}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={{ color: colors.brand[600], fontWeight: '600' }} onPress={() => WEB_URL && Linking.openURL(`${WEB_URL}/#/privacy`)}>Privacy Policy</Text>, and I'm at least 18.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => nav.goBack()}>
            <Text style={styles.loginLinkText}>Already have an account? <Text style={{ color: colors.brand[600], fontWeight: '700' }}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing['2xl'] },

  header: { alignItems: 'center', marginBottom: spacing['2xl'] },
  logo: { fontSize: 32, fontWeight: '800', color: colors.brand[500] },
  subtitle: { fontSize: 16, color: colors.ink[500], marginTop: spacing.sm },

  form: {},
  label: { fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: spacing.xs, marginTop: spacing.lg },
  input: {
    borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: 14, fontSize: 15, color: colors.ink[900],
    backgroundColor: colors.ink[50],
  },

  roleRow: { flexDirection: 'row', gap: spacing.md },
  roleBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg,
    paddingVertical: 14, alignItems: 'center', backgroundColor: colors.ink[50],
  },
  roleBtnActive: { borderColor: colors.brand[500], backgroundColor: colors.brand[50] },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: colors.ink[600] },
  roleBtnTextActive: { color: colors.brand[600] },

  registerBtn: {
    backgroundColor: colors.brand[500], borderRadius: radius.lg,
    paddingVertical: 16, alignItems: 'center', marginTop: spacing['2xl'],
  },
  registerBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },

  loginLink: { marginTop: spacing.xl, alignItems: 'center' },
  loginLinkText: { fontSize: 14, color: colors.ink[500] },
});
