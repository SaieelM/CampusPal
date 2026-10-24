// Read-only week view of the timetable (one column per day, scroll sideways).
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { weekStart } from '../../components/WeekStrip';
import { Row } from '../../components/ui';
import { subjectTitle } from '../../lib/attendance';
import { useClass } from '../../lib/ClassContext';
import { DAY_SHORT, addDays, formatDate, formatTime, parseDate, todayStr } from '../../lib/dates';
import { lecturesOn } from '../../lib/timetable';
import { statusColor, useTheme } from '../../lib/theme';

const TONE = { present: 'safe', absent: 'danger', cancelled: 'none' };

export default function WeekView() {
  const t = useTheme();
  const params = useLocalSearchParams();
  const { cls, membership, records, holidays } = useClass();
  const [monday, setMonday] = useState(weekStart(params.date ? String(params.date) : todayStr()));
  const days = useMemo(() => [0, 1, 2, 3, 4, 5].map((i) => addDays(monday, i)), [monday]);
  const status = useMemo(() => {
    const m = {};
    for (const r of records) m[`${r.date}|${r.slot_key}`] = r.status;
    return m;
  }, [records]);

  if (!cls || !membership) return null;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Row style={{ justifyContent: 'space-between', padding: 12 }}>
        <Pressable onPress={() => setMonday(addDays(monday, -7))} hitSlop={10} accessibilityLabel="Previous week">
          <Ionicons name="chevron-back" size={24} color={t.primary} />
        </Pressable>
        <Text style={{ color: t.text, fontWeight: '700', fontSize: 16 }}>
          {formatDate(monday, { withDay: false })} – {formatDate(addDays(monday, 5), { withDay: false })}
        </Text>
        <Pressable onPress={() => setMonday(addDays(monday, 7))} hitSlop={10} accessibilityLabel="Next week">
          <Ionicons name="chevron-forward" size={24} color={t.primary} />
        </Pressable>
      </Row>
      <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}>
        {days.map((d) => {
          const lectures = lecturesOn(cls, membership, d, records.filter((r) => r.date === d && r.extra)).filter((l) => l.kind !== 'other');
          const isToday = d === todayStr();
          return (
            <View key={d} style={{ width: 150, marginRight: 10 }}>
              <View style={{ alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: isToday ? t.primarySoft : t.card, marginBottom: 8 }}>
                <Text style={{ color: isToday ? t.primary : t.muted, fontSize: 12 }}>{DAY_SHORT[parseDate(d).getDay() || 7]}</Text>
                <Text style={{ color: isToday ? t.primary : t.text, fontWeight: '700', fontSize: 16 }}>{parseDate(d).getDate()}</Text>
              </View>
              <ScrollView>
                {holidays.has(d) ? (
                  <Text style={{ color: t.primary, textAlign: 'center', marginTop: 8 }}>Holiday</Text>
                ) : lectures.length === 0 ? (
                  <Text style={{ color: t.disabled, textAlign: 'center', marginTop: 8 }}>No lectures</Text>
                ) : (
                  lectures.map((l) => {
                    const s = status[`${d}|${l.key}`];
                    const mine = l.kind === 'mine';
                    return (
                      <View
                        key={l.key}
                        style={{
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: s ? statusColor(t, TONE[s]) : t.border,
                          backgroundColor: mine ? t.card : t.bg,
                          padding: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ color: t.muted, fontSize: 11 }}>
                          {formatTime(l.start)} – {formatTime(l.end)}
                        </Text>
                        <Text style={{ color: mine ? t.text : t.muted, fontWeight: mine ? '600' : '400', fontSize: 13 }} numberOfLines={3}>
                          {mine ? subjectTitle(l.subject) : l.label || 'Free period'}
                        </Text>
                        {l.room ? <Text style={{ color: t.muted, fontSize: 11 }}>{l.room}</Text> : null}
                        {s ? (
                          <Text style={{ color: statusColor(t, TONE[s]), fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                            {s[0].toUpperCase() + s.slice(1)}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
