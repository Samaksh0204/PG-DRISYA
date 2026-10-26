import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList, TabParamList, PropertyListing, City, SiteStats } from '../types';
import { fetchListings, fetchCities, fetchStats } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ListingCard } from '../components/ListingCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { Button, CountBadge, ErrorText, Icon, IconTile, SectionHeader, type IconName } from '../components/ui';
import { colors } from '../theme/colors';
import { spacing, radius, shadow, SCREEN } from '../theme/spacing';

type Nav = CompositeNavigationProp<BottomTabNavigationProp<TabParamList, 'Home'>, NativeStackNavigationProp<RootStackParamList>>;

const TRUST: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'people-outline', title: 'No brokerage', desc: 'Talk to owners directly. Drisya never charges tenants a commission.' },
  { icon: 'shield-checkmark-outline', title: 'Reviewed listings', desc: 'Every new listing is checked by our team before it goes live.' },
  { icon: 'star-outline', title: 'Real reviews only', desc: 'Only tenants who visited or stayed can leave a review.' },
  { icon: 'cash-outline', title: 'Clear pricing', desc: 'Rent and deposit upfront. Pay the owner at move-in.' },
];

const STEPS: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'search-outline', title: 'Search', desc: 'Filter by city, budget, gender, room type and amenities.' },
  { icon: 'chatbubbles-outline', title: 'Message & visit', desc: 'Ask the owner questions and book a visit slot that suits you.' },
  { icon: 'calendar-outline', title: 'Request to book', desc: 'Pick your move-in date. Instant Book PGs confirm right away.' },
  { icon: 'key-outline', title: 'Move in & review', desc: 'Pay the owner at move-in under a written agreement, then review.' },
];

