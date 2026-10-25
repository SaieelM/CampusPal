// AsyncStorage storage backend, used when SQLite isn't available
// (Expo Go 58 on Android doesn't register the SQLite module).
// Same behaviour as dbSqlite.js. Each class's attendance and holidays are kept
// in memory and saved as one JSON value per class.
const PREFIX = 'campuspal:';

export function createAsyncStorageBackend(storage) {
  const classes = new Map(); // code → Promise<{ records: Map(date|slot → row), holidays: Set }>
  let nextId = 1;
  let txDepth = 0;
  const dirty = new Set();

  const attKey = (code) => `${PREFIX}attendance:${code}`;
  const holKey = (code) => `${PREFIX}holidays:${code}`;
  const rowKey = (date, slotKey) => `${date}|${slotKey}`;

  // Cache the loading promise so parallel callers share one in-memory copy.
  function load(code) {
    if (!classes.has(code)) {
      classes.set(
        code,
        (async () => {
          const [rawAtt, rawHol] = await Promise.all([storage.getItem(attKey(code)), storage.getItem(holKey(code))]);
          const rows = rawAtt ? JSON.parse(rawAtt) : [];
          for (const r of rows) nextId = Math.max(nextId, (r.id || 0) + 1);
          return {
            records: new Map(rows.map((r) => [rowKey(r.date, r.slot_key), r])),
            holidays: new Set(rawHol ? JSON.parse(rawHol) : []),
          };
        })()
      );
    }
    return classes.get(code);
  }

  async function save(code) {
    if (txDepth > 0) {
      dirty.add(code); // written once when the transaction ends
      return;
    }
    const entry = await classes.get(code);
    await storage.setItem(attKey(code), JSON.stringify([...entry.records.values()]));
    await storage.setItem(holKey(code), JSON.stringify([...entry.holidays]));
  }

  return {
    name: 'asyncstorage',
    init: async () => {},

    kvGet: (key) => storage.getItem(`${PREFIX}kv:${key}`),
    kvSet: (key, raw) => (raw === null ? storage.removeItem(`${PREFIX}kv:${key}`) : storage.setItem(`${PREFIX}kv:${key}`, raw)),

    async getRecords(code) {
      const { records } = await load(code);
      return [...records.values()].sort((a, b) => a.date.localeCompare(b.date) || (a.start || '').localeCompare(b.start || ''));
    },
    async setRecord(code, r) {
      const entry = await load(code);
      const k = rowKey(r.date, r.slotKey);
      const existing = entry.records.get(k);
      if (existing) {
        // Same as SQLite's ON CONFLICT … DO UPDATE: only these three change.
        entry.records.set(k, { ...existing, status: r.status, count: r.count, subject_id: r.subjectId });
      } else {
        entry.records.set(k, {
          id: nextId++,
          class_code: code,
          date: r.date,
          slot_key: r.slotKey,
          subject_id: r.subjectId,
          status: r.status,
          count: r.count,
          extra: r.extra,
          start: r.start,
          end: r.end,
        });
      }
      await save(code);
    },
    async deleteRecord(code, date, slotKey) {
      const entry = await load(code);
      entry.records.delete(rowKey(date, slotKey));
      await save(code);
    },

    async getHolidays(code) {
      return new Set((await load(code)).holidays);
    },
    async setHoliday(code, date, isHoliday) {
      const entry = await load(code);
      if (isHoliday) {
        entry.holidays.add(date);
        // Timetabled lectures on a holiday don't count; extra lectures are kept.
        for (const [k, r] of entry.records) if (r.date === date && !r.extra) entry.records.delete(k);
      } else {
        entry.holidays.delete(date);
      }
      await save(code);
    },

    async withTransaction(fn) {
      txDepth += 1;
      try {
        await fn();
      } finally {
        txDepth -= 1;
        if (txDepth === 0) {
          const codes = [...dirty];
          dirty.clear();
          for (const code of codes) await save(code);
        }
      }
    },
    async clearClassData(code) {
      classes.set(code, Promise.resolve({ records: new Map(), holidays: new Set() }));
      await save(code);
    },
  };
}
