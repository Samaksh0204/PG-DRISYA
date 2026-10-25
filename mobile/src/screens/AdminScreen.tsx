// Admin console (website: /admin): stats, listing moderation, reports, users, Expert inquiries.
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdminListing, AdminReport, AdminStats, AdminUser, Inquiry, RootStackParamList } from '../types';
import { admin } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Button, Chip, Empty, ErrorText, Icon, StatusPill } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { formatDate, formatINR, optimizeImage, timeAgo } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'listings' | 'reports' | 'users' | 'inquiries';

export function AdminScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('listings');
  const [stats, setStats] = useState<AdminStats | null>(null);

  const loadStats = useCallback(() => { admin.stats().then(setStats).catch(() => {}); }, []);
  useEffect(() => { loadStats(); }, [loadStats]);

  if (user?.role !== 'admin') return <View style={s.page}><Empty icon="lock-closed-outline" title="Admins only" /></View>;

  return (
    <View style={s.page}>
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stats}>
          {([['Pending listings', stats.pendingListings], ['Open reports', stats.openReports], ['New inquiries', stats.newInquiries], ['Live listings', stats.activeListings], ['Users', stats.users], ['Hosts', stats.owners], ['Pending bookings', stats.pendingBookings], ['Reviews', stats.reviews]] as [string, number][]).map(([l, v]) => (
            <View key={l} style={s.stat}><Text style={s.statVal}>{v}</Text><Text style={s.statLbl}>{l}</Text></View>
          ))}
        </ScrollView>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
        <Chip label="Listings" icon="business-outline" active={tab === 'listings'} onPress={() => setTab('listings')} />
        <Chip label="Reports" icon="flag-outline" active={tab === 'reports'} onPress={() => setTab('reports')} />
        <Chip label="Users" icon="people-outline" active={tab === 'users'} onPress={() => setTab('users')} />
        <Chip label="Inquiries" icon="headset-outline" active={tab === 'inquiries'} onPress={() => setTab('inquiries')} />
      </ScrollView>
      {tab === 'listings' && <ListingsTab onChange={loadStats} />}
      {tab === 'reports' && <ReportsTab onChange={loadStats} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'inquiries' && <InquiriesTab onChange={loadStats} />}
    </View>
  );
}

function useList<T>(loader: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await loader()); setError(''); } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [loader]);
  useEffect(() => { load(); }, [load]);
  return { items, loading, error, load };
}

const act = async (fn: () => Promise<unknown>, done: () => void) => {
  try { await fn(); done(); } catch (e: any) { Alert.alert('Could not update', e.message); }
};

function ListingsTab({ onChange }: { onChange: () => void }) {
  const nav = useNavigation<Nav>();
  const [status, setStatus] = useState('pending_review');
  const loader = useCallback(async () => (await admin.listings(status)).listings, [status]);
  const { items, loading, error, load } = useList<AdminListing>(loader);
  const done = () => { load(); onChange(); };
  const reject = (l: AdminListing) => Alert.prompt
    ? Alert.prompt('Reject listing', 'Tell the host what to change.', (note) => act(() => admin.moderate(l.id, 'reject', note || ''), done))
    : act(() => admin.moderate(l.id, 'reject', 'Please review your listing details and photos.'), done);

  return (
    <FlatList
      data={items}
      keyExtractor={(l) => l.id}
      contentContainerStyle={s.list}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand[500]} />}
      ListHeaderComponent={
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
            {[['pending_review', 'Pending'], ['active', 'Live'], ['inactive', 'Paused'], ['rejected', 'Rejected']].map(([v, l]) => <Chip key={v} label={l} active={status === v} onPress={() => setStatus(v)} />)}
          </ScrollView>
          <ErrorText>{error}</ErrorText>
        </>
      }
      ListEmptyComponent={loading ? undefined : <Empty icon="checkmark-done" title="Nothing to review" />}
      renderItem={({ item: l }) => (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {l.photos[0] ? <Image source={{ uri: optimizeImage(l.photos[0], 200) }} style={s.img} /> : <View style={[s.img, { backgroundColor: colors.brand[50] }]} />}
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={2} onPress={() => nav.navigate('ListingDetail', { id: l.id })}>{l.title}</Text>
              <Text style={s.meta}>{l.locality ? `${l.locality}, ` : ''}{l.city} · {formatINR(l.price)}/mo · {l.photos.length} photos</Text>
              <Text style={s.meta}>Host: {l.owner?.fullName || '—'} {l.owner?.email ? `(${l.owner.email})` : ''}</Text>
              <View style={s.row}>
                <StatusPill status={l.status} />
                {l.verified && <Badge label="Verified" icon="shield-checkmark" />}
                {l.featured && <Badge label="Featured" tone="amber" />}
              </View>
            </View>
          </View>
          <View style={s.actions}>
            {l.status === 'pending_review' || l.status === 'rejected' ? (
              <>
                <Button title="Approve" icon="checkmark" onPress={() => act(() => admin.moderate(l.id, 'approve'), done)} style={s.small} />
                {l.status === 'pending_review' && <Button variant="outline" title="Reject" onPress={() => reject(l)} style={s.small} />}
              </>
            ) : null}
            {l.status === 'active' && (
              <>
                <Button variant="outline" title={l.verified ? 'Unverify' : 'Verify'} onPress={() => act(() => admin.moderate(l.id, l.verified ? 'unverify' : 'verify'), done)} style={s.small} />
                <Button variant="outline" title={l.featured ? 'Unfeature' : 'Feature'} onPress={() => act(() => admin.moderate(l.id, l.featured ? 'unfeature' : 'feature'), done)} style={s.small} />
                <Button variant="ghost" title="Deactivate" onPress={() => act(() => admin.moderate(l.id, 'deactivate', 'Deactivated by admin'), done)} style={s.small} />
              </>
            )}
          </View>
        </View>
      )}
    />
  );
}

