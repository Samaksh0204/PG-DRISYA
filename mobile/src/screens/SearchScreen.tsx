import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Modal, ScrollView, Switch } from 'react-native';
import { useNavigation, useRoute, type CompositeNavigationProp, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, TabParamList, PropertyListing } from '../types';
import { searchListings } from '../services/api';
import { ListingCard } from '../components/ListingCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { Button, Chip, Empty, ErrorText, Icon } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import { AMENITIES } from '../data/amenities';
import { colors } from '../theme/colors';
import { spacing, radius, SCREEN } from '../theme/spacing';

type Nav = CompositeNavigationProp<BottomTabNavigationProp<TabParamList, 'Search'>, NativeStackNavigationProp<RootStackParamList>>;
type Route = RouteProp<TabParamList, 'Search'>;

// Same values the website sends to GET /api/properties.
const SORT_OPTIONS = [
  { value: '', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'views', label: 'Most viewed' },
];
const GENDERS: [string, string][] = [['', 'Anyone'], ['male', 'Men'], ['female', 'Women'], ['coed', 'Co-ed']];
const OCCUPANCY: [string, string][] = [['', 'Any'], ['single', 'Single'], ['double', 'Double'], ['triple', 'Triple'], ['dorm', 'Dorm']];
const BUDGETS: [string, string, string][] = [['Any', '', ''], ['< ₹5k', '', '5000'], ['₹5k–10k', '5000', '10000'], ['₹10k–15k', '10000', '15000'], ['₹15k+', '15000', '']];
const PAGE_SIZE = 20;

interface Filters {
  city: string;
  gender: string;
  occupancy: string;
  minPrice: string;
  maxPrice: string;
  amenities: string[];
  verified: boolean;
  instantBook: boolean;
  featured: boolean;
  sort: string;
}
const EMPTY: Filters = { city: '', gender: '', occupancy: '', minPrice: '', maxPrice: '', amenities: [], verified: false, instantBook: false, featured: false, sort: '' };

