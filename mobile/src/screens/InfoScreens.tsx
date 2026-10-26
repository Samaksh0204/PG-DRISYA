// In-app versions of the website's Trust & Safety, Pricing, Help and legal pages,
// plus the "Drisya Expert" assisted-search request form.
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KeyboardScreen } from '../components/KeyboardScreen';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { InfoPage, RootStackParamList } from '../types';
import { submitInquiry, WEB_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorText, Field, Icon, IconTile, type IconName } from '../components/ui';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { isEmail } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TITLES: Record<InfoPage, string> = { trust: 'Trust & Safety', pricing: 'Pricing', help: 'Help centre', privacy: 'Privacy Policy', terms: 'Terms & Privacy' };

export function InfoScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Info'>>();
  useEffect(() => { nav.setOptions({ title: TITLES[params.page] }); }, [nav, params.page]);
  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 56 }}>
      {params.page === 'trust' && <Trust />}
      {params.page === 'pricing' && <Pricing />}
      {params.page === 'help' && <Help />}
      {(params.page === 'privacy' || params.page === 'terms') && <Legal />}
    </ScrollView>
  );
}

const openWeb = (path: string) => (WEB_URL ? Linking.openURL(`${WEB_URL}/#${path}`) : Alert.alert('Not available', 'The website address is not configured for this build.'));

function Trust() {
  const nav = useNavigation<Nav>();
  const items: [IconName, string, string][] = [
    ['search-outline', 'Every new listing is reviewed', 'Our team checks each listing before it goes live and rejects ones with missing or misleading information.'],
    ['shield-checkmark-outline', 'Verified badge = inspected', 'Only listings our team has inspected in person get the Verified badge. Hosts cannot add it themselves.'],
    ['star-outline', 'Reviews you can trust', 'Only tenants with a completed visit or a stay can review, one review per person per PG. Hosts can reply publicly.'],
    ['call-outline', 'Contact details stay private', 'Host phone numbers and email addresses are never shown. Tenants and hosts talk through Drisya messages, so there is always a record.'],
    ['mail-outline', 'Confirmed emails', 'Tenants must confirm their email before sending a booking request.'],
    ['lock-closed-outline', 'Account security', 'Passwords are hashed, logins are rate-limited, and changing your password signs you out everywhere else.'],
  ];
  const tips: [IconName, string][] = [
    ['eye-outline', 'Always visit the PG in person before paying anything.'],
    ['cash-outline', 'Pay rent and deposit only against a written rent agreement, and get a receipt.'],
    ['flag-outline', 'Never pay a "token" or advance to hold a room you haven\'t seen. Report anyone who asks.'],
    ['lock-closed-outline', 'Never share OTPs, bank passwords or card details. Drisya will never ask for them.'],
    ['chatbubbles-outline', 'Keep conversations on Drisya messages so there is a record if something goes wrong.'],
  ];
  return (
    <>
      <Text style={s.h1}>Trust & Safety</Text>
      <Text style={s.lead}>How we keep Drisya safe, and how you can protect yourself.</Text>
      {items.map(([icon, title, desc]) => (
        <View key={title} style={s.card}>
          <IconTile name={icon} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{title}</Text>
            <Text style={s.cardText}>{desc}</Text>
          </View>
        </View>
      ))}
      <View style={s.tint}>
        <Text style={s.h2}>Protect yourself</Text>
        {tips.map(([icon, t]) => (
          <View key={t} style={s.tipRow}><Icon name={icon} size={16} color={colors.brand[600]} /><Text style={s.tipText}>{t}</Text></View>
        ))}
      </View>
      <Text style={s.h2}>Report a problem</Text>
      <Text style={s.cardText}>Use Report on any listing, review, chat or profile. Reports go straight to our team, and we'll update you in your notifications. Listings or accounts can be paused while we investigate.</Text>
      <Button variant="outline" title="Find the listing to report" icon="search-outline" onPress={() => nav.navigate('MainTabs', { screen: 'Search' })} style={{ marginTop: spacing.md }} />
      <Button variant="danger" title="Emergency: call 112" icon="call-outline" onPress={() => Linking.openURL('tel:112')} style={{ marginTop: spacing.sm }} />
    </>
  );
}

