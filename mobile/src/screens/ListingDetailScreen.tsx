import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, FlatList, Linking, Alert, Share, TextInput } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList, PropertyListing, Owner, Review, ViewerInfo, CategoryRatings } from '../types';
import { fetchListingDetail, replyToReview, toggleFavorite, WEB_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AMENITY_MAP, GENDER_LABEL, OCCUPANCY_LABEL } from '../data/amenities';
import { Avatar, Badge, Button, Empty, Icon, ScreenLoader, Stars, type IconName } from '../components/ui';
import { IdentityBadge } from './AadhaarScreen';
import { colors } from '../theme/colors';
import { spacing, radius, shadow, SCREEN } from '../theme/spacing';
import { formatDate, formatINR, moveInCost, optimizeImage, pluralize, timeAgo } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ListingDetail'>;
type Route = RouteProp<RootStackParamList, 'ListingDetail'>;

const IMAGE_H = SCREEN.width * 0.75;
const CATEGORIES: [keyof CategoryRatings, string][] = [['cleanliness', 'Cleanliness'], ['accuracy', 'Accuracy'], ['safety', 'Safety'], ['food', 'Food'], ['value', 'Value']];

export function ListingDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { user, favoriteIds, toggleFavLocal } = useAuth();

  const [property, setProperty] = useState<PropertyListing | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [viewer, setViewer] = useState<ViewerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imgIdx, setImgIdx] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Reload whenever the screen regains focus (e.g. after writing a review or booking).
  useFocusEffect(
    useCallback(() => {
      let live = true;
      fetchListingDetail(route.params.id)
        .then((data) => {
          if (!live) return;
          setProperty(data.property);
          setOwner(data.owner);
          setReviews(data.reviews);
          setViewer(data.viewer);
          setError('');
        })
        .catch((e) => live && setError(e.message || 'Listing not found'))
        .finally(() => live && setLoading(false));
      return () => { live = false; };
    }, [route.params.id, user?.id]),
  );

  const categoryAverages = useMemo(() => CATEGORIES.map(([k, label]) => {
    const vals = reviews.map((r) => r.ratings?.[k]).filter((v): v is number => typeof v === 'number' && v > 0);
    return { label, value: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
  }).filter((c) => c.value > 0), [reviews]);

  const requireLogin = (go: () => void) => (user ? go() : nav.navigate('Login'));

  const handleHeart = async () => {
    if (!user) return nav.navigate('Login');
    if (!property) return;
    const was = favoriteIds.has(property.id);
    toggleFavLocal(property.id, !was);
    try { toggleFavLocal(property.id, (await toggleFavorite(property.id)).saved); } catch { toggleFavLocal(property.id, was); }
  };

  const handleShare = () => {
    if (!property) return;
    const link = WEB_URL ? `${WEB_URL}/#/listing/${property.id}` : '';
    Share.share({ title: property.title, message: `${property.title} — ${formatINR(property.price)}/month in ${property.locality ? `${property.locality}, ` : ''}${property.city} on PG Drisya${link ? `\n${link}` : ''}` }).catch(() => {});
  };

  const openMaps = () => {
    if (!property) return;
    const q = property.lat && property.lng ? `${property.lat},${property.lng}` : encodeURIComponent(`${property.locality} ${property.city}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => {});
  };

  if (loading) return <ScreenLoader />;

  if (!property) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Empty icon="business-outline" title="Listing not found" desc={error || 'It may have been paused or removed.'}>
          <Button title="Go back" onPress={() => nav.goBack()} />
        </Empty>
      </View>
    );
  }

  const isFav = favoriteIds.has(property.id);
  const photos = property.photos.length > 0 ? property.photos : [];
  const full = property.roomsAvailable < 1;
  const cost = moveInCost(property.price, property.deposit);
  const shownReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const facts: { icon: IconName; label: string; value: string }[] = [
    { icon: 'people-outline', label: 'For', value: GENDER_LABEL[property.genderPreference] || property.genderPreference },
    { icon: 'bed-outline', label: 'Room', value: OCCUPANCY_LABEL[property.occupancy] || property.occupancy },
    { icon: 'key-outline', label: 'Available', value: full ? 'Full' : pluralize(property.roomsAvailable, 'room') },
    { icon: 'calendar-outline', label: 'Move in', value: property.moveInDate ? formatDate(property.moveInDate) : 'Flexible' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Photo carousel */}
        <View>
          {photos.length ? (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / SCREEN.width))}
              renderItem={({ item }) => <Image source={{ uri: optimizeImage(item, 900) }} style={styles.carouselImg} resizeMode="cover" accessibilityLabel={property.title} />}
            />
          ) : (
            <View style={[styles.carouselImg, styles.noPhoto]}><Icon name="business-outline" size={56} color={colors.brand[300]} /></View>
          )}

          <View style={[styles.floatBar, { top: insets.top + 8 }]}>
            <TouchableOpacity style={styles.floatBtn} onPress={() => nav.goBack()} accessibilityLabel="Back"><Icon name="arrow-back" size={20} color={colors.ink[900]} /></TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity style={styles.floatBtn} onPress={handleShare} accessibilityLabel="Share"><Icon name="share-outline" size={19} color={colors.ink[900]} /></TouchableOpacity>
              <TouchableOpacity style={styles.floatBtn} onPress={handleHeart} accessibilityLabel={isFav ? 'Remove from wishlist' : 'Save to wishlist'}>
                <Icon name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? colors.danger : colors.ink[900]} />
              </TouchableOpacity>
            </View>
          </View>

          {photos.length > 1 && (
            <View style={styles.photoCounter}><Text style={styles.photoCounterText}>{imgIdx + 1} / {photos.length}</Text></View>
          )}
        </View>

        <View style={styles.body}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            {property.verified && <Badge label="Verified" icon="shield-checkmark" />}
            {property.featured && <Badge label="Featured" icon="ribbon-outline" tone="amber" />}
            {property.instantBook && <Badge label="Instant Book" icon="flash" />}
            {property.status !== 'active' && <Badge label={property.status === 'pending_review' ? 'In review' : property.status === 'inactive' ? 'Paused' : property.status} tone="ink" />}
          </View>

          <Text style={styles.title}>{property.title}</Text>
          <View style={styles.metaRow}>
            {property.reviewCount > 0 ? (
              <>
                <Icon name="star" size={14} color={colors.warning} />
                <Text style={styles.metaStrong}>{property.rating.toFixed(1)}</Text>
                <Text style={styles.meta}>({pluralize(property.reviewCount, 'review')}) · </Text>
              </>
            ) : <Text style={styles.meta}>New · </Text>}
            <TouchableOpacity onPress={openMaps} style={styles.locLink} accessibilityRole="link">
              <Icon name="location-outline" size={14} color={colors.brand[700]} />
              <Text style={styles.locText} numberOfLines={1}>{property.locality ? `${property.locality}, ` : ''}{property.city}</Text>
            </TouchableOpacity>
          </View>
          {!!property.distanceFromLandmark && (
            <View style={[styles.metaRow, { marginTop: 4 }]}>
              <Icon name="navigate-outline" size={13} color={colors.ink[500]} />
              <Text style={styles.meta}>{property.distanceFromLandmark}</Text>
            </View>
          )}

          {/* Facts */}
          <View style={styles.facts}>
            {facts.map((f) => (
              <View key={f.label} style={styles.fact}>
                <Icon name={f.icon} size={18} color={colors.brand[600]} />
                <Text style={styles.factLabel}>{f.label}</Text>
                <Text style={styles.factValue} numberOfLines={1}>{f.value}</Text>
              </View>
            ))}
          </View>

          {/* Price */}
          <View style={[styles.priceCard, shadow.soft]}>
            <View style={styles.priceRow}><Text style={styles.priceLabel}>Monthly rent</Text><Text style={styles.priceVal}>{formatINR(property.price)}</Text></View>
            <View style={styles.priceRow}><Text style={styles.priceLabel}>Refundable deposit</Text><Text style={styles.priceVal}>{formatINR(property.deposit)}</Text></View>
            <View style={[styles.priceRow, styles.priceTotal]}><Text style={styles.priceTotalLabel}>Due at move-in</Text><Text style={styles.priceTotalVal}>{formatINR(cost.total)}</Text></View>
            <Text style={styles.small}>Paid to the owner at move-in, against a written agreement. No brokerage.</Text>
          </View>

          {/* Description */}
          {!!property.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this PG</Text>
              <Text style={styles.descText} numberOfLines={showFullDesc ? undefined : 5}>{property.description}</Text>
              {property.description.length > 240 && (
                <TouchableOpacity onPress={() => setShowFullDesc((v) => !v)}><Text style={styles.link}>{showFullDesc ? 'Show less' : 'Read more'}</Text></TouchableOpacity>
              )}
            </View>
          )}

          {/* Amenities */}
          {property.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What this place offers</Text>
              <View style={styles.amenGrid}>
                {property.amenities.map((key) => {
                  const a = AMENITY_MAP[key];
                  return (
                    <View key={key} style={styles.amenItem}>
                      <View style={styles.amenIcon}><Icon name={a?.icon || 'checkmark'} size={16} color={colors.brand[600]} /></View>
                      <Text style={styles.amenLabel}>{a?.label || key}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Rules */}
          {property.rules.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>House rules</Text>
              {property.rules.map((rule, i) => (
                <View key={i} style={styles.ruleRow}>
                  <Icon name="checkmark-circle" size={16} color={colors.brand[500]} />
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Location */}
          <TouchableOpacity style={[styles.mapCard]} onPress={openMaps} activeOpacity={0.85}>
            <View style={styles.mapIcon}><Icon name="map-outline" size={22} color={colors.white} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mapTitle}>{property.locality || property.city}</Text>
              <Text style={styles.small}>{property.exactLocation ? 'Exact location · open in Maps for directions' : 'Approximate area · exact location after your visit is confirmed'}</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.ink[400]} />
          </TouchableOpacity>

          {/* Host */}
          {owner && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Meet your host</Text>
              <TouchableOpacity style={[styles.hostCard, shadow.soft]} onPress={() => nav.navigate('HostProfile', { id: owner.id, name: owner.name })} activeOpacity={0.85}>
                <View style={styles.hostTop}>
                  <Avatar uri={owner.avatar} name={owner.name} size={56} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.hostName}>{owner.name}</Text>
                      {owner.verified && <Icon name="shield-checkmark" size={16} color={colors.brand[500]} accessibilityLabel="Host checked by the Drisya team" />}
                    </View>
                    {owner.identityVerified && <View style={{ marginTop: 4 }}><IdentityBadge /></View>}
                    <Text style={styles.meta}>Hosting since {owner.joinedYear} · {pluralize(owner.listingCount, 'listing')}</Text>
                    {owner.reviewCount > 0 && (
                      <View style={[styles.metaRow, { marginTop: 2 }]}>
                        <Icon name="star" size={12} color={colors.warning} />
                        <Text style={styles.meta}>{owner.rating.toFixed(1)} host rating · {pluralize(owner.reviewCount, 'review')}</Text>
                      </View>
                    )}
                  </View>
                  <Icon name="chevron-forward" size={18} color={colors.ink[300]} />
                </View>
                {owner.responseRate > 0 && (
                  <View style={styles.hostStat}>
                    <Icon name="time-outline" size={14} color={colors.brand[600]} />
                    <Text style={styles.hostStatText}>{owner.responseRate}% response rate · replies {owner.responseTime}</Text>
                  </View>
                )}
                {!!owner.bio && <Text style={styles.hostBio} numberOfLines={3}>{owner.bio}</Text>}
              </TouchableOpacity>
              {!viewer?.isOwner && (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Button variant="outline" icon="chatbubbles-outline" title="Message" style={{ flex: 1 }}
                    onPress={() => requireLogin(() => nav.navigate('Chat', { participantId: owner.id, participantName: owner.name, propertyId: property.id, propertyTitle: property.title }))} />
                  <Button variant="outline" icon="calendar-outline" title="Book a visit" style={{ flex: 1 }}
                    onPress={() => requireLogin(() => nav.navigate('BookVisit', { propertyId: property.id, title: property.title }))} />
                </View>
              )}
              {!viewer?.isOwner && <Text style={[styles.small, { textAlign: 'center', marginTop: spacing.sm }]}>Host phone numbers are never shared. Talk to the host here in Drisya messages, so there's a record if anything goes wrong.</Text>}
            </View>
          )}

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.reviewHead}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Reviews</Text>
              {property.reviewCount > 0 && (
                <View style={styles.metaRow}>
                  <Icon name="star" size={16} color={colors.warning} />
                  <Text style={styles.reviewAvg}>{property.rating.toFixed(1)}</Text>
                  <Text style={styles.meta}>· {pluralize(property.reviewCount, 'review')}</Text>
                </View>
              )}
            </View>

            {categoryAverages.length > 0 && (
              <View style={styles.catGrid}>
                {categoryAverages.map((c) => (
                  <View key={c.label} style={styles.catRow}>
                    <Text style={styles.catLabel}>{c.label}</Text>
                    <View style={styles.catBar}><View style={[styles.catFill, { width: `${(c.value / 5) * 100}%` }]} /></View>
                    <Text style={styles.catVal}>{c.value.toFixed(1)}</Text>
                  </View>
                ))}
              </View>
            )}

            {viewer?.canReview && (
              <Button icon="create-outline" title="Write a review" onPress={() => nav.navigate('WriteReview', { propertyId: property.id, title: property.title })} style={{ marginTop: spacing.md }} />
            )}

            {reviews.length === 0 ? (
              <Text style={[styles.meta, { marginTop: spacing.md }]}>No reviews yet. Only tenants who visited or stayed can review.</Text>
            ) : shownReviews.map((r) => (
              <ReviewItem key={r.id} review={r} canReply={!!viewer?.isOwner && !r.ownerReply} ownerName={owner?.name || 'Host'}
                onReplied={(updated) => setReviews((list) => list.map((x) => (x.id === updated.id ? { ...x, ownerReply: updated.ownerReply } : x)))}
                onReport={() => requireLogin(() => nav.navigate('Report', { targetType: 'review', targetId: r.id, label: `Review by ${r.author}` }))}
                onAuthor={r.authorId ? () => nav.navigate('HostProfile', { id: r.authorId!, name: r.author }) : undefined} />
            ))}
            {reviews.length > 3 && (
              <Button variant="outline" title={showAllReviews ? 'Show fewer' : `Show all ${reviews.length} reviews`} onPress={() => setShowAllReviews((v) => !v)} style={{ marginTop: spacing.sm }} />
            )}
          </View>

          {viewer?.isOwner ? (
            <View style={styles.ownerBox}>
              <Icon name="information-circle-outline" size={18} color={colors.brand[700]} />
              <Text style={styles.ownerBoxText}>This is your listing. {property.views} views so far.</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.reportRow} onPress={() => requireLogin(() => nav.navigate('Report', { targetType: 'listing', targetId: property.id, label: property.title }))}>
              <Icon name="flag-outline" size={14} color={colors.ink[500]} />
              <Text style={styles.reportText}>Report this listing</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomPrice}>{formatINR(property.price)}<Text style={styles.bottomUnit}> /month</Text></Text>
          <Text style={styles.small}>{full ? 'Currently full' : property.instantBook ? 'Instant confirmation' : 'Owner confirms'}</Text>
        </View>
        {viewer?.isOwner ? (
          <Button title="Edit listing" icon="create-outline" onPress={() => nav.navigate('AddListing', { editId: property.id })} />
        ) : (
          <>
            {owner ? (
              <TouchableOpacity style={styles.callBtn} onPress={() => requireLogin(() => nav.navigate('Chat', { participantId: owner.id, participantName: owner.name, propertyId: property.id, propertyTitle: property.title }))} accessibilityLabel="Message owner">
                <Icon name="chatbubbles-outline" size={20} color={colors.ink[900]} />
              </TouchableOpacity>
            ) : null}
            <Button
              title={full ? 'Full' : property.instantBook ? 'Book now' : 'Request to book'}
              icon={full ? undefined : property.instantBook ? 'flash' : undefined}
              disabled={full || property.status !== 'active'}
              onPress={() => requireLogin(() => nav.navigate('RequestBooking', { propertyId: property.id, title: property.title, price: property.price, deposit: property.deposit, instantBook: property.instantBook, moveInDate: property.moveInDate }))}
            />
          </>
        )}
      </View>
    </View>
  );
}

function ReviewItem({ review: r, canReply, ownerName, onReplied, onReport, onAuthor }: {
  review: Review; canReply: boolean; ownerName: string; onReplied: (r: Review) => void; onReport: () => void; onAuthor?: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      onReplied(await replyToReview(r.id, text.trim()));
      setReplying(false);
    } catch (e: any) {
      Alert.alert('Could not post reply', e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <TouchableOpacity onPress={onAuthor} disabled={!onAuthor}><Avatar uri={r.authorAvatar} name={r.author} size={40} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewAuthor}>{r.author}</Text>
          <View style={styles.metaRow}>
            <Stars value={r.rating} size={12} />
            <Text style={styles.reviewDate}>  {timeAgo(r.date)}</Text>
          </View>
        </View>
        {r.verifiedStay && <Badge label="Stayed here" icon="checkmark-circle" />}
      </View>
      {!!r.text && <Text style={styles.reviewText}>{r.text}</Text>}
      {r.photos && r.photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
          {r.photos.map((p) => <Image key={p} source={{ uri: optimizeImage(p, 200) }} style={styles.reviewPhoto} />)}
        </ScrollView>
      )}
      {r.ownerReply && (
        <View style={styles.replyBox}>
          <Text style={styles.replyHead}>Response from {ownerName}</Text>
          <Text style={styles.replyText}>{r.ownerReply.text}</Text>
        </View>
      )}
      {canReply && !replying && <TouchableOpacity onPress={() => setReplying(true)}><Text style={[styles.link, { marginTop: spacing.sm }]}>Reply publicly</Text></TouchableOpacity>}
      {replying && (
        <View style={{ marginTop: spacing.sm }}>
          <TextInput style={styles.replyInput} value={text} onChangeText={setText} placeholder="Thank the guest or address their feedback" placeholderTextColor={colors.ink[400]} multiline maxLength={1000} accessibilityLabel="Reply" />
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <Button variant="outline" title="Cancel" onPress={() => setReplying(false)} style={{ flex: 1, minHeight: 40, paddingVertical: 8 }} />
            <Button title="Post reply" onPress={send} loading={busy} disabled={!text.trim()} style={{ flex: 1, minHeight: 40, paddingVertical: 8 }} />
          </View>
        </View>
      )}
      <TouchableOpacity onPress={onReport} style={{ alignSelf: 'flex-end', marginTop: 6 }} hitSlop={6}>
        <Text style={styles.reportSmall}>Report</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: 'center', backgroundColor: colors.white, padding: spacing.lg },
  carouselImg: { width: SCREEN.width, height: IMAGE_H, backgroundColor: colors.ink[100] },
  noPhoto: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand[50] },
  floatBar: { position: 'absolute', left: spacing.lg, right: spacing.lg, flexDirection: 'row', justifyContent: 'space-between' },
  floatBtn: { backgroundColor: 'rgba(255,255,255,0.95)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', ...shadow.soft },
  photoCounter: { position: 'absolute', bottom: spacing['2xl'] + 8, right: spacing.lg, backgroundColor: colors.overlay, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  photoCounterText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  body: { marginTop: -spacing['2xl'], backgroundColor: colors.white, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink[900], letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  meta: { fontSize: 13, color: colors.ink[500] },
  metaStrong: { fontSize: 13, fontWeight: '700', color: colors.ink[900] },
  locLink: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  locText: { fontSize: 13, fontWeight: '600', color: colors.brand[700], textDecorationLine: 'underline' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  fact: { width: (SCREEN.width - spacing.lg * 2 - spacing.sm) / 2, backgroundColor: colors.page, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.ink[200], padding: spacing.md },
  factLabel: { fontSize: 11, color: colors.ink[500], marginTop: 6, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  factValue: { fontSize: 14, fontWeight: '700', color: colors.ink[900], marginTop: 1 },
  priceCard: { marginTop: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.ink[200], padding: spacing.lg, backgroundColor: colors.white },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priceLabel: { fontSize: 14, color: colors.ink[600] },
  priceVal: { fontSize: 14, fontWeight: '600', color: colors.ink[900] },
  priceTotal: { borderTopWidth: 1, borderTopColor: colors.ink[200], paddingTop: spacing.sm, marginTop: 4 },
  priceTotalLabel: { fontSize: 15, fontWeight: '700', color: colors.ink[900] },
  priceTotalVal: { fontSize: 15, fontWeight: '800', color: colors.ink[900] },
  small: { fontSize: 12, color: colors.ink[500], marginTop: 2, lineHeight: 17 },
  section: { marginTop: spacing['2xl'] },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink[900], marginBottom: spacing.md },
  descText: { fontSize: 15, color: colors.ink[700], lineHeight: 23 },
  link: { fontSize: 14, fontWeight: '700', color: colors.brand[700], marginTop: 6 },
  amenGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  amenItem: { flexDirection: 'row', alignItems: 'center', width: '50%', gap: 10, paddingRight: 8 },
  amenIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  amenLabel: { flex: 1, fontSize: 14, color: colors.ink[700] },
  ruleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  ruleText: { flex: 1, fontSize: 14, color: colors.ink[700], lineHeight: 20 },
  mapCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing['2xl'], padding: spacing.md, borderRadius: radius.xl, backgroundColor: colors.page, borderWidth: 1, borderColor: colors.ink[200] },
  mapIcon: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.ink[900], alignItems: 'center', justifyContent: 'center' },
  mapTitle: { fontSize: 15, fontWeight: '700', color: colors.ink[900] },
  hostCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.ink[200], padding: spacing.lg, backgroundColor: colors.white },
  hostTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hostName: { fontSize: 17, fontWeight: '700', color: colors.ink[900] },
  hostStat: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, backgroundColor: colors.brand[50], borderRadius: radius.md, padding: spacing.sm },
  hostStatText: { fontSize: 12, color: colors.brand[800], fontWeight: '600' },
  hostBio: { fontSize: 14, color: colors.ink[600], marginTop: spacing.md, lineHeight: 20 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAvg: { fontSize: 16, fontWeight: '800', color: colors.ink[900] },
  catGrid: { marginTop: spacing.md, gap: 8 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  catLabel: { width: 90, fontSize: 13, color: colors.ink[600] },
  catBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.ink[100], overflow: 'hidden' },
  catFill: { height: 6, borderRadius: 3, backgroundColor: colors.brand[500] },
  catVal: { width: 28, textAlign: 'right', fontSize: 13, fontWeight: '700', color: colors.ink[900] },
  reviewCard: { borderTopWidth: 1, borderTopColor: colors.ink[200], paddingVertical: spacing.lg, marginTop: spacing.md },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reviewAuthor: { fontSize: 15, fontWeight: '700', color: colors.ink[900] },
  reviewDate: { fontSize: 12, color: colors.ink[500] },
  reviewText: { fontSize: 14, color: colors.ink[700], lineHeight: 21, marginTop: spacing.md },
  reviewPhoto: { width: 84, height: 84, borderRadius: radius.md, marginRight: spacing.sm, backgroundColor: colors.ink[100] },
  replyBox: { marginTop: spacing.md, backgroundColor: colors.page, borderLeftWidth: 3, borderLeftColor: colors.brand[500], borderRadius: radius.sm, padding: spacing.md },
  replyHead: { fontSize: 12, fontWeight: '700', color: colors.ink[900] },
  replyText: { fontSize: 13, color: colors.ink[700], marginTop: 4, lineHeight: 19 },
  replyInput: { borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, padding: spacing.md, minHeight: 80, textAlignVertical: 'top', fontSize: 14, color: colors.ink[900] },
  reportSmall: { fontSize: 12, color: colors.ink[400] },
  ownerBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.brand[50], borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.xl },
  ownerBoxText: { flex: 1, fontSize: 13, color: colors.brand[800] },
  reportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.xl, paddingVertical: spacing.md },
  reportText: { fontSize: 13, color: colors.ink[500], textDecorationLine: 'underline' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.ink[200] },
  bottomPrice: { fontSize: 19, fontWeight: '800', color: colors.ink[900] },
  bottomUnit: { fontSize: 13, fontWeight: '400', color: colors.ink[500] },
  callBtn: { width: 46, height: 46, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.ink[200], alignItems: 'center', justifyContent: 'center' },
});
