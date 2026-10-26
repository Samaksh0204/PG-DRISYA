// Forms opened from a listing or profile: forgot / reset password, confirm email,
// book a visit, request to book, write a review, report.
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KeyboardScreen } from '../components/KeyboardScreen';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CategoryRatings, RootStackParamList } from '../types';
import { forgotPassword, resetPassword, verifyEmail, scheduleVisit, requestBooking, submitReview, submitReport } from '../services/api';
import { Button, Chip, ErrorText, Field, Icon, IconTile, Stars } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { formatDay, formatINR, isEmail, localISODate, moveInCost, passwordProblem, upcomingDates } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const SLOTS = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'];

function Form({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardScreen style={{ flex: 1, backgroundColor: colors.page }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </KeyboardScreen>
  );
}

export function ForgotPasswordScreen() {
  const nav = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!isEmail(email)) return setError('Please enter a valid email address');
    setBusy(true);
    setError('');
    try {
      const { message } = await forgotPassword(email.trim());
      Alert.alert('Check your email', `${message} Open the link on this phone, or paste the code from it here.`, [{ text: 'OK', onPress: () => nav.replace('ResetPassword') }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Form>
      <IconTile name="key-outline" size={56} />
      <Text style={[s.h1, { marginTop: spacing.lg }]}>Reset your password</Text>
      <Text style={s.p}>Enter your account email and we'll send you a reset link. It works for one hour.</Text>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <ErrorText>{error}</ErrorText>
      <Button title="Send reset link" onPress={submit} loading={busy} />
      <TouchableOpacity onPress={() => nav.replace('ResetPassword')} style={{ alignSelf: 'center', marginTop: spacing.lg }}>
        <Text style={s.link}>I already have a reset link</Text>
      </TouchableOpacity>
    </Form>
  );
}

// The emailed link is ".../#/reset-password?token=…". The app opens it via the
// pgdrisya://reset-password?token=… deep link, or the user pastes the link/token.
const tokenFrom = (v: string) => {
  const m = v.match(/token=([A-Za-z0-9_-]+)/);
  return (m ? m[1] : v).trim();
};

export function ResetPasswordScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ResetPassword'>>();
  const [token, setToken] = useState(params?.token || '');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const t = tokenFrom(token);
    if (!t) return setError('Paste the link or code from the email');
    const p = passwordProblem(pw);
    if (p) return setError(p);
    setBusy(true);
    setError('');
    try {
      const { message } = await resetPassword(t, pw);
      Alert.alert('Password changed', message || 'You can now sign in with your new password.', [{ text: 'Sign in', onPress: () => nav.replace('Login') }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Form>
      <IconTile name="lock-closed-outline" size={56} />
      <Text style={[s.h1, { marginTop: spacing.lg }]}>Choose a new password</Text>
      <Text style={s.p}>Signing in again is required on all your devices afterwards.</Text>
      {!params?.token && <Field label="Reset link or code" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} placeholder="Paste from the email" />}
      <Field label="New password" value={pw} onChangeText={setPw} secureTextEntry autoComplete="password-new" hint="8+ characters, with letters and numbers" />
      <ErrorText>{error}</ErrorText>
      <Button title="Save new password" onPress={submit} loading={busy} disabled={!pw} />
    </Form>
  );
}

export function VerifyEmailScreen() {
  const nav = useNavigation<Nav>();
  const { user, setUser } = useAuth();
  const { params } = useRoute<RouteProp<RootStackParamList, 'VerifyEmail'>>();
  const [token, setToken] = useState(params?.token || '');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState('');
  const run = async (raw: string) => {
    const t = tokenFrom(raw);
    if (!t) return setError('Paste the link or code from the email');
    setState('busy');
    setError('');
    try {
      const res = await verifyEmail(t);
      if (user && res.user) setUser(res.user);
      setState('done');
    } catch (e: any) {
      setError(e.message);
      setState('idle');
    }
  };
  useEffect(() => { if (params?.token) run(params.token); }, [params?.token]);
  if (state === 'done') {
    return (
      <Form>
        <IconTile name="checkmark-circle" size={56} />
        <Text style={[s.h1, { marginTop: spacing.lg }]}>Email confirmed</Text>
        <Text style={s.p}>You can now send booking requests.</Text>
        <Button title="Continue" onPress={() => (nav.canGoBack() ? nav.goBack() : nav.replace('MainTabs'))} />
      </Form>
    );
  }
  return (
    <Form>
      <IconTile name="mail-outline" size={56} />
      <Text style={[s.h1, { marginTop: spacing.lg }]}>Confirm your email</Text>
      <Text style={s.p}>Open the link we emailed you on this phone, or paste it here.</Text>
      <Field label="Confirmation link or code" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} />
      <ErrorText>{error}</ErrorText>
      <Button title="Confirm email" onPress={() => run(token)} loading={state === 'busy'} disabled={!token} />
    </Form>
  );
}

export function BookVisitScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'BookVisit'>>();
  const dates = upcomingDates(14);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await scheduleVisit({ propertyId: params.propertyId, date, timeSlot: slot, message: note.trim() });
      Alert.alert('Visit requested', `${formatDay(date)} at ${slot}. The owner will confirm.`, [{ text: 'OK', onPress: () => nav.goBack() }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Form>
      <Text style={s.h1}>Book a visit</Text>
      <Text style={s.p}>{params.title}</Text>
      <Text style={s.label}>Date</Text>
      <View style={s.wrap}>{dates.map((d) => <Chip key={d} label={d === localISODate() ? 'Today' : formatDay(d)} active={date === d} onPress={() => setDate(d)} />)}</View>
      {date ? (
        <>
          <Text style={s.label}>Time</Text>
          <View style={s.wrap}>{SLOTS.map((t) => <Chip key={t} label={t} active={slot === t} onPress={() => setSlot(t)} />)}</View>
        </>
      ) : null}
      <Field label="Note for the owner (optional)" value={note} onChangeText={setNote} maxLength={500} />
      <ErrorText>{error}</ErrorText>
      <Button title="Request visit" onPress={submit} loading={busy} disabled={!date || !slot} />
    </Form>
  );
}

export function RequestBookingScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const { params } = useRoute<RouteProp<RootStackParamList, 'RequestBooking'>>();
  const today = localISODate();
  const earliest = params.moveInDate && params.moveInDate > today ? params.moveInDate : today;
  const dates = upcomingDates(30).filter((d) => d >= earliest).slice(0, 21);
  const [moveIn, setMoveIn] = useState(dates[0]);
  const [months, setMonths] = useState(6);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const cost = moveInCost(params.price, params.deposit);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const { booking } = await requestBooking({ propertyId: params.propertyId, moveInDate: moveIn, durationMonths: months, message: message.trim() });
      Alert.alert(booking.status === 'accepted' ? 'Booking confirmed' : 'Request sent', booking.status === 'accepted' ? 'The owner has been notified. Message them on Drisya to arrange your move-in.' : 'The owner usually replies within 24 hours.', [{ text: 'View my trips', onPress: () => nav.replace('Trips') }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Form>
      <Text style={s.h1}>{params.instantBook ? 'Book instantly' : 'Request to book'}</Text>
      <Text style={s.p}>{params.title}</Text>
      {!user?.emailVerified && (
        <TouchableOpacity onPress={() => nav.navigate('VerifyEmail')} style={s.warn}>
          <Icon name="mail-outline" size={18} color={colors.amber[700]} />
          <Text style={s.warnText}>Confirm your email first — tap to paste the link we sent, or resend it from Account settings.</Text>
        </TouchableOpacity>
      )}
      <Text style={s.label}>Move-in date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        {dates.map((d) => <Chip key={d} label={d === today ? 'Today' : formatDay(d)} active={moveIn === d} onPress={() => setMoveIn(d)} />)}
      </ScrollView>
      <Text style={s.label}>Length of stay</Text>
      <View style={s.wrap}>{[1, 3, 6, 11, 12].map((m) => <Chip key={m} label={`${m} mo`} active={months === m} onPress={() => setMonths(m)} />)}</View>
      <Field label="Introduce yourself" value={message} onChangeText={setMessage} multiline maxLength={1000} placeholder="College/work and move-in plans" />
      <View style={s.box}>
        <Row label="First month's rent" value={formatINR(cost.firstMonth)} />
        <Row label="Refundable deposit" value={formatINR(cost.deposit)} />
        <Row label="Due at move-in" value={formatINR(cost.total)} bold />
        <Text style={s.small}>Paid to the owner at move-in against a written agreement. Nothing is charged now.</Text>
      </View>
      <ErrorText>{error}</ErrorText>
      <Button title={params.instantBook ? 'Book instantly' : 'Send request'} onPress={submit} loading={busy} />
    </Form>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={[s.rowText, bold && { fontWeight: '700', color: colors.ink[900] }]}>{label}</Text>
      <Text style={[s.rowText, bold && { fontWeight: '700', color: colors.ink[900] }]}>{value}</Text>
    </View>
  );
}

export function WriteReviewScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'WriteReview'>>();
  const [rating, setRating] = useState(0);
  const [cats, setCats] = useState<CategoryRatings>({});
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!rating) return setError('Please choose a star rating');
    setBusy(true);
    setError('');
    try {
      await submitReview({ propertyId: params.propertyId, rating, text: text.trim(), ratings: cats });
      Alert.alert('Thanks!', 'Your review has been posted.', [{ text: 'OK', onPress: () => nav.goBack() }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Form>
      <Text style={s.h1}>Review</Text>
      <Text style={s.p}>{params.title}</Text>
      <Text style={s.label}>Overall</Text>
      <View style={{ marginBottom: spacing.lg }}><Stars value={rating} size={36} onChange={setRating} /></View>
      <View style={s.box}>
        <Text style={[s.label, { marginBottom: spacing.sm }]}>Rate the details (optional)</Text>
        {([['cleanliness', 'Cleanliness'], ['accuracy', 'Accuracy'], ['safety', 'Safety'], ['food', 'Food'], ['value', 'Value']] as [keyof CategoryRatings, string][]).map(([k, l]) => (
          <View key={k} style={s.catRow}>
            <Text style={s.rowText}>{l}</Text>
            <Stars value={cats[k] || 0} size={22} onChange={(n) => setCats((c) => ({ ...c, [k]: n }))} />
          </View>
        ))}
      </View>
      <Field label="Your review" value={text} onChangeText={setText} multiline maxLength={2000} placeholder="Food, cleanliness, safety, owner…" />
      <Text style={s.small}>Reviews are public and can't be edited after posting.</Text>
      <ErrorText>{error}</ErrorText>
      <Button title="Post review" onPress={submit} loading={busy} style={{ marginTop: spacing.md }} />
    </Form>
  );
}

const REASONS: [string, string][] = [
  ['fake_listing', "It's fake or doesn't exist"],
  ['inaccurate', 'Photos or details are wrong'],
  ['scam', 'Asked for money / scam'],
  ['harassment', 'Harassment'],
  ['unsafe', 'Safety concern'],
  ['discrimination', 'Discrimination'],
  ['offensive', 'Offensive content'],
  ['other', 'Something else'],
];

export function ReportScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Report'>>();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason) return setError('Please choose a reason');
    setBusy(true);
    setError('');
    try {
      await submitReport({ targetType: params.targetType, targetId: params.targetId, reason, details: details.trim() });
      Alert.alert('Report sent', 'Thanks — our team will review it.', [{ text: 'OK', onPress: () => nav.goBack() }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Form>
      <Text style={s.h1}>Report</Text>
      <Text style={s.p}>{params.label}</Text>
      {REASONS.map(([value, label]) => (
        <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: reason === value }} onPress={() => setReason(value)} style={[s.option, reason === value && s.optionActive]}>
          <Icon name={reason === value ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={reason === value ? colors.brand[500] : colors.ink[300]} />
          <Text style={{ color: colors.ink[900], fontSize: 15 }}>{label}</Text>
        </TouchableOpacity>
      ))}
      <Field label="Details (optional)" value={details} onChangeText={setDetails} multiline maxLength={1000} />
      <ErrorText>{error}</ErrorText>
      <Button title="Submit report" onPress={submit} loading={busy} />
    </Form>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '800', color: colors.ink[900] },
  p: { fontSize: 14, color: colors.ink[500], marginTop: 4, marginBottom: spacing.xl },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  box: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowText: { fontSize: 14, color: colors.ink[600] },
  small: { fontSize: 12, color: colors.ink[500], marginTop: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.ink[200], backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  optionActive: { borderColor: colors.brand[500], backgroundColor: colors.brand[50] },
  link: { fontSize: 14, fontWeight: '700', color: colors.brand[700] },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  warn: { flexDirection: 'row', gap: 8, backgroundColor: colors.amber[50], borderWidth: 1, borderColor: colors.amber[100], borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  warnText: { flex: 1, fontSize: 13, color: colors.amber[700], lineHeight: 18 },
});
