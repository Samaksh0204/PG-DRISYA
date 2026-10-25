import {
  Wifi, Utensils, Snowflake, WashingMachine, Cctv, Zap, Car, Droplets, CookingPot, BookOpen, Dumbbell, Tv,
  Stethoscope, Sparkles, Thermometer, Shirt, type LucideIcon,
} from 'lucide-react';
import { AMENITIES } from './amenities';

export const AMENITY_ICONS: Record<string, LucideIcon> = {
  wifi: Wifi, mess: Utensils, ac: Snowflake, laundry: WashingMachine, cctv: Cctv, power: Zap, parking: Car,
  hotwater: Droplets, kitchen: CookingPot, study: BookOpen, gym: Dumbbell, tv: Tv, medical: Stethoscope,
  housekeeping: Sparkles, geyser: Thermometer, wardrobe: Shirt,
};

export const AMENITY_LABELS: Record<string, string> = Object.fromEntries(AMENITIES.map((a) => [a.key, a.label]));
