import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface Amenity {
  key: string;
  label: string;
  icon: IconName;
}

// Same keys and labels as the website (client/src/data/amenities.ts).
export const AMENITIES: Amenity[] = [
  { key: 'wifi', label: 'Wi-Fi', icon: 'wifi' },
  { key: 'mess', label: 'Mess / Meals', icon: 'restaurant' },
  { key: 'ac', label: 'Air Conditioning', icon: 'snow' },
  { key: 'laundry', label: 'Laundry', icon: 'basket' },
  { key: 'cctv', label: 'CCTV Security', icon: 'videocam' },
  { key: 'power', label: 'Power Backup', icon: 'flash' },
  { key: 'parking', label: 'Parking', icon: 'car' },
  { key: 'hotwater', label: '24x7 Hot Water', icon: 'water' },
  { key: 'kitchen', label: 'Shared Kitchen', icon: 'flame' },
  { key: 'study', label: 'Study Desk', icon: 'book' },
  { key: 'gym', label: 'Gym', icon: 'barbell' },
  { key: 'tv', label: 'Common TV', icon: 'tv' },
  { key: 'medical', label: 'Medical Kit', icon: 'medkit' },
  { key: 'housekeeping', label: 'Housekeeping', icon: 'sparkles' },
  { key: 'geyser', label: 'Geyser', icon: 'thermometer' },
  { key: 'wardrobe', label: 'Wardrobe', icon: 'shirt' },
];

export const AMENITY_MAP: Record<string, Amenity> = Object.fromEntries(
  AMENITIES.map((a) => [a.key, a]),
);

export const GENDER_LABEL: Record<string, string> = { male: 'Men', female: 'Women', coed: 'Co-ed' };
export const OCCUPANCY_LABEL: Record<string, string> = { single: 'Single', double: 'Double', triple: 'Triple', dorm: 'Dorm' };
