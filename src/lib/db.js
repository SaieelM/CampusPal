// Local, offline storage (SQLite on the phone).
// Attendance is personal, so it never leaves the device.
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('campuspal.db');

let ready = null;

export function initDb() {
  if (!ready) ready = migrate();
  return ready;
}

async function migrate() {
  const DATABASE_VERSION = 1;
  const row = await db.getFirstAsync('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= DATABASE_VERSION) return;
  if (current === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_code TEXT NOT NULL,
        date TEXT NOT NULL,
        slot_key TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        status TEXT NOT NULL,          -- present | absent | cancelled
        count INTEGER NOT NULL DEFAULT 1,
        extra INTEGER NOT NULL DEFAULT 0,
        start TEXT,
        end TEXT,
        UNIQUE (class_code, date, slot_key)
      );
      CREATE TABLE IF NOT EXISTS holidays (
        class_code TEXT NOT NULL,
        date TEXT NOT NULL,
        PRIMARY KEY (class_code, date)
      );
    `);
  }
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

// ---------- key/value ----------
export async function kvGet(key, fallback = null) {
  await initDb();
  const row = await db.getFirstAsync('SELECT value FROM kv WHERE key = ?', key);
  if (!row || row.value == null) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

export async function kvSet(key, value) {
  await initDb();
  if (value === null || value === undefined) {
    await db.runAsync('DELETE FROM kv WHERE key = ?', key);
  } else {
    await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, JSON.stringify(value));
  }
}

// ---------- attendance ----------
export async function getRecords(classCode) {
  await initDb();
  return db.getAllAsync('SELECT * FROM attendance WHERE class_code = ? ORDER BY date, start', classCode);
}

export async function setRecord(classCode, { date, slotKey, subjectId, status, count = 1, extra = 0, start = null, end = null }) {
  await initDb();
  await db.runAsync(
    `INSERT INTO attendance (class_code, date, slot_key, subject_id, status, count, extra, start, end)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (class_code, date, slot_key)
     DO UPDATE SET status = excluded.status, count = excluded.count, subject_id = excluded.subject_id`,
    classCode, date, slotKey, subjectId, status, count, extra, start, end
  );
}

export async function deleteRecord(classCode, date, slotKey) {
  await initDb();
  await db.runAsync('DELETE FROM attendance WHERE class_code = ? AND date = ? AND slot_key = ?', classCode, date, slotKey);
}

export async function getHolidays(classCode) {
  await initDb();
  const rows = await db.getAllAsync('SELECT date FROM holidays WHERE class_code = ?', classCode);
  return new Set(rows.map((r) => r.date));
}

export async function setHoliday(classCode, date, isHoliday) {
  await initDb();
  if (isHoliday) {
    await db.runAsync('INSERT OR IGNORE INTO holidays (class_code, date) VALUES (?, ?)', classCode, date);
    // Timetabled lectures on a holiday don't count; extra lectures are kept.
    await db.runAsync('DELETE FROM attendance WHERE class_code = ? AND date = ? AND extra = 0', classCode, date);
  } else {
    await db.runAsync('DELETE FROM holidays WHERE class_code = ? AND date = ?', classCode, date);
  }
}

export async function withTransaction(fn) {
  await initDb();
  await db.withTransactionAsync(fn);
}

export async function clearClassData(classCode) {
  await initDb();
  await db.runAsync('DELETE FROM attendance WHERE class_code = ?', classCode);
  await db.runAsync('DELETE FROM holidays WHERE class_code = ?', classCode);
}