function Pricing() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const tenant = ['Search, map and filters', 'Message hosts', 'Book visits', 'Request to book', 'Wishlist', 'Drisya Expert help'];
  const host = ['Unlimited listings (each reviewed by our team)', 'Up to 15 photos per listing', 'Visit scheduling and booking requests', 'Instant Book', 'In-app messages and notifications', 'Reply to reviews', 'Map pin in search'];
  const plan = (title: string, sub: string, features: string[], cta: string, onPress: () => void, highlight?: boolean) => (
    <View style={[s.plan, highlight && { borderColor: colors.brand[500], borderWidth: 2 }]}>
      <Text style={s.planTitle}>{title}</Text>
      <Text style={s.planPrice}>₹0</Text>
      <Text style={s.small}>{sub}</Text>
      <View style={{ marginTop: spacing.md }}>
        {features.map((f) => <View key={f} style={s.tipRow}><Icon name="checkmark" size={16} color={colors.brand[600]} /><Text style={s.tipText}>{f}</Text></View>)}
      </View>
      <Button variant={highlight ? 'primary' : 'outline'} title={cta} onPress={onPress} style={{ marginTop: spacing.md }} />
    </View>
  );
  return (
    <>
      <Text style={[s.h1, { textAlign: 'center' }]}>Simple pricing</Text>
      <Text style={[s.lead, { textAlign: 'center' }]}>Drisya is free for tenants and hosts while we launch. No brokerage, no commission, no card needed.</Text>
      {plan('Tenants', 'always', tenant, 'Find a PG', () => nav.navigate('MainTabs', { screen: 'Search' }))}
      {plan('Hosts', 'during launch', host, 'List your PG', () => (user ? (user.role === 'tenant' ? nav.navigate('MainTabs', { screen: 'Profile' }) : nav.navigate('HostDashboard')) : nav.navigate('Register')), true)}
      <Text style={[s.small, { textAlign: 'center', marginTop: spacing.md }]}>If we introduce paid features later, we'll tell hosts well in advance. Existing free features will not be taken away without notice.</Text>
    </>
  );
}

const FAQ: [string, string][] = [
  ['Does Drisya charge brokerage?', 'No. Drisya does not charge tenants or hosts any fee at the moment. You pay rent and deposit directly to the host at move-in.'],
  ['How does booking work?', 'Pick a move-in date and length of stay and send a request. The host accepts or declines, usually within 24 hours. PGs with Instant Book are confirmed immediately while rooms are free. Nothing is charged online.'],
  ["Can I get the owner's phone number?", 'No. To keep everyone safe, host phone numbers are never shown. Message the host on Drisya — before and after your visit or booking — so there is always a record.'],
  ['Who can write reviews?', 'Only tenants whose visit was marked completed, or who stayed there through a booking. Reviews from stays are labelled "Stayed here".'],
  ['What does "Verified" mean?', 'Our team physically inspected the property. Every new listing is also reviewed online before it goes live.'],
  ['How do I cancel?', 'Open Profile → My bookings & visits and choose Cancel. The other person is notified straight away.'],
  ['I forgot my password', 'Use "Forgot password?" on the sign-in screen. We\'ll email you a link that works for one hour.'],
  ['How do I delete my account or download my data?', 'Go to Profile → Account settings.'],
  ['How do I list my PG?', 'Sign up (or choose "List your PG" in Profile), add details and real photos, and submit. Our team reviews it within 1–2 working days.'],
];

