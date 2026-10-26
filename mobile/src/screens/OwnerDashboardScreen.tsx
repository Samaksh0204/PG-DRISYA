// Host dashboard: stats, my listings (edit / pause / delete) and reviews with replies.
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Booking, PropertyListing, Review, RootStackParamList, Visit } from '../types';
import {
  deleteListing, fetchOwnerBookings, fetchOwnerListings, fetchOwnerReviews, fetchOwnerVisits, replyToReview, setListingStatus,
} from '../services/api';
import { Avatar, Button, Empty, Icon, Segmented, StatusPill, Stars, type IconName } from '../components/ui';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { formatINR, optimizeImage, timeAgo } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'listings' | 'reviews';

export function OwnerDashboardScreen() {
  const nav = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('listings');
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [l, r, b, v] = await Promise.all([
        fetchOwnerListings(),
        fetchOwnerReviews().catch(() => [] as Review[]),
        fetchOwnerBookings().catch(() => [] as Booking[]),
        fetchOwnerVisits().catch(() => [] as Visit[]),
      ]);
      setListings(l);
      setReviews(r);
      setBookings(b);
      setVisits(v);
    } catch (e: any) {
      Alert.alert('Could not load your dashboard', e.message);
    }
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); load(); } catch (e: any) { Alert.alert('Could not update', e.message); }
  };

  const remove = (l: PropertyListing) =>
    Alert.alert('Delete listing?', `"${l.title}" will be removed from search. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteListing(l.id)) },
    ]);

  const pending = bookings.filter((b) => b.status === 'pending').length + visits.filter((v) => v.status === 'pending').length;
  const live = listings.filter((l) => l.status === 'active').length;
  const views = listings.reduce((n, l) => n + l.views, 0);
  const rated = listings.filter((l) => l.reviewCount > 0);
  const avg = rated.length ? rated.reduce((n, l) => n + l.rating * l.reviewCount, 0) / rated.reduce((n, l) => n + l.reviewCount, 0) : 0;
  const unanswered = reviews.filter((r) => !r.ownerReply).length;

  const stats: { icon: IconName; value: string; label: string }[] = [
    { icon: 'business-outline', value: `${live}/${listings.length}`, label: 'Live listings' },
    { icon: 'eye-outline', value: String(views), label: 'Total views' },
    { icon: 'file-tray-outline', value: String(pending), label: 'Pending requests' },
    { icon: 'star-outline', value: avg ? avg.toFixed(1) : '—', label: 'Avg rating' },
  ];

  const header = (
    <View>
      <View style={s.statsGrid}>
        {stats.map((st) => (
          <View key={st.label} style={s.stat}>
            <Icon name={st.icon} size={18} color={colors.brand[600]} />
            <Text style={s.statVal}>{st.value}</Text>
            <Text style={s.statLbl}>{st.label}</Text>
          </View>
        ))}
      </View>
      {pending > 0 && (
        <TouchableOpacity style={s.alert} onPress={() => nav.navigate('HostRequests')} activeOpacity={0.85}>
          <Icon name="notifications-outline" size={18} color={colors.amber[700]} />
          <Text style={s.alertText}>{pending} request{pending === 1 ? '' : 's'} waiting for your reply</Text>
          <Icon name="chevron-forward" size={16} color={colors.amber[700]} />
        </TouchableOpacity>
      )}
      <View style={s.actionsRow}>
        <Button title="Add PG" icon="add" onPress={() => nav.navigate('AddListing', {})} style={{ flex: 1 }} />
        <Button variant="outline" title="Requests" icon="file-tray-outline" onPress={() => nav.navigate('HostRequests')} style={{ flex: 1 }} />
      </View>
      <View style={{ marginBottom: spacing.lg }}>
        <Segmented value={tab} onChange={setTab} options={[
          { value: 'listings', label: 'Listings' },
          { value: 'reviews', label: 'Reviews', count: unanswered },
        ]} />
      </View>
    </View>
  );

  const refresh = <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />;

  if (tab === 'reviews') {
    return (
      <FlatList
        style={s.page}
        contentContainerStyle={{ padding: spacing.lg }}
        data={reviews}
        keyExtractor={(r) => r.id}
        refreshControl={refresh}
        ListHeaderComponent={header}
        ListEmptyComponent={loading ? undefined : <Empty icon="star-outline" title="No reviews yet" desc="Tenants can review after a completed visit or stay." />}
        renderItem={({ item }) => <OwnerReview review={item} onReplied={load} onOpen={() => item.propertyId && nav.navigate('ListingDetail', { id: String(item.propertyId) })} />}
      />
    );
  }

  return (
    <FlatList
      style={s.page}
      contentContainerStyle={{ padding: spacing.lg }}
      data={listings}
      keyExtractor={(l) => l.id}
      refreshControl={refresh}
      ListHeaderComponent={header}
      ListEmptyComponent={loading ? undefined : <Empty icon="business-outline" title="No listings yet" desc="Listing is free. Every new listing is reviewed by our team before it goes live." />}
      renderItem={({ item }) => (
        <View style={s.card}>
          <TouchableOpacity onPress={() => nav.navigate('ListingDetail', { id: item.id })} activeOpacity={0.85} style={{ flexDirection: 'row', gap: spacing.md }}>
            {item.photos[0] ? <Image source={{ uri: optimizeImage(item.photos[0], 240) }} style={s.img} /> : <View style={[s.img, s.noImg]}><Icon name="business-outline" size={24} color={colors.brand[300]} /></View>}
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={1}>{item.title}</Text>
              <Text style={s.meta}>{[item.locality, item.city].filter(Boolean).join(', ')} · {formatINR(item.price)}/mo</Text>
              <View style={s.metaRow}>
                <Icon name="eye-outline" size={12} color={colors.ink[500]} /><Text style={s.meta}>{item.views}</Text>
                <Icon name="star" size={12} color={colors.warning} /><Text style={s.meta}>{item.reviewCount ? item.rating.toFixed(1) : '—'}</Text>
                <Icon name="bed-outline" size={12} color={colors.ink[500]} /><Text style={s.meta}>{item.roomsAvailable} free</Text>
              </View>
              <View style={{ marginTop: 6 }}><StatusPill status={item.status} /></View>
            </View>
          </TouchableOpacity>
          {item.status === 'rejected' && <Text style={s.note}>Changes needed: {item.moderationNote || 'see your notifications'}. Edit to resubmit.</Text>}
          {item.status === 'pending_review' && <Text style={s.wait}>Waiting for review by the Drisya team.</Text>}
          <View style={s.actions}>
            <Button variant="outline" icon="create-outline" title="Edit" onPress={() => nav.navigate('AddListing', { editId: item.id })} style={s.small} />
            {['active', 'inactive'].includes(item.status) && (
              <Button variant="outline" icon={item.status === 'inactive' ? 'play-circle-outline' : 'pause-circle-outline'} title={item.status === 'inactive' ? 'Resume' : 'Pause'}
                onPress={() => run(() => setListingStatus(item.id, item.status === 'inactive' ? 'active' : 'inactive'))} style={s.small} />
            )}
            <Button variant="ghost" icon="trash-outline" title="Delete" onPress={() => remove(item)} style={s.small} />
          </View>
        </View>
      )}
    />
  );
}

function OwnerReview({ review: r, onReplied, onOpen }: { review: Review; onReplied: () => void; onOpen: () => void }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await replyToReview(r.id, text.trim());
      setOpen(false);
      onReplied();
    } catch (e: any) {
      Alert.alert('Could not post reply', e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={s.card}>
      <TouchableOpacity onPress={onOpen}><Text style={s.reviewProp} numberOfLines={1}>{r.propertyTitle}</Text></TouchableOpacity>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm }}>
        <Avatar uri={r.authorAvatar} name={r.author} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{r.author}</Text>
          <Text style={s.meta}>{timeAgo(r.date)}</Text>
        </View>
        <Stars value={r.rating} size={12} />
      </View>
      {!!r.text && <Text style={s.reviewText}>{r.text}</Text>}
      {r.ownerReply ? (
        <View style={s.replyBox}><Text style={s.replyHead}>Your reply</Text><Text style={s.reviewText}>{r.ownerReply.text}</Text></View>
      ) : open ? (
        <View style={{ marginTop: spacing.sm }}>
          <TextInput style={s.input} value={text} onChangeText={setText} multiline maxLength={1000} placeholder="Write a public reply" placeholderTextColor={colors.ink[400]} accessibilityLabel="Reply" />
          <View style={s.actions}>
            <Button variant="outline" title="Cancel" onPress={() => setOpen(false)} style={s.small} />
            <Button title="Post reply" onPress={send} loading={busy} disabled={!text.trim()} style={s.small} />
          </View>
        </View>
      ) : (
        <View style={s.actions}><Button variant="outline" icon="chatbubble-ellipses-outline" title="Reply" onPress={() => setOpen(true)} style={s.small} /></View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  stat: { width: '48.5%', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.xl, padding: spacing.md },
  statVal: { fontSize: 22, fontWeight: '800', color: colors.ink[900], marginTop: 6 },
  statLbl: { fontSize: 12, color: colors.ink[500] },
  alert: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.amber[50], borderWidth: 1, borderColor: colors.amber[100], borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.amber[700] },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.ink[200] },
  img: { width: 88, height: 76, borderRadius: radius.md },
  noImg: { backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink[900] },
  meta: { fontSize: 12, color: colors.ink[500], marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  note: { marginTop: spacing.sm, fontSize: 12, color: colors.red[700], backgroundColor: colors.red[50], padding: spacing.sm, borderRadius: radius.sm },
  wait: { marginTop: spacing.sm, fontSize: 12, color: colors.amber[700] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  small: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 38 },
  reviewProp: { fontSize: 12, fontWeight: '700', color: colors.brand[700] },
  reviewText: { fontSize: 14, color: colors.ink[700], lineHeight: 20, marginTop: spacing.sm },
  replyBox: { marginTop: spacing.md, backgroundColor: colors.page, borderLeftWidth: 3, borderLeftColor: colors.brand[500], borderRadius: radius.sm, padding: spacing.md },
  replyHead: { fontSize: 12, fontWeight: '700', color: colors.ink[900] },
  input: { borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, padding: spacing.md, minHeight: 80, textAlignVertical: 'top', fontSize: 14, color: colors.ink[900] },
});
