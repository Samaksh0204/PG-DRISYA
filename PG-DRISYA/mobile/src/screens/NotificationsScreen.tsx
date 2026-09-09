import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, NotificationItem } from '../types';
import { fetchNotifications, markAllNotificationsRead } from '../services/api';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ICON_MAP: Record<string, string> = {
  info: 'ℹ️',
  listing: '🏠',
  review: '⭐',
  visit: '📅',
  system: '🔔',
};

export function NotificationsScreen() {
  const nav = useNavigation<Nav>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const handlePress = (item: NotificationItem) => {
    if (item.type === 'listing' && item.data?.propertyId) {
      nav.navigate('ListingDetail', { id: item.data.propertyId });
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.coral[500]} /></View>;
  }

  return (
    <View style={styles.container}>
      {notifications.some((n) => !n.read) && (
        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySub}>You're all caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notifItem, !item.read && styles.notifUnread]}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.notifIcon}>{ICON_MAP[item.type] || '🔔'}</Text>
              <View style={styles.notifBody}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifText} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.ink[100] }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.coral[500]} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  markAllBtn: { alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  markAllText: { fontSize: 13, color: colors.coral[600], fontWeight: '600' },

  notifItem: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, alignItems: 'flex-start' },
  notifUnread: { backgroundColor: colors.coral[50] },
  notifIcon: { fontSize: 24, marginRight: spacing.md, marginTop: 2 },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: colors.ink[900] },
  notifText: { fontSize: 13, color: colors.ink[600], marginTop: 2, lineHeight: 18 },
  notifTime: { fontSize: 11, color: colors.ink[400], marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.coral[500], marginTop: 6 },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] },
  emptyIcon: { fontSize: 56, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink[900] },
  emptySub: { fontSize: 14, color: colors.ink[500], marginTop: spacing.sm },
});
