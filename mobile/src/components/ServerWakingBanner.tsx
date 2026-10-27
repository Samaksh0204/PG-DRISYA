import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onServerWaking } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// Shown while the API is starting up after being idle (free hosting sleeps).
export function ServerWakingBanner() {
  const insets = useSafeAreaInsets();
  const [waking, setWaking] = useState(false);
  useEffect(() => onServerWaking(setWaking), []);
  if (!waking) return null;
  return (
    <View style={[s.bar, { paddingTop: insets.top + 6 }]} accessibilityRole="alert" accessibilityLiveRegion="polite" pointerEvents="none">
      <ActivityIndicator size="small" color={colors.white} />
      <Text style={s.text}>Waking up the server — this can take up to a minute…</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, elevation: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.ink[900], paddingBottom: 8, paddingHorizontal: spacing.lg },
  text: { color: colors.white, fontSize: 13, fontWeight: '600', flexShrink: 1 },
});
