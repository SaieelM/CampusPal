// Turns a shared class timetable + the student's batch/electives into
// the concrete list of lectures for any date.
import { addDays, minutes, nowMinutes, todayStr, weekday } from './dates';

/** The key used to remember a student's elective choice for a subject. */
export function electiveGroup(subject) {
  return (subject.group || subject.name || '').trim();
}

export function subjectMap(cls) {
  const map = {};
  for (const s of cls?.subjects || []) map[s.id] = s;
  return map;
}

/** Subjects that count for this student (core + chosen electives). */
export function mySubjects(cls, membership) {
  if (!cls || !membership) return [];
  const chosen = new Set(membership.electives || []);
  return (cls.subjects || []).filter((s) => !s.elective || chosen.has(electiveGroup(s)));
}

/** Distinct elective groups offered in the class, each with its subjects. */
export function electiveGroups(cls) {
  const groups = new Map();
  for (const s of cls?.subjects || []) {
    if (!s.elective) continue;
    const g = electiveGroup(s);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(s);
  }
  return [...groups.entries()].map(([name, subjects]) => ({ name, subjects }));
}

/** The timetable version in force on a date (latest effectiveFrom <= date). */
export function versionFor(cls, date) {
  const versions = [...(cls?.versions || [])].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  let found = null;
  for (const v of versions) if (v.effectiveFrom <= date) found = v;
  return found;
}

export function latestVersion(cls) {
  const versions = [...(cls?.versions || [])].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return versions[versions.length - 1] || null;
}

/**
 * Classify a slot for this student:
 *  - 'mine'      → counts for attendance
 *  - 'other'     → another batch's lab or an elective they don't take
 *  - 'untracked' → mentoring, library hour, etc.
 */
export function slotKind(slot, subjects, membership) {
  const subject = slot.subjectId ? subjects[slot.subjectId] : null;
  if (!subject) return 'untracked';
  if (slot.batch && slot.batch !== membership?.batch) return 'other';
  if (subject.elective && !(membership?.electives || []).includes(electiveGroup(subject))) return 'other';
  return 'mine';
}

const overlaps = (a, b) => minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end);

/**
 * All lectures on a date, sorted by time. `extras` are extra-lecture
 * attendance records for that date (rows from the attendance table).
 * 'other' slots that clash with one of the student's own lectures are
 * dropped so the day view stays clean.
 */
export function lecturesOn(cls, membership, date, extras = []) {
  if (!cls || date < cls.startDate) return [];
  if (cls.endDate && date > cls.endDate) return [];
  const version = versionFor(cls, date);
  const subjects = subjectMap(cls);
  const day = weekday(date);
  const list = [];

  if (version) {
    for (const slot of version.slots || []) {
      if (slot.day !== day) continue;
      list.push({
        key: slot.id,
        date,
        start: slot.start,
        end: slot.end,
        count: slot.count || 1,
        room: slot.room || '',
        label: slot.label || '',
        batch: slot.batch || null,
        subject: slot.subjectId ? subjects[slot.subjectId] || null : null,
        kind: slotKind(slot, subjects, membership),
        extra: false,
      });
    }
  }

  for (const r of extras) {
    list.push({
      key: r.slot_key,
      date,
      start: r.start || '00:00',
      end: r.end || r.start || '00:00',
      count: r.count,
      room: '',
      label: 'Extra lecture',
      batch: null,
      subject: subjects[r.subject_id] || { id: r.subject_id, name: 'Removed subject' },
      kind: 'mine',
      extra: true,
    });
  }

  const mine = list.filter((l) => l.kind === 'mine');
  const shownOthers = new Set();
  return list
    .filter((l) => {
      if (l.kind !== 'other') return true;
      if (mine.some((m) => overlaps(m, l))) return false;
      // Two parallel lectures that aren't yours (e.g. both batches' labs) → show one row.
      const slotTime = `${l.start}-${l.end}`;
      if (shownOthers.has(slotTime)) return false;
      shownOthers.add(slotTime);
      return true;
    })
    .sort((a, b) => minutes(a.start) - minutes(b.start));
}

/**
 * Lectures from the semester start up to now that the student hasn't marked.
 * Today's lectures only count once they have ended.
 */
export function unmarkedLectures(cls, membership, records, holidays) {
  if (!cls || !membership) return [];
  const marked = new Set(records.map((r) => `${r.date}|${r.slot_key}`));
  const today = todayStr();
  const now = nowMinutes();
  const out = [];
  let date = cls.startDate;
  let guard = 0;
  while (date <= today && guard++ < 400) {
    if (!holidays.has(date)) {
      for (const l of lecturesOn(cls, membership, date)) {
        if (l.kind !== 'mine') continue;
        if (date === today && minutes(l.end) > now) continue;
        if (!marked.has(`${date}|${l.key}`)) out.push(l);
      }
    }
    date = addDays(date, 1);
  }
  return out;
}

let idCounter = 0;
export function newId(prefix = 'id') {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${idCounter}`;
}
