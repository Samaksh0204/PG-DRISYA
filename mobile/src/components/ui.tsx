// Shared building blocks, styled to match the website's components
// (.btn-primary, .btn-outline, .input, .chip, .card, badges).
import React from 'react';
import {
  ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radius, shadow, spacing } from '../theme/spacing';
import { STATUS_LABEL, avatarUrl } from '../utils/format';
import type { IconName } from '../data/amenities';

export type { IconName };

export function Icon({ name, size = 18, color = colors.ink[700], style, accessibilityLabel }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle>; accessibilityLabel?: string }) {
  // Decorative unless labelled.
  return <Ionicons name={name} size={size} color={color} style={style} accessibilityLabel={accessibilityLabel} accessible={!!accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'} />;
}

type ButtonVariant = 'primary' | 'outline' | 'danger' | 'ghost' | 'dark';

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, icon }: {
  title: string; onPress: () => void; variant?: ButtonVariant; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; icon?: IconName;
}) {
  const solid = variant === 'primary' || variant === 'danger' || variant === 'dark';
  const fg = solid ? colors.white : variant === 'outline' ? colors.ink[900] : colors.brand[700];
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.btn, styles[variant], (disabled || loading) && { opacity: 0.5 }, style]}
    >
      {loading ? <ActivityIndicator color={solid ? colors.white : colors.brand[500]} /> : (
        <View style={styles.btnInner}>
          {icon ? <Icon name={icon} size={17} color={fg} /> : null}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.ink[400]}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        {...props}
        style={[styles.input, focused && styles.inputFocused, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// Selected = pale teal with a teal border (the website's .chip-active).
export function Chip({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} activeOpacity={0.8} style={[styles.chip, active && styles.chipActive]}>
      {icon ? <Icon name={icon} size={14} color={active ? colors.brand[700] : colors.ink[500]} /> : null}
      <Text style={[styles.chipText, active && { color: colors.brand[800] }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const PILL_TONES = {
  good: { bg: colors.brand[50], fg: colors.brand[800] },
  bad: { bg: colors.red[50], fg: colors.red[700] },
  wait: { bg: colors.amber[100], fg: colors.amber[700] },
  info: { bg: colors.ink[100], fg: colors.ink[700] },
};

export function StatusPill({ status }: { status: string }) {
  const tone = ['confirmed', 'accepted', 'completed', 'active', 'resolved'].includes(status) ? 'good'
    : ['declined', 'rejected', 'cancelled'].includes(status) ? 'bad'
      : ['pending', 'pending_review', 'open', 'new'].includes(status) ? 'wait' : 'info';
  const t = PILL_TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.pillText, { color: t.fg }]}>{STATUS_LABEL[status] || status}</Text>
    </View>
  );
}

export function Badge({ label, icon, tone = 'brand', solid }: { label: string; icon?: IconName; tone?: 'brand' | 'amber' | 'ink' | 'red'; solid?: boolean }) {
  const map = {
    brand: { bg: colors.brand[50], fg: colors.brand[700], solidBg: colors.brand[500] },
    amber: { bg: colors.amber[50], fg: colors.amber[700], solidBg: colors.amber[500] },
    ink: { bg: colors.ink[100], fg: colors.ink[700], solidBg: colors.ink[900] },
    red: { bg: colors.red[50], fg: colors.red[700], solidBg: colors.red[500] },
  }[tone];
  const fg = solid ? colors.white : map.fg;
  return (
    <View style={[styles.badge, { backgroundColor: solid ? map.solidBg : map.bg }]}>
      {icon ? <Icon name={icon} size={12} color={fg} /> : null}
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function IconTile({ name, size = 44, tone = 'brand' }: { name: IconName; size?: number; tone?: 'brand' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <View style={{ width: size, height: size, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? colors.brand[500] : colors.brand[50] }}>
      <Icon name={name} size={size * 0.48} color={dark ? colors.white : colors.brand[600]} />
    </View>
  );
}

export function Empty({ icon, title, desc, children }: { icon: IconName; title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <IconTile name={icon} size={64} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {desc ? <Text style={styles.emptyDesc}>{desc}</Text> : null}
      {children ? <View style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}>{children}</View> : null}
    </View>
  );
}

export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <View accessibilityRole="alert" style={styles.error}>
      <Icon name="alert-circle-outline" size={16} color={colors.red[700]} />
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, shadow.soft, style]}>{children}</View>;
}

export function SectionHeader({ eyebrow, icon, title, action, onAction }: { eyebrow?: string; icon?: IconName; title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <View style={styles.eyebrowRow}>
            {icon ? <Icon name={icon} size={14} color={colors.brand[600]} /> : null}
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          </View>
        ) : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action && onAction ? (
        <TouchableOpacity onPress={onAction} style={styles.sectionAction} accessibilityRole="button">
          <Text style={styles.sectionActionText}>{action}</Text>
          <Icon name="arrow-forward" size={14} color={colors.brand[600]} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function Avatar({ uri, name, size = 40 }: { uri?: string; name: string; size?: number }) {
  return <Image source={{ uri: uri || avatarUrl(name) }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.ink[100] }} />;
}

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? 6 : 1 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = <Icon name={n <= Math.round(value) ? 'star' : 'star-outline'} size={size} color={n <= Math.round(value) ? colors.warning : colors.ink[300]} />;
        return onChange ? (
          <TouchableOpacity key={n} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`} onPress={() => onChange(n)} hitSlop={6}>{icon}</TouchableOpacity>
        ) : <View key={n}>{icon}</View>;
      })}
    </View>
  );
}

// Two-or-more option switcher (tabs inside a screen).
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity key={o.value} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onChange(o.value)} style={[styles.segmentItem, active && styles.segmentActive]}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>{o.label}</Text>
            {o.count ? <View style={styles.segmentCount}><Text style={styles.segmentCountText}>{o.count}</Text></View> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function ListRow({ icon, label, sub, onPress, danger, right }: { icon: IconName; label: string; sub?: string; onPress: () => void; danger?: boolean; right?: React.ReactNode }) {
  return (
    <TouchableOpacity accessibilityRole="button" style={styles.listRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.listIcon, danger && { backgroundColor: colors.red[50] }]}>
        <Icon name={icon} size={18} color={danger ? colors.red[500] : colors.brand[600]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.listLabel, danger && { color: colors.red[500] }]}>{label}</Text>
        {sub ? <Text style={styles.listSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right}
      <Icon name="chevron-forward" size={18} color={colors.ink[300]} />
    </TouchableOpacity>
  );
}

export function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View style={styles.countBadge}><Text style={styles.countBadgeText}>{count > 99 ? '99+' : count}</Text></View>
  );
}

export function ScreenLoader() {
  return <View style={styles.loader}><ActivityIndicator size="large" color={colors.brand[500]} /></View>;
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.lg, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, minHeight: 46 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: { backgroundColor: colors.brand[500] },
  dark: { backgroundColor: colors.ink[900] },
  danger: { backgroundColor: colors.danger },
  outline: { borderWidth: 1, borderColor: colors.ink[200], backgroundColor: colors.white },
  ghost: { backgroundColor: 'transparent' },
  btnText: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink[700], marginBottom: 6 },
  hint: { fontSize: 12, color: colors.ink[500], marginTop: 4 },
  input: { borderWidth: 1, borderColor: colors.ink[200], borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.ink[900], backgroundColor: colors.white },
  inputFocused: { borderColor: colors.brand[500] },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.ink[200], backgroundColor: colors.white, marginRight: spacing.sm, marginBottom: spacing.sm },
  chipActive: { borderColor: colors.brand[500], backgroundColor: colors.brand[50] },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.ink[700] },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '700' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: spacing['2xl'] },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.ink[900], marginTop: spacing.lg, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: colors.ink[500], marginTop: 6, textAlign: 'center', lineHeight: 20 },
  error: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.red[50], borderWidth: 1, borderColor: colors.red[100], padding: spacing.md, borderRadius: radius.lg, marginVertical: spacing.sm },
  errorText: { flex: 1, color: colors.red[700], fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.ink[200] },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  eyebrow: { fontSize: 13, fontWeight: '700', color: colors.brand[600] },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.ink[900] },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  sectionActionText: { fontSize: 13, fontWeight: '700', color: colors.brand[600] },
  segment: { flexDirection: 'row', backgroundColor: colors.ink[100], borderRadius: radius.lg, padding: 4 },
  segmentItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: radius.md },
  segmentActive: { backgroundColor: colors.white, ...shadow.soft },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.ink[500] },
  segmentTextActive: { color: colors.ink[900] },
  segmentCount: { backgroundColor: colors.brand[500], borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segmentCountText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.ink[200] },
  listIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  listLabel: { fontSize: 15, fontWeight: '600', color: colors.ink[900] },
  listSub: { fontSize: 12, color: colors.ink[500], marginTop: 1 },
  countBadge: { backgroundColor: colors.brand[500], borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginRight: 6 },
  countBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.page },
});