function Help() {
  const nav = useNavigation<Nav>();
  const [open, setOpen] = useState<number | null>(0);
  const support = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || '';
  return (
    <>
      <Text style={s.h1}>Help centre</Text>
      <View style={s.quickRow}>
        {([['key-outline', 'Reset password', () => nav.navigate('ForgotPassword')], ['flag-outline', 'Report a problem', () => nav.navigate('Info', { page: 'trust' })], ['trash-outline', 'Delete account', () => nav.navigate('AccountSettings')]] as [IconName, string, () => void][]).map(([icon, label, go]) => (
          <TouchableOpacity key={label} style={s.quick} onPress={go}>
            <Icon name={icon} size={18} color={colors.brand[500]} />
            <Text style={s.quickText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.faq}>
        {FAQ.map(([q, a], i) => (
          <View key={q} style={i > 0 && s.faqDivider}>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open === i }} onPress={() => setOpen(open === i ? null : i)} style={s.faqQ}>
              <Text style={s.faqQText}>{q}</Text>
              <Icon name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink[500]} />
            </TouchableOpacity>
            {open === i && <Text style={s.faqA}>{a}</Text>}
          </View>
        ))}
      </View>
      <View style={s.tint}>
        <Text style={s.h2}>Still need help?</Text>
        <Button variant="outline" icon="headset-outline" title="Ask a Drisya Expert" onPress={() => nav.navigate('Expert')} />
        {support ? <Button variant="ghost" icon="mail-outline" title={support} onPress={() => Linking.openURL(`mailto:${support}`)} style={{ marginTop: spacing.sm }} /> : null}
      </View>
    </>
  );
}

function Legal() {
  return (
    <>
      <Text style={s.h1}>Terms & Privacy</Text>
      <Text style={s.lead}>The short version — the full documents are on our website.</Text>
      {([
        ['person-outline', 'What we collect', 'Your account details, the listings, messages, visits, bookings and reviews you create, and basic technical logs to keep the service secure.'],
        ['eye-outline', 'Who sees what', 'Your name and profile photo are public. Host phone numbers are never shown. A tenant\'s number is shared with the host only after a visit is confirmed or a booking accepted. Email addresses are never shown.'],
        ['cash-outline', 'Payments', 'Drisya does not take payments. Rent and deposit are paid directly to the host at move-in against a written agreement.'],
        ['download-outline', 'Your data', 'Download a copy of your data or delete your account at any time from Account settings.'],
        ['flag-outline', 'Fair use', 'Listings must be real and accurate. Harassment, discrimination and scams lead to removal and account suspension.'],
      ] as [IconName, string, string][]).map(([icon, title, desc]) => (
        <View key={title} style={s.card}>
          <IconTile name={icon} size={40} />
          <View style={{ flex: 1 }}><Text style={s.cardTitle}>{title}</Text><Text style={s.cardText}>{desc}</Text></View>
        </View>
      ))}
      <Button variant="outline" icon="document-text-outline" title="Full Terms of Service" onPress={() => openWeb('/terms')} style={{ marginTop: spacing.sm }} />
      <Button variant="outline" icon="lock-closed-outline" title="Full Privacy Policy" onPress={() => openWeb('/privacy')} style={{ marginTop: spacing.sm }} />
    </>
  );
}

