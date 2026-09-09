import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import type { PropertyListing } from '../types';
import { useAuth } from '../context/AuthContext';
import { toggleFavorite } from '../services/api';
import { colors } from '../theme/colors';
import { radius, shadow, spacing } from '../theme/spacing';

const CARD_WIDTH = (Dimensions.get('window').width - spacing.lg * 2 - spacing.md) / 2;

const genderLabel: Record<string, string> = { male: 'Male', female: 'Female', coed: 'Co-ed' };
const occupancyLabel: Record<string, string> = { single: 'Single', double: 'Double', triple: 'Triple', dorm: 'Dorm' };

interface Props {
  listing: PropertyListing;
  onPress: () => void;
  wide?: boolean;
}

export function ListingCard({ listing, onPress, wide }: Props) {
  const { user, favoriteIds, toggleFavLocal } = useAuth();
  const isFav = favoriteIds.has(listing.id);
  const [toggling, setToggling] = useState(false);

  const handleHeart = async () => {
    if (!user || toggling) return;
    setToggling(true);
    try {
      const { saved } = await toggleFavorite(listing.id);
      toggleFavLocal(listing.id, saved);
    } catch {} finally {
      setToggling(false);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { width: wide ? '100%' : CARD_WIDTH }, shadow.card]}
    >
      <View style={[styles.imageWrap, { height: wide ? 180 : 130 }]}>
        <Image
          source={{ uri: listing.photos[0] || 'https://via.placeholder.com/400x300?text=No+Photo' }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Badges */}
        <View style={styles.badgeRow}>
          {listing.featured && (
            <View style={[styles.badge, { backgroundColor: colors.amber[500] }]}>
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          )}
          {listing.verified && (
            <View style={[styles.badge, { backgroundColor: colors.teal[500] }]}>
              <Text style={styles.badgeText}>Verified</Text>
            </View>
          )}
        </View>

        {/* Heart */}
        {user && (
          <TouchableOpacity style={styles.heartBtn} onPress={handleHeart} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 18 }}>{isFav ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        )}

        {/* Photo dots */}
        {listing.photos.length > 1 && (
          <View style={styles.dots}>
            {listing.photos.slice(0, 5).map((_, i) => (
              <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{listing.title}</Text>
        <Text style={styles.location} numberOfLines={1}>
          {listing.locality ? `${listing.locality}, ` : ''}{listing.city}
        </Text>

        <View style={styles.tags}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{genderLabel[listing.genderPreference] || listing.genderPreference}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{occupancyLabel[listing.occupancy] || listing.occupancy}</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{listing.price.toLocaleString('en-IN')}</Text>
          <Text style={styles.perMonth}>/month</Text>
          {listing.rating > 0 && (
            <View style={styles.ratingWrap}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingText}>{listing.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md },
  imageWrap: { width: '100%', backgroundColor: colors.ink[100], position: 'relative' },
  image: { width: '100%', height: '100%' },
  badgeRow: { position: 'absolute', top: spacing.sm, left: spacing.sm, flexDirection: 'row', gap: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  heartBtn: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 16, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  dots: { position: 'absolute', bottom: spacing.sm, alignSelf: 'center', flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 14, backgroundColor: colors.white },
  info: { padding: spacing.md },
  title: { fontSize: 14, fontWeight: '600', color: colors.ink[900] },
  location: { fontSize: 12, color: colors.ink[500], marginTop: 2 },
  tags: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  tag: { backgroundColor: colors.ink[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  tagText: { fontSize: 11, color: colors.ink[600], fontWeight: '500' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.sm },
  price: { fontSize: 16, fontWeight: '700', color: colors.ink[900] },
  perMonth: { fontSize: 12, color: colors.ink[500], marginLeft: 2 },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto', gap: 2 },
  ratingStar: { fontSize: 12, color: colors.amber[500] },
  ratingText: { fontSize: 12, fontWeight: '600', color: colors.ink[700] },
});
