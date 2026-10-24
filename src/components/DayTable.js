// The day's timetable as a table: Time | Subject | Room | Status.
// The Status cell opens a picker with Present / Absent / Cancelled / Clear.
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { subjectTitle } from '../lib/attendance';
import { formatTime, minutes } from '../lib/dates';
import { statusColor, statusSoft, useTheme } from '../lib/theme';

export const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', icon: 'checkmark-circle', tone: 'safe' },
  { value: 'absent', label: 'Absent', icon: 'close-circle', tone: 'danger' },
  { value: 'cancelled', label: 'Cancelled', icon: 'remove-circle', tone: 'none' },
];
const OPTION = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o]));

const BREAK_MIN_GAP = 30; // show a "Break" row for gaps of 30+ minutes

/** Adds "Break" rows between lectures so the table reads like the printed timetable. */
function withBreaks(lectures) {
  const rows = [];
  let lastEnd = null;
  for (const l of lectures) {
    if (lastEnd !== null && minutes(l.start) - minutes(lastEnd) >= BREAK_MIN_GAP) {
      rows.push({ key: `break-${lastEnd}`, kind: 'break', start: lastEnd, end: l.start });
    }
    rows.push(l);
    if (lastEnd === null || minutes(l.end) > minutes(lastEnd)) lastEnd = l.end;
  }
  return rows;
}

const shortTime = (t) => formatTime(t).replace(' AM', '').replace(' PM', '');

/** `locked` (e.g. a future day) makes the Status cell call `onLockedPress` instead of opening the picker. */
export function DayTable({ lectures, statusBySlot, onChange, locked, onLockedPress }) {
  const t = useTheme();
  const [picking, setPicking] = useState(null);
  const rows = withBreaks(lectures);

  const choose = (value) => {
    const l = picking;
    setPicking(null);
    onChange(l, value);
  };

  return (
    <View style={[styles.table, { borderColor: t.border, backgroundColor: t.card }]}>
      <View style={[styles.row, styles.head, { borderColor: t.border }]}>
        <Text style={[styles.cTime, styles.headText, { color: t.muted }]}>Time</Text>
        <Text style={[styles.cSubject, styles.headText, { color: t.muted }]}>Subject</Text>
        <Text style={[styles.cRoom, styles.headText, { color: t.muted }]}>Room</Text>
        <Text style={[styles.cStatus, styles.headText, { color: t.muted, textAlign: 'center' }]}>Status</Text>
      </View>

      {rows.map((l, i) => {
        const last = i === rows.length - 1;
        const tracked = l.kind === 'mine';
        const name =
          l.kind === 'break'
            ? 'Break'
            : l.kind === 'other'
            ? 'Not your lecture'
            : l.kind === 'untracked'
            ? l.label || 'Free period'
            : subjectTitle(l.subject);
        const status = tracked ? statusBySlot[l.key] : null;
        const opt = status ? OPTION[status] : null;
        return (
          <View key={l.key} style={[styles.row, { borderColor: t.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }]}>
            <Text style={[styles.cTime, { color: tracked ? t.text : t.disabled, fontSize: 12 }]}>
              {shortTime(l.start)}
              {'\n'}
              {shortTime(l.end)}
            </Text>
            <View style={styles.cSubject}>
              <Text style={{ color: tracked ? t.text : t.disabled, fontWeight: tracked ? '600' : '400', fontSize: 14 }} numberOfLines={3}>
                {name}
              </Text>
              {tracked && (l.extra || l.count > 1) ? (
                <Text style={{ color: t.muted, fontSize: 11 }}>
                  {[l.extra ? 'Extra' : null, l.count > 1 ? `counts ×${l.count}` : null].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.cRoom, { color: tracked ? t.muted : t.disabled, fontSize: 12 }]}>{l.room || ''}</Text>
            <View style={styles.cStatus}>
              {tracked ? (
                <Pressable
                  onPress={() => (locked ? onLockedPress?.() : setPicking(l))}
                  accessibilityRole="button"
                  accessibilityLabel={`Attendance for ${name}: ${opt ? opt.label : 'not marked'}`}
                  style={[
                    styles.select,
                    {
                      borderColor: opt ? statusColor(t, opt.tone) : t.border,
                      backgroundColor: opt ? statusSoft(t, opt.tone) : t.input,
                    },
                  ]}
                >
                  <Text style={{ color: opt ? statusColor(t, opt.tone) : t.muted, fontWeight: '600', fontSize: 13 }} numberOfLines={1}>
                    {opt ? opt.label : 'Mark'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={opt ? statusColor(t, opt.tone) : t.muted} />
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}

      <Modal visible={Boolean(picking)} transparent animationType="fade" onRequestClose={() => setPicking(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPicking(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: t.card }]}>
            <Text style={{ color: t.text, fontSize: 17, fontWeight: '700' }} numberOfLines={2}>
              {picking ? subjectTitle(picking.subject) : ''}
            </Text>
            <Text style={{ color: t.muted, marginBottom: 12 }}>
              {picking ? `${formatTime(picking.start)} – ${formatTime(picking.end)}` : ''}
            </Text>
            {STATUS_OPTIONS.map((o) => {
              const selected = picking && statusBySlot[picking.key] === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => choose(o.value)}
                  style={[styles.option, { borderColor: selected ? statusColor(t, o.tone) : t.border, backgroundColor: selected ? statusSoft(t, o.tone) : 'transparent' }]}
                >
                  <Ionicons name={o.icon} size={22} color={statusColor(t, o.tone)} />
                  <Text style={{ color: t.text, fontSize: 16, fontWeight: '600', marginLeft: 10, flex: 1 }}>{o.label}</Text>
                  {selected ? <Ionicons name="checkmark" size={20} color={statusColor(t, o.tone)} /> : null}
                </Pressable>
              );
            })}
            {picking && statusBySlot[picking.key] ? (
              <Pressable onPress={() => choose(null)} style={[styles.option, { borderColor: t.border }]}>
                <Ionicons name="refresh" size={22} color={t.muted} />
                <Text style={{ color: t.muted, fontSize: 16, fontWeight: '600', marginLeft: 10 }}>Clear (not marked)</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, minHeight: 52 },
  head: { minHeight: 34, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  headText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  cTime: { width: 52 },
  cSubject: { flex: 1, paddingRight: 6 },
  cRoom: { width: 42 },
  cStatus: { width: 104, alignItems: 'stretch' },
  select: {
    minHeight: 40,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' },
  sheet: { padding: 20, paddingBottom: 32, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, padding: 14, marginBottom: 8 },
});
