import { Text, View } from 'react-native';

import { fmtPct, overallShortageMessage, pctLabel, shortageMessage, skipText, subjectTitle } from '../lib/attendance';
import { OVERALL_MIN } from '../lib/config';
import { statusColor, useTheme } from '../lib/theme';
import { Banner, Card, ProgressBar } from './ui';

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
