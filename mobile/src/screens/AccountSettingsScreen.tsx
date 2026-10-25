// Account settings: email confirmation, password, legal links, and in-app account
// deletion (required by Google Play and the App Store for apps with sign-up).
import React, { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { changePassword, deleteAccount, exportMyData, resendVerification, setToken } from '../services/api';
import { Button, Card, ErrorText, Field } from '../components/ui';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { passwordProblem } from '../utils/format';

export function AccountSettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [delError, setDelError] = useState('');
  const [delBusy, setDelBusy] = useState(false);

  if (!user) return null;

  const change = async () => {
    const p = passwordProblem(next);
    if (p) return setPwError(p);
    setPwBusy(true);
    setPwError('');
    try {
      const res = await changePassword(current, next);
      await setToken(res.token);
      setCurrent(''); setNext('');
      Alert.alert('Password changed', 'Other devices have been signed out.');
    } catch (e: any) {
      setPwError(e.message);
    } finally {
      setPwBusy(false);
    }
  };

  const remove = () => {
    Alert.alert('Delete your account?', 'This permanently deletes your profile, wishlist and notifications, takes down your listings and cancels open visits and bookings. This cannot be undone.', [
      { text: 'Keep account', style: 'cancel' },
      {
        text: 'Delete forever', style: 'destructive', onPress: async () => {
          setDelBusy(true);
          setDelError('');
          try {
            await deleteAccount(delPw);
            await logout();
            Alert.alert('Account deleted', "We're sorry to see you go.");
          } catch (e: any) {
            setDelError(e.message);
          } finally {
            setDelBusy(false);
          }
        },
      },
    ]);
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await exportMyData();
      await Share.share({ title: 'My PG Drisya data', message: JSON.stringify(data, null, 2) });
    } catch (e: any) {
      Alert.alert('Could not export', e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.page }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={s.h}>Email</Text>
        <Text style={s.p}>{user.email}</Text>
        {user.emailVerified ? <Text style={[s.small, { color: colors.teal[700] }]}>Confirmed</Text> : (
          <>
            <Text style={[s.small, { color: colors.amber[700] }]}>Not confirmed — needed to request bookings.</Text>
            <Button variant="outline" icon="mail-outline" title="Resend confirmation email" onPress={async () => { try { Alert.alert('Sent', (await resendVerification()).message); } catch (e: any) { Alert.alert('Error', e.message); } }} style={{ marginTop: spacing.md }} />
            <Button variant="ghost" title="I have the link — confirm now" onPress={() => nav.navigate('VerifyEmail')} style={{ marginTop: spacing.xs }} />
          </>
        )}
      </Card>

      <Card>
        <Text style={s.h}>Change password</Text>
        <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="password" />
        <Field label="New password" value={next} onChangeText={setNext} secureTextEntry autoComplete="password-new" />
        <ErrorText>{pwError}</ErrorText>
        <Button title="Change password" onPress={change} loading={pwBusy} disabled={!current || !next} />
      </Card>

      <Card>
        <Text style={s.h}>Legal & data</Text>
        <Button variant="outline" icon="document-text-outline" title="Terms & privacy" onPress={() => nav.navigate('Info', { page: 'terms' })} style={s.gap} />
        <Button variant="outline" icon="download-outline" title="Export my data" onPress={exportData} loading={exporting} />
        <Text style={s.small}>A copy of your profile, listings, bookings, visits, reviews and messages as JSON.</Text>
      </Card>

      <Card>
        <Text style={[s.h, { color: colors.red[700] }]}>Delete account</Text>
        <Text style={s.small}>Enter your password to confirm.</Text>
        <View style={{ height: spacing.sm }} />
        <Field label="Password" value={delPw} onChangeText={setDelPw} secureTextEntry />
        <ErrorText>{delError}</ErrorText>
        <Button variant="danger" title="Delete my account" onPress={remove} loading={delBusy} disabled={!delPw} />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '700', color: colors.ink[900], marginBottom: spacing.sm },
  p: { fontSize: 14, color: colors.ink[700] },
  small: { fontSize: 12, color: colors.ink[500], marginTop: 4 },
  gap: { marginBottom: spacing.sm },
});
