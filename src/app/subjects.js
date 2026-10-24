// Per-subject attendance with the ordinance warnings.
import { useMemo } from 'react';
import { router } from 'expo-router';

import { OverallCard, OverallShortageBanner, ShortageBanner, SubjectCard } from '../components/AttendanceViews';
import { Body, EmptyState, Heading, Screen } from '../components/ui';
import { computeStats } from '../lib/attendance';
import { useClass } from '../lib/ClassContext';

export default function Subjects() {
  const { cls, membership, records } = useClass();
  const stats = useMemo(() => (cls && membership ? computeStats(cls, membership, records) : null), [cls, membership, records]);

  if (!stats) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="calendar-outline" title="Join your class first" />
      </Screen>
    );
  }

  const danger = stats.perSubject.filter((s) => s.status === 'danger');
  return (
    <Screen edges={[]}>
      {stats.overall.status === 'danger' ? <OverallShortageBanner overall={stats.overall} /> : null}
      {danger.map((s) => (
        <ShortageBanner key={s.subject.id} stat={s} />
      ))}
      <OverallCard overall={stats.overall} />
      <Body muted style={{ fontSize: 13 }}>Minimum 50% in each course (theory and lab separately) and 75% overall.</Body>
      <Heading>Subjects</Heading>
      {stats.perSubject.map((s) => (
        <SubjectCard key={s.subject.id} stat={s} onPress={() => router.push(`/subject/${s.subject.id}`)} />
      ))}
    </Screen>
  );
}
