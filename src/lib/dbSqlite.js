// SQLite storage backend (APK and development builds).
export function createSQLiteBackend(SQLite) {
  const db = SQLite.openDatabaseSync('campuspal.db');
  let ready = null;

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

  const init = () => {
    if (!ready) ready = migrate();
    return ready;
  };

  return {
    name: 'sqlite',
    init,

    async kvGet(key) {
      await init();
      const row = await db.getFirstAsync('SELECT value FROM kv WHERE key = ?', key);
      return row ? row.value : null;
    },
    async kvSet(key, raw) {
      await init();
      if (raw === null) await db.runAsync('DELETE FROM kv WHERE key = ?', key);
      else await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, raw);
    },

    async getRecords(classCode) {
      await init();
      return db.getAllAsync('SELECT * FROM attendance WHERE class_code = ? ORDER BY date, start', classCode);
    },
    async setRecord(classCode, r) {
      await init();
      await db.runAsync(
        `INSERT INTO attendance (class_code, date, slot_key, subject_id, status, count, extra, start, end)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (class_code, date, slot_key)
         DO UPDATE SET status = excluded.status, count = excluded.count, subject_id = excluded.subject_id`,
        classCode, r.date, r.slotKey, r.subjectId, r.status, r.count, r.extra, r.start, r.end
      );
    },
    async deleteRecord(classCode, date, slotKey) {
      await init();
      await db.runAsync('DELETE FROM attendance WHERE class_code = ? AND date = ? AND slot_key = ?', classCode, date, slotKey);
    },

    async getHolidays(classCode) {
      await init();
      const rows = await db.getAllAsync('SELECT date FROM holidays WHERE class_code = ?', classCode);
      return new Set(rows.map((r) => r.date));
    },
    async setHoliday(classCode, date, isHoliday) {
      await init();
      if (isHoliday) {
        await db.runAsync('INSERT OR IGNORE INTO holidays (class_code, date) VALUES (?, ?)', classCode, date);
        // Timetabled lectures on a holiday don't count; extra lectures are kept.
        await db.runAsync('DELETE FROM attendance WHERE class_code = ? AND date = ? AND extra = 0', classCode, date);
      } else {
        await db.runAsync('DELETE FROM holidays WHERE class_code = ? AND date = ?', classCode, date);
      }
    },

    async withTransaction(fn) {
      await init();
      await db.withTransactionAsync(fn);
    },
    async clearClassData(classCode) {
      await init();
      await db.runAsync('DELETE FROM attendance WHERE class_code = ?', classCode);
      await db.runAsync('DELETE FROM holidays WHERE class_code = ?', classCode);
    },
  };
}
