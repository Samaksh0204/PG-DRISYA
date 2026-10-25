import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { becomeOwner } from '../services/api';
import { Avatar, Badge, Button, CountBadge, Empty, ListRow } from '../components/ui';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { formatDate } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { user, logout, setSession, unreadNotifications } = useAuth();

  const infoLinks = (
    <View style={styles.group}>
      <ListRow icon="headset-outline" label="Drisya Expert" sub="Free help shortlisting PGs" onPress={() => nav.navigate('Expert')} />
      <ListRow icon="shield-checkmark-outline" label="Trust & Safety" onPress={() => nav.navigate('Info', { page: 'trust' })} />
      <ListRow icon="pricetag-outline" label="Pricing" onPress={() => nav.navigate('Info', { page: 'pricing' })} />
      <ListRow icon="help-circle-outline" label="Help centre" onPress={() => nav.navigate('Info', { page: 'help' })} />
      <ListRow icon="document-text-outline" label="Terms & Privacy" onPress={() => nav.navigate('Info', { page: 'terms' })} />
    </View>
  );

  if (!user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: 40 }}>
        <Empty icon="person-outline" title="Your PG Drisya account" desc="Sign in to save PGs, message owners, book visits and manage your stay.">
          <Button title="Sign in" onPress={() => nav.navigate('Login')} />
          <Button variant="outline" title="Create an account" onPress={() => nav.navigate('Register')} style={{ marginTop: spacing.sm }} />
        </Empty>
        <Text style={styles.groupTitle}>Learn more</Text>
        {infoLinks}
      </ScrollView>
    );
  }

  const handleLogout = () => {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const becomeHost = () => Alert.alert('Become a host?', 'Your account will also be able to list PGs. You can still search and book as a tenant.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Continue', onPress: async () => {
        try { const r = await becomeOwner(); await setSession(r.token, r.user); nav.navigate('HostDashboard'); } catch (e: any) { Alert.alert('Error', e.message); }
      },
    },
  ]);

  const isHost = user.role === 'owner' || user.role === 'admin';
  const checklist = [
    !user.emailVerified && { label: 'Confirm your email', onPress: () => nav.navigate('AccountSettings') },
    !user.phone && { label: 'Add a phone number', onPress: () => nav.navigate('EditProfile') },
    user.identityStatus !== 'verified' && { label: 'Verify your identity', onPress: () => nav.navigate('Aadhaar') },
  ].filter(Boolean) as { label: string; onPress: () => void }[];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xl }]}>
        <View style={styles.headerAccent} />
        <Avatar uri={user.avatar} name={user.fullName} size={84} />
        <Text style={styles.name}>{user.fullName}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.badges}>
          <Badge solid label={user.role === 'admin' ? 'Admin' : user.role === 'owner' ? 'Host' : 'Tenant'} icon={user.role === 'admin' ? 'shield-checkmark' : user.role === 'owner' ? 'key' : 'home'} />
          {user.identityStatus === 'verified' && <Badge solid label="ID verified" icon="finger-print" tone="ink" />}
        </View>
        <Text style={styles.since}>Member since {formatDate(user.createdAt)}</Text>
      </View>

      {checklist.length > 0 && (
        <View style={styles.checklist}>
          <Text style={styles.checkTitle}>Complete your profile</Text>
          {checklist.map((c) => (
            <Text key={c.label} style={styles.checkItem} onPress={c.onPress}>• {c.label}  ›</Text>
          ))}
        </View>
      )}

      <Text style={styles.groupTitle}>Your stays</Text>
      <View style={styles.group}>
        <ListRow icon="key-outline" label="My bookings & visits" onPress={() => nav.navigate('Trips')} />
        <ListRow icon="heart-outline" label="Wishlist" onPress={() => nav.navigate('MainTabs', { screen: 'Favorites' })} />
        <ListRow icon="notifications-outline" label="Notifications" onPress={() => nav.navigate('Notifications')} right={<CountBadge count={unreadNotifications} />} />
      </View>

      <Text style={styles.groupTitle}>Hosting</Text>
      <View style={styles.group}>
        {isHost ? (
          <>
            <ListRow icon="business-outline" label="Host dashboard" sub="Listings, stats and reviews" onPress={() => nav.navigate('HostDashboard')} />
            <ListRow icon="file-tray-outline" label="Booking & visit requests" onPress={() => nav.navigate('HostRequests')} />
            <ListRow icon="add-circle-outline" label="Add a new PG" onPress={() => nav.navigate('AddListing', {})} />
            <ListRow icon="person-outline" label="View my public profile" onPress={() => nav.navigate('HostProfile', { id: user.id, name: user.fullName })} />
          </>
        ) : (
          <ListRow icon="business-outline" label="List your PG" sub="Free during launch" onPress={becomeHost} />
        )}
      </View>

      {user.role === 'admin' && (
        <>
          <Text style={styles.groupTitle}>Admin</Text>
          <View style={styles.group}>
            <ListRow icon="grid-outline" label="Admin console" sub="Moderation, reports, users, inquiries" onPress={() => nav.navigate('Admin')} />
          </View>
        </>
      )}

      <Text style={styles.groupTitle}>Account</Text>
      <View style={styles.group}>
        <ListRow icon="create-outline" label="Edit profile" onPress={() => nav.navigate('EditProfile')} />
        <ListRow icon="finger-print" label="Identity verification" sub={{ verified: 'Verified', pending: 'Pending', rejected: 'Not approved — try again', unverified: 'Not verified' }[user.identityStatus || 'unverified']} onPress={() => nav.navigate('Aadhaar')} />
        <ListRow icon="settings-outline" label="Account settings" sub="Email, password, data, delete account" onPress={() => nav.navigate('AccountSettings')} />
      </View>

      <Text style={styles.groupTitle}>Learn more</Text>
      {infoLinks}

      <View style={[styles.group, { marginTop: spacing.xl }]}>
        <ListRow icon="log-out-outline" label="Sign out" danger onPress={handleLogout} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  header: { backgroundColor: colors.ink[900], alignItems: 'center', paddingBottom: spacing['2xl'], overflow: 'hidden' },
  headerAccent: { position: 'absolute', right: -80, top: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: colors.brand[700], opacity: 0.35 },
  name: { fontSize: 22, fontWeight: '800', color: colors.white, marginTop: spacing.md },
  email: { fontSize: 13, color: colors.ink[300], marginTop: 2 },
  badges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  since: { fontSize: 12, color: colors.ink[300], marginTop: spacing.sm },
  checklist: { margin: spacing.lg, marginBottom: 0, backgroundColor: colors.brand[50], borderWidth: 1, borderColor: colors.brand[100], borderRadius: radius.xl, padding: spacing.lg },
  checkTitle: { fontSize: 15, fontWeight: '700', color: colors.ink[900], marginBottom: 6 },
  checkItem: { fontSize: 14, color: colors.brand[800], fontWeight: '600', paddingVertical: 4 },
  groupTitle: { fontSize: 12, fontWeight: '700', color: colors.ink[500], textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.xl, marginBottom: spacing.sm, marginHorizontal: spacing.lg + 4 },
  group: { marginHorizontal: spacing.lg, backgroundColor: colors.white, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.ink[200], marginTop: 0 },
});
