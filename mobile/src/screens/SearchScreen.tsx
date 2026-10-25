import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, TabParamList, PropertyListing } from '../types';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { fetchListings } from '../services/api';
import { ListingCard } from '../components/ListingCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { useDebounce } from '../hooks/useDebounce';
import { colors } from '../theme/colors';
import { spacing, radius, SCREEN } from '../theme/spacing';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Search'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type Route = RouteProp<TabParamList, 'Search'>;

const GENDERS = ['all', 'male', 'female', 'coed'] as const;
const BUDGETS = [
  { label: 'Any', min: '', max: '' },
  { label: '< ₹5k', min: '', max: '5000' },
  { label: '₹5k–₹10k', min: '5000', max: '10000' },
  { label: '₹10k–₹15k', min: '10000', max: '15000' },
  { label: '₹15k+', min: '15000', max: '' },
] as const;
const SORT_OPTIONS = [
  { label: 'Relevance', value: '' },
  { label: 'Price ↑', value: 'price' },
  { label: 'Price ↓', value: '-price' },
  { label: 'Rating ↓', value: '-rating' },
  { label: 'Newest', value: '-createdAt' },
] as const;

export function SearchScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();

  const [query, setQuery] = useState(route.params?.city || '');
  const [gender, setGender] = useState<string>(route.params?.gender || 'all');
  const [budgetIdx, setBudgetIdx] = useState(0);
  const [sortIdx, setSortIdx] = useState(0);
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const debouncedQuery = useDebounce(query, 400);

  // reset when route params change (e.g. from HomeScreen city tap)
  useEffect(() => {
    if (route.params?.city) setQuery(route.params.city);
    if (route.params?.gender) setGender(route.params.gender);
  }, [route.params?.city, route.params?.gender]);

  const buildParams = useCallback(() => {
    const p: Record<string, string> = { page: String(page) };
    if (debouncedQuery.trim()) p.city = debouncedQuery.trim();
    if (gender !== 'all') p.genderPreference = gender;
    const b = BUDGETS[budgetIdx];
    if (b.min) p.minPrice = b.min;
    if (b.max) p.maxPrice = b.max;
    const s = SORT_OPTIONS[sortIdx].value;
    if (s) p.sort = s;
    return p;
  }, [debouncedQuery, gender, budgetIdx, sortIdx, page]);

  const load = useCallback(async (reset = false) => {
    try {
      const params = buildParams();
      if (reset) params.page = '1';
      const data = await fetchListings(params);
      if (reset) {
        setListings(data);
        setPage(1);
      } else {
        setListings((prev) => [...prev, ...data]);
      }
      setHasMore(data.length >= 10);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildParams]);

  // reload when filter/query changes
  useEffect(() => {
    setLoading(true);
    load(true);
  }, [debouncedQuery, gender, budgetIdx, sortIdx]);

  const onRefresh = () => { setRefreshing(true); load(true); };
  const loadMore = () => {
    if (!hasMore || loading) return;
    setPage((p) => p + 1);
  };

  useEffect(() => {
    if (page > 1) load();
  }, [page]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (gender !== 'all') c++;
    if (budgetIdx > 0) c++;
    if (sortIdx > 0) c++;
    return c;
  }, [gender, budgetIdx, sortIdx]);

  const renderItem = useCallback(({ item }: { item: PropertyListing }) => (
    <View style={styles.cardWrap}>
      <ListingCard listing={item} onPress={() => nav.navigate('ListingDetail', { id: item.id })} />
    </View>
  ), [nav]);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Search city, locality..."
            placeholderTextColor={colors.ink[400]}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
          <Text style={styles.filterIcon}>⚙</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick gender chips */}
      <View style={styles.chipRow}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.chip, gender === g && styles.chipActive]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
              {g === 'all' ? 'All' : g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Co-ed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results info */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsCount}>
          {loading ? 'Searching...' : `${listings.length} PG${listings.length !== 1 ? 's' : ''} found`}
        </Text>
        <TouchableOpacity onPress={() => setFilterOpen(true)}>
          <Text style={styles.sortLabel}>
            {SORT_OPTIONS[sortIdx].label} ▾
          </Text>
        </TouchableOpacity>
      </View>

      {/* Listings */}
      {loading && listings.length === 0 ? (
        <View style={styles.skeletonGrid}>
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏠</Text>
          <Text style={styles.emptyTitle}>No PGs found</Text>
          <Text style={styles.emptySub}>Try adjusting your filters or search a different city.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => { setQuery(''); setGender('all'); setBudgetIdx(0); }}>
            <Text style={styles.emptyBtnText}>Clear filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.coral[500]} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loading ? <ActivityIndicator color={colors.coral[500]} style={{ marginVertical: spacing.lg }} /> : null}
        />
      )}

      {/* Filter Modal */}
      <Modal visible={filterOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters & Sort</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Budget */}
            <Text style={styles.filterLabel}>Budget</Text>
            <View style={styles.chipRow}>
              {BUDGETS.map((b, i) => (
                <TouchableOpacity key={b.label} style={[styles.chip, budgetIdx === i && styles.chipActive]} onPress={() => setBudgetIdx(i)}>
                  <Text style={[styles.chipText, budgetIdx === i && styles.chipTextActive]}>{b.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Gender */}
            <Text style={styles.filterLabel}>Gender Preference</Text>
            <View style={styles.chipRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity key={g} style={[styles.chip, gender === g && styles.chipActive]} onPress={() => setGender(g)}>
                  <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                    {g === 'all' ? 'All' : g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Co-ed'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort */}
            <Text style={styles.filterLabel}>Sort by</Text>
            <View style={styles.chipRow}>
              {SORT_OPTIONS.map((s, i) => (
                <TouchableOpacity key={s.value} style={[styles.chip, sortIdx === i && styles.chipActive]} onPress={() => setSortIdx(i)}>
                  <Text style={[styles.chipText, sortIdx === i && styles.chipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => { setGender('all'); setBudgetIdx(0); setSortIdx(0); }}
              >
                <Text style={styles.clearFilterText}>Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterOpen(false)}>
                <Text style={styles.applyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  searchRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.ink[50], borderRadius: radius.lg, paddingHorizontal: spacing.md,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  input: { flex: 1, fontSize: 15, paddingVertical: 12, color: colors.ink[900] },
  clearBtn: { fontSize: 16, color: colors.ink[400], padding: 4 },
  filterBtn: {
    width: 48, height: 48, borderRadius: radius.lg,
    backgroundColor: colors.ink[50], justifyContent: 'center', alignItems: 'center',
  },
  filterIcon: { fontSize: 20 },
  filterBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: colors.coral[500], borderRadius: 8,
    width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  filterBadgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm, marginTop: spacing.md },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.ink[50], borderWidth: 1, borderColor: colors.ink[100],
  },
  chipActive: { backgroundColor: colors.coral[500], borderColor: colors.coral[500] },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.ink[600] },
  chipTextActive: { color: colors.white },
  resultsBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  resultsCount: { fontSize: 13, color: colors.ink[500], fontWeight: '500' },
  sortLabel: { fontSize: 13, color: colors.coral[600], fontWeight: '600' },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.lg, gap: spacing.md },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'] },
  gridRow: { justifyContent: 'space-between' },
  cardWrap: { width: (SCREEN.width - spacing.lg * 2 - spacing.md) / 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80, paddingHorizontal: spacing.lg },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.ink[700] },
  emptySub: { fontSize: 14, color: colors.ink[400], textAlign: 'center', marginTop: spacing.sm },
  emptyBtn: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.coral[500], borderRadius: radius.lg },
  emptyBtnText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.white, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing.xl, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.ink[900] },
  modalClose: { fontSize: 20, color: colors.ink[400], padding: 4 },
  filterLabel: { fontSize: 14, fontWeight: '600', color: colors.ink[700], marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing['2xl'] },
  clearFilterBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.ink[200], alignItems: 'center' },
  clearFilterText: { fontSize: 14, fontWeight: '600', color: colors.ink[600] },
  applyBtn: { flex: 2, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.coral[500], alignItems: 'center' },
  applyText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
