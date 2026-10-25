// Tenant: my bookings & visits. Owner: incoming booking and visit requests.
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Booking, PersonSummary, RootStackParamList, Visit } from '../types';
import { fetchMyBookings, fetchMyVisits, fetchOwnerBookings, fetchOwnerVisits, updateBookingStatus, updateVisitStatus } from '../services/api';
import { Button, Empty, Segmented, StatusPill, Icon } from '../components/ui';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { formatDay, formatINR, localISODate } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Item = { kind: 'booking'; b: Booking } | { kind: 'visit'; v: Visit };

function useData(loader: () => Promise<Item[]>) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { setItems(await loader()); } catch { /* keep previous */ }
    setLoading(false);
  }, [loader]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return { items, loading, load };
}

const act = async (fn: () => Promise<unknown>, reload: () => void) => {
  try { await fn(); reload(); } catch (e: any) { Alert.alert('Could not update', e.message); }
};
const confirm = (title: string, msg: string, go: () => void) => Alert.alert(title, msg, [{ text: 'No', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: go }]);

export function TripsScreen() {
  const nav = useNavigation<Nav>();
  const [tab, setTab] = useState<'booking' | 'visit'>('booking');
  const loader = useCallback(async (): Promise<Item[]> => {
    const [b, v] = await Promise.all([fetchMyBookings(), fetchMyVisits()]);
    return [...b.map((x) => ({ kind: 'booking' as const, b: x })), ...v.map((x) => ({ kind: 'visit' as const, v: x }))];
  }, []);
  const { items, loading, load } = useData(loader);
  const shown = items.filter((i) => i.kind === tab);

  return (
    <View style={s.container}>
      <View style={s.tabs}><Segmented value={tab} onChange={setTab} options={[{ value: 'booking', label: 'Bookings' }, { value: 'visit', label: 'Visits' }]} /></View>
      <FlatList
        data={shown}
        keyExtractor={(i) => (i.kind === 'booking' ? i.b._id : i.v._id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        ListEmptyComponent={loading ? undefined : <Empty icon={tab === 'booking' ? 'key-outline' : 'calendar-outline'} title={tab === 'booking' ? 'No bookings yet' : 'No visits yet'} desc="Find a PG and request to book or book a visit."><Button title="Find a PG" onPress={() => nav.navigate('MainTabs', { screen: 'Search' })} /></Empty>}
        renderItem={({ item }) => {
          if (item.kind === 'booking') {
            const b = item.b;
            return (
              <RowCard photo={b.propertyId?.photos?.[0]} title={b.propertyId?.title || 'Listing removed'} status={b.status} onPress={() => b.propertyId && nav.navigate('ListingDetail', { id: b.propertyId._id })}
                lines={[`Move-in ${formatDay(b.moveInDate)} · ${b.durationMonths} mo`, `${formatINR(b.monthlyRent)}/mo + ${formatINR(b.deposit)} deposit`, b.statusReason ? `Note: ${b.statusReason}` : '']}>
                {['accepted', 'completed'].includes(b.status) && b.propertyId && <Button variant="outline" title="Write review" onPress={() => nav.navigate('WriteReview', { propertyId: b.propertyId!._id, title: b.propertyId!.title })} style={s.small} />}
                {['pending', 'accepted'].includes(b.status) && <Button variant="ghost" title="Cancel" onPress={() => confirm('Cancel booking?', 'The owner will be told straight away.', () => act(() => updateBookingStatus(b._id, 'cancelled'), load))} style={s.small} />}
              </RowCard>
            );
          }
          const v = item.v;
          return (
            <RowCard photo={v.propertyId?.photos?.[0]} title={v.propertyId?.title || 'Listing removed'} status={v.status} onPress={() => v.propertyId && nav.navigate('ListingDetail', { id: v.propertyId._id })} lines={[`${formatDay(v.date)} at ${v.timeSlot}`]}>
              {v.status === 'completed' && v.propertyId && <Button variant="outline" title="Write review" onPress={() => nav.navigate('WriteReview', { propertyId: v.propertyId!._id, title: v.propertyId!.title })} style={s.small} />}
              {['pending', 'confirmed'].includes(v.status) && <Button variant="ghost" title="Cancel" onPress={() => confirm('Cancel visit?', 'The owner will be notified.', () => act(() => updateVisitStatus(v._id, 'cancelled'), load))} style={s.small} />}
            </RowCard>
          );
        }}
      />
    </View>
  );
}

export function HostRequestsScreen() {
  const [tab, setTab] = useState<'booking' | 'visit'>('booking');
  const loader = useCallback(async (): Promise<Item[]> => {
    const [b, v] = await Promise.all([fetchOwnerBookings(), fetchOwnerVisits()]);
    return [...b.map((x) => ({ kind: 'booking' as const, b: x })), ...v.map((x) => ({ kind: 'visit' as const, v: x }))];
  }, []);
  const { items, loading, load } = useData(loader);
  const shown = items.filter((i) => i.kind === tab);
  const today = localISODate();

  return (
    <View style={s.container}>
      <View style={s.tabs}><Segmented value={tab} onChange={setTab} options={[
        { value: 'booking', label: 'Booking requests', count: items.filter((i) => i.kind === 'booking' && i.b.status === 'pending').length },
        { value: 'visit', label: 'Visits', count: items.filter((i) => i.kind === 'visit' && i.v.status === 'pending').length },
      ]} /></View>
      <FlatList
        data={shown}
        keyExtractor={(i) => (i.kind === 'booking' ? i.b._id : i.v._id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        ListEmptyComponent={loading ? undefined : <Empty icon="file-tray-outline" title="Nothing here yet" desc="Requests from tenants appear here." />}
        renderItem={({ item }) => {
          if (item.kind === 'booking') {
            const b = item.b;
            const t = b.tenantId as PersonSummary;
            return (
              <RowCard photo={b.propertyId?.photos?.[0]} title={t?.fullName || 'Former member'} status={b.status}
                lines={[b.propertyId?.title || '', `Move-in ${formatDay(b.moveInDate)} · ${b.durationMonths} mo`, b.message ? `"${b.message}"` : '']}>
                {['accepted', 'completed'].includes(b.status) && t?.phone ? <Button variant="outline" title={`Call ${t.phone}`} onPress={() => Linking.openURL(`tel:${t.phone}`)} style={s.small} /> : null}
                {b.status === 'pending' && <>
                  <Button title="Accept" onPress={() => act(() => updateBookingStatus(b._id, 'accepted'), load)} style={s.small} />
                  <Button variant="outline" title="Decline" onPress={() => act(() => updateBookingStatus(b._id, 'declined'), load)} style={s.small} />
                </>}
                {b.status === 'accepted' && b.moveInDate <= today && <Button variant="outline" title="Mark moved in" onPress={() => act(() => updateBookingStatus(b._id, 'completed'), load)} style={s.small} />}
              </RowCard>
            );
          }
          const v = item.v;
          const t = v.tenantId as PersonSummary;
          return (
            <RowCard photo={v.propertyId?.photos?.[0]} title={t?.fullName || 'Former member'} status={v.status} lines={[v.propertyId?.title || '', `${formatDay(v.date)} at ${v.timeSlot}`, v.message ? `"${v.message}"` : '']}>
              {v.status === 'pending' && <>
                <Button title="Confirm" onPress={() => act(() => updateVisitStatus(v._id, 'confirmed'), load)} style={s.small} />
                <Button variant="outline" title="Decline" onPress={() => act(() => updateVisitStatus(v._id, 'rejected'), load)} style={s.small} />
              </>}
              {v.status === 'confirmed' && v.date <= today && <Button variant="outline" title="Mark visited" onPress={() => act(() => updateVisitStatus(v._id, 'completed'), load)} style={s.small} />}
            </RowCard>
          );
        }}
      />
    </View>
  );
}

function RowCard({ photo, title, status, lines, onPress, children }: { photo?: string; title: string; status: string; lines: string[]; onPress?: () => void; children?: React.ReactNode }) {
  return (
    <View style={s.card}>
      <TouchableOpacity style={s.cardTop} onPress={onPress} disabled={!onPress} activeOpacity={0.8}>
        {photo ? <Image source={{ uri: photo }} style={s.photo} /> : <View style={[s.photo, s.noPhoto]}><Icon name="business-outline" size={24} color={colors.brand[300]} /></View>}
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {lines.filter(Boolean).map((l) => <Text key={l} style={s.line} numberOfLines={2}>{l}</Text>)}
          <View style={{ marginTop: 6 }}><StatusPill status={status} /></View>
        </View>
      </TouchableOpacity>
      {children ? <View style={s.actions}>{children}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  tabs: { padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink[200] },
  noPhoto: { backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.ink[200] },
  cardTop: { flexDirection: 'row', gap: spacing.md },
  photo: { width: 72, height: 72, borderRadius: radius.md },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink[900] },
  line: { fontSize: 12, color: colors.ink[500], marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  small: { paddingVertical: 8, paddingHorizontal: 14 },
});