const REASON_LABEL: Record<string, string> = { fake_listing: 'Fake listing', inaccurate: 'Inaccurate', scam: 'Scam', harassment: 'Harassment', unsafe: 'Unsafe', offensive: 'Offensive', discrimination: 'Discrimination', other: 'Other' };

function ReportsTab({ onChange }: { onChange: () => void }) {
  const nav = useNavigation<Nav>();
  const [status, setStatus] = useState('open');
  const loader = useCallback(async () => (await admin.reports(status)).reports, [status]);
  const { items, loading, error, load } = useList<AdminReport>(loader);
  const done = () => { load(); onChange(); };
  return (
    <FlatList
      data={items}
      keyExtractor={(r) => r._id}
      contentContainerStyle={s.list}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand[500]} />}
      ListHeaderComponent={
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[['open', 'Open'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed']].map(([v, l]) => <Chip key={v} label={l} active={status === v} onPress={() => setStatus(v)} />)}
          </View>
          <ErrorText>{error}</ErrorText>
        </>
      }
      ListEmptyComponent={loading ? undefined : <Empty icon="flag-outline" title="No reports" />}
      renderItem={({ item: r }) => {
        const label = r.target?.title || r.target?.fullName || r.target?.text || '(removed)';
        return (
          <View style={s.card}>
            <View style={s.row}>
              <Badge label={r.targetType} tone="ink" />
              <Badge label={REASON_LABEL[r.reason] || r.reason} tone="red" />
              <Text style={s.meta}>{timeAgo(r.createdAt)}</Text>
            </View>
            <Text style={[s.title, { marginTop: spacing.sm }]} numberOfLines={2}
              onPress={r.targetType === 'listing' ? () => nav.navigate('ListingDetail', { id: r.targetId }) : r.targetType === 'user' ? () => nav.navigate('HostProfile', { id: r.targetId }) : undefined}>
              {label}
            </Text>
            {!!r.details && <Text style={s.body}>"{r.details}"</Text>}
            <Text style={s.meta}>By {r.reporterId?.fullName || 'deleted user'}</Text>
            {r.status === 'open' && (
              <View style={s.actions}>
                <Button title="Resolve" onPress={() => act(() => admin.resolveReport(r._id, 'resolved'), done)} style={s.small} />
                {r.targetType !== 'message' && (
                  <Button variant="danger" title="Remove content" onPress={() => Alert.alert('Remove content?', 'This pauses the listing / suspends the user / deletes the review.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => act(() => admin.resolveReport(r._id, 'resolved', true), done) },
                  ])} style={s.small} />
                )}
                <Button variant="ghost" title="Dismiss" onPress={() => act(() => admin.resolveReport(r._id, 'dismissed'), done)} style={s.small} />
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

function UsersTab() {
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 350);
  const loader = useCallback(async () => (await admin.users(dq)).users, [dq]);
  const { items, loading, error, load } = useList<AdminUser>(loader);
  const toggleSuspend = (u: AdminUser) => {
    if (u.suspended) return act(() => admin.updateUser(u.id, { suspended: false }), load);
    Alert.alert(`Suspend ${u.fullName}?`, 'They will be signed out and their listings paused.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => act(() => admin.updateUser(u.id, { suspended: true, reason: 'Suspended by admin' }), load) },
    ]);
  };
  return (
    <FlatList
      data={items}
      keyExtractor={(u) => u.id}
      contentContainerStyle={s.list}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand[500]} />}
      ListHeaderComponent={
        <>
          <View style={s.searchBox}>
            <Icon name="search-outline" size={18} color={colors.ink[400]} />
            <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder="Search name or email" placeholderTextColor={colors.ink[400]} autoCapitalize="none" accessibilityLabel="Search users" />
          </View>
          <ErrorText>{error}</ErrorText>
        </>
      }
      ListEmptyComponent={loading ? undefined : <Empty icon="people-outline" title="No users found" />}
      renderItem={({ item: u }) => (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Avatar uri={u.avatar} name={u.fullName} size={42} />
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{u.fullName}</Text>
              <Text style={s.meta}>{u.email}{u.phone ? ` · ${u.phone}` : ''}</Text>
              <View style={s.row}>
                <Badge label={u.role} tone="ink" />
                {u.verified && <Badge label="Verified" icon="shield-checkmark" />}
                {u.emailVerified && <Badge label="Email ✓" />}
                {u.suspended && <Badge label="Suspended" tone="red" />}
              </View>
              <Text style={s.meta}>Joined {formatDate(u.createdAt)}{u.lastLoginAt ? ` · last seen ${timeAgo(u.lastLoginAt)}` : ''}</Text>
            </View>
          </View>
          {u.role !== 'admin' && (
            <View style={s.actions}>
              <Button variant="outline" title={u.verified ? 'Unverify host' : 'Verify host'} onPress={() => act(() => admin.updateUser(u.id, { verified: !u.verified }), load)} style={s.small} />
              <Button variant={u.suspended ? 'outline' : 'ghost'} title={u.suspended ? 'Unsuspend' : 'Suspend'} onPress={() => toggleSuspend(u)} style={s.small} />
            </View>
          )}
        </View>
      )}
    />
  );
}

function InquiriesTab({ onChange }: { onChange: () => void }) {
  const loader = useCallback(async () => (await admin.inquiries()).inquiries, []);
  const { items, loading, error, load } = useList<Inquiry>(loader);
  const done = () => { load(); onChange(); };
  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i._id}
      contentContainerStyle={s.list}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand[500]} />}
      ListHeaderComponent={<ErrorText>{error}</ErrorText>}
      ListEmptyComponent={loading ? undefined : <Empty icon="headset-outline" title="No Expert requests yet" />}
      renderItem={({ item: i }) => (
        <View style={s.card}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={s.title}>{i.name}</Text>
            <StatusPill status={i.status} />
          </View>
          <Text style={s.meta}>{[i.city, i.locality].filter(Boolean).join(' · ') || 'Any area'}{i.budget ? ` · up to ${formatINR(i.budget)}` : ''}{i.moveInDate ? ` · from ${formatDate(i.moveInDate)}` : ''}</Text>
          {!!i.message && <Text style={s.body}>{i.message}</Text>}
          <Text style={s.meta}>{timeAgo(i.createdAt)}</Text>
          <View style={s.actions}>
            {i.phone ? <Button variant="outline" icon="call-outline" title="Call" onPress={() => Linking.openURL(`tel:${i.phone}`)} style={s.small} /> : null}
            {i.email ? <Button variant="outline" icon="mail-outline" title="Email" onPress={() => Linking.openURL(`mailto:${i.email}?subject=Your PG search on Drisya`)} style={s.small} /> : null}
            {i.status === 'new' && <Button title="Mark contacted" onPress={() => act(() => admin.updateInquiry(i._id, 'contacted'), done)} style={s.small} />}
            {i.status !== 'closed' && <Button variant="ghost" title="Close" onPress={() => act(() => admin.updateInquiry(i._id, 'closed'), done)} style={s.small} />}
          </View>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  stats: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  stat: { backgroundColor: colors.ink[900], borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minWidth: 104 },
  statVal: { fontSize: 22, fontWeight: '800', color: colors.white },
  statLbl: { fontSize: 11, color: colors.ink[300], marginTop: 2 },
  tabs: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: { padding: spacing.lg, paddingTop: spacing.sm, flexGrow: 1 },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.md },
  img: { width: 80, height: 70, borderRadius: radius.md },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink[900] },
  meta: { fontSize: 12, color: colors.ink[500], marginTop: 3 },
  body: { fontSize: 14, color: colors.ink[700], marginTop: spacing.sm, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  small: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 38 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: colors.ink[900] },
});
