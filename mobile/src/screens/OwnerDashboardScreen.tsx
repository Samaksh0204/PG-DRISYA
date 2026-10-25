import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PropertyListing, RootStackParamList } from '../types';
import { deleteListing, fetchOwnerListings, setListingStatus } from '../services/api';
import { Button, Empty, StatusPill } from '../components/ui';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { formatINR } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function OwnerDashboardScreen() {
  const nav = useNavigation<Nav>();
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setListings(await fetchOwnerListings()); } catch (e: any) { Alert.alert('Could not load listings', e.message); }
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

  return (
    <FlatList
      style={{ backgroundColor: colors.ink[50] }}
      contentContainerStyle={{ padding: spacing.lg }}
      data={listings}
      keyExtractor={(l) => l.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <Button title="+ Add PG" onPress={() => nav.navigate('AddListing', {})} style={{ flex: 1 }} />
          <Button variant="outline" title="Requests" onPress={() => nav.navigate('HostRequests')} style={{ flex: 1 }} />
        </View>
      }
      ListEmptyComponent={loading ? null : <Empty icon="🏠" title="No listings yet" desc="Listing is free. Every new listing is reviewed by our team before it goes live." />}
      renderItem={({ item }) => (
        <View style={s.card}>
          <TouchableOpacity onPress={() => nav.navigate('ListingDetail', { id: item.id })} activeOpacity={0.85} style={{ flexDirection: 'row', gap: spacing.md }}>
            {item.photos[0] ? <Image source={{ uri: item.photos[0] }} style={s.img} /> : <View style={[s.img, { backgroundColor: colors.ink[100] }]} />}
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={1}>{item.title}</Text>
              <Text style={s.meta}>{[item.locality, item.city].filter(Boolean).join(', ')} · {formatINR(item.price)}/mo</Text>
              <Text style={s.meta}>👁 {item.views} · ★ {item.reviewCount ? item.rating.toFixed(1) : '—'} · {item.roomsAvailable} free</Text>
              <View style={{ marginTop: 6 }}><StatusPill status={item.status} /></View>
            </View>
          </TouchableOpacity>
          {item.status === 'rejected' && <Text style={s.note}>Changes needed: {item.moderationNote}. Edit to resubmit.</Text>}
          {item.status === 'pending_review' && <Text style={s.wait}>Waiting for review by the Drisya team.</Text>}
          <View style={s.actions}>
            <Button variant="outline" title="Edit" onPress={() => nav.navigate('AddListing', { editId: item.id })} style={s.small} />
            {['active', 'inactive'].includes(item.status) && (
              <Button variant="outline" title={item.status === 'inactive' ? 'Resume' : 'Pause'} onPress={() => run(() => setListingStatus(item.id, item.status === 'inactive' ? 'active' : 'inactive'))} style={s.small} />
            )}
            <Button variant="ghost" title="Delete" onPress={() => remove(item)} style={s.small} />
          </View>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.ink[100] },
  img: { width: 84, height: 72, borderRadius: radius.md },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink[900] },
  meta: { fontSize: 12, color: colors.ink[500], marginTop: 2 },
  note: { marginTop: spacing.sm, fontSize: 12, color: colors.red[700], backgroundColor: colors.red[50], padding: spacing.sm, borderRadius: radius.sm },
  wait: { marginTop: spacing.sm, fontSize: 12, color: colors.amber[700] },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  small: { paddingVertical: 8, paddingHorizontal: 14 },
});
