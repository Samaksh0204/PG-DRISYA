// Public profile of a host or tenant (website: /user/:id). No email or phone.
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PropertyListing, PublicProfile, Review, RootStackParamList } from '../types';
import { fetchPublicProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ListingCard } from '../components/ListingCard';
import { Avatar, Badge, Button, Empty, Icon, ScreenLoader, Stars } from '../components/ui';
import { IdentityBadge } from './AadhaarScreen';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { formatDate, pluralize, timeAgo } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HostProfileScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'HostProfile'>>();
  const { user: me } = useAuth();
  const [user, setUser] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    fetchPublicProfile(params.id)
      .then((d) => {
        if (!live) return;
        setUser(d.user);
        setListings(d.listings);
        setReviews(d.reviews);
        nav.setOptions({ title: d.user.fullName });
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [params.id, nav]);

  if (loading) return <ScreenLoader />;
  if (!user) return <View style={s.page}><Empty icon="person-outline" title="Profile not available" desc={error} /></View>;

  const isHost = user.role === 'owner' || user.listingCount > 0;
  const isMe = me?.id === user.id;

  return (
    <ScrollView style={s.page} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={s.header}>
        <Avatar uri={user.avatar} name={user.fullName} size={88} />
        <View style={s.nameRow}>
          <Text style={s.name}>{user.fullName}</Text>
          {user.verified && <Icon name="shield-checkmark" size={20} color={colors.brand[500]} />}
        </View>
        <Text style={s.sub}>{isHost ? 'Host' : 'Member'}{user.city ? ` · ${user.city}` : ''} · Joined {formatDate(user.createdAt)}</Text>
        <View style={s.stats}>
          {isHost && <Stat value={String(user.listingCount)} label={user.listingCount === 1 ? 'Listing' : 'Listings'} />}
          {user.reviewCount > 0 && <Stat value={`${user.rating.toFixed(1)}★`} label={pluralize(user.reviewCount, 'review')} />}
          {user.responseRate > 0 && <Stat value={`${user.responseRate}%`} label="Response rate" />}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }}>
          {user.identityVerified && <IdentityBadge />}
          {user.verified && <Badge label="Host checked by Drisya" icon="shield-checkmark" tone="ink" />}
          {user.responseTime && user.responseRate > 0 ? <Badge label={`Usually replies ${user.responseTime}`} icon="time-outline" /> : null}
        </View>
        {!!user.bio && <Text style={s.bio}>{user.bio}</Text>}
        {!isMe && (
          <View style={s.actions}>
            <Button variant="outline" icon="chatbubbles-outline" title="Message" style={{ flex: 1 }}
              onPress={() => (me ? nav.navigate('Chat', { participantId: user.id, participantName: user.fullName }) : nav.navigate('Login'))} />
            <Button variant="ghost" icon="flag-outline" title="Report" style={{ flex: 1 }}
              onPress={() => (me ? nav.navigate('Report', { targetType: 'user', targetId: user.id, label: user.fullName }) : nav.navigate('Login'))} />
          </View>
        )}
      </View>

      {listings.length > 0 && (
        <View style={s.section}>
          <Text style={s.h2}>{isMe ? 'Your' : `${user.fullName.split(' ')[0]}'s`} listings</Text>
          <View style={s.grid}>
            {listings.map((l) => <ListingCard key={l.id} listing={l} onPress={() => nav.push('ListingDetail', { id: l.id })} onRequireLogin={() => nav.navigate('Login')} />)}
          </View>
        </View>
      )}

      {reviews.length > 0 && (
        <View style={s.section}>
          <Text style={s.h2}>What guests say</Text>
          {reviews.map((r) => (
            <View key={r.id} style={s.review}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Avatar uri={r.authorAvatar} name={r.author} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={s.author}>{r.author}</Text>
                  <Text style={s.small}>{r.propertyTitle} · {timeAgo(r.date)}</Text>
                </View>
                <Stars value={r.rating} size={12} />
              </View>
              {!!r.text && <Text style={s.reviewText}>{r.text}</Text>}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statVal}>{value}</Text>
      <Text style={s.statLbl}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  header: { backgroundColor: colors.white, alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.ink[200] },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  name: { fontSize: 22, fontWeight: '800', color: colors.ink[900] },
  sub: { fontSize: 13, color: colors.ink[500], marginTop: 4, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.lg },
  stat: { minWidth: 92, alignItems: 'center', borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.ink[900] },
  statLbl: { fontSize: 11, color: colors.ink[500], marginTop: 2 },
  bio: { fontSize: 14, color: colors.ink[700], lineHeight: 21, marginTop: spacing.md, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, alignSelf: 'stretch' },
  section: { padding: spacing.lg },
  h2: { fontSize: 18, fontWeight: '800', color: colors.ink[900], marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  review: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md },
  author: { fontSize: 14, fontWeight: '700', color: colors.ink[900] },
  small: { fontSize: 12, color: colors.ink[500] },
  reviewText: { fontSize: 14, color: colors.ink[700], lineHeight: 20, marginTop: spacing.sm },
});
