// Phone push notifications (Expo push service → FCM on Android, APNs on iOS).
//
// Needs, outside the code:
//  • an Expo project ID (run `eas init` once; it's written to app.json → extra.eas.projectId)
//  • a development or store build for Android — Expo Go on Android can't receive push
//  • FCM credentials (Android) / APNs key (iOS) uploaded with `eas credentials`
// Until then registration is skipped with a log message and nothing else breaks.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { request } from './api';
import { colors } from '../theme/colors';

const PUSH_TOKEN_KEY = 'drisya_push_token';

// Show alerts while the app is open too (the in-app badge also updates).
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export function projectId(): string | undefined {
  return (Constants.expoConfig?.extra as any)?.eas?.projectId || (Constants as any).easConfig?.projectId;
}

export type PushSetup = { ok: true; token: string } | { ok: false; reason: 'not-device' | 'denied' | 'no-project' | 'error' };

// Ask permission (once — the OS remembers), get this device's token and tell the server.
export async function registerForPush(): Promise<PushSetup> {
  try {
    if (!Device.isDevice) return { ok: false, reason: 'not-device' };
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Messages and bookings',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: colors.brand[500],
        vibrationPattern: [0, 200, 120, 200],
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return { ok: false, reason: 'denied' };

    const pid = projectId();
    if (!pid) {
      console.warn('[push] No Expo projectId — run `eas init` in mobile/ to enable push notifications.');
      return { ok: false, reason: 'no-project' };
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: pid });
    await request('/push/register', { method: 'POST', body: JSON.stringify({ token, platform: Platform.OS }) });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return { ok: true, token };
  } catch (err: any) {
    console.warn('[push] registration failed:', err?.message);
    return { ok: false, reason: 'error' };
  }
}

// On sign-out: stop this device getting the old account's notifications.
// Must run while the session token is still valid.
export async function unregisterPush() {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    await request('/push/unregister', { method: 'POST', body: JSON.stringify({ token }), timeoutMs: 5000 });
  } catch { /* the server also drops tokens Expo reports as dead */ }
}
