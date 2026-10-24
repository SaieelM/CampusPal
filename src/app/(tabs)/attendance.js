import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ActionSheet } from '../../components/ActionSheet';
import { DayTable } from '../../components/DayTable';
import { WeekStrip } from '../../components/WeekStrip';
import { Banner, Button, EmptyState, Loading, Row, Screen, Title, confirm, toast } from '../../components/ui';
import { computeStats, fmtPct, pctLabel, subjectTitle } from '../../lib/attendance';
import { useClass } from '../../lib/ClassContext';
import { OVERALL_MIN } from '../../lib/config';
import { formatDate, todayStr } from '../../lib/dates';
import { leaveClass } from '../../lib/classes';
import { dayState, lecturesOn, unmarkedLectures } from '../../lib/timetable';
import { statusColor, useTheme } from '../../lib/theme';
import { useMarking } from '../../lib/useMarking';

export default function Attendance() {
  const t = useTheme();
  const { cls, membership, records, holidays, loading, removed, syncFromServer, reload } = useClass();
  const { setStatus, markMany, toggleHoliday } = useMarking();
  const [date, setDate] = useState(todayStr());
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (membership) syncFromServer().then((changed) => changed && toast('Timetable updated by your class'));
    // only when the joined class changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membership?.code]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const changed = await syncFromServer();
    setRefreshing(false);
    if (changed) toast('Timetable updated');
  }, [syncFromServer]);

  const joined = Boolean(cls && membership);
  const stats = useMemo(() => (joined ? computeStats(cls, membership, records) : null), [joined, cls, membership, records]);
  const unmarked = useMemo(() => (joined ? unmarkedLectures(cls, membership, records, holidays).length : 0), [joined, cls, membership, records, holidays]);
  const statusBySlot = useMemo(() => {
    const m = {};
    for (const r of records) if (r.date === date) m[r.slot_key] = r.status;
    return m;
  }, [records, date]);
  const lectures = useMemo(() => {
    if (!joined) return [];
    const extras = records.filter((r) => r.date === date && r.extra);
    return lecturesOn(cls, membership, date, extras);
  }, [joined, cls, membership, records, date]);
  const stateOf = useCallback((d) => (joined ? dayState(cls, membership, records, holidays, d) : 'none'), [joined, cls, membership, records, holidays]);

  if (loading) return <Loading />;

  if (!joined) {
    return (
      <Screen>
        <Title>Attendance</Title>
        <EmptyState
          icon="calendar-outline"
          title="Join your class to start"
          message="Ask your class representative for the class code. If you're the CR, create the class timetable once and share the code."
        >
          <Button title="Join with class code" icon="enter-outline" onPress={() => router.push('/class/join')} />
          <Button title="Create class timetable" icon="create-outline" variant="secondary" style={{ marginTop: 10 }} onPress={() => router.push('/class/edit')} />
        </EmptyState>
      </Screen>
    );
  }

  const today = todayStr();
  const isFuture = date > today;
  const beforeStart = date < cls.startDate;
  const isHoliday = holidays.has(date);
  const mine = lectures.filter((l) => l.kind === 'mine');
  const danger = stats.perSubject.filter((s) => s.status === 'danger');
  const o = stats.overall;

  const menuItems = isHoliday
    ? [{ label: 'Not a holiday', icon: 'calendar-outline', onPress: () => toggleHoliday(date, false) }]
    : [
        ...(mine.length && !isFuture && !beforeStart
          ? [
              {
                label: 'Mark day as holiday',
                icon: 'sunny-outline',
                onPress: async () => {
                  const hasMarks = mine.some((l) => statusBySlot[l.key]);
                  if (hasMarks && !(await confirm('Mark as holiday?', 'Attendance already marked for this day will be removed.', 'Mark holiday'))) return;
                  await toggleHoliday(date, true);
                  toast('Marked as holiday');
                },
              },
              { label: 'Mark all present', icon: 'checkmark-done', onPress: () => markMany(mine, 'present') },
            ]
          : []),
        ...(!isFuture && !beforeStart
          ? [{ label: 'Add extra lecture', icon: 'add-circle-outline', onPress: () => router.push({ pathname: '/class/extra', params: { date } }) }]
          : []),
      ];

  const leaveRemoved = async () => {
    if (!(await confirm('Leave this class?', 'It was removed. Your attendance for it will be cleared from this phone.', 'Leave'))) return;
    await leaveClass({ deleteAttendance: true });
    await reload();
  };

  const overallLine =
    o.pct === null
      ? 'Mark lectures to see predictions'
      : o.status === 'danger'
      ? `Attend the next ${o.mustAttend} to reach ${pctLabel(OVERALL_MIN)}`
      : `Can skip ${o.canSkip} more`;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Title>Attendance</Title>
          <Text style={{ color: t.muted }} numberOfLines={1}>
            {cls.name}
            {membership.batch ? ` · ${membership.batch}` : ''}
          </Text>
        </View>
        <Row style={{ gap: 18 }}>
          <Pressable onPress={() => router.push({ pathname: '/class/week', params: { date } })} hitSlop={10} accessibilityLabel="Week view">
            <Ionicons name="grid-outline" size={22} color={t.muted} />
          </Pressable>
          <Pressable onPress={() => router.push('/class/settings')} hitSlop={10} accessibilityLabel="Class settings">
            <Ionicons name="settings-outline" size={22} color={t.muted} />
          </Pressable>
        </Row>
      </Row>
      <View style={{ height: 12 }} />

      {removed ? (
        <Banner
          status="danger"
          title="This class was removed"
          action={<Button small variant="outline" title="Leave and join again" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={leaveRemoved} />}
        >
          Ask your CR for the new class code.
        </Banner>
      ) : null}

      {danger.length || o.status === 'danger' ? (
        <Pressable onPress={() => router.push('/subjects')}>
          <Banner status="danger">
            {danger.length === 1 && o.status !== 'danger'
              ? `${subjectTitle(danger[0].subject)} is below 50%. Attend the next ${danger[0].mustAttend}.`
              : [
                  o.status === 'danger' ? `Overall below ${pctLabel(OVERALL_MIN)}.` : null,
                  danger.length ? `${danger.length} subject${danger.length === 1 ? '' : 's'} below 50%.` : null,
                  'Tap to see details.',
                ]
                  .filter(Boolean)
                  .join(' ')}
          </Banner>
        </Pressable>
      ) : null}

      {unmarked > 0 ? (
        <Pressable onPress={() => router.push('/class/catchup')}>
          <Banner status="warning" icon="time-outline">
            {`${unmarked} past lecture${unmarked === 1 ? '' : 's'} not marked. Tap to catch up.`}
          </Banner>
        </Pressable>
      ) : null}

      <WeekStrip date={date} onSelect={setDate} dayState={stateOf} />

      <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <Pressable onPress={() => setDate(today)} disabled={date === today}>
          <Text style={{ color: t.text, fontSize: 17, fontWeight: '700' }}>{date === today ? 'Today' : formatDate(date)}</Text>
          {date !== today ? <Text style={{ color: t.primary, fontSize: 13 }}>Back to today</Text> : null}
        </Pressable>
        {menuItems.length ? <Button small variant="secondary" title="Day options" icon="ellipsis-horizontal" onPress={() => setMenuOpen(true)} /> : null}
      </Row>

      {beforeStart ? (
        <Banner status="none" icon="information-circle-outline">{`The semester starts on ${formatDate(cls.startDate)}.`}</Banner>
      ) : isHoliday ? (
        <Banner status="safe" icon="sunny-outline" title="Holiday">
          Lectures on this day don’t count.
        </Banner>
      ) : lectures.length === 0 ? (
        <Banner status="none" icon="cafe-outline">No lectures on this day.</Banner>
      ) : (
        <DayTable
          lectures={lectures}
          statusBySlot={statusBySlot}
          onChange={setStatus}
          locked={isFuture}
          onLockedPress={() => toast('You can mark this once the lecture has happened')}
        />
      )}

      <Pressable
        onPress={() => router.push('/subjects')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopWidth: 1,
          borderTopColor: t.border,
          paddingTop: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View>
          <Text style={{ color: t.muted, fontSize: 13 }}>Overall attendance</Text>
          <Text style={{ color: statusColor(t, o.status), fontSize: 24, fontWeight: '800' }}>
            {fmtPct(o.pct)} <Text style={{ color: t.muted, fontSize: 13, fontWeight: '400' }}>{o.attended}/{o.total}</Text>
          </Text>
          <Text style={{ color: t.text, fontSize: 13 }}>{overallLine}</Text>
        </View>
        <Row>
          <Text style={{ color: t.primary, fontWeight: '700' }}>Subjects</Text>
          <Ionicons name="chevron-forward" size={18} color={t.primary} />
        </Row>
      </Pressable>

      <ActionSheet visible={menuOpen} title={formatDate(date)} items={menuItems} onClose={() => setMenuOpen(false)} />
    </Screen>
  );
}
