import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet,
  Dimensions, FlatList, Linking, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, PropertyListing, Owner, Review } from '../types';
import { fetchListingDetail, toggleFavorite } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AMENITY_MAP } from '../data/amenities';
import { colors } from '../theme/colors';
import { spacing, radius, shadow, SCREEN } from '../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ListingDetail'>;
type Route = RouteProp<RootStackParamList, 'ListingDetail'>;

const IMAGE_H = SCREEN.width * 0.65;

const genderLabel: Record<string, string> = { male: 'Male', female: 'Female', coed: 'Co-ed' };
const occupancyLabel: Record<string, string> = { single: 'Single', double: 'Double', triple: 'Triple', dorm: 'Dorm' };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function ListingDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user, favoriteIds, toggleFavLocal } = useAuth();

  const [property, setProperty] = useState<PropertyListing | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [toggling, setToggling] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const data = await fetchListingDetail(route.params.id);
      if (data) {
        setProperty(data.property);
        setOwner(data.owner);
        setReviews(data.reviews);
      }
      setLoading(false);
    })();
  }, [route.params.id]);

  const handleHeart = useCallback(async () => {
    if (!user || !property || toggling) return;
    setToggling(true);
    try {
      const { saved } = await toggleFavorite(property.id);
      toggleFavLocal(property.id, saved);
    } catch {} finally {
      setToggling(false);
    }
  }, [user, property, toggling, toggleFavLocal]);

  const handleCall = () => {
    if (owner?.phone) Linking.openURL(`tel:${owner.phone}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.coral[500]} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 40 }}>🏚️</Text>
        <Text style={styles.errorTitle}>Listing not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFav = favoriteIds.has(property.id);
  const photos = property.photos.length > 0 ? property.photos : ['https://via.placeholder.com/600x400?text=No+Photo'];

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.carouselWrap}>
          <FlatList
            ref={flatRef}
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={(e) => {
              setImgIdx(Math.round(e.nativeEvent.contentOffset.x / SCREEN.width));
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.carouselImg} resizeMode="cover" />
            )}
          />

          {/* Back button */}
          <TouchableOpacity style={styles.navBack} onPress={() => nav.goBack()}>
            <Text style={{ fontSize: 18 }}>←</Text>
          </TouchableOpacity>

          {/* Heart button */}
          {user && (
            <TouchableOpacity style={styles.navHeart} onPress={handleHeart}>
              <Text style={{ fontSize: 18 }}>{isFav ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          )}

          {/* Photo counter */}
          {photos.length > 1 && (
            <View style={styles.photoCounter}>
              <Text style={styles.photoCounterText}>{imgIdx + 1}/{photos.length}</Text>
            </View>
          )}

          {/* Dots */}
          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.slice(0, 8).map((_, i) => (
                <View key={i} style={[styles.dot, i === imgIdx && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Badges row */}
        <View style={styles.badgeRow}>
          {property.verified && (
            <View style={[styles.badge, { backgroundColor: colors.teal[500] }]}>
              <Text style={styles.badgeText}>✓ Verified</Text>
            </View>
          )}
          {property.featured && (
            <View style={[styles.badge, { backgroundColor: colors.amber[500] }]}>
              <Text style={styles.badgeText}>★ Featured</Text>
            </View>
          )}
          {property.instantBook && (
            <View style={[styles.badge, { backgroundColor: colors.coral[500] }]}>
              <Text style={styles.badgeText}>⚡ Instant Book</Text>
            </View>
          )}
        </View>

        {/* Title & location */}
        <View style={styles.section}>
          <Text style={styles.title}>{property.title}</Text>
          <Text style={styles.location}>{property.locality ? `${property.locality}, ` : ''}{property.city}</Text>
        </View>

        {/* Price card */}
        <View style={[styles.priceCard, shadow.card]}>
          <View>
            <Text style={styles.priceMain}>₹{property.price.toLocaleString('en-IN')}</Text>
            <Text style={styles.priceUnit}>/month</Text>
          </View>
          <View style={styles.priceMeta}>
            <Text style={styles.priceMetaLabel}>Deposit</Text>
            <Text style={styles.priceMetaVal}>₹{property.deposit.toLocaleString('en-IN')}</Text>
          </View>
          {property.rating > 0 && (
            <View style={styles.ratingBox}>
              <Text style={styles.ratingNum}>{property.rating.toFixed(1)}</Text>
              <Text style={styles.ratingLabel}>★ {property.reviewCount} reviews</Text>
            </View>
          )}
        </View>

        {/* Quick info */}
        <View style={styles.quickRow}>
          {[
            { icon: '👤', label: genderLabel[property.genderPreference] || property.genderPreference },
            { icon: '🛏️', label: occupancyLabel[property.occupancy] || property.occupancy },
            { icon: '📅', label: property.moveInDate ? `Move in: ${property.moveInDate}` : 'Flexible' },
          ].map(({ icon, label }) => (
            <View key={label} style={styles.quickItem}>
              <Text style={styles.quickIcon}>{icon}</Text>
              <Text style={styles.quickLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        {!!property.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this PG</Text>
            <Text style={styles.descText}>{property.description}</Text>
          </View>
        )}

        {/* Amenities */}
        {property.amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenGrid}>
              {property.amenities.map((key) => {
                const a = AMENITY_MAP[key];
                return (
                  <View key={key} style={styles.amenItem}>
                    <Text style={styles.amenIcon}>{a?.icon || '•'}</Text>
                    <Text style={styles.amenLabel}>{a?.label || key}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* House Rules */}
        {property.rules && property.rules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>House Rules</Text>
            {property.rules.map((rule, i) => (
              <Text key={i} style={styles.ruleText}>• {rule}</Text>
            ))}
          </View>
        )}

        {/* Owner Info */}
        {owner && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Owner</Text>
            <View style={[styles.ownerCard, shadow.card]}>
              <Image
                source={{ uri: owner.avatar }}
                style={styles.ownerAvatar}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.ownerName}>{owner.name}</Text>
                  {owner.verified && (
                    <View style={styles.verifiedBadge}><Text style={{ fontSize: 10, color: colors.white }}>✓</Text></View>
                  )}
                </View>
                <Text style={styles.ownerMeta}>
                  Member since {owner.joinedYear} • {owner.listingCount} listing{owner.listingCount !== 1 ? 's' : ''}
                </Text>
                {owner.responseRate > 0 && (
                  <Text style={styles.ownerResponse}>
                    Response rate: {owner.responseRate}% • {owner.responseTime}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
            {reviews.slice(0, 5).map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Image source={{ uri: r.authorAvatar }} style={styles.reviewAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewAuthor}>{r.author}</Text>
                    <Text style={styles.reviewDate}>{timeAgo(r.date)}</Text>
                  </View>
                  <View style={styles.reviewRating}>
                    <Text style={styles.reviewRatingText}>★ {r.rating.toFixed(1)}</Text>
                  </View>
                </View>
                <Text style={styles.reviewText}>{r.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bottom spacer for sticky bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, shadow.card]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomPrice}>₹{property.price.toLocaleString('en-IN')}<Text style={styles.bottomUnit}>/mo</Text></Text>
        </View>
        {owner?.phone ? (
          <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
            <Text style={styles.callBtnText}>📞 Call Owner</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.callBtn} onPress={() => Alert.alert('Contact', 'Owner contact info not available.')}>
            <Text style={styles.callBtnText}>📩 Inquire</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.ink[700], marginTop: spacing.md },
  backBtn: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.coral[500], borderRadius: radius.lg },
  backBtnText: { color: colors.white, fontWeight: '700' },

  // Carousel
  carouselWrap: { position: 'relative' },
  carouselImg: { width: SCREEN.width, height: IMAGE_H },
  navBack: {
    position: 'absolute', top: 50, left: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.9)', width: 36, height: 36,
    borderRadius: 18, justifyContent: 'center', alignItems: 'center',
  },
  navHeart: {
    position: 'absolute', top: 50, right: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.9)', width: 36, height: 36,
    borderRadius: 18, justifyContent: 'center', alignItems: 'center',
  },
  photoCounter: {
    position: 'absolute', bottom: spacing.lg, right: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  photoCounterText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  dots: {
    position: 'absolute', bottom: spacing.lg, alignSelf: 'center',
    flexDirection: 'row', gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 18, backgroundColor: colors.white },

  // Badges
  badgeRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },

  // Content sections
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink[900], marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink[900] },
  location: { fontSize: 14, color: colors.ink[500], marginTop: 4 },

  // Price card
  priceCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.lg,
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg,
  },
  priceMain: { fontSize: 24, fontWeight: '800', color: colors.coral[600] },
  priceUnit: { fontSize: 13, color: colors.ink[400], fontWeight: '500' },
  priceMeta: { alignItems: 'center' },
  priceMetaLabel: { fontSize: 11, color: colors.ink[400] },
  priceMetaVal: { fontSize: 15, fontWeight: '700', color: colors.ink[800] },
  ratingBox: { marginLeft: 'auto', alignItems: 'center' },
  ratingNum: { fontSize: 20, fontWeight: '800', color: colors.amber[600] },
  ratingLabel: { fontSize: 11, color: colors.ink[500] },

  // Quick info
  quickRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.md },
  quickItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.ink[50], borderRadius: radius.md, padding: spacing.md,
  },
  quickIcon: { fontSize: 16 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: colors.ink[700] },

  // Description
  descText: { fontSize: 14, color: colors.ink[600], lineHeight: 22 },

  // Amenities
  amenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  amenItem: { flexDirection: 'row', alignItems: 'center', width: '45%', gap: 8 },
  amenIcon: { fontSize: 18 },
  amenLabel: { fontSize: 13, color: colors.ink[700] },

  // Rules
  ruleText: { fontSize: 13, color: colors.ink[600], lineHeight: 22 },

  // Owner
  ownerCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg,
  },
  ownerAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.ink[100] },
  ownerName: { fontSize: 16, fontWeight: '700', color: colors.ink[900] },
  verifiedBadge: {
    backgroundColor: colors.teal[500], borderRadius: 8,
    width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  ownerMeta: { fontSize: 12, color: colors.ink[500], marginTop: 2 },
  ownerResponse: { fontSize: 11, color: colors.teal[600], marginTop: 2 },

  // Reviews
  reviewCard: { backgroundColor: colors.ink[50], borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink[200] },
  reviewAuthor: { fontSize: 14, fontWeight: '600', color: colors.ink[800] },
  reviewDate: { fontSize: 11, color: colors.ink[400] },
  reviewRating: { backgroundColor: colors.amber[100], paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  reviewRatingText: { fontSize: 12, fontWeight: '700', color: colors.amber[700] },
  reviewText: { fontSize: 13, color: colors.ink[600], lineHeight: 20, marginTop: spacing.md },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, paddingBottom: 30,
    borderTopWidth: 1, borderTopColor: colors.ink[100],
  },
  bottomPrice: { fontSize: 20, fontWeight: '800', color: colors.ink[900] },
  bottomUnit: { fontSize: 13, fontWeight: '400', color: colors.ink[400] },
  callBtn: {
    backgroundColor: colors.coral[500], borderRadius: radius.lg,
    paddingHorizontal: spacing.xl, paddingVertical: 14,
  },
  callBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
