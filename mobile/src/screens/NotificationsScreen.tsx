import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList, NotificationItem } from '../types';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../services/api';
import { Empty, ErrorText, Icon, ScreenLoader, type IconName } from '../components/ui';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { timeAgo } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ICON_MAP: Record<string, IconName> = {
  info: 'information-circle-outline',
  listing: 'business-outline',
  review: 'star-outline',
  visit: 'calendar-outline',
  booking: 'key-outline',
  message: 'chatbubbles-outline',
  report: 'flag-outline',
  account: 'person-outline',
  system: 'notifications-outline',
};

export function NotificationsScreen() {
  const nav = useNavigation<Nav>();
  const { user, refreshCounts } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (pg = 1) => {
    if (pg > 1) setMore(true);
    try {
      const data = await fetchNotifications(pg);
      setItems((prev) => (pg === 1 ? data.notifications : [...prev, ...data.notifications]));
      setPage(pg);
      setPages(data.pages || 1);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setMore(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(1); }, [load]));

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      refreshCounts();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handlePress = (item: NotificationItem) => {
    if (!item.read) {
      setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
      markNotificationRead(item._id).then(refreshCounts).catch(() => {});
    }
    const host = user?.role === 'owner' || user?.role === 'admin';
    const incoming = /request|instant booking|cancelled by the tenant/i.test(item.title + item.body);
    if (item.type === 'message') nav.navigate('MainTabs', { screen: 'Inbox' });
    else if (item.type === 'booking' || item.type === 'visit') nav.navigate(host && incoming ? 'HostRequests' : 'Trips');
    else if (item.type === 'listing' && /your listing/i.test(item.title)) nav.navigate('HostDashboard');
    else if (item.type === 'review' && host && !item.data?.propertyId) nav.navigate('HostDashboard');
    else if (item.data?.inquiryId && user?.role === 'admin') nav.navigate('Admin');
    else if (item.data?.propertyId) nav.navigate('ListingDetail', { id: String(item.data.propertyId) });
  };

  if (loading) return <ScreenLoader />;
  const unread = items.filter((n) => !n.read).length;

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ flexGrow: 1 }}
      ListHeaderComponent={
        <>
          {error ? <View style={{ paddingHorizontal: spacing.lg }}><ErrorText>{error}</ErrorText></View> : null}
          {unread > 0 && (
            <View style={styles.headerRow}>
              <Text style={styles.headerText}>{unread} unread</Text>
              <TouchableOpacity onPress={markAll} style={styles.markAll}>
                <Icon name="checkmark-done" size={16} color={colors.brand[700]} />
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      }
      ListEmptyComponent={<Empty icon="notifications-outline" title="You're all caught up" desc="Updates on visits, bookings, messages and reviews show up here." />}
      renderItem={({ item }) => (
        <TouchableOpacity style={[styles.item, !item.read && styles.unread]} onPress={() => handlePress(item)} activeOpacity={0.7}>
          <View style={[styles.iconWrap, !item.read && { backgroundColor: colors.brand[500] }]}>
            <Icon name={ICON_MAP[item.type] || 'notifications-outline'} size={18} color={item.read ? colors.brand[600] : colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, !item.read && { fontWeight: '800' }]}>{item.title}</Text>
            <Text style={styles.body} numberOfLines={3}>{item.body}</Text>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </View>
          {!item.read && <View style={styles.dot} />}
        </TouchableOpacity>
      )}
      onEndReached={() => { if (!more && page < pages) load(page + 1); }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={more ? <ActivityIndicator color={colors.brand[500]} style={{ margin: spacing.lg }} /> : undefined}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.ink[200] },
  headerText: { fontSize: 13, fontWeight: '700', color: colors.ink[700] },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markAllText: { fontSize: 13, color: colors.brand[700], fontWeight: '700' },
  item: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.ink[200] },
  unread: { backgroundColor: colors.brand[50] },
  iconWrap: { width: 38, height: 38, borderRadius: radius.lg, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: colors.ink[900] },
  body: { fontSize: 13, color: colors.ink[600], marginTop: 2, lineHeight: 18 },
  time: { fontSize: 11, color: colors.ink[400], marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand[500], marginTop: 6 },
});
