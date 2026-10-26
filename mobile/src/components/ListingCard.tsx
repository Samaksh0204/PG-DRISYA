import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import type { PropertyListing } from '../types';
import { useAuth } from '../context/AuthContext';
import { toggleFavorite } from '../services/api';
import { GENDER_LABEL, OCCUPANCY_LABEL } from '../data/amenities';
import { colors } from '../theme/colors';
import { radius, shadow, spacing } from '../theme/spacing';
import { formatINR, optimizeImage } from '../utils/format';
import { Icon } from './ui';

const CARD_WIDTH = (Dimensions.get('window').width - spacing.lg * 2 - spacing.md) / 2;

interface Props {
  listing: PropertyListing;
  onPress: () => void;
  wide?: boolean;
  onRequireLogin?: () => void;
}

export function ListingCard({ listing, onPress, wide, onRequireLogin }: Props) {
  const { user, favoriteIds, toggleFavLocal } = useAuth();
  const isFav = favoriteIds.has(listing.id);
  const [toggling, setToggling] = useState(false);

  const handleHeart = async () => {
    if (!user) { onRequireLogin?.(); return; }
    if (toggling) return;
    setToggling(true);
    toggleFavLocal(listing.id, !isFav); // optimistic
    try {
      const { saved } = await toggleFavorite(listing.id);
      toggleFavLocal(listing.id, saved);
    } catch {
      toggleFavLocal(listing.id, isFav);
    } finally {
      setToggling(false);
    }
  };

  const photo = optimizeImage(listing.photos[0], wide ? 640 : 400);
  const full = listing.roomsAvailable < 1;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatINR(listing.price)} per month`}
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.card, { width: wide ? '100%' : CARD_WIDTH }, shadow.card]}
    >
      <View style={[styles.imageWrap, { height: wide ? 180 : 128 }]}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.noPhoto]}><Icon name="business-outline" size={32} color={colors.brand[300]} /></View>
        )}

        <View style={styles.badgeRow}>
          {listing.verified && (
            <View style={[styles.badge, { backgroundColor: colors.white }]}>
              <Icon name="shield-checkmark" size={11} color={colors.brand[600]} />
              <Text style={[styles.badgeText, { color: colors.brand[700] }]}>Verified</Text>
            </View>
          )}
          {listing.featured && wide && (
            <View style={[styles.badge, { backgroundColor: colors.amber[500] }]}>
              <Icon name="ribbon-outline" size={11} color={colors.white} />
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isFav ? 'Remove from wishlist' : 'Save to wishlist'}
          style={styles.heartBtn}
          onPress={handleHeart}
          hitSlop={10}
        >
          <Icon name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? colors.danger : colors.ink[900]} />
        </TouchableOpacity>

        {full && <View style={styles.fullTag}><Text style={styles.fullText}>Full</Text></View>}
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{listing.title}</Text>
          {listing.reviewCount > 0 && (
            <View style={styles.ratingWrap}>
              <Icon name="star" size={12} color={colors.warning} />
              <Text style={styles.ratingText}>{listing.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <View style={styles.locRow}>
          <Icon name="location-outline" size={12} color={colors.ink[500]} />
          <Text style={styles.location} numberOfLines={1}>{listing.locality ? `${listing.locality}, ` : ''}{listing.city}</Text>
        </View>
        <View style={styles.tags}>
          <Text style={styles.tag}>{GENDER_LABEL[listing.genderPreference] || listing.genderPreference}</Text>
          <Text style={styles.tag}>{OCCUPANCY_LABEL[listing.occupancy] || listing.occupancy}</Text>
          {listing.instantBook && wide ? (
            <View style={[styles.tagBox, { backgroundColor: colors.brand[50] }]}>
              <Icon name="flash" size={10} color={colors.brand[700]} />
              <Text style={[styles.tagInline, { color: colors.brand[700] }]}>Instant</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatINR(listing.price)}</Text>
          <Text style={styles.perMonth}> /month</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.ink[200] },
  imageWrap: { width: '100%', backgroundColor: colors.ink[100] },
  image: { width: '100%', height: '100%' },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand[50] },
  badgeRow: { position: 'absolute', top: spacing.sm, left: spacing.sm, flexDirection: 'row', gap: 4, flexWrap: 'wrap', right: 44 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  heartBtn: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  fullTag: { position: 'absolute', bottom: spacing.sm, left: spacing.sm, backgroundColor: colors.overlay, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  fullText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  info: { padding: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink[900] },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  location: { flex: 1, fontSize: 12, color: colors.ink[500] },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm },
  tag: { fontSize: 11, color: colors.ink[600], fontWeight: '600', backgroundColor: colors.ink[100], paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  tagBox: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  tagInline: { fontSize: 11, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.sm },
  price: { fontSize: 16, fontWeight: '800', color: colors.ink[900] },
  perMonth: { fontSize: 12, color: colors.ink[500] },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 12, fontWeight: '700', color: colors.ink[900] },
});
