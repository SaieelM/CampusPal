// Attendance maths: percentages, skip predictions and warnings.
import { OVERALL_MIN, SUBJECT_MIN } from './config';
import { mySubjects } from './timetable';

const ratio = ({ num, den }) => num / den;
export const pctLabel = (rule) => `${Math.round(ratio(rule) * 100)}%`;

/**
 * How many more lectures can be missed while staying at or above `rule`.
 * attended/total ≥ num/den  ⇔  den·A ≥ num·(T + x)  ⇒  x = ⌊(den·A − num·T) / num⌋
 */
export function canSkip(attended, total, rule) {
  if (total === 0) return null;
  return Math.max(0, Math.floor((rule.den * attended - rule.num * total) / rule.num));
}

/**
 * How many lectures must be attended in a row to get back to `rule`.
 * (A + x) / (T + x) ≥ num/den  ⇒  x = ⌈(num·T − den·A) / (den − num)⌉
 */
export function mustAttend(attended, total, rule) {
  if (total === 0) return 0;
  return Math.max(0, Math.ceil((rule.num * total - rule.den * attended) / (rule.den - rule.num)));
}

export const percent = (attended, total) => (total === 0 ? null : (attended / total) * 100);

/**
 * Build per-subject and overall stats for the student's own subjects.
 * Cancelled lectures don't count; a slot that "counts as N" adds N.
 */
export function computeStats(cls, membership, records) {
  const subjects = mySubjects(cls, membership);
  const ids = new Set(subjects.map((s) => s.id));
  const tally = {};
  for (const s of subjects) tally[s.id] = { attended: 0, total: 0 };

  for (const r of records) {
    if (!ids.has(r.subject_id) || r.status === 'cancelled') continue;
    tally[r.subject_id].total += r.count;
    if (r.status === 'present') tally[r.subject_id].attended += r.count;
  }

  let A = 0;
  let T = 0;
  for (const id of ids) {
    A += tally[id].attended;
    T += tally[id].total;
  }

  const overall = {
    attended: A,
    total: T,
    pct: percent(A, T),
    canSkip: canSkip(A, T, OVERALL_MIN),
    mustAttend: mustAttend(A, T, OVERALL_MIN),
  };
  overall.status = statusFor(overall.pct, overall.canSkip, OVERALL_MIN);

  const perSubject = subjects.map((s) => {
    const { attended, total } = tally[s.id];
    const subjectSkip = canSkip(attended, total, SUBJECT_MIN);
    // Skipping a lecture also lowers the overall %, so the real limit is the smaller one.
    let skip = subjectSkip;
    let limitedBy = 'subject';
    if (skip !== null && overall.canSkip !== null && overall.canSkip < skip) {
      skip = overall.canSkip;
      limitedBy = 'overall';
    }
    const pct = percent(attended, total);
    return {
      subject: s,
      attended,
      total,
      pct,
      canSkip: skip,
      limitedBy,
      mustAttend: mustAttend(attended, total, SUBJECT_MIN),
      status: statusFor(pct, skip, SUBJECT_MIN),
    };
  });

  return { overall, perSubject };
}

/** 'none' (no data) | 'danger' (below rule) | 'warning' (≤1 skip left) | 'safe' */
function statusFor(pct, skip, rule) {
  if (pct === null) return 'none';
  if (pct < ratio(rule) * 100) return 'danger';
  if (skip !== null && skip <= 1) return 'warning';
  return 'safe';
}

export const fmtPct = (pct) => (pct === null ? '—' : `${Math.floor(pct * 10) / 10}%`);

export function subjectTitle(subject) {
  if (!subject) return '';
  const type = subject.type === 'lab' ? 'Lab' : 'Theory';
  return `${subject.name} (${type})`;
}

/** The official wording shown when a course is below the ordinance minimum. */
export function shortageMessage(stat) {
  return {
    title: `Attendance shortage: ${subjectTitle(stat.subject)} – ${fmtPct(stat.pct)}`,
    body:
      `As per the University ordinance, a minimum of ${pctLabel(SUBJECT_MIN)} attendance in each course ` +
      'is mandatory to be eligible for the examination.',
    action: `Attend the next ${stat.mustAttend} lecture${stat.mustAttend === 1 ? '' : 's'} of this course to meet the requirement.`,
  };
}

export function overallShortageMessage(overall) {
  return {
    title: `Overall attendance below ${pctLabel(OVERALL_MIN)} – ${fmtPct(overall.pct)}`,
    body:
      `As per the University ordinance, a minimum of ${pctLabel(OVERALL_MIN)} overall attendance ` +
      'is mandatory to be eligible for the examination.',
    action: `Attend the next ${overall.mustAttend} lecture${overall.mustAttend === 1 ? '' : 's'} to meet the requirement.`,
  };
}

export function skipText(stat) {
  if (stat.pct === null) return 'No lectures marked yet';
  if (stat.status === 'danger') return `Attend the next ${stat.mustAttend} to recover`;
  if (stat.canSkip === 0) return 'No skips left – attend every lecture';
  const n = stat.canSkip;
  const base = `You can safely skip ${n} more lecture${n === 1 ? '' : 's'}`;
  return stat.limitedBy === 'overall' ? `${base} (limited by overall ${pctLabel(OVERALL_MIN)})` : base;
}
