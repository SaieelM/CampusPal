// Shared class timetables live in Firestore (classes/{code}) so one person
// (e.g. the CR) enters the timetable and everyone else joins with the code.
// A copy is cached on the phone so attendance works offline.
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { db } from './firebase';
import { clearClassData, kvGet, kvSet } from './db';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function randomCode(prefix) {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  const p = (prefix || 'CLS').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'CLS';
  return `${p}-${s}`;
}

export function normaliseCode(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, '');
}

export async function fetchClass(code) {
  const snap = await getDoc(doc(db, 'classes', normaliseCode(code)));
  return snap.exists() ? { ...snap.data(), code: snap.id } : null;
}

/** Creates a new class with a unique code. Returns the code. */
export async function createClass(data, uid) {
  const prefix = `${data.course || ''}${data.semester || ''}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(prefix);
    const ref = doc(db, 'classes', code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;
    await setDoc(ref, { ...clean(data), code, createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return code;
  }
  throw new Error('Could not generate a unique class code. Please try again.');
}

export async function updateClass(code, data) {
  const { code: _c, createdBy: _b, createdAt: _a, updatedAt: _u, ...rest } = clean(data);
  await updateDoc(doc(db, 'classes', code), { ...rest, updatedAt: serverTimestamp() });
}

// Firestore rejects `undefined` values; strip them.
function clean(value) {
  return JSON.parse(JSON.stringify(value));
}

// ---------- local cache ----------
export async function getLocalClass() {
  return kvGet('class');
}

export async function getMembership() {
  return kvGet('membership');
}

/** Store a Firestore class locally; timestamps are dropped (not JSON-friendly). */
export async function saveLocalClass(cls) {
  const { createdAt, updatedAt, ...rest } = cls;
  await kvSet('class', rest);
  return rest;
}

export async function saveMembership(membership) {
  await kvSet('membership', membership);
}

export async function leaveClass({ deleteAttendance }) {
  const m = await getMembership();
  if (deleteAttendance && m?.code) await clearClassData(m.code);
  await kvSet('class', null);
  await kvSet('membership', null);
}