const SAFETY = [
  'Always visit the PG before paying anything.',
  'Pay rent and deposit only against a written agreement and receipt.',
  'Never share OTPs or bank passwords — Drisya will never ask for them.',
  'Report fake listings or suspicious requests from any listing or chat.',
];

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user, unreadNotifications } = useAuth();
  const [featured, setFeatured] = useState<PropertyListing[]>([]);
  const [trending, setTrending] = useState<PropertyListing[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');

  const loadData = useCallback(async () => {
    setError('');
    try {
      const [feat, trend, cityData, s] = await Promise.all([
        fetchListings({ featured: 'true', limit: '6' }),
        fetchListings({ sort: 'views', limit: '6' }),
        fetchCities(),
        fetchStats().catch(() => null),
      ]);
      setFeatured(feat);
      setTrending(trend);
      setCities(cityData);
      setStats(s);
    } catch (e: any) {
      setError(e.message || 'Could not load listings right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = () => nav.navigate('Search', searchText.trim() ? { q: searchText.trim() } : {});
  const open = (id: string) => nav.navigate('ListingDetail', { id });
  const goLogin = () => nav.navigate('Login');

  const statItems = stats && stats.activeListings > 0
    ? [
        { value: String(stats.activeListings), label: 'PGs listed' },
        { value: String(stats.cities), label: stats.cities === 1 ? 'City' : 'Cities' },
        { value: String(stats.verifiedListings), label: 'Verified' },
        ...(stats.reviews >= 5 ? [{ value: `${stats.avgRating}★`, label: `${stats.reviews} reviews` }] : []),
      ]
    : [];

  const rail = (data: PropertyListing[]) => (
    <FlatList
      data={data}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: spacing.lg }}
      ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
      renderItem={({ item }) => (
        <View style={{ width: SCREEN.width * 0.72 }}>
          <ListingCard listing={item} wide onPress={() => open(item.id)} onRequireLogin={goLogin} />
        </View>
      )}
    />
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
    >
      {/* Hero — white with soft teal shapes, like the website */}
      <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.blobA} />
        <View style={styles.blobB} />
        <View style={styles.topBar}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}><Icon name="shield-checkmark" size={16} color={colors.brand[400]} /></View>
            <Text style={styles.logoText}>PG Drisya</Text>
          </View>
          {user ? (
            <TouchableOpacity accessibilityLabel="Notifications" onPress={() => nav.navigate('Notifications')} style={styles.bell}>
              <Icon name="notifications-outline" size={22} color={colors.ink[900]} />
              {unreadNotifications > 0 && <View style={styles.bellDot} />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={goLogin} style={styles.signIn} accessibilityRole="button">
              <Text style={styles.signInText}>Sign in</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.heroBadge}>
          <Icon name="shield-checkmark" size={13} color={colors.brand[700]} />
          <Text style={styles.heroBadgeText}>No brokerage · Listings reviewed by our team</Text>
        </View>
        <Text style={styles.heroTitle}>
          Find your <Text style={{ color: colors.brand[600] }}>home away from home</Text>
        </Text>
        <Text style={styles.heroSub}>
          Comfortable PGs and hostels for students and working professionals. Message owners directly, visit before you pay, and book with confidence.
        </Text>

        <View style={[styles.searchBar, shadow.card]}>
          <Icon name="search-outline" size={20} color={colors.ink[400]} style={{ marginLeft: spacing.md }} />
          <TextInput
            style={styles.searchInput}
            placeholder="City, area or PG name"
            placeholderTextColor={colors.ink[400]}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            accessibilityLabel="Search PGs"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} accessibilityRole="button" accessibilityLabel="Search">
            <Icon name="arrow-forward" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.quickRow}>
          {([['Men', 'male'], ['Women', 'female'], ['Co-ed', 'coed']] as const).map(([label, g]) => (
            <TouchableOpacity key={g} style={styles.quickChip} onPress={() => nav.navigate('Search', { gender: g })}>
              <Text style={styles.quickChipText}>{label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.quickChip} onPress={() => nav.navigate('Search', { maxPrice: '8000' })}>
            <Text style={styles.quickChipText}>Under ₹8k</Text>
          </TouchableOpacity>
        </View>

        {statItems.length > 0 && (
          <View style={styles.stats}>
            {statItems.map((st) => (
              <View key={st.label} style={[styles.stat, shadow.soft]}>
                <Text style={styles.statVal}>{st.value}</Text>
                <Text style={styles.statLbl}>{st.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Trust */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trustRow}>
        {TRUST.map((t) => (
          <View key={t.title} style={[styles.trustCard, shadow.soft]}>
            <IconTile name={t.icon} />
            <Text style={styles.trustTitle}>{t.title}</Text>
            <Text style={styles.trustDesc}>{t.desc}</Text>
          </View>
        ))}
      </ScrollView>

      {error ? <View style={{ paddingHorizontal: spacing.lg }}><ErrorText>{error}</ErrorText></View> : null}

      {/* Featured */}
      <View style={styles.section}>
        <SectionHeader eyebrow="Featured" icon="star" title="Handpicked PGs" action="View all" onAction={() => nav.navigate('Search', { featured: true })} />
        {loading ? (
          <View style={styles.skeletonRow}><SkeletonCard wide /></View>
        ) : featured.length ? rail(featured) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Listings are coming soon in your city.</Text>
            <Button title="Browse all PGs" onPress={() => nav.navigate('Search', {})} style={{ marginTop: spacing.md }} />
          </View>
        )}
      </View>

      {/* Most viewed */}
      {trending.length > 0 && (
        <View style={[styles.section, styles.band]}>
          <SectionHeader eyebrow="Popular" icon="trending-up" title="Most viewed" action="Explore" onAction={() => nav.navigate('Search', { sort: 'views' })} />
          {rail(trending)}
        </View>
      )}

      {/* Cities */}
      {cities.length > 0 && (
        <View style={styles.section}>
          <SectionHeader eyebrow="Explore" icon="location" title="Cities on Drisya" />
          <FlatList
            data={cities}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.name}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.cityCard, shadow.card]} activeOpacity={0.85} onPress={() => nav.navigate('Search', { city: item.name })} accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.listingCount} PGs`}>
                <View style={styles.cityAccent} />
                <Text style={styles.cityInitials}>{item.name.slice(0, 2).toUpperCase()}</Text>
                <Icon name="location" size={20} color={colors.brand[300]} />
                <View style={{ marginTop: 'auto' }}>
                  <Text style={styles.cityName}>{item.name}</Text>
                  <Text style={styles.cityCount}>{item.listingCount} PG{item.listingCount === 1 ? '' : 's'}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* How it works */}
      <View style={[styles.section, styles.band]}>
        <Text style={[styles.centerTitle]}>How Drisya works</Text>
        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={s.title} style={styles.step}>
              <IconTile name={s.icon} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.stepNum}>0{i + 1}</Text>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Safety + host CTA */}
      <View style={styles.safety}>
        <Text style={styles.safetyTitle}>Stay safe while you search</Text>
        {SAFETY.map((t) => (
          <View key={t} style={styles.safetyRow}>
            <Icon name="shield-checkmark" size={16} color={colors.brand[600]} />
            <Text style={styles.safetyText}>{t}</Text>
          </View>
        ))}
        <Button variant="outline" icon="flag-outline" title="Trust & Safety" onPress={() => nav.navigate('Info', { page: 'trust' })} style={{ marginTop: spacing.md }} />
      </View>

      <View style={styles.hostCta}>
        <Text style={styles.hostTitle}>Own a PG or hostel?</Text>
        <Text style={styles.hostSub}>List it free, get booking requests from tenants with confirmed emails, and manage visits in one place.</Text>
        <Button
          title="List your PG"
          icon="add-circle-outline"
          onPress={() => (user ? nav.navigate(user.role === 'owner' || user.role === 'admin' ? 'HostDashboard' : 'Profile') : nav.navigate('Register'))}
          style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
        />
      </View>

      <TouchableOpacity style={styles.expert} onPress={() => nav.navigate('Expert')} activeOpacity={0.85}>
        <IconTile name="headset-outline" />
        <View style={{ flex: 1 }}>
          <Text style={styles.expertTitle}>Short on time? Ask a Drisya Expert</Text>
          <Text style={styles.expertSub}>Free shortlist of PGs, usually within a working day.</Text>
        </View>
        <Icon name="chevron-forward" size={18} color={colors.ink[400]} />
      </TouchableOpacity>

      <View style={{ height: spacing['3xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  hero: { backgroundColor: colors.white, paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'], overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: colors.ink[200] },
  blobA: { position: 'absolute', right: -120, top: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: colors.brand[50] },
  blobB: { position: 'absolute', left: -90, bottom: -120, width: 220, height: 220, borderRadius: 110, backgroundColor: colors.ink[50] },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMark: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.ink[900], alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 18, fontWeight: '800', color: colors.ink[900] },
  bell: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200] },
  bellDot: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.brand[500], borderWidth: 1.5, borderColor: colors.white },
  signIn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.ink[200], backgroundColor: colors.white },
  signInText: { fontSize: 14, fontWeight: '700', color: colors.ink[900] },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.brand[200], backgroundColor: colors.brand[50], borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, marginBottom: spacing.md },
  heroBadgeText: { fontSize: 12, fontWeight: '600', color: colors.brand[800] },
  heroTitle: { color: colors.ink[900], fontSize: 31, fontWeight: '800', lineHeight: 38, letterSpacing: -0.5 },
  heroSub: { color: colors.ink[600], fontSize: 15, lineHeight: 22, marginTop: spacing.md },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.ink[200], marginTop: spacing.xl, padding: 5 },
  searchInput: { flex: 1, paddingHorizontal: spacing.sm, paddingVertical: 10, fontSize: 15, color: colors.ink[900] },
  searchBtn: { backgroundColor: colors.brand[500], width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  quickChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.md, borderWidth: 1, borderColor: colors.ink[200], backgroundColor: colors.white },
  quickChipText: { fontSize: 13, fontWeight: '600', color: colors.ink[700] },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  stat: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', color: colors.ink[900] },
  statLbl: { fontSize: 11, color: colors.ink[500], marginTop: 2, textAlign: 'center' },
  trustRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.md },
  trustCard: { width: 210, backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.ink[200], padding: spacing.lg },
  trustTitle: { fontSize: 15, fontWeight: '700', color: colors.ink[900], marginTop: spacing.md },
  trustDesc: { fontSize: 13, color: colors.ink[600], marginTop: 4, lineHeight: 19 },
  section: { marginTop: spacing['2xl'] },
  band: { backgroundColor: colors.white, paddingVertical: spacing['2xl'], borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.ink[200] },
  skeletonRow: { paddingHorizontal: spacing.lg },
  emptyBox: { marginHorizontal: spacing.lg, padding: spacing.xl, borderRadius: radius.xl, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.ink[300], alignItems: 'center', backgroundColor: colors.white },
  emptyText: { color: colors.ink[600], fontSize: 14, textAlign: 'center' },
  cityCard: { width: 150, height: 120, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.ink[900], padding: spacing.md },
  cityAccent: { position: 'absolute', right: -40, bottom: -50, width: 130, height: 130, borderRadius: 65, backgroundColor: colors.brand[700], opacity: 0.55 },
  cityInitials: { position: 'absolute', right: 8, top: 4, fontSize: 52, fontWeight: '800', color: 'rgba(255,255,255,0.08)' },
  cityName: { color: colors.white, fontSize: 16, fontWeight: '700' },
  cityCount: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  centerTitle: { fontSize: 20, fontWeight: '800', color: colors.ink[900], textAlign: 'center' },
  steps: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNum: { fontSize: 11, fontWeight: '800', color: colors.brand[500], letterSpacing: 2 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: colors.ink[900], marginTop: 2 },
  stepDesc: { fontSize: 13, color: colors.ink[600], marginTop: 2, lineHeight: 19 },
  safety: { margin: spacing.lg, marginTop: spacing['2xl'], backgroundColor: colors.brand[50], borderWidth: 1, borderColor: colors.brand[100], borderRadius: radius['2xl'], padding: spacing.xl },
  safetyTitle: { fontSize: 19, fontWeight: '800', color: colors.ink[900], marginBottom: spacing.md },
  safetyRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  safetyText: { flex: 1, fontSize: 14, color: colors.ink[700], lineHeight: 20 },
  hostCta: { marginHorizontal: spacing.lg, backgroundColor: colors.ink[900], borderRadius: radius['2xl'], padding: spacing.xl, alignItems: 'center' },
  hostTitle: { color: colors.white, fontSize: 21, fontWeight: '800', textAlign: 'center' },
  hostSub: { color: colors.ink[300], fontSize: 14, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  expert: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, margin: spacing.lg, padding: spacing.lg, backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.ink[200] },
  expertTitle: { fontSize: 15, fontWeight: '700', color: colors.ink[900] },
  expertSub: { fontSize: 12, color: colors.ink[500], marginTop: 2 },
});
