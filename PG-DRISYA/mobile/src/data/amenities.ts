export interface Amenity {
  key: string;
  label: string;
  icon: string;
}

export const AMENITIES: Amenity[] = [
  { key: 'wifi', label: 'Wi-Fi', icon: '📶' },
  { key: 'mess', label: 'Mess / Meals', icon: '🍽️' },
  { key: 'ac', label: 'Air Conditioning', icon: '❄️' },
  { key: 'laundry', label: 'Laundry', icon: '🧺' },
  { key: 'cctv', label: 'CCTV Security', icon: '📹' },
  { key: 'power', label: 'Power Backup', icon: '⚡' },
  { key: 'parking', label: 'Parking', icon: '🚗' },
  { key: 'hotwater', label: '24x7 Hot Water', icon: '💧' },
  { key: 'kitchen', label: 'Shared Kitchen', icon: '🍳' },
  { key: 'study', label: 'Study Desk', icon: '📖' },
  { key: 'gym', label: 'Gym', icon: '🏋️' },
  { key: 'tv', label: 'Common TV', icon: '📺' },
  { key: 'medical', label: 'Medical Kit', icon: '🩺' },
  { key: 'housekeeping', label: 'Housekeeping', icon: '✨' },
  { key: 'geyser', label: 'Geyser', icon: '🌡️' },
  { key: 'wardrobe', label: 'Wardrobe', icon: '👔' },
];

export const AMENITY_MAP: Record<string, Amenity> = Object.fromEntries(
  AMENITIES.map((a) => [a.key, a]),
);
