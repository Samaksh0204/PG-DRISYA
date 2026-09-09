import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { spacing, radius, shadow } from '../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <View style={styles.guestWrap}>
        <Text style={styles.guestIcon}>👤</Text>
        <Text style={styles.guestTitle}>Sign in to see your profile</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => nav.navigate('Login')}>
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=ff4d3d&color=fff&size=200`;

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const menuItems = [
    { icon: '✏️', label: 'Edit Profile', onPress: () => nav.navigate('EditProfile') },
    { icon: '🔔', label: 'Notifications', onPress: () => nav.navigate('Notifications') },
    { icon: '🪪', label: user.aadhaarVerified ? 'Aadhaar Verified ✓' : 'Verify Aadhaar', onPress: () => nav.navigate('Aadhaar') },
    ...(user.role === 'owner' ? [{ icon: '🏢', label: 'My Listings', onPress: () => nav.navigate('AddListing', {}) }] : []),
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <Text style={styles.name}>{user.fullName}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>{user.role === 'owner' ? '🔑 Owner' : '🏠 Tenant'}</Text>
        </View>
        {user.verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Verified</Text>
          </View>
        )}
      </View>

      {/* Info card */}
      <View style={[styles.infoCard, shadow.card]}>
        {[
          { label: 'Email', value: user.email },
          { label: 'Phone', value: user.phone || 'Not set' },
          { label: 'City', value: user.city || 'Not set' },
          { label: 'Gender', value: user.gender || 'Not set' },
          { label: 'Member since', value: new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) },
        ].map((item) => (
          <View key={item.label} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{item.label}</Text>
            <Text style={styles.infoValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink[50] },

  guestWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white, padding: spacing['2xl'] },
  guestIcon: { fontSize: 56, marginBottom: spacing.lg },
  guestTitle: { fontSize: 18, fontWeight: '600', color: colors.ink[700], marginBottom: spacing.xl },
  signInBtn: { backgroundColor: colors.coral[500], borderRadius: radius.lg, paddingHorizontal: spacing['3xl'], paddingVertical: spacing.md },
  signInBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },

  profileHeader: { backgroundColor: colors.coral[500], alignItems: 'center', paddingTop: 60, paddingBottom: spacing['3xl'] },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: colors.white },
  name: { fontSize: 22, fontWeight: '800', color: colors.white, marginTop: spacing.md },
  roleTag: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: 4, marginTop: spacing.sm },
  roleTagText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  verifiedBadge: { marginTop: spacing.sm },
  verifiedText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },

  infoCard: { backgroundColor: colors.white, margin: spacing.lg, borderRadius: radius.lg, padding: spacing.lg },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.ink[100] },
  infoLabel: { fontSize: 13, color: colors.ink[500] },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.ink[900] },

  menu: { marginHorizontal: spacing.lg, backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.ink[100] },
  menuIcon: { fontSize: 18, marginRight: spacing.md },
  menuLabel: { flex: 1, fontSize: 15, color: colors.ink[900], fontWeight: '500' },
  menuArrow: { fontSize: 22, color: colors.ink[400] },

  logoutBtn: { marginHorizontal: spacing.lg, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.red[500], borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center' },
  logoutText: { color: colors.red[500], fontSize: 15, fontWeight: '600' },
});
