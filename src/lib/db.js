// Local, offline storage on the phone. Attendance is personal, so it never
// leaves the device.
//
// Uses SQLite when the app binary has it (APK and development builds).
// Expo Go 58 on Android doesn't register the SQLite native module, so there
// the same data is kept in AsyncStorage instead (see dbAsync.js).
import { requireOptionalNativeModule } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAsyncStorageBackend } from './dbAsync';
import { createSQLiteBackend } from './dbSqlite';

const hasSQLite = requireOptionalNativeModule('ExpoSQLite') != null;

// Only load expo-sqlite when its native module exists; importing it otherwise crashes.
const backend = hasSQLite ? createSQLiteBackend(require('expo-sqlite')) : createAsyncStorageBackend(AsyncStorage);

/** 'sqlite' or 'asyncstorage' (Expo Go). */
export const storageBackend = backend.name;

export function initDb() {
  return backend.init();
}

// ---------- key/value ----------
export async function kvGet(key, fallback = null) {
  const raw = await backend.kvGet(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function kvSet(key, value) {
  await backend.kvSet(key, value === null || value === undefined ? null : JSON.stringify(value));
}

// ---------- attendance ----------
export function getRecords(classCode) {
  return backend.getRecords(classCode);
}

export function setRecord(classCode, { date, slotKey, subjectId, status, count = 1, extra = 0, start = null, end = null }) {
  return backend.setRecord(classCode, { date, slotKey, subjectId, status, count, extra, start, end });
}

export function deleteRecord(classCode, date, slotKey) {
  return backend.deleteRecord(classCode, date, slotKey);
}

export function getHolidays(classCode) {
  return backend.getHolidays(classCode);
}

export function setHoliday(classCode, date, isHoliday) {
  return backend.setHoliday(classCode, date, isHoliday);
}

export function withTransaction(fn) {
  return backend.withTransaction(fn);
}

export function clearClassData(classCode) {
  return backend.clearClassData(classCode);
}