export function SearchScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();

  const [query, setQuery] = useState('');
  const [f, setF] = useState<Filters>(EMPTY);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const reqId = useRef(0);

  const dq = useDebounce(query, 350);

  // Links from the home screen (city tiles, quick chips, "view all").
  useEffect(() => {
    const p = route.params;
    if (!p) return;
    setQuery(p.q || '');
    setF({ ...EMPTY, city: p.city || '', gender: p.gender || '', sort: p.sort || '', featured: !!p.featured, verified: !!p.verified, instantBook: !!p.instantBook, maxPrice: p.maxPrice || '' });
  }, [route.params]);

  const params = useCallback((pg: number) => ({
    search: dq.trim() || undefined,
    city: f.city || undefined,
    gender: f.gender || undefined,
    occupancy: f.occupancy || undefined,
    minPrice: f.minPrice || undefined,
    maxPrice: f.maxPrice || undefined,
    amenities: f.amenities.length ? f.amenities.join(',') : undefined,
    verified: f.verified ? 'true' : undefined,
    instantBook: f.instantBook ? 'true' : undefined,
    featured: f.featured ? 'true' : undefined,
    sort: f.sort || undefined,
    page: pg,
    limit: PAGE_SIZE,
  }), [dq, f]);

  const load = useCallback(async (pg: number) => {
    const id = ++reqId.current;
    setError('');
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await searchListings(params(pg));
      if (id !== reqId.current) return; // a newer search started
      setListings((prev) => (pg === 1 ? res.listings : [...prev, ...res.listings.filter((l) => !prev.some((p) => p.id === l.id))]));
      setTotal(res.total);
      setPage(res.page);
      setPages(res.pages);
    } catch (e: any) {
      if (id === reqId.current) setError(e.message);
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [params]);

  useEffect(() => { load(1); }, [load]);

  const loadMore = () => {
    if (loading || loadingMore || page >= pages) return;
    load(page + 1);
  };

  const activeCount = [f.city, f.gender, f.occupancy, f.minPrice || f.maxPrice, f.verified, f.instantBook, f.featured, ...f.amenities].filter(Boolean).length;
  const budgetIdx = BUDGETS.findIndex(([, min, max]) => min === draft.minPrice && max === draft.maxPrice);
  const sortLabel = SORT_OPTIONS.find((s) => s.value === f.sort)?.label || 'Recommended';
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));
  const setD = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((x) => ({ ...x, [k]: v }));

  const openFilters = () => { setDraft(f); setFilterOpen(true); };
  const clearAll = () => { setQuery(''); setF(EMPTY); };

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View style={styles.searchRow}>
          <View style={styles.inputWrap}>
            <Icon name="search-outline" size={18} color={colors.ink[400]} />
            <TextInput
              style={styles.input}
              placeholder="City, area or PG name"
              placeholderTextColor={colors.ink[400]}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              accessibilityLabel="Search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={8}>
                <Icon name="close-circle" size={18} color={colors.ink[300]} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]} onPress={openFilters} accessibilityLabel="Filters">
            <Icon name="options-outline" size={20} color={activeCount > 0 ? colors.brand[700] : colors.ink[900]} />
            {activeCount > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeCount}</Text></View>}
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {GENDERS.slice(1).map(([v, l]) => <Chip key={v} label={l} active={f.gender === v} onPress={() => set('gender', f.gender === v ? '' : v)} />)}
          <Chip label="Verified" icon="shield-checkmark-outline" active={f.verified} onPress={() => set('verified', !f.verified)} />
          <Chip label="Instant Book" icon="flash-outline" active={f.instantBook} onPress={() => set('instantBook', !f.instantBook)} />
          <Chip label="Meals" icon="restaurant-outline" active={f.amenities.includes('mess')} onPress={() => set('amenities', f.amenities.includes('mess') ? f.amenities.filter((a) => a !== 'mess') : [...f.amenities, 'mess'])} />
        </ScrollView>
      </View>

      <View style={styles.resultsBar}>
        <Text style={styles.resultsCount}>
          {loading ? 'Searching…' : `${total} PG${total !== 1 ? 's' : ''}${f.city ? ` in ${f.city}` : ''}`}
        </Text>
        <TouchableOpacity onPress={openFilters} style={styles.sortBtn} accessibilityLabel="Sort">
          <Icon name="swap-vertical" size={14} color={colors.brand[700]} />
          <Text style={styles.sortLabel}>{sortLabel}</Text>
        </TouchableOpacity>
      </View>

      {error ? <View style={{ paddingHorizontal: spacing.lg }}><ErrorText>{error}</ErrorText></View> : null}

      {loading && listings.length === 0 ? (
        <View style={styles.skeletonGrid}><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList
          data={listings}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListingCard listing={item} onPress={() => nav.navigate('ListingDetail', { id: item.id })} onRequireLogin={() => nav.navigate('Login')} />}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={loading ? undefined : (
            <Empty icon="search-outline" title="No PGs match" desc="Try a different area, widen your budget or remove some filters.">
              <Button variant="outline" title="Clear all filters" onPress={clearAll} />
            </Empty>
          )}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.brand[500]} style={{ marginVertical: spacing.lg }} /> : undefined}
        />
      )}

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)} accessibilityLabel="Close filters" hitSlop={8}>
                <Icon name="close" size={24} color={colors.ink[500]} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: SCREEN.height * 0.62 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.filterLabel}>Sort by</Text>
              <View style={styles.wrap}>{SORT_OPTIONS.map((s) => <Chip key={s.value} label={s.label} active={draft.sort === s.value} onPress={() => setD('sort', s.value)} />)}</View>

              <Text style={styles.filterLabel}>City</Text>
              <TextInput style={styles.cityInput} value={draft.city} onChangeText={(v) => setD('city', v)} placeholder="Any city" placeholderTextColor={colors.ink[400]} accessibilityLabel="City" />

              <Text style={styles.filterLabel}>Monthly budget</Text>
              <View style={styles.wrap}>{BUDGETS.map(([l, min, max], i) => <Chip key={l} label={l} active={budgetIdx === i} onPress={() => setDraft((x) => ({ ...x, minPrice: min, maxPrice: max }))} />)}</View>

              <Text style={styles.filterLabel}>Who can stay</Text>
              <View style={styles.wrap}>{GENDERS.map(([v, l]) => <Chip key={v} label={l} active={draft.gender === v} onPress={() => setD('gender', v)} />)}</View>

              <Text style={styles.filterLabel}>Room type</Text>
              <View style={styles.wrap}>{OCCUPANCY.map(([v, l]) => <Chip key={v} label={l} active={draft.occupancy === v} onPress={() => setD('occupancy', v)} />)}</View>

              <Text style={styles.filterLabel}>Amenities</Text>
              <View style={styles.wrap}>
                {AMENITIES.map((a) => (
                  <Chip key={a.key} label={a.label} icon={a.icon} active={draft.amenities.includes(a.key)}
                    onPress={() => setD('amenities', draft.amenities.includes(a.key) ? draft.amenities.filter((k) => k !== a.key) : [...draft.amenities, a.key])} />
                ))}
              </View>

              {([['verified', 'Drisya Verified only', 'Inspected in person by our team'], ['instantBook', 'Instant Book', 'Confirmed without waiting for the owner'], ['featured', 'Featured', 'Handpicked by our team']] as const).map(([k, l, d]) => (
                <View key={k} style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>{l}</Text>
                    <Text style={styles.switchDesc}>{d}</Text>
                  </View>
                  <Switch value={draft[k]} onValueChange={(v) => setD(k, v)} trackColor={{ true: colors.brand[500], false: colors.ink[200] }} thumbColor={colors.white} accessibilityLabel={l} />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Button variant="outline" title="Clear all" onPress={() => setDraft(EMPTY)} style={{ flex: 1 }} />
              <Button title="Show results" onPress={() => { setF(draft); setFilterOpen(false); }} style={{ flex: 2 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  top: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.ink[200], paddingTop: spacing.md },
  searchRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingHorizontal: spacing.md },
  input: { flex: 1, fontSize: 15, paddingVertical: 11, color: colors.ink[900] },
  filterBtn: { width: 46, height: 46, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.ink[200], justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
  filterBtnActive: { borderColor: colors.brand[500], backgroundColor: colors.brand[50] },
  filterBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: colors.brand[500], borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  quickRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 4 },
  resultsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  resultsCount: { fontSize: 14, color: colors.ink[700], fontWeight: '700' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortLabel: { fontSize: 13, color: colors.brand[700], fontWeight: '700' },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: spacing['3xl'], flexGrow: 1 },
  gridRow: { justifyContent: 'space-between' },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.white, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing.xl, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  modalTitle: { fontSize: 19, fontWeight: '800', color: colors.ink[900] },
  filterLabel: { fontSize: 14, fontWeight: '700', color: colors.ink[900], marginTop: spacing.lg, marginBottom: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  cityInput: { borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.ink[900] },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.ink[200] },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.ink[900] },
  switchDesc: { fontSize: 12, color: colors.ink[500], marginTop: 1 },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
