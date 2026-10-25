import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme, useNavigation, type LinkingOptions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import type { RootStackParamList, TabParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { Avatar, Icon, type IconName } from '../components/ui';
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
import { HostProfileScreen } from '../screens/HostProfileScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { InfoScreen, ExpertScreen } from '../screens/InfoScreens';
import { InboxScreen, ChatScreen } from '../screens/InboxScreens';
import { TripsScreen, HostRequestsScreen } from '../screens/TripsScreens';
import {
  ForgotPasswordScreen, ResetPasswordScreen, VerifyEmailScreen, BookVisitScreen, RequestBookingScreen, WriteReviewScreen, ReportScreen,
} from '../screens/ActionScreens';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<keyof TabParamList, [IconName, IconName]> = {
  Home: ['home', 'home-outline'],
  Search: ['search', 'search-outline'],
  Favorites: ['heart', 'heart-outline'],
  Inbox: ['chatbubbles', 'chatbubbles-outline'],
  Profile: ['person', 'person-outline'],
};

// The same navy/teal palette as the website, applied to every navigator.
const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.brand[500], background: colors.page, card: colors.white, text: colors.ink[900], border: colors.ink[200], notification: colors.brand[500] },
};

// Links from emails/website: pgdrisya://listing/<id>, pgdrisya://reset-password?token=…,
// pgdrisya://verify-email?token=…, pgdrisya://user/<id>
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'pgdrisya://'],
  config: {
    screens: {
      MainTabs: { screens: { Home: '', Search: 'search', Favorites: 'wishlist', Inbox: 'messages', Profile: 'profile' } },
      ListingDetail: 'listing/:id',
      HostProfile: 'user/:id',
      ResetPassword: 'reset-password',
      VerifyEmail: 'verify-email',
      Notifications: 'notifications',
      Trips: 'dashboard',
      HostDashboard: 'owner',
      Admin: 'admin',
      Expert: 'expert',
    },
  },
};

function HeaderRight() {
  const { user, unreadNotifications } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  if (!user) {
    return (
      <TouchableOpacity onPress={() => nav.navigate('Login')} style={styles.headerBtn} accessibilityRole="button">
        <Text style={styles.headerLoginText}>Sign in</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={[styles.headerBtn, { flexDirection: 'row', alignItems: 'center', gap: spacing.md }]}>
      <TouchableOpacity onPress={() => nav.navigate('Notifications')} accessibilityLabel={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`} hitSlop={8}>
        <Icon name="notifications-outline" size={23} color={colors.ink[900]} />
        {unreadNotifications > 0 && <View style={styles.dot} />}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => nav.navigate('MainTabs', { screen: 'Profile' })} accessibilityLabel="Profile">
        <Avatar uri={user.avatar} name={user.fullName} size={30} />
      </TouchableOpacity>
    </View>
  );
}

function MainTabs() {
  const { unreadMessages } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.ink[900],
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerRight: () => <HeaderRight />,
        tabBarActiveTintColor: colors.brand[600],
        tabBarInactiveTintColor: colors.ink[400],
        tabBarStyle: { borderTopColor: colors.ink[200], backgroundColor: colors.white },
        tabBarIcon: ({ focused, color, size }) => <Icon name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size - 2} color={color} />,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarBadgeStyle: { backgroundColor: colors.brand[500], color: colors.white, fontSize: 10, fontWeight: '800' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Find a PG', tabBarLabel: 'Search' }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Wishlist', tabBarLabel: 'Saved' }} />
      <Tab.Screen name="Inbox" component={InboxScreen} options={{ title: 'Messages', tabBarLabel: 'Inbox', tabBarBadge: unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : unreadMessages) : undefined }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashMark}><Icon name="shield-checkmark" size={40} color={colors.brand[400]} /></View>
        <Text style={styles.splashLogo}>PG Drisya</Text>
      </View>
    );
  }
  return (
    <NavigationContainer theme={theme} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.ink[900],
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          headerShadowVisible: false,
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: colors.page },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign in', presentation: 'modal' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset password' }} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'New password' }} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: 'Confirm email' }} />
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="HostProfile" component={HostProfileScreen} options={({ route }) => ({ title: route.params.name || 'Profile' })} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ title: 'Account settings' }} />
        <Stack.Screen name="Aadhaar" component={AadhaarScreen} options={{ title: 'ID verification' }} />
        <Stack.Screen name="AddListing" component={AddListingScreen} options={({ route }) => ({ title: route.params?.editId ? 'Edit listing' : 'New listing' })} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Trips" component={TripsScreen} options={{ title: 'My bookings & visits' }} />
        <Stack.Screen name="HostDashboard" component={OwnerDashboardScreen} options={{ title: 'Host dashboard' }} />
        <Stack.Screen name="HostRequests" component={HostRequestsScreen} options={{ title: 'Requests' }} />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin console' }} />
        <Stack.Screen name="Expert" component={ExpertScreen} options={{ title: 'Drisya Expert' }} />
        <Stack.Screen name="Info" component={InfoScreen} options={{ title: '' }} />
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
  headerLoginText: { fontSize: 14, fontWeight: '700', color: colors.brand[600] },
  dot: { position: 'absolute', top: -1, right: -1, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.brand[500], borderWidth: 1.5, borderColor: colors.white },
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.ink[900] },
  splashMark: { width: 80, height: 80, borderRadius: 20, backgroundColor: colors.ink[800], alignItems: 'center', justifyContent: 'center' },
  splashLogo: { fontSize: 30, fontWeight: '800', color: colors.white, marginTop: spacing.lg },
});
