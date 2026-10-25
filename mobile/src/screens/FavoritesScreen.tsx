import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, FavoriteItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchFavorites, toggleFavorite } from '../services/api';
import { colors } from '../theme/colors';
import { spacing, radius, shadow } from '../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function FavoritesScreen() {
  const nav = useNavigation<Nav>();
  const { user, refreshFavorites, toggleFavLocal } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const data = await fetchFavorites();
      setFavorites(data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRemove = async (fav: FavoriteItem) => {
    const propId = typeof fav.propertyId === 'object' ? (fav.propertyId as any)._id || (fav.propertyId as any).id : fav.propertyId;
    try {
      await toggleFavorite(propId);
      toggleFavLocal(propId, false);
      setFavorites((prev) => prev.filter((f) => f._id !== fav._id));
    } catch {}
  };

  if (!user) {
    return (
      <View style={styles.guestWrap}>
        <Text style={styles.guestIcon}>❤️</Text>
        <Text style={styles.guestTitle}>Sign in to save favorites</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => nav.navigate('Login')}>
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.coral[500]} /></View>;
  }

  const renderItem = ({ item }: { item: FavoriteItem }) => {
    const p = item.propertyId as any;
    if (!p || !p.title) return null;
    return (
      <TouchableOpacity
        style={[styles.card, shadow.card]}
        onPress={() => nav.navigate('ListingDetail', { id: p._id || p.id })}
        activeOpacity={0.85}
      >
        <Image source={{ uri: p.photos?.[0] || 'https://via.placeholder.com/400x200' }} style={styles.cardImage} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{p.title}</Text>
          <Text style={styles.cardLoc}>{p.locality ? `${p.locality}, ` : ''}{p.city}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>₹{p.price?.toLocaleString('en-IN')}/mo</Text>
            <TouchableOpacity onPress={() => handleRemove(item)}>
              <Text style={styles.removeText}>Remove ♥</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {favorites.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>💔</Text>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptySub}>Tap the heart on any listing to save it here.</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.coral[500]} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink[50] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  guestWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white, padding: spacing['2xl'] },
  guestIcon: { fontSize: 56, marginBottom: spacing.lg },
  guestTitle: { fontSize: 18, fontWeight: '600', color: colors.ink[700], marginBottom: spacing.xl },
  signInBtn: { backgroundColor: colors.coral[500], borderRadius: radius.lg, paddingHorizontal: spacing['3xl'], paddingVertical: spacing.md },
  signInBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },

  card: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden' },
  cardImage: { width: '100%', height: 140 },
  cardBody: { padding: spacing.lg },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink[900] },
  cardLoc: { fontSize: 13, color: colors.ink[500], marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  cardPrice: { fontSize: 16, fontWeight: '700', color: colors.coral[600] },
  removeText: { fontSize: 13, color: colors.red[500], fontWeight: '600' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] },
  emptyIcon: { fontSize: 56, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink[900] },
  emptySub: { fontSize: 14, color: colors.ink[500], marginTop: spacing.sm, textAlign: 'center' },
});
