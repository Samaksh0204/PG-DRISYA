// Design tokens — kept identical to the website (client/src/index.css):
// Deep Navy + White + Teal. Change colours here only.
const brand = {
  50: '#E6F7F5',
  100: '#CCF1EC',
  200: '#99E4DA',
  300: '#5ED6C7',
  400: '#2DC4B3',
  500: '#14B8A6', // primary action
  600: '#0F9488', // pressed / hover
  700: '#0F766E',
  800: '#115E59',
  900: '#134E4A',
  950: '#042F2E',
} as const;

// Navy-slate neutrals. 50 = page bg · 200 = borders · 500 = muted text
// 700 = body text · 900 = deep navy (headings, hero)
const ink = {
  50: '#F4F7FA',
  100: '#EAEFF5',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#6B7A90',
  500: '#64748B',
  600: '#475569',
  700: '#243447',
  800: '#1B3854',
  900: '#102A43',
  950: '#0A1C2E',
} as const;

export const colors = {
  brand,
  // The website aliases teal to the brand scale too.
  teal: brand,
  ink,
  page: ink[50],
  surface: '#FFFFFF',
  success: '#15803D',
  warning: '#F59E0B',
  danger: '#DC2626',
  white: '#FFFFFF',
  black: '#000000',
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#DC2626',
    700: '#B91C1C',
  },
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    700: '#15803D',
  },
  overlay: 'rgba(10, 28, 46, 0.55)',
} as const;

// ui-avatars background (hex without #) — matches the server's default avatar.
export const AVATAR_BG = '102A43';
