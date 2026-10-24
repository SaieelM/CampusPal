// Home dashboard: today's lectures, attendance summary, warnings, top notes.
import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { LectureRow, OverallCard } from '../../components/AttendanceViews';
import { NoteCard } from '../../components/NoteCard';
import { Banner, Button, Card, Heading, Row, Screen, Title } from '../../components/ui';
import { computeStats, subjectTitle } from '../../lib/attendance';
import { useAuth } from '../../lib/auth';
import { useClass } from '../../lib/ClassContext';
import { formatDate, minutes, nowMinutes, todayStr } from '../../lib/dates';
import { cachedNotes, listNotes, noteScore } from '../../lib/notes';
import { lecturesOn, unmarkedLectures } from '../../lib/timetable';
import { useTheme } from '../../lib/theme';
import { useMarking } from '../../lib/useMarking';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const t = useTheme();
  const { profile } = useAuth();
  const { cls, membership, records, holidays } = useClass();
  const { mark, clear } = useMarking();
  const [topNotes, setTopNotes] = useState([]);
  const today = todayStr();

  useFocusEffect(
    useCallback(() => {
      const pick = (all) =>
        setTopNotes(all.filter((n) => n.semester === profile.semester).sort((a, b) => noteScore(b) - noteScore(a)).slice(0, 3));
      cachedNotes(profile.course).then(pick);
      listNotes(profile.course).then(pick).catch(() => {});
    }, [profile.course, profile.semester])
  );

  const joined = Boolean(cls && membership);
  const stats = useMemo(() => (joined ? computeStats(cls, membership, records) : null), [joined, cls, membership, records]);
  const todays = useMemo(() => {
    if (!joined || holidays.has(today)) return [];
    const extras = records.filter((r) => r.date === today && r.extra);
    return lecturesOn(cls, membership, today, extras).filter((l) => l.kind === 'mine');
  }, [joined, cls, membership, records, holidays, today]);
  const statusBySlot = useMemo(() => {
    const m = {};
    for (const r of records) if (r.date === today) m[r.slot_key] = r.status;
    return m;
  }, [records, today]);
  const unmarkedCount = useMemo(
    () => (joined ? unmarkedLectures(cls, membership, records, holidays).length : 0),
    [joined, cls, membership, records, holidays]
  );

  const now = nowMinutes();
  const next = todays.find((l) => minutes(l.end) > now);
  const danger = stats ? stats.perSubject.filter((s) => s.status === 'danger') : [];
  const firstName = (profile.name || '').split(' ')[0];

  return (
    <Screen>
      <Text style={{ color: t.muted }}>{formatDate(today)}</Text>
      <Title>
        {greeting()}, {firstName} 👋
      </Title>

      {!joined ? (
        <Card style={{ marginTop: 12, backgroundColor: t.primarySoft, borderColor: t.primarySoft }}>
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 16 }}>Set up attendance in 20 seconds</Text>
          <Text style={{ color: t.muted, marginTop: 4, marginBottom: 12 }}>Join your class with the code from your CR and we’ll load your timetable.</Text>
          <Button title="Join your class" icon="enter-outline" onPress={() => router.push('/class/join')} />
        </Card>
      ) : (
        <>
          {danger.length || stats.overall.status === 'danger' ? (
            <View style={{ marginTop: 12 }}>
              <Banner
                status="danger"
                title="Attendance shortage"
                action={<Button small variant="outline" title="See details" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => router.push('/attendance')} />}
              >
                {[
                  stats.overall.status === 'danger' ? 'Overall attendance is below 75%.' : null,
                  danger.length ? `Below 50% in: ${danger.map((d) => subjectTitle(d.subject)).join(', ')}.` : null,
                  'As per the University ordinance you may not be eligible for exams.',
                ]
                  .filter(Boolean)
                  .join(' ')}
              </Banner>
            </View>
          ) : null}

          {unmarkedCount > 0 ? (
            <Banner
              status="warning"
              icon="time-outline"
              title={`${unmarkedCount} lecture${unmarkedCount === 1 ? '' : 's'} to mark`}
              action={<Button small variant="outline" title="Catch up" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => router.push('/class/catchup')} />}
            >
              Keep your predictions accurate.
            </Banner>
          ) : null}

          <Heading right={<Button small variant="ghost" title="All" onPress={() => router.push('/attendance')} />}>Today</Heading>
          {holidays.has(today) ? (
            <Banner status="safe" icon="sunny-outline">Marked as a holiday.</Banner>
          ) : todays.length === 0 ? (
            <Banner status="none" icon="cafe-outline">No lectures today. Enjoy!</Banner>
          ) : (
            <>
              {next ? (
                <Text style={{ color: t.muted, marginBottom: 8 }}>
                  {minutes(next.start) > now ? 'Next up' : 'Happening now'}: <Text style={{ color: t.text, fontWeight: '700' }}>{subjectTitle(next.subject)}</Text>
                  {next.room ? ` in ${next.room}` : ''}
                </Text>
              ) : null}
              {todays.map((l) => (
                <LectureRow key={l.key} lecture={l} compact status={statusBySlot[l.key]} onMark={(s) => mark(l, s)} onClear={() => clear(l)} />
              ))}
            </>
          )}

          <OverallCard overall={stats.overall} onPress={() => router.push('/attendance')} />
        </>
      )}

      <Heading right={<Button small variant="ghost" title="Browse" onPress={() => router.push('/notes')} />}>
        Top notes for Sem {profile.semester}
      </Heading>
      {topNotes.length ? (
        topNotes.map((n) => <NoteCard key={n.id} note={n} onPress={() => router.push(`/notes/${n.id}`)} />)
      ) : (
        <Card>
          <Text style={{ color: t.muted, marginBottom: 10 }}>No notes for your semester yet. Be the first to share!</Text>
          <Button small title="Upload notes" icon="cloud-upload" variant="secondary" onPress={() => router.push('/notes/upload')} />
        </Card>
      )}

      <Row style={{ gap: 8, marginTop: 8 }}>
        <Button small title="Upload notes" icon="cloud-upload-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/notes/upload')} />
        <Button small title="Feedback" icon="chatbubble-ellipses-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/feedback')} />
      </Row>
    </Screen>
  );
}
