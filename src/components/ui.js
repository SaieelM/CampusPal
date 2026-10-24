import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { statusColor, statusSoft, useTheme } from '../lib/theme';

export function toast(message) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert(message);
}

export function Screen({ children, scroll = true, refreshing, onRefresh, edges = ['top'], contentStyle }) {
  const t = useTheme();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.primary} colors={[t.primary]} /> : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={edges}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Title({ children, style }) {
  const t = useTheme();
  return <Text style={[styles.title, { color: t.text }, style]}>{children}</Text>;
}

export function Heading({ children, style, right }) {
  const t = useTheme();
  return (
    <View style={styles.headingRow}>
      <Text style={[styles.heading, { color: t.text }, style]}>{children}</Text>
      {right}
    </View>
  );
}

export function Body({ children, style, muted, numberOfLines }) {
  const t = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[styles.body, { color: muted ? t.muted : t.text }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style, onPress }) {
  const t = useTheme();
  const s = [styles.card, { backgroundColor: t.card, borderColor: t.border }, style];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...s, pressed && { opacity: 0.85 }]} android_ripple={{ color: t.border }}>
        {children}
      </Pressable>
    );
  }
  return <View style={s}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, small }) {
  const t = useTheme();
  const palette = {
    primary: { bg: t.primary, fg: t.primaryText, border: t.primary },
    secondary: { bg: t.primarySoft, fg: t.primary, border: t.primarySoft },
    outline: { bg: 'transparent', fg: t.primary, border: t.primary },
    danger: { bg: t.danger, fg: '#fff', border: t.danger },
    ghost: { bg: 'transparent', fg: t.primary, border: 'transparent' },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: off ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={palette.fg} style={{ marginRight: 6 }} /> : null}
          <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ label, error, hint, style, ...props }) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={[styles.label, { color: t.muted }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={t.disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          { color: t.text, backgroundColor: t.input, borderColor: error ? t.danger : focused ? t.primary : t.border },
          props.multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 },
        ]}
        {...props}
      />
      {error ? <Text style={[styles.hint, { color: t.danger }]}>{error}</Text> : hint ? <Text style={[styles.hint, { color: t.muted }]}>{hint}</Text> : null}
    </View>
  );
}

export function Label({ children }) {
  const t = useTheme();
  return <Text style={[styles.label, { color: t.muted }]}>{children}</Text>;
}

export function Chip({ label, selected, onPress, icon, style }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { backgroundColor: selected ? t.primary : t.card, borderColor: selected ? t.primary : t.border },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? t.primaryText : t.muted} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color: selected ? t.primaryText : t.text, fontSize: 14, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children, style }) {
  return <View style={[styles.chipRow, style]}>{children}</View>;
}

export function Banner({ status = 'warning', icon, title, children, action }) {
  const t = useTheme();
  const color = statusColor(t, status);
  return (
    <View style={[styles.banner, { backgroundColor: statusSoft(t, status), borderLeftColor: color }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Ionicons name={icon || (status === 'danger' ? 'warning' : status === 'safe' ? 'checkmark-circle' : 'alert-circle')} size={20} color={color} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          {title ? <Text style={{ color, fontWeight: '700', fontSize: 15, marginBottom: 2 }}>{title}</Text> : null}
          {typeof children === 'string' ? <Text style={{ color: t.text, fontSize: 14, lineHeight: 20 }}>{children}</Text> : children}
          {action}
        </View>
      </View>
    </View>
  );
}

export function EmptyState({ icon = 'albums-outline', title, message, children }) {
  const t = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={t.disabled} />
      <Text style={[styles.heading, { color: t.text, textAlign: 'center', marginTop: 12 }]}>{title}</Text>
      {message ? <Text style={[styles.body, { color: t.muted, textAlign: 'center', marginTop: 4 }]}>{message}</Text> : null}
      <View style={{ marginTop: 16, alignSelf: 'stretch' }}>{children}</View>
    </View>
  );
}

export function Loading({ message }) {
  const t = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: t.bg }]}>
      <ActivityIndicator size="large" color={t.primary} />
      {message ? <Text style={{ color: t.muted, marginTop: 12 }}>{message}</Text> : null}
    </View>
  );
}

export function ProgressBar({ value, color }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={[styles.progressTrack, { backgroundColor: t.border }]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 4, backgroundColor: color || t.primary }} />
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 10 }) {
  const t = useTheme();
  const btn = (icon, next, off) => (
    <Pressable onPress={off ? undefined : () => onChange(next)} style={[styles.stepBtn, { borderColor: t.border, opacity: off ? 0.4 : 1 }]}>
      <Ionicons name={icon} size={20} color={t.primary} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {btn('remove', value - 1, value <= min)}
      <Text style={{ color: t.text, fontSize: 18, fontWeight: '700', minWidth: 36, textAlign: 'center' }}>{value}</Text>
      {btn('add', value + 1, value >= max)}
    </View>
  );
}

export function Row({ children, style }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: 10 }} />;
}

export function confirm(title, message, confirmText = 'OK', destructive = false) {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 },
  heading: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  button: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 40, paddingHorizontal: 12, borderRadius: 10 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { minHeight: 50, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  hint: { fontSize: 13, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, minHeight: 40, borderRadius: 20, borderWidth: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  banner: { borderRadius: 12, borderLeftWidth: 5, padding: 12, marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
