import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fetchClass, getLocalClass, getMembership, saveLocalClass, saveMembership } from './classes';
import { getHolidays, getRecords, initDb } from './db';
import { scheduleLectureReminders } from './notifications';

const ClassContext = createContext(null);

/**
 * Holds the joined class (timetable), the student's batch/electives and the
 * attendance records. Screens call `refreshRecords()` after marking.
 */
export function ClassProvider({ children }) {
  const [cls, setCls] = useState(null);
  const [membership, setMembershipState] = useState(null);
  const [records, setRecords] = useState([]);
  const [holidays, setHolidays] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async (code) => {
    if (!code) {
      setRecords([]);
      setHolidays(new Set());
      return;
    }
    const [r, h] = await Promise.all([getRecords(code), getHolidays(code)]);
    setRecords(r);
    setHolidays(h);
  }, []);

  const reload = useCallback(async () => {
    await initDb();
    const [c, m] = await Promise.all([getLocalClass(), getMembership()]);
    setCls(c);
    setMembershipState(m);
    await loadRecords(m?.code);
    setLoading(false);
    return { cls: c, membership: m };
  }, [loadRecords]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads async data on mount
    reload();
  }, [reload]);

  /** Pull the latest timetable from Firestore (if online). Returns true if it changed. */
  const syncFromServer = useCallback(async () => {
    if (!membership?.code) return false;
    try {
      const fresh = await fetchClass(membership.code);
      if (!fresh) return false;
      const before = JSON.stringify(cls);
      const saved = await saveLocalClass(fresh);
      if (JSON.stringify(saved) === before) return false;
      setCls(saved);
      await scheduleLectureReminders(saved, membership);
      return true;
    } catch {
      return false; // offline: keep using the cached copy
    }
  }, [cls, membership]);

  const joinClass = useCallback(async (classData, m) => {
    const saved = await saveLocalClass(classData);
    await saveMembership(m);
    setCls(saved);
    setMembershipState(m);
    await loadRecords(m.code);
    await scheduleLectureReminders(saved, m);
  }, [loadRecords]);

  const updateMembership = useCallback(async (m) => {
    await saveMembership(m);
    setMembershipState(m);
    await scheduleLectureReminders(cls, m);
  }, [cls]);

  const setLocalClass = useCallback(async (classData) => {
    const saved = await saveLocalClass(classData);
    setCls(saved);
    if (membership) await scheduleLectureReminders(saved, membership);
  }, [membership]);

  const value = useMemo(
    () => ({
      cls,
      membership,
      records,
      holidays,
      loading,
      reload,
      syncFromServer,
      joinClass,
      updateMembership,
      setLocalClass,
      refreshRecords: () => loadRecords(membership?.code),
    }),
    [cls, membership, records, holidays, loading, reload, syncFromServer, joinClass, updateMembership, setLocalClass, loadRecords]
  );

  return <ClassContext.Provider value={value}>{children}</ClassContext.Provider>;
}

export function useClass() {
  const ctx = useContext(ClassContext);
  if (!ctx) throw new Error('useClass must be used inside ClassProvider');
  return ctx;
}