export function ExpertScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.fullName || '', email: user?.email || '', phone: user?.phone || '', city: user?.city || '', locality: user?.preferredLocality || '', budget: user?.budgetMax ? String(user.budgetMax) : '', moveInDate: '', message: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) return setError('Please enter your name');
    if (!form.email.trim() && form.phone.replace(/\D/g, '').length < 10) return setError('Please give an email or a 10-digit phone number');
    if (form.email.trim() && !isEmail(form.email)) return setError('Please enter a valid email');
    if (form.moveInDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.moveInDate)) return setError('Move-in date must look like 2026-11-01');
    setBusy(true);
    setError('');
    try {
      setDone((await submitInquiry({ ...form, budget: form.budget ? Number(form.budget) : undefined })).message);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <View style={[s.page, { justifyContent: 'center', padding: spacing['2xl'], alignItems: 'center' }]}>
        <IconTile name="checkmark-circle" size={72} />
        <Text style={[s.h1, { marginTop: spacing.lg, textAlign: 'center' }]}>Request received</Text>
        <Text style={[s.lead, { textAlign: 'center' }]}>{done}</Text>
        <Button title="Browse PGs meanwhile" onPress={() => nav.navigate('MainTabs', { screen: 'Search' })} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  return (
    <KeyboardScreen style={{ flex: 1 }}>
      <ScrollView style={s.page} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 56 }}>
        <View style={s.hero}>
          <Text style={s.heroTitle}>Drisya Expert</Text>
          <Text style={s.heroText}>Moving to a new city and short on time? Tell us what you need and a local Drisya team member will shortlist PGs and help you set up visits. Free while we're launching.</Text>
        </View>
        <View style={{ padding: spacing.lg }}>
          {([['headset-outline', 'Tell us your needs', 'Budget, area, college or office, food and move-in date.'], ['list-outline', 'Get a shortlist', 'Suitable PGs from Drisya, usually within one working day.'], ['calendar-outline', 'Visit and decide', 'Book visits in the app and decide in your own time.']] as [IconName, string, string][]).map(([icon, t, d]) => (
            <View key={t} style={s.step}><IconTile name={icon} size={40} /><View style={{ flex: 1 }}><Text style={s.cardTitle}>{t}</Text><Text style={s.cardText}>{d}</Text></View></View>
          ))}
          <View style={[s.formCard]}>
            <Text style={s.h2}>Request help</Text>
            <Field label="Your name" value={form.name} onChangeText={set('name')} autoComplete="name" />
            <Field label="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
            <Field label="City" value={form.city} onChangeText={set('city')} />
            <Field label="Preferred area / college" value={form.locality} onChangeText={set('locality')} />
            <Field label="Budget (₹/month)" value={form.budget} onChangeText={set('budget')} keyboardType="number-pad" />
            <Field label="Move-in date (optional)" value={form.moveInDate} onChangeText={set('moveInDate')} placeholder="YYYY-MM-DD" />
            <Field label="Anything else?" value={form.message} onChangeText={set('message')} multiline maxLength={2000} placeholder="Food, AC, gender, distance…" />
            <ErrorText>{error}</ErrorText>
            <Button title="Send request" icon="paper-plane" onPress={submit} loading={busy} />
            <Text style={[s.small, { marginTop: spacing.sm }]}>We'll only use these details to help with your search.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardScreen>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  h1: { fontSize: 26, fontWeight: '800', color: colors.ink[900] },
  h2: { fontSize: 18, fontWeight: '800', color: colors.ink[900], marginTop: spacing.lg, marginBottom: spacing.sm },
  lead: { fontSize: 15, color: colors.ink[600], marginTop: 6, marginBottom: spacing.xl, lineHeight: 22 },
  small: { fontSize: 12, color: colors.ink[500], lineHeight: 17 },
  card: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink[900] },
  cardText: { fontSize: 14, color: colors.ink[600], marginTop: 2, lineHeight: 20 },
  tint: { backgroundColor: colors.brand[50], borderRadius: radius.xl, padding: spacing.lg, marginVertical: spacing.lg },
  tipRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tipText: { flex: 1, fontSize: 14, color: colors.ink[700], lineHeight: 20 },
  plan: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.md },
  planTitle: { fontSize: 17, fontWeight: '700', color: colors.ink[900] },
  planPrice: { fontSize: 38, fontWeight: '800', color: colors.ink[900], marginTop: 4 },
  quickRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.lg },
  quick: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, padding: spacing.md, gap: 6 },
  quickText: { fontSize: 13, fontWeight: '600', color: colors.ink[900] },
  faq: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.xl, overflow: 'hidden' },
  faqDivider: { borderTopWidth: 1, borderTopColor: colors.ink[100] },
  faqQ: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  faqQText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink[900] },
  faqA: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, fontSize: 14, color: colors.ink[600], lineHeight: 21 },
  hero: { backgroundColor: colors.ink[900], padding: spacing.xl, paddingVertical: spacing['2xl'] },
  heroTitle: { fontSize: 26, fontWeight: '800', color: colors.white },
  heroText: { fontSize: 15, color: colors.ink[200], marginTop: spacing.sm, lineHeight: 22 },
  step: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  formCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.xl, padding: spacing.lg, paddingTop: 0 },
});
