// Mon–Sat strip for the week of the selected date, with a status dot per day.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DAY_SHORT, addDays, parseDate, weekday } from '../lib/dates';
import { useTheme } from '../lib/theme';

export function weekStart(date) {
  return addDays(date, 1 - weekday(date)); // Monday of that week
}

/**
 * `dayState(date)` returns 'done' | 'pending' | 'holiday' | 'future' | 'none'.
 */
export function WeekStrip({ date, onSelect, dayState }) {
  const t = useTheme();
  const monday = weekStart(date);
  const days = [0, 1, 2, 3, 4, 5].map((i) => addDays(monday, i));
  const dotColor = { done: t.safe, pending: t.warning, holiday: t.primary, future: t.border, none: 'transparent' };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => onSelect(addDays(date, -7))} hitSlop={8} style={styles.arrow} accessibilityLabel="Previous week">
        <Ionicons name="chevron-back" size={22} color={t.primary} />
      </Pressable>
      {days.map((d) => {
        const selected = d === date;
        return (
          <Pressable
            key={d}
            onPress={() => onSelect(d)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.day, { borderColor: selected ? t.primary : t.border, backgroundColor: selected ? t.primarySoft : t.card }]}
          >
            <Text style={{ color: selected ? t.primary : t.muted, fontSize: 12 }}>{DAY_SHORT[weekday(d)]}</Text>
            <Text style={{ color: selected ? t.primary : t.text, fontSize: 16, fontWeight: '700' }}>{parseDate(d).getDate()}</Text>
            <View style={[styles.dot, { backgroundColor: dotColor[dayState(d)] }]} />
          </Pressable>
        );
      })}
      <Pressable onPress={() => onSelect(addDays(date, 7))} hitSlop={8} style={styles.arrow} accessibilityLabel="Next week">
        <Ionicons name="chevron-forward" size={22} color={t.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  arrow: { paddingVertical: 10 },
  day: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 3 },
});
