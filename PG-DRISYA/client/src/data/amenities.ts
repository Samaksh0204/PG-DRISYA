import type { Amenity } from '../types';

export const AMENITIES: Amenity[] = [
  { key: 'wifi', label: 'Wi-Fi', icon: 'Wifi' },
  { key: 'mess', label: 'Mess / Meals', icon: 'Utensils' },
  { key: 'ac', label: 'Air Conditioning', icon: 'Snowflake' },
  { key: 'laundry', label: 'Laundry', icon: 'WashingMachine' },
  { key: 'cctv', label: 'CCTV Security', icon: 'Cctv' },
  { key: 'power', label: 'Power Backup', icon: 'Zap' },
  { key: 'parking', label: 'Parking', icon: 'Car' },
  { key: 'hotwater', label: '24x7 Hot Water', icon: 'Droplets' },
  { key: 'kitchen', label: 'Shared Kitchen', icon: 'CookingPot' },
  { key: 'study', label: 'Study Desk', icon: 'BookOpen' },
  { key: 'gym', label: 'Gym', icon: 'Dumbbell' },
  { key: 'tv', label: 'Common TV', icon: 'Tv' },
  { key: 'medical', label: 'Medical Kit', icon: 'Stethoscope' },
  { key: 'housekeeping', label: 'Housekeeping', icon: 'Sparkles' },
  { key: 'geyser', label: 'Geyser', icon: 'Thermometer' },
  { key: 'wardrobe', label: 'Wardrobe', icon: 'Shirt' },
];

export const AMENITY_MAP: Record<string, Amenity> = Object.fromEntries(
  AMENITIES.map((a) => [a.key, a]),
);
