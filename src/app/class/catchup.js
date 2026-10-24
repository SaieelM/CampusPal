// Mark every past lecture that hasn't been marked yet, day by day.
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { DayTable } from '../../components/DayTable';
import { Body, Button, EmptyState, Row, Screen } from '../../components/ui';
import { useClass } from '../../lib/ClassContext';
import { formatDate } from '../../lib/dates';
import { unmarkedLectures } from '../../lib/timetable';
import { useTheme } from '../../lib/theme';
import { useMarking } from '../../lib/useMarking';

const PAGE_DAYS = 10;

export default function CatchUp() {
  const t = useTheme();
  const { cls, membership, records, holidays } = useClass();
  const { setStatus, markMany, toggleHoliday } = useMarking();
  const [busyDate, setBusyDate] = useState(null);
  const [showDays, setShowDays] = useState(PAGE_DAYS);

  const byDate = useMemo(() => {
    const list = cls && membership ? unmarkedLectures(cls, membership, records, holidays) : [];
    const groups = new Map();
    for (const l of list) {
      if (!groups.has(l.date)) groups.set(l.date, []);
      groups.get(l.date).push(l);
    }
    // Most recent first – that's what students remember best.
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [cls, membership, records, holidays]);

  const total = byDate.reduce((n, [, ls]) => n + ls.length, 0);

  if (total === 0) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="checkmark-done-circle-outline" title="All caught up!" message="Every past lecture is marked. Nice." />
      </Screen>
    );
  }

  const run = async (date, fn) => {
    setBusyDate(date);
    try {
      await fn();
    } finally {
      setBusyDate(null);
    }
  };

  return (
    <Screen edges={[]}>
      <Body muted style={{ marginBottom: 12 }}>
        {total} lecture{total === 1 ? '' : 's'} since {formatDate(cls.startDate, { withDay: false })} still need marking. Use the
        quick buttons for whole days.
      </Body>
      {byDate.slice(0, showDays).map(([date, lectures]) => (
        <View key={date} style={{ marginBottom: 18 }}>
          <Text style={{ color: t.text, fontSize: 17, fontWeight: '700', marginBottom: 8 }}>{formatDate(date)}</Text>
          <Row style={{ gap: 8, marginBottom: 10 }}>
            <Button
              small
              title="All present"
              icon="checkmark-done"
              variant="secondary"
              style={{ flex: 1 }}
              loading={busyDate === date}
              onPress={() => run(date, () => markMany(lectures, 'present'))}
            />
            <Button
              small
              title="Holiday"
              icon="sunny-outline"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => run(date, () => toggleHoliday(date, true))}
            />
          </Row>
          <DayTable lectures={lectures} statusBySlot={{}} onChange={setStatus} />
        </View>
      ))}
      {byDate.length > showDays ? (
        <Button title={`Show older days (${byDate.length - showDays} more)`} variant="outline" onPress={() => setShowDays((n) => n + PAGE_DAYS)} />
      ) : null}
    </Screen>
  );
}
