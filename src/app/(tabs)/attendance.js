import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  LectureRow,
  OverallCard,
  OverallShortageBanner,
  ShortageBanner,
  SubjectCard,
} from '../../components/AttendanceViews';
import { Banner, Button, EmptyState, Heading, Loading, Row, Screen, Title, toast } from '../../components/ui';
import { computeStats } from '../../lib/attendance';
import { useClass } from '../../lib/ClassContext';
import { addDays, friendlyDate, todayStr } from '../../lib/dates';
import { lecturesOn, unmarkedLectures } from '../../lib/timetable';
import { useTheme } from '../../lib/theme';
import { useMarking } from '../../lib/useMarking';

export default function Attendance() {
  const t = useTheme();
  const { cls, membership, records, holidays, loading, syncFromServer } = useClass();
  const { mark, clear, toggleHoliday } = useMarking();
  const [date, setDate] = useState(todayStr());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (membership) syncFromServer().then((changed) => changed && toast('Timetable updated by your class'));
    // only on first open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membership?.code]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const changed = await syncFromServer();
    setRefreshing(false);
    toast(changed ? 'Timetable updated' : 'Timetable is up to date');
  }, [syncFromServer]);

  const stats = useMemo(() => (cls && membership ? computeStats(cls, membership, records) : null), [cls, membership, records]);
  const unmarked = useMemo(
    () => (cls && membership ? unmarkedLectures(cls, membership, records, holidays) : []),
    [cls, membership, records, holidays]
  );
  const statusBySlot = useMemo(() => {
    const m = {};
    for (const r of records) if (r.date === date) m[r.slot_key] = r.status;
    return m;
  }, [records, date]);
  const lectures = useMemo(() => {
    if (!cls || !membership) return [];
    const extras = records.filter((r) => r.date === date && r.extra);
    return lecturesOn(cls, membership, date, extras);
  }, [cls, membership, records, date]);

  if (loading) return <Loading />;

  if (!cls || !membership) {
    return (
      <Screen>
        <Title>Attendance</Title>
        <EmptyState
          icon="calendar-outline"
          title="Join your class to start"
          message="Ask your class representative for the class code. If you're the CR, create the class timetable once and share the code with everyone."
        >
          <Button title="Join with class code" icon="enter-outline" onPress={() => router.push('/class/join')} />
          <Button
            title="Create class timetable (CR)"
            icon="create-outline"
            variant="secondary"
            style={{ marginTop: 10 }}
            onPress={() => router.push('/class/edit')}
          />
        </EmptyState>
      </Screen>
    );
  }

  const today = todayStr();
  const isFuture = date > today;
  const beforeStart = date < cls.startDate;
  const isHoliday = holidays.has(date);
  const myLectures = lectures.filter((l) => l.kind === 'mine');
  const dangerSubjects = stats.perSubject.filter((s) => s.status === 'danger');

  const onMark = (lecture, status) => {
    if (isFuture) return toast('You can mark this once the lecture has happened');
    mark(lecture, status);
  };

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
        <Pressable onPress={() => router.push('/class/settings')} hitSlop={10} accessibilityLabel="Class settings">
          <Ionicons name="settings-outline" size={24} color={t.muted} />
        </Pressable>
      </Row>

      <View style={{ height: 14 }} />

      {unmarked.length > 0 ? (
        <Banner
          status="warning"
          icon="time-outline"
          title={`${unmarked.length} lecture${unmarked.length === 1 ? '' : 's'} not marked yet`}
          action={<Button small title="Catch up now" variant="outline" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => router.push('/class/catchup')} />}
        >
          Mark past lectures so your percentages and skip predictions are accurate.
        </Banner>
      ) : null}

      {stats.overall.status === 'danger' ? <OverallShortageBanner overall={stats.overall} /> : null}
      {dangerSubjects.map((s) => (
        <ShortageBanner key={s.subject.id} stat={s} />
      ))}

      {/* Day picker */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 }}>
        <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={12} style={{ padding: 6 }} accessibilityLabel="Previous day">
          <Ionicons name="chevron-back" size={26} color={t.primary} />
        </Pressable>
        <Pressable onPress={() => setDate(today)}>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>{friendlyDate(date)}</Text>
          {date !== today ? <Text style={{ color: t.primary, textAlign: 'center', fontSize: 13 }}>Tap for today</Text> : null}
        </Pressable>
        <Pressable onPress={() => setDate(addDays(date, 1))} hitSlop={12} style={{ padding: 6 }} accessibilityLabel="Next day">
          <Ionicons name="chevron-forward" size={26} color={t.primary} />
        </Pressable>
      </View>

      {beforeStart ? (
        <Banner status="none" icon="information-circle-outline">
          {`The semester starts on ${friendlyDate(cls.startDate)}.`}
        </Banner>
      ) : isHoliday ? (
        <Banner
          status="safe"
          icon="sunny-outline"
          title="Holiday"
          action={<Button small variant="outline" title="Not a holiday" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => toggleHoliday(date, false)} />}
        >
          Lectures on this day don’t count.
        </Banner>
      ) : lectures.length === 0 ? (
        <Banner status="none" icon="cafe-outline">No lectures on this day.</Banner>
      ) : (
        lectures.map((l) => (
          <LectureRow
            key={l.key}
            lecture={l}
            status={statusBySlot[l.key]}
            onMark={(s) => onMark(l, s)}
            onClear={() => clear(l)}
          />
        ))
      )}

      {!beforeStart && !isFuture ? (
        <Row style={{ gap: 8, marginBottom: 6 }}>
          <Button small title="Extra lecture" icon="add" variant="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/class/extra', params: { date } })} />
          {!isHoliday && myLectures.length > 0 ? (
            <Button small title="Mark holiday" icon="sunny-outline" variant="secondary" style={{ flex: 1 }} onPress={() => toggleHoliday(date, true)} />
          ) : null}
        </Row>
      ) : null}

      <Heading>Summary</Heading>
      <OverallCard overall={stats.overall} />
      <Heading>Subjects</Heading>
      {stats.perSubject.map((s) => (
        <SubjectCard key={s.subject.id} stat={s} onPress={() => router.push(`/subject/${s.subject.id}`)} />
      ))}
    </Screen>
  );
}
