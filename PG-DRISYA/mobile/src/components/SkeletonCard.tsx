import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

const CARD_WIDTH = (Dimensions.get('window').width - spacing.lg * 2 - spacing.md) / 2;

export function SkeletonCard({ wide }: { wide?: boolean }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <View style={[styles.card, { width: wide ? '100%' : CARD_WIDTH }]}>
      <Animated.View style={[styles.imagePlaceholder, { opacity, height: wide ? 180 : 130 }]} />
      <View style={styles.info}>
        <Animated.View style={[styles.line, { width: '75%', opacity }]} />
        <Animated.View style={[styles.line, { width: '50%', height: 10, opacity }]} />
        <Animated.View style={[styles.line, { width: '40%', marginTop: 8, opacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  imagePlaceholder: {
    width: '100%',
    backgroundColor: colors.ink[100],
  },
  info: {
    padding: spacing.md,
    gap: 6,
  },
  line: {
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.ink[100],
  },
});
