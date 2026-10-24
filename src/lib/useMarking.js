import { useCallback } from 'react';

import { computeStats, overallShortageMessage, shortageMessage } from './attendance';
import { useClass } from './ClassContext';
import { deleteRecord, getRecords, setHoliday, setRecord, withTransaction } from './db';
import { notifyNow } from './notifications';

/** Marking helpers shared by the Today view, catch-up and subject history. */
export function useMarking() {
  const { cls, membership, records, refreshRecords } = useClass();
  const code = membership?.code;

  // After a change, alert if a course (or overall) has just dropped below the minimum.
  const alertIfNewShortage = useCallback(
    async (before) => {
      const after = computeStats(cls, membership, await getRecords(code));
      const was = Object.fromEntries(before.perSubject.map((s) => [s.subject.id, s.status]));
      for (const s of after.perSubject) {
        if (s.status === 'danger' && was[s.subject.id] !== 'danger') {
          const m = shortageMessage(s);
          await notifyNow(`⚠️ ${m.title}`, `${m.action} ${m.body}`);
        }
      }
      if (after.overall.status === 'danger' && before.overall.status !== 'danger') {
        const m = overallShortageMessage(after.overall);
        await notifyNow(`⚠️ ${m.title}`, m.action);
      }
    },
    [cls, membership, code]
  );

  const recordFor = (lecture, status) => ({
    date: lecture.date,
    slotKey: lecture.key,
    subjectId: lecture.subject.id,
    status,
    count: lecture.count,
    extra: lecture.extra ? 1 : 0,
    start: lecture.start,
    end: lecture.end,
  });

  const mark = useCallback(
    async (lecture, status) => {
      const before = computeStats(cls, membership, records);
      await setRecord(code, recordFor(lecture, status));
      await refreshRecords();
      if (status === 'absent') await alertIfNewShortage(before);
    },
    [cls, membership, records, code, refreshRecords, alertIfNewShortage]
  );

  const markMany = useCallback(
    async (lectures, status) => {
      const before = computeStats(cls, membership, records);
      await withTransaction(async () => {
        for (const l of lectures) await setRecord(code, recordFor(l, status));
      });
      await refreshRecords();
      if (status === 'absent') await alertIfNewShortage(before);
    },
    [cls, membership, records, code, refreshRecords, alertIfNewShortage]
  );

  const clear = useCallback(
    async (lecture) => {
      await deleteRecord(code, lecture.date, lecture.key);
      await refreshRecords();
    },
    [code, refreshRecords]
  );

  /** Marks a whole day as a holiday (its lectures stop counting) or undoes it. */
  const toggleHoliday = useCallback(
    async (date, isHoliday) => {
      await setHoliday(code, date, isHoliday);
      await refreshRecords();
    },
    [code, refreshRecords]
  );

  return { mark, markMany, clear, toggleHoliday };
}
