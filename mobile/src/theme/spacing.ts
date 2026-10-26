import { Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

export const SCREEN = { width, height };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

// Matches the website: rounded-xl = 12, rounded-2xl = 16, rounded-3xl = 24.
export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

// Navy-tinted shadows, like the website's shadow-card / shadow-soft.
export const shadow = {
  card: Platform.select({
    ios: { shadowColor: '#102A43', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
    android: { elevation: 3 },
    default: {},
  }),
  soft: Platform.select({
    ios: { shadowColor: '#102A43', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
    android: { elevation: 1 },
    default: {},
  }),
} as const;

export const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;
