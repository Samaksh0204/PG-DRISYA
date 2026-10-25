import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputProps, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { STATUS_LABEL } from '../utils/format';

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: { title: string; onPress: () => void; variant?: 'primary' | 'outline' | 'danger' | 'ghost'; loading?: boolean; disabled?: boolean; style?: ViewStyle }) {
  const v = styles[variant];
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} onPress={onPress} disabled={disabled || loading} activeOpacity={0.8} style={[styles.btn, v, (disabled || loading) && { opacity: 0.5 }, style]}>
      {loading ? <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.white : colors.coral[500]} /> : (
        <Text style={[styles.btnText, { color: variant === 'primary' || variant === 'danger' ? colors.white : variant === 'outline' ? colors.ink[900] : colors.coral[600] }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.ink[400]} style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]} {...props} />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function StatusPill({ status }: { status: string }) {
  const good = ['confirmed', 'accepted', 'completed', 'active'].includes(status);
  const bad = ['declined', 'rejected'].includes(status);
  const wait = ['pending', 'pending_review'].includes(status);
  return (
    <View style={[styles.pill, { backgroundColor: good ? colors.teal[100] : bad ? colors.red[50] : wait ? colors.amber[100] : colors.ink[100] }]}>
      <Text style={[styles.pillText, { color: good ? colors.teal[700] : bad ? colors.red[700] : wait ? colors.amber[700] : colors.ink[700] }]}>{STATUS_LABEL[status] || status}</Text>
    </View>
  );
}

export function Empty({ icon, title, desc }: { icon: string; title: string; desc?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40 }}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {desc ? <Text style={styles.emptyDesc}>{desc}</Text> : null}
    </View>
  );
}

export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <Text accessibilityRole="alert" style={styles.error}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  primary: { backgroundColor: colors.coral[500] },
  danger: { backgroundColor: colors.red[500] },
  outline: { borderWidth: 1, borderColor: colors.ink[200], backgroundColor: colors.white },
  ghost: { backgroundColor: 'transparent' },
  btnText: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.ink[900], backgroundColor: colors.white },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.ink[100], marginRight: spacing.sm, marginBottom: spacing.sm },
  chipActive: { backgroundColor: colors.coral[500] },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.ink[700] },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: spacing['2xl'] },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.ink[900], marginTop: spacing.md, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: colors.ink[500], marginTop: 6, textAlign: 'center' },
  error: { color: colors.red[700], backgroundColor: colors.red[50], padding: spacing.md, borderRadius: radius.md, marginVertical: spacing.sm, fontSize: 13 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.ink[100] },
});
