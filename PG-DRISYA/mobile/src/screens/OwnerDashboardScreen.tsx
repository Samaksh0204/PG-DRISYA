import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, PropertyListing } from '../types';
import { fetchOwnerListings, deleteListing } from '../services/api';
import { colors } from '../theme/colors';
import { spacing, radius, shadow } from '../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function OwnerDashboardScreen() {
  const nav = useNavigation<Nav>();
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchOwnerListings();
      setListings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Deactivate Listing', `Deactivate "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate', style: 'destructive',
        onPress: async () => {
          try {
            await deleteListing(id);
            setListings((prev) => prev.filter((l) => l.id !== id));
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: PropertyListing }) => (
    <View style={[styles.card, shadow.card]}>
      <TouchableOpacity onPress={() => nav.navigate('ListingDetail', { id: item.id })} activeOpacity={0.85}>
        <Image source={{ uri: item.photos[0] || 'https://via.placeholder.com/400x200?text=No+Photo' }} style={styles.cardImage} />
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status === 'active' ? '● Active' : '○ Inactive'}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardLocation}>{item.locality ? `${item.locality}, ` : ''}{item.city}</Text>
        <View style={styles.cardStatsRow}>
          <Text style={styles.cardPrice}>₹{item.price.toLocaleString('en-IN')}/mo</Text>
          <Text style={styles.cardStat}>👁 {item.views}</Text>
          <Text style={styles.cardStat}>★ {item.rating.toFixed(1)}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => nav.navigate('AddListing', { editId: item.id })}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.title)}>
            <Text style={styles.deleteBtnText}>Deactivate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.coral[500]} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Listings ({listings.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => nav.navigate('AddListing', {})}>
          <Text style={styles.addBtnText}>+ Add PG</Text>
        </TouchableOpacity>
      </View>

      {listings.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🏠</Text>
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptySub}>Add your first PG to start getting inquiries.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => nav.navigate('AddListing', {})}>
            <Text style={styles.emptyBtnText}>Add Your First PG</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.coral[500]} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink[50] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  heading: { fontSize: 20, fontWeight: '800', color: colors.ink[900] },
  addBtn: { backgroundColor: colors.coral[500], borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },

  card: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden' },
  cardImage: { width: '100%', height: 160 },
  statusBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { color: colors.white, fontSize: 11, fontWeight: '600' },
  cardBody: { padding: spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.ink[900] },
  cardLocation: { fontSize: 13, color: colors.ink[500], marginTop: 2 },
  cardStatsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  cardPrice: { fontSize: 15, fontWeight: '700', color: colors.coral[600] },
  cardStat: { fontSize: 13, color: colors.ink[500] },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  editBtn: { flex: 1, borderWidth: 1, borderColor: colors.coral[500], borderRadius: radius.lg, paddingVertical: spacing.sm, alignItems: 'center' },
  editBtnText: { color: colors.coral[600], fontWeight: '600', fontSize: 14 },
  deleteBtn: { flex: 1, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingVertical: spacing.sm, alignItems: 'center' },
  deleteBtnText: { color: colors.ink[500], fontWeight: '600', fontSize: 14 },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] },
  emptyIcon: { fontSize: 56, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink[900] },
  emptySub: { fontSize: 14, color: colors.ink[500], marginTop: spacing.sm, textAlign: 'center' },
  emptyBtn: { marginTop: spacing.xl, backgroundColor: colors.coral[500], borderRadius: radius.lg, paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md },
  emptyBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
