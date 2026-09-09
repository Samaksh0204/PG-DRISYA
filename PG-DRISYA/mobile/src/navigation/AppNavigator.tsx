import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// Screens
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

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Tab icons (emoji-based, no external icon lib needed) ──
const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Home: { active: '🏠', inactive: '🏡' },
  Search: { active: '🔍', inactive: '🔎' },
  Favorites: { active: '❤️', inactive: '🤍' },
  Profile: { active: '👤', inactive: '👤' },
};

// ── Header user icon ──
function HeaderUserIcon() {
  const { user } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!user) {
    return (
      <TouchableOpacity onPress={() => nav.navigate('Login')} style={styles.headerBtn}>
        <Text style={styles.headerLoginText}>Sign In</Text>
      </TouchableOpacity>
    );
  }

  const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=ff4d3d&color=fff&size=80`;

  return (
    <TouchableOpacity onPress={() => nav.navigate('Notifications')} style={styles.headerAvatarWrap}>
      <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
    </TouchableOpacity>
  );
}

// ── Bottom Tab Navigator ──
function MainTabs() {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.ink[900],
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        headerShadowVisible: false,
        headerRight: () => <HeaderUserIcon />,
        tabBarActiveTintColor: colors.coral[500],
        tabBarInactiveTintColor: colors.ink[400],
        tabBarStyle: { borderTopColor: colors.ink[100], paddingBottom: 6, height: 56 },
        tabBarIcon: ({ focused }) => {
          const icons = TAB_ICONS[route.name];
          return <Text style={{ fontSize: 20 }}>{focused ? icons.active : icons.inactive}</Text>;
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favorites' }} />
      <Tab.Screen
        name="Profile"
        component={user?.role === 'owner' ? OwnerProfileWrapper : ProfileScreen}
        options={{ title: user?.role === 'owner' ? 'Dashboard' : 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Owner gets dashboard as profile tab
import { OwnerDashboardScreen } from '../screens/OwnerDashboardScreen';
function OwnerProfileWrapper() {
  return <OwnerDashboardScreen />;
}

// ── Root Stack ──
export function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>PG Drisya</Text>
        <Text style={styles.splashSub}>Loading...</Text>
      </View>
    );
  }

  // Custom theme so navigation chrome uses our palette instead of React Navigation's default blue
  const appTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.coral[500],
      background: colors.white,
      card: colors.white,
      text: colors.ink[900],
      border: colors.ink[100],
      notification: colors.coral[500],
    },
  };

  return (
    <NavigationContainer theme={appTheme}>
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
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign In', presentation: 'modal' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: '', headerTransparent: true }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
        <Stack.Screen name="Aadhaar" component={AadhaarScreen} options={{ title: 'Aadhaar Verification' }} />
        <Stack.Screen name="AddListing" component={AddListingScreen} options={({ route }) => ({ title: route.params?.editId ? 'Edit Listing' : 'New Listing' })} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerBtn: { marginRight: spacing.lg },
  headerLoginText: { fontSize: 14, fontWeight: '700', color: colors.coral[500] },
  headerAvatarWrap: { marginRight: spacing.lg },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.coral[500] },
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
  splashLogo: { fontSize: 36, fontWeight: '800', color: colors.coral[500] },
  splashSub: { fontSize: 14, color: colors.ink[500], marginTop: spacing.sm },
});
