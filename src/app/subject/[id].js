// One subject: stats, prediction, ordinance warning and editable history.
import { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ShortageBanner, SubjectCard } from '../../components/AttendanceViews';
import { Banner, Button, Card, EmptyState, Heading, Screen } from '../../components/ui';
import { computeStats, subjectTitle } from '../../lib/attendance';
import { useClass } from '../../lib/ClassContext';
import { formatDate, formatTime } from '../../lib/dates';
import { statusColor, useTheme } from '../../lib/theme';
import { useMarking } from '../../lib/useMarking';

const LABEL = { present: 'Present', absent: 'Absent', cancelled: 'Cancelled' };
const COLOR_KEY = { present: 'safe', absent: 'danger', cancelled: 'none' };

export default function SubjectDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams();
  const { cls, membership, records } = useClass();
  const { mark, clear } = useMarking();
  const [selected, setSelected] = useState(null);

  const stat = useMemo(
    () => (cls && membership ? computeStats(cls, membership, records).perSubject.find((s) => s.subject.id === id) : null),
    [cls, membership, records, id]
  );
  const history = useMemo(
    () => records.filter((r) => r.subject_id === id).sort((a, b) => (b.date + (b.start || '')).localeCompare(a.date + (a.start || ''))),
    [records, id]
  );

  if (!stat) {
    return (
      <Screen edges={[]}>
        <EmptyState title="Subject not found" />
      </Screen>
    );
  }

  const lectureOf = (r) => ({
    key: r.slot_key,
    date: r.date,
    subject: stat.subject,
    count: r.count,
    extra: Boolean(r.extra),
    start: r.start,
    end: r.end,
  });
  const apply = async (fn) => {
    const r = selected;
    setSelected(null);
    await fn(lectureOf(r));
  };

  const s = stat.subject;
  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: s.type === 'lab' ? `${s.name} Lab` : s.name }} />
      {stat.status === 'danger' ? <ShortageBanner stat={stat} /> : null}
      <SubjectCard stat={stat} />
      <Card>
        <Text style={{ color: t.text, fontWeight: '700', marginBottom: 4 }}>{subjectTitle(s)}</Text>
        {s.code ? <Text style={{ color: t.muted }}>Course code: {s.code}</Text> : null}
        {s.professor ? <Text style={{ color: t.muted }}>Professor: {s.professor}</Text> : null}
        <Text style={{ color: t.muted }}>{s.elective ? `Elective · ${s.group}` : 'Compulsory'}</Text>
      </Card>
      <Banner status="none" icon="information-circle-outline">
        Minimum 50% attendance is required in this course, and 75% overall.
      </Banner>

      <Heading>History ({history.length})</Heading>
      {history.length === 0 ? <Text style={{ color: t.muted }}>Nothing marked yet.</Text> : null}
      {history.map((r) => {
        const color = statusColor(t, COLOR_KEY[r.status]);
        return (
          <Pressable key={`${r.date}-${r.slot_key}`} onPress={() => setSelected(r)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: '600' }}>{formatDate(r.date)}</Text>
                <Text style={{ color: t.muted, fontSize: 13 }}>
                  {r.start ? formatTime(r.start) : ''}
                  {r.extra ? ' · Extra lecture' : ''}
                  {r.count > 1 ? ` · counts ×${r.count}` : ''}
                </Text>
              </View>
              <Text style={{ color, fontWeight: '700', marginRight: 6 }}>{LABEL[r.status]}</Text>
              <Ionicons name="create-outline" size={18} color={t.muted} />
            </View>
          </Pressable>
        );
      })}

      <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' }} onPress={() => setSelected(null)}>
          <Pressable style={{ backgroundColor: t.card, padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 10 }}>
            <Text style={{ color: t.text, fontSize: 17, fontWeight: '700', marginBottom: 4 }}>
              {selected ? formatDate(selected.date) : ''} – change entry
            </Text>
            <Button title="Present" variant="secondary" onPress={() => apply((l) => mark(l, 'present'))} />
            <Button title="Absent" variant="secondary" onPress={() => apply((l) => mark(l, 'absent'))} />
            <Button title="Cancelled (doesn't count)" variant="secondary" onPress={() => apply((l) => mark(l, 'cancelled'))} />
            <Button title="Remove entry" variant="ghost" onPress={() => apply(clear)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
