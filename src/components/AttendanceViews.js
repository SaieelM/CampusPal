import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { fmtPct, overallShortageMessage, pctLabel, shortageMessage, skipText, subjectTitle } from '../lib/attendance';
import { OVERALL_MIN } from '../lib/config';
import { formatTime } from '../lib/dates';
import { statusColor, useTheme } from '../lib/theme';
import { Banner, Card, ProgressBar } from './ui';

const STATUS_META = {
  present: { label: 'Present', icon: 'checkmark-circle', key: 'safe' },
  absent: { label: 'Absent', icon: 'close-circle', key: 'danger' },
  cancelled: { label: 'Cancelled', icon: 'remove-circle', key: 'none' },
};

/** One lecture in a day view, with Present / Absent / Cancelled buttons. */
export function LectureRow({ lecture, status, onMark, onClear, compact }) {
  const t = useTheme();
  const time = `${formatTime(lecture.start)} – ${formatTime(lecture.end)}`;

  if (lecture.kind !== 'mine') {
    const title =
      lecture.kind === 'untracked'
        ? lecture.label || 'Free period'
        : 'Not your lecture';
    const sub =
      lecture.kind === 'untracked'
        ? 'Not tracked for attendance'
        : "Another batch's lab or an elective you don't take";
    return (
      <View style={[styles.row, { borderColor: t.border, backgroundColor: t.bg }]}>
        <Text style={[styles.time, { color: t.disabled }]}>{time}</Text>
        <Text style={{ color: t.muted, fontWeight: '600', fontSize: 15 }}>{title}</Text>
        <Text style={{ color: t.disabled, fontSize: 13 }}>{sub}</Text>
      </View>
    );
  }

  const meta = status ? STATUS_META[status] : null;
  return (
    <View style={[styles.row, { borderColor: meta ? statusColor(t, meta.key) : t.border, backgroundColor: t.card }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[styles.time, { color: t.muted }]}>
          {time}
          {lecture.room ? ` · ${lecture.room}` : ''}
          {lecture.extra ? ' · Extra' : ''}
        </Text>
        {lecture.count > 1 ? <Text style={{ color: t.muted, fontSize: 12 }}>counts as {lecture.count}</Text> : null}
      </View>
      <Text style={{ color: t.text, fontWeight: '700', fontSize: 16, marginBottom: compact ? 6 : 10 }}>
        {subjectTitle(lecture.subject)}
      </Text>
      {meta ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={meta.icon} size={20} color={statusColor(t, meta.key)} />
            <Text style={{ color: statusColor(t, meta.key), fontWeight: '700', marginLeft: 6 }}>{meta.label}</Text>
          </View>
          <Pressable onPress={onClear} hitSlop={10} style={{ padding: 4 }}>
            <Text style={{ color: t.primary, fontWeight: '600' }}>Undo</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['present', 'absent', 'cancelled'].map((s) => (
            <MarkButton key={s} status={s} onPress={() => onMark(s)} />
          ))}
        </View>
      )}
    </View>
  );
}

function MarkButton({ status, onPress }) {
  const t = useTheme();
  const meta = STATUS_META[status];
  const color = statusColor(t, meta.key);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Mark ${meta.label}`}
      style={({ pressed }) => [styles.markBtn, { borderColor: color, opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={meta.icon} size={18} color={color} />
      <Text style={{ color, fontWeight: '700', marginLeft: 4, fontSize: 14 }}>{meta.label}</Text>
    </Pressable>
  );
}

/** Big overall attendance card for the dashboard. */
export function OverallCard({ overall, onPress }) {
  const t = useTheme();
  const color = statusColor(t, overall.status);
  let line = 'Mark your lectures to see predictions';
  if (overall.pct !== null) {
    line =
      overall.status === 'danger'
        ? `Attend the next ${overall.mustAttend} lectures to reach ${pctLabel(OVERALL_MIN)}`
        : overall.canSkip === 0
        ? 'No skips left overall – attend every lecture'
        : `You can skip ${overall.canSkip} more lecture${overall.canSkip === 1 ? '' : 's'} overall`;
  }
  return (
    <Card onPress={onPress}>
      <Text style={{ color: t.muted, fontWeight: '600' }}>Overall attendance</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginVertical: 4 }}>
        <Text style={{ color, fontSize: 40, fontWeight: '800' }}>{fmtPct(overall.pct)}</Text>
        <Text style={{ color: t.muted, marginLeft: 8 }}>
          {overall.attended}/{overall.total} · min {pctLabel(OVERALL_MIN)}
        </Text>
      </View>
      <ProgressBar value={overall.pct === null ? 0 : overall.pct / 100} color={color} />
      <Text style={{ color: t.text, marginTop: 8, fontWeight: '500' }}>{line}</Text>
    </Card>
  );
}

/** Per-subject card with % and skip prediction. */
export function SubjectCard({ stat, onPress }) {
  const t = useTheme();
  const color = statusColor(t, stat.status);
  return (
    <Card onPress={onPress} style={{ borderLeftWidth: 5, borderLeftColor: color }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 16 }} numberOfLines={2}>
            {subjectTitle(stat.subject)}
          </Text>
          {stat.subject.code ? <Text style={{ color: t.muted, fontSize: 13 }}>{stat.subject.code}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color, fontSize: 22, fontWeight: '800' }}>{fmtPct(stat.pct)}</Text>
          <Text style={{ color: t.muted, fontSize: 12 }}>
            {stat.attended}/{stat.total}
          </Text>
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        <ProgressBar value={stat.pct === null ? 0 : stat.pct / 100} color={color} />
      </View>
      <Text style={{ color: stat.status === 'danger' ? t.danger : t.text, marginTop: 8, fontSize: 14 }}>{skipText(stat)}</Text>
    </Card>
  );
}

/** Ordinance warning for one course below 50%. */
export function ShortageBanner({ stat }) {
  const t = useTheme();
  const m = shortageMessage(stat);
  return (
    <Banner status="danger" title={m.title}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: t.text }}>
        {m.body}
        {'\n'}
        <Text style={{ fontWeight: '700' }}>{m.action}</Text>
      </Text>
    </Banner>
  );
}

export function OverallShortageBanner({ overall }) {
  const t = useTheme();
  const m = overallShortageMessage(overall);
  return (
    <Banner status="danger" title={m.title}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: t.text }}>
        {m.body}
        {'\n'}
        <Text style={{ fontWeight: '700' }}>{m.action}</Text>
      </Text>
    </Banner>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1.5, borderRadius: 14, padding: 12, marginBottom: 10 },
  time: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  markBtn: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1.5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
