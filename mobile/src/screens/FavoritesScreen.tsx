import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text } from 'react-native';
import { useNavigation, useFocusEffect, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, TabParamList, PropertyListing } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchFavoriteListings } from '../services/api';
import { ListingCard } from '../components/ListingCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { Button, Empty, ErrorText } from '../components/ui';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { pluralize } from '../utils/format';

type Nav = CompositeNavigationProp<BottomTabNavigationProp<TabParamList, 'Favorites'>, NativeStackNavigationProp<RootStackParamList>>;

export function FavoritesScreen() {
  const nav = useNavigation<Nav>();
  const { user, favoriteIds } = useAuth();
  const [favorites, setFavorites] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      setFavorites(await fetchFavoriteListings());
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Un-hearting a card removes it straight away.
  const shown = useMemo(() => favorites.filter((f) => favoriteIds.has(f.id)), [favorites, favoriteIds]);

  if (!user) {
    return (
      <View style={styles.center}>
        <Empty icon="heart-outline" title="Save PGs you like" desc="Sign in to keep a wishlist and compare places later.">
          <Button title="Sign in" onPress={() => nav.navigate('Login')} />
        </Empty>
      </View>
    );
  }

  if (loading) return <View style={styles.skeletons}><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;

  return (
    <FlatList
      style={styles.container}
      data={shown}
      numColumns={2}
      keyExtractor={(item) => item.id}
      columnWrapperStyle={{ justifyContent: 'space-between' }}
      contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
      ListHeaderComponent={
        <>
          {error ? <ErrorText>{error}</ErrorText> : null}
          {shown.length > 0 && <Text style={styles.count}>{pluralize(shown.length, 'saved PG')}</Text>}
        </>
      }
      renderItem={({ item }) => <ListingCard listing={item} onPress={() => nav.navigate('ListingDetail', { id: item.id })} />}
      ListEmptyComponent={
        <Empty icon="heart-outline" title="No saved PGs yet" desc="Tap the heart on any listing to save it here.">
          <Button title="Find a PG" onPress={() => nav.navigate('Search', {})} />
        </Empty>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  center: { flex: 1, justifyContent: 'center', backgroundColor: colors.page, padding: spacing.lg },
  skeletons: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: colors.page },
  count: { fontSize: 14, fontWeight: '700', color: colors.ink[700], marginBottom: spacing.md },
});
