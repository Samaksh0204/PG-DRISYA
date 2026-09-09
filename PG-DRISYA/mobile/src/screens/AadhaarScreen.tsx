import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { verifyAadhaar } from '../services/api';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

export function AadhaarScreen() {
  const nav = useNavigation();
  const { user, refreshUser } = useAuth();
  const [aadhaar, setAadhaar] = useState('');
  const [loading, setLoading] = useState(false);

  if (user?.aadhaarVerified) {
    return (
      <View style={styles.verifiedWrap}>
        <Text style={styles.checkIcon}>✅</Text>
        <Text style={styles.verifiedTitle}>Aadhaar Verified</Text>
        <Text style={styles.verifiedSub}>Your identity has been verified successfully.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleVerify = async () => {
    const clean = aadhaar.replace(/\s/g, '');
    if (!/^\d{12}$/.test(clean)) {
      Alert.alert('Invalid', 'Please enter a valid 12-digit Aadhaar number');
      return;
    }
    setLoading(true);
    try {
      await verifyAadhaar(clean);
      await refreshUser();
      Alert.alert('Success', 'Aadhaar verified successfully!');
      nav.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatAadhaar = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 12);
    const parts = digits.match(/.{1,4}/g);
    return parts ? parts.join(' ') : '';
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.icon}>🪪</Text>
        <Text style={styles.title}>Verify Your Aadhaar</Text>
        <Text style={styles.subtitle}>Verified users get a trust badge and better visibility on their listings.</Text>

        <Text style={styles.label}>Aadhaar Number</Text>
        <TextInput
          style={styles.input}
          placeholder="XXXX XXXX XXXX"
          placeholderTextColor={colors.ink[400]}
          value={formatAadhaar(aadhaar)}
          onChangeText={(t) => setAadhaar(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          maxLength={14}
        />
        <Text style={styles.hint}>Enter your 12-digit Aadhaar number</Text>

        <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.verifyBtnText}>Verify Aadhaar</Text>}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔒 Your data is safe</Text>
          <Text style={styles.infoText}>We only store the verification status, not the full Aadhaar number. Your data is encrypted and secure.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, padding: spacing['2xl'], justifyContent: 'center' },

  verifiedWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white, padding: spacing['2xl'] },
  checkIcon: { fontSize: 56, marginBottom: spacing.lg },
  verifiedTitle: { fontSize: 22, fontWeight: '800', color: colors.teal[700] },
  verifiedSub: { fontSize: 14, color: colors.ink[500], marginTop: spacing.sm, textAlign: 'center' },
  backBtn: { marginTop: spacing.xl, backgroundColor: colors.teal[500], borderRadius: radius.lg, paddingHorizontal: spacing['3xl'], paddingVertical: spacing.md },
  backBtnText: { color: colors.white, fontWeight: '700' },

  icon: { fontSize: 48, textAlign: 'center', marginBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink[900], textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.ink[500], textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing['2xl'], lineHeight: 20 },

  label: { fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: spacing.xs },
  input: {
    borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: 16, fontSize: 20, color: colors.ink[900],
    backgroundColor: colors.ink[50], textAlign: 'center', letterSpacing: 2, fontWeight: '600',
  },
  hint: { fontSize: 12, color: colors.ink[400], marginTop: spacing.xs, textAlign: 'center' },

  verifyBtn: { backgroundColor: colors.coral[500], borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: spacing['2xl'] },
  verifyBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },

  infoBox: { marginTop: spacing['2xl'], padding: spacing.lg, backgroundColor: colors.teal[50], borderRadius: radius.lg },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.teal[800] },
  infoText: { fontSize: 12, color: colors.teal[700], marginTop: 4, lineHeight: 18 },
});
