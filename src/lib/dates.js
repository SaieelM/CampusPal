// All dates in the app are local calendar dates stored as 'YYYY-MM-DD'.
// Times are 'HH:MM' (24h). Days of week: 1 = Monday … 7 = Sunday.

export const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_SHORT = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const pad = (n) => String(n).padStart(2, '0');

export function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr() {
  return toDateStr(new Date());
}

export function addDays(str, n) {
  const d = parseDate(str);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function weekday(str) {
  const js = parseDate(str).getDay(); // 0 = Sunday
  return js === 0 ? 7 : js;
}

export function isValidDateStr(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str || '')) return false;
  return toDateStr(parseDate(str)) === str;
}

export function isValidTime(str) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(str || '');
}

export function minutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function toTimeStr(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatTime(time) {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

export function formatDate(str, { withDay = true } = {}) {
  const d = parseDate(str);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const base = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  return withDay ? `${DAY_SHORT[weekday(str)]}, ${base}` : base;
}

export function friendlyDate(str) {
  const t = todayStr();
  if (str === t) return 'Today';
  if (str === addDays(t, -1)) return 'Yesterday';
  if (str === addDays(t, 1)) return 'Tomorrow';
  return formatDate(str);
}

export function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}
