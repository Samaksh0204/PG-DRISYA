import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ListingDetailScreen } from '../screens/ListingDetailScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { AadhaarScreen } from '../screens/AadhaarScreen';
import { AddListingScreen } from '../screens/AddListingScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { OwnerDashboardScreen } from '../screens/OwnerDashboardScreen';
import { AccountSettingsScreen } from '../screens/AccountSettingsScreen';
import { InboxScreen, ChatScreen } from '../screens/InboxScreens';
import { TripsScreen, HostRequestsScreen } from '../screens/TripsScreens';
import { ForgotPasswordScreen, BookVisitScreen, RequestBookingScreen, WriteReviewScreen, ReportScreen } from '../screens/ActionScreens';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<keyof TabParamList, string> = { Home: '🏠', Search: '🔍', Favorites: '❤️', Inbox: '💬', Profile: '👤' };

function HeaderRight() {
  const { user } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  if (!user) {
    return (
      <TouchableOpacity onPress={() => nav.navigate('Login')} style={styles.headerBtn} accessibilityRole="button">
        <Text style={styles.headerLoginText}>Sign in</Text>
      </TouchableOpacity>
    );
  }
  const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=ff4d3d&color=fff&size=80`;
  return (
    <TouchableOpacity onPress={() => nav.navigate('Notifications')} style={styles.headerBtn} accessibilityLabel="Notifications">
      <Image source={{ uri: avatar }} style={styles.headerAvatar} />
    </TouchableOpacity>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.ink[900],
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
        headerRight: () => <HeaderRight />,
        tabBarActiveTintColor: colors.coral[500],
        tabBarInactiveTintColor: colors.ink[400],
        tabBarStyle: { borderTopColor: colors.ink[100], paddingBottom: 6, height: 58 },
        tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{TAB_ICONS[route.name]}</Text>,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Saved' }} />
      <Tab.Screen name="Inbox" component={InboxScreen} options={{ title: 'Inbox' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>PG Drisya</Text>
        <Text style={styles.splashSub}>Loading…</Text>
      </View>
    );
  }
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.ink[900],
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.white },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign in', presentation: 'modal' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset password' }} />
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: '', headerTransparent: true }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ title: 'Account settings' }} />
        <Stack.Screen name="Aadhaar" component={AadhaarScreen} options={{ title: 'ID verification' }} />
        <Stack.Screen name="AddListing" component={AddListingScreen} options={({ route }) => ({ title: route.params?.editId ? 'Edit listing' : 'New listing' })} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Trips" component={TripsScreen} options={{ title: 'My bookings & visits' }} />
        <Stack.Screen name="HostDashboard" component={OwnerDashboardScreen} options={{ title: 'Host dashboard' }} />
        <Stack.Screen name="HostRequests" component={HostRequestsScreen} options={{ title: 'Requests' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params.participantName })} />
        <Stack.Screen name="BookVisit" component={BookVisitScreen} options={{ title: 'Book a visit' }} />
        <Stack.Screen name="RequestBooking" component={RequestBookingScreen} options={{ title: 'Book' }} />
        <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ title: 'Write a review' }} />
        <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Report', presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerBtn: { marginRight: spacing.lg },
  headerLoginText: { fontSize: 14, fontWeight: '700', color: colors.coral[500] },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.coral[500] },
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
  splashLogo: { fontSize: 36, fontWeight: '800', color: colors.coral[500] },
  splashSub: { fontSize: 14, color: colors.ink[500], marginTop: spacing.sm },
});
