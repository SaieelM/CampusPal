// Builds demo attendance histories ("scenarios") for testing.
// Pure logic (no Expo / Firebase) so it can be checked on a laptop.
//
// Each subject gets a fixed attendance ratio applied as an exact pattern
// (not random), so a scenario gives the same result every time it's loaded.
import { addDays, todayStr } from './dates';
import { lecturesOn } from './timetable';

/** Demo student in the Sem III class. */
export const DEMO_MEMBERSHIP = {
  batch: 'Batch 1',
  electives: ['TDD and Design Patterns', 'DSVE2 – Cloud Computing', 'DSVE3 – Mobile Application Development'],
};

// Holidays in every scenario (Ganesh Chaturthi, Gandhi Jayanti).
export const DEMO_HOLIDAYS = ['2026-09-14', '2026-10-02'];

export const SCENARIOS = {
  regular: {
    label: 'Regular student',
    description: 'Mostly present. One course below 50%, one close to the limit, overall above 75%.',
    expect: [
      'Overall above 75% (green) with skips available',
      'Cryptography (Theory) below 50% → red ordinance warning',
      'Mobile Application Development (Lab) yellow: 1 or 0 skips left',
      'Holidays on 14 Sep and 2 Oct, an extra Cloud lecture on 19 Sep counting ×2',
      'The last teaching day is left unmarked → “catch up” banner',
    ],
    // Share of lectures attended per subject id (default for the rest).
    rates: { crypto: 0.4, madlab: 0.52, cloudlab: 0.85, default: 0.95 },
    cancelEvery: 9, // every 9th lecture of a subject was cancelled
    extras: [{ key: 'extra_demo_cloud', subjectId: 'cloud', date: '2026-09-19', start: '10:00', end: '12:00', count: 2, status: 'present' }],
  },
  absent: {
    label: 'Many absents',
    description: 'Skips a lot. Overall below 75% and several courses below 50%.',
    expect: [
      'Overall below 75% → red overall warning, “attend the next N”',
      'Cryptography, MAD Lab, UI/UX and DevOps below 50% → red warnings',
      'Cloud Computing (Theory) at exactly 50% or just above → allowed, but no skips left',
      'Home tab shows the “Attendance shortage” card',
      'The last teaching day is left unmarked → “catch up” banner',
    ],
    rates: { crypto: 0.25, madlab: 0.3, uiux: 0.4, devops: 0.45, cloud: 0.5, tdd: 0.6, mad: 0.65, cloudlab: 0.7, default: 0.6 },
    cancelEvery: 12,
    extras: [],
  },
};

/** The most recent day before today that has lectures for the demo student. */
export function lastTeachingDay(cls, membership, today = todayStr()) {
  let last = null;
  for (let d = cls.startDate; d < today; d = addDays(d, 1)) {
    if (DEMO_HOLIDAYS.includes(d)) continue;
    if (lecturesOn(cls, membership, d).some((l) => l.kind === 'mine')) last = d;
  }
  return last;
}

/**
 * Plans the attendance records for a scenario: every lecture from the
 * semester start up to (but not including) the last teaching day, which is
 * left unmarked on purpose so the "catch up" banner shows.
 * Returns { holidays, records } where records match db.setRecord's input.
 */
export function planDemoAttendance(cls, scenarioKey, today = todayStr()) {
  const scenario = SCENARIOS[scenarioKey];
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioKey}`);
  const membership = { code: cls.code, ...DEMO_MEMBERSHIP };
  const stop = lastTeachingDay(cls, membership, today) || today;
  const seen = {}; // lectures per subject so far (including cancelled)
  const held = {}; // lectures per subject that actually happened
  const records = [];

  for (let date = cls.startDate; date < stop; date = addDays(date, 1)) {
    if (DEMO_HOLIDAYS.includes(date)) continue;
    for (const l of lecturesOn(cls, membership, date)) {
      if (l.kind !== 'mine') continue;
      const id = l.subject.id;
      seen[id] = (seen[id] || 0) + 1;
      let status;
      if (seen[id] % scenario.cancelEvery === 0) {
        status = 'cancelled';
      } else {
        // Spread the presents evenly: lecture n is attended when the running
        // total of `rate` crosses the next whole number (rounded).
        const rate = scenario.rates[id] ?? scenario.rates.default;
        const n = held[id] || 0;
        held[id] = n + 1;
        status = Math.floor((n + 1) * rate + 0.5) > Math.floor(n * rate + 0.5) ? 'present' : 'absent';
      }
      records.push({ date, slotKey: l.key, subjectId: id, status, count: l.count, extra: 0, start: l.start, end: l.end });
    }
  }

  for (const e of scenario.extras) {
    if (e.date < stop) {
      records.push({ date: e.date, slotKey: e.key, subjectId: e.subjectId, status: e.status, count: e.count, extra: 1, start: e.start, end: e.end });
    }
  }

  return { membership, holidays: DEMO_HOLIDAYS, records, unmarkedDay: stop };
}
