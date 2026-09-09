import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, TextInput,
  StyleSheet, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList, PropertyListing, City } from '../types';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { fetchListings, fetchCities } from '../services/api';
import { ListingCard } from '../components/ListingCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { colors } from '../theme/colors';
import { spacing, radius, shadow, SCREEN } from '../theme/spacing';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const [featured, setFeatured] = useState<PropertyListing[]>([]);
  const [trending, setTrending] = useState<PropertyListing[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [feat, trend, cityData] = await Promise.all([
        fetchListings({ featured: 'true' }),
        fetchListings({ sort: 'views' }),
        fetchCities(),
      ]);
      setFeatured(feat.slice(0, 6));
      setTrending(trend.slice(0, 6));
      setCities(cityData);
    } catch (err) {
      console.error('Home load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleSearch = () => {
    if (searchText.trim()) {
      nav.navigate('Search', { city: searchText.trim() });
    } else {
      nav.navigate('Search', {});
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.coral[500]} />}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTag}>India's trusted PG platform</Text>
        <Text style={styles.heroTitle}>
          Find your{' '}
          <Text style={{ color: colors.coral[400] }}>Home Away{'\n'}From Home</Text>
        </Text>
        <Text style={styles.heroSub}>
          Verified listings, virtual tours, and instant bookings.
        </Text>

        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by city..."
            placeholderTextColor={colors.ink[400]}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        {[
          { val: '10+', lbl: 'Verified PGs' },
          { val: '20+', lbl: 'Happy Tenants' },
          { val: '4', lbl: 'Cities' },
          { val: '4.9', lbl: 'Avg Rating' },
        ].map(({ val, lbl }) => (
          <View key={lbl} style={styles.stat}>
            <Text style={styles.statVal}>{val}</Text>
            <Text style={styles.statLbl}>{lbl}</Text>
          </View>
        ))}
      </View>

      {/* Featured */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTag}>★ Featured</Text>
            <Text style={styles.sectionTitle}>Handpicked PGs for you</Text>
          </View>
          <TouchableOpacity onPress={() => nav.navigate('Search', {})}>
            <Text style={styles.viewAll}>View all →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.listRow}><SkeletonCard /><SkeletonCard /></View>
        ) : (
          <FlatList
            data={featured}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN.width * 0.65 }}>
                <ListingCard listing={item} wide onPress={() => nav.navigate('ListingDetail', { id: item.id })} />
              </View>
            )}
          />
        )}
      </View>

      {/* Popular Cities */}
      {cities.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTag}>📍 Explore</Text>
              <Text style={styles.sectionTitle}>Popular cities</Text>
            </View>
          </View>
          <FlatList
            data={cities}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.name}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.cityCard} activeOpacity={0.8} onPress={() => nav.navigate('Search', { city: item.name })}>
                <View style={styles.cityGradient}>
                  <Text style={styles.cityName}>{item.name}</Text>
                  <Text style={styles.cityCount}>{item.listingCount} PGs</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Trending */}
      <View style={[styles.section, { backgroundColor: colors.ink[50], paddingVertical: spacing['2xl'] }]}>
        <View style={[styles.sectionHeader, { paddingHorizontal: spacing.lg }]}>
          <View>
            <Text style={styles.sectionTag}>🔥 Trending</Text>
            <Text style={styles.sectionTitle}>Most viewed this week</Text>
          </View>
        </View>
        {!loading && (
          <FlatList
            data={trending}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN.width * 0.65 }}>
                <ListingCard listing={item} wide onPress={() => nav.navigate('ListingDetail', { id: item.id })} />
              </View>
            )}
          />
        )}
      </View>

      {/* How It Works */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: 'center', paddingHorizontal: spacing.lg }]}>How Drisya works</Text>
        <View style={styles.stepsRow}>
          {[
            { step: '01', icon: '🔍', title: 'Search & Filter', desc: 'Browse verified PGs by city, budget, gender.' },
            { step: '02', icon: '💬', title: 'Connect & Visit', desc: 'Chat with owners or take virtual tours.' },
            { step: '03', icon: '📅', title: 'Book & Move In', desc: 'Book online and move in instantly.' },
          ].map(({ step, icon, title, desc }) => (
            <View key={step} style={styles.stepCard}>
              <Text style={styles.stepIcon}>{icon}</Text>
              <Text style={styles.stepNum}>{step}</Text>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepDesc}>{desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA */}
      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>Ready to find your new home?</Text>
        <Text style={styles.ctaSub}>Join 50+ tenants who found their perfect PG through Drisya.</Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => nav.navigate('Search', {})}>
          <Text style={styles.ctaBtnText}>Browse PGs</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: spacing['3xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  hero: { backgroundColor: colors.ink[900], paddingTop: 60, paddingBottom: spacing['3xl'], paddingHorizontal: spacing.lg },
  heroTag: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500', marginBottom: spacing.sm },
  heroTitle: { color: colors.white, fontSize: 30, fontWeight: '800', lineHeight: 38, marginBottom: spacing.md },
  heroSub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 20, marginBottom: spacing.xl },
  searchBar: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden' },
  searchInput: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: 14, fontSize: 15, color: colors.ink[900] },
  searchBtn: { backgroundColor: colors.coral[500], paddingHorizontal: spacing.xl, justifyContent: 'center' },
  searchBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  statsBar: { flexDirection: 'row', backgroundColor: colors.coral[500], paddingVertical: spacing.lg, justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statVal: { color: colors.white, fontSize: 22, fontWeight: '800' },
  statLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  section: { marginTop: spacing['2xl'] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionTag: { fontSize: 12, fontWeight: '700', color: colors.coral[600], marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.ink[900] },
  viewAll: { fontSize: 13, fontWeight: '600', color: colors.coral[600] },
  listRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md },
  cityCard: { width: 140, height: 100, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.coral[100] },
  cityGradient: { flex: 1, justifyContent: 'flex-end', padding: spacing.md, backgroundColor: colors.ink[800] },
  cityName: { color: colors.white, fontSize: 16, fontWeight: '700' },
  cityCount: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  stepsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: spacing.lg },
  stepCard: { flex: 1, alignItems: 'center' },
  stepIcon: { fontSize: 28, marginBottom: spacing.sm },
  stepNum: { fontSize: 10, fontWeight: '800', color: colors.coral[500], letterSpacing: 2 },
  stepTitle: { fontSize: 13, fontWeight: '700', color: colors.ink[900], marginTop: 4, textAlign: 'center' },
  stepDesc: { fontSize: 11, color: colors.ink[500], textAlign: 'center', marginTop: 4, lineHeight: 16 },
  cta: { margin: spacing.lg, backgroundColor: colors.coral[500], borderRadius: radius['2xl'], padding: spacing['2xl'], alignItems: 'center' },
  ctaTitle: { color: colors.white, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  ctaSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
  ctaBtn: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md, marginTop: spacing.lg },
  ctaBtnText: { color: colors.coral[600], fontWeight: '700', fontSize: 14 },
});
