// Identity verification (route name kept as "Aadhaar" so existing links still work).
// Verification happens on an authorised provider's own pages; the app starts a session,
// opens the provider, and shows whatever status the server reports. We never ask for
// or store an Aadhaar number, OTP or document here.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ApiError, cancelIdentityVerification, fetchIdentityStatus, startIdentityVerification, verifyAadhaar } from '../services/api';
import { Badge, Button, Card, ErrorText, Icon, IconTile, type IconName } from '../components/ui';
import type { IdentityState } from '../types';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { formatDate } from '../utils/format';

const REASONS: Record<string, string> = {
  provider_error: 'The verification service had a problem.',
  user_cancelled: 'You cancelled it.',
  superseded: 'A newer attempt replaced it.',
};

export function IdentityBadge() {
  return <Badge label="ID verified" icon="finger-print" />;
}

export function AadhaarScreen() {
  const { refreshUser } = useAuth();
  const [state, setState] = useState<IdentityState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const s = await fetchIdentityStatus();
      setState((prev) => {
        if (prev && prev.status !== s.status) refreshUser();
        return s;
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    load();
    // Coming back from the provider's page in the browser.
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
    return () => sub.remove();
  }, [load]);

  useEffect(() => {
    if (state?.status !== 'pending') return;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [state?.status, load]);

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const { redirectUrl } = await startIdentityVerification();
      await Linking.openURL(redirectUrl);
      await load();
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 503) await load();
      else setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => Alert.alert('Cancel verification?', 'You can start again any time.', [
    { text: 'Keep going', style: 'cancel' },
    { text: 'Cancel it', style: 'destructive', onPress: async () => { setBusy(true); try { setState(await cancelIdentityVerification()); } catch (e: any) { setError(e.message); } finally { setBusy(false); } } },
  ]);

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.brand[500]} size="large" /></View>;
  if (!state) {
    return (
      <View style={s.center}>
        <ErrorText>{error || 'Could not load your verification status.'}</ErrorText>
        <Button variant="outline" icon="reload" title="Try again" onPress={() => { setLoading(true); load(); }} />
      </View>
    );
  }

  const view: Record<string, { icon: IconName; title: string; body: string; tone: 'brand' | 'amber' | 'red' | 'ink' }> = {
    verified: { icon: 'shield-checkmark', title: 'Verified', body: `Your identity was verified${state.verifiedAt ? ` on ${formatDate(state.verifiedAt)}` : ''}. An "ID verified" badge shows on your profile.`, tone: 'brand' },
    pending: { icon: 'time-outline', title: 'Pending', body: "Finish the steps on the provider's page, then come back. This screen updates automatically.", tone: 'amber' },
    rejected: { icon: 'alert-circle-outline', title: 'Not approved', body: 'The provider could not verify your identity. You can try again.', tone: 'red' },
    unverified: state.available
      ? { icon: 'finger-print', title: 'Not verified', body: 'Verify with Aadhaar through our authorised partner. You give consent on their page; we never see or store your Aadhaar number.', tone: 'ink' }
      : { icon: 'cloud-offline-outline', title: 'Verification unavailable', body: "Online ID verification isn't available yet. Our team verifies hosts manually for now. Never share your Aadhaar number in chat.", tone: 'ink' },
  };
  const v = view[state.status];
  const tones = { brand: [colors.brand[50], colors.brand[800]], amber: [colors.amber[50], colors.amber[700]], red: [colors.red[50], colors.red[700]], ink: [colors.ink[100], colors.ink[700]] };
  const [bg, fg] = tones[v.tone];
  const last = state.latestAttempt;

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48 }}>
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <IconTile name="finger-print" size={64} />
        <Text style={s.h1}>Identity verification</Text>
        <Text style={s.sub}>A verified identity helps hosts and tenants trust each other.</Text>
      </View>

      <View style={[s.status, { backgroundColor: bg }]} accessibilityLiveRegion="polite">
        <Icon name={v.icon} size={22} color={fg} />
        <View style={{ flex: 1 }}>
          <Text style={[s.statusTitle, { color: fg }]}>{v.title}</Text>
          <Text style={[s.statusBody, { color: fg }]}>{v.body}</Text>
          {last && ['failed', 'expired', 'cancelled'].includes(last.status) && state.status !== 'verified' && (
            <Text style={[s.small, { color: fg }]}>Last attempt {last.status}. {REASONS[last.reason] || ''}</Text>
          )}
        </View>
      </View>

      <ErrorText>{error}</ErrorText>

      {state.available && (state.status === 'unverified' || state.status === 'rejected') && (
        <Button icon="open-outline" title={state.status === 'rejected' ? 'Try again' : 'Verify my identity'} onPress={start} loading={busy} style={{ marginTop: spacing.md }} />
      )}
      {state.status === 'pending' && (
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {state.available && <Button icon="open-outline" title="Continue verification" onPress={start} loading={busy} />}
          <Button variant="outline" icon="reload" title="Check status" onPress={load} disabled={busy} />
          <Button variant="ghost" title="Cancel" onPress={cancel} disabled={busy} />
        </View>
      )}

      <Card style={{ marginTop: spacing.xl }}>
        <Text style={s.cardTitle}>How it works</Text>
        {['You open our authorised partner\'s page and give consent there.', 'They confirm your identity and tell us the result.', 'We keep only the result — no Aadhaar number, OTP or document.'].map((t) => (
          <View key={t} style={s.row}><Icon name="checkmark-circle" size={16} color={colors.brand[500]} /><Text style={s.rowText}>{t}</Text></View>
        ))}
        <Text style={s.small}>This is separate from confirming your email and from the "Verified" badge our team gives listings after an inspection.</Text>
      </Card>

      {__DEV__ && process.env.EXPO_PUBLIC_AADHAAR_SIMULATION === 'true' && state.status !== 'verified' && <SimulationDemo onDone={load} />}
    </ScrollView>
  );
}

// Development-only demo of the old simulated check. The server refuses it in production.
function SimulationDemo({ onDone }: { onDone: () => void }) {
  const [num, setNum] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setError('');
    try { await verifyAadhaar(num.replace(/\D/g, '')); onDone(); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Card style={{ borderStyle: 'dashed' }}>
      <Text style={[s.cardTitle, { color: colors.amber[700] }]}>Development demo</Text>
      <Text style={s.small}>Simulated — no real verification. Disabled on production servers.</Text>
      <TextInput style={s.input} value={num} onChangeText={setNum} keyboardType="number-pad" maxLength={14} placeholder="12-digit test number" placeholderTextColor={colors.ink[400]} accessibilityLabel="Test Aadhaar number" />
      <ErrorText>{error}</ErrorText>
      <Button variant="outline" title="Run demo check" onPress={run} loading={busy} />
    </Card>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.page, gap: spacing.md },
  h1: { fontSize: 22, fontWeight: '800', color: colors.ink[900], marginTop: spacing.md },
  sub: { fontSize: 14, color: colors.ink[500], marginTop: 4, textAlign: 'center' },
  status: { flexDirection: 'row', gap: spacing.md, borderRadius: radius.xl, padding: spacing.lg },
  statusTitle: { fontSize: 16, fontWeight: '800' },
  statusBody: { fontSize: 14, marginTop: 2, lineHeight: 20 },
  small: { fontSize: 12, color: colors.ink[500], marginTop: spacing.sm, lineHeight: 17 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink[900], marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  rowText: { flex: 1, fontSize: 14, color: colors.ink[700], lineHeight: 20 },
  input: { borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.ink[900], marginTop: spacing.md },
});
