// Shared class timetables live in Firestore (classes/{code}) so one person
// (e.g. the CR) enters the timetable and everyone else joins with the code.
// A copy is cached on the phone so attendance works offline.
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

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

/**
 * Class names must be unique. "MCA Sem III – 2026/27" and "mca sem iii 2026-27"
 * count as the same name, so case, spaces and punctuation are ignored.
 */
export function nameKey(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export class DuplicateNameError extends Error {
  constructor() {
    super('A class with this name already exists. Ask your CR for its code, or choose a different name.');
    this.name = 'DuplicateNameError';
  }
}

/** Returns the code of the class that already uses this name, or null. */
export async function findClassByName(name) {
  const snap = await getDoc(doc(db, 'classNames', nameKey(name)));
  return snap.exists() ? snap.data().code : null;
}

/**
 * Creates a new class with a unique code and a unique name (both checked
 * atomically, so two people pressing Create together can't clash). Returns the code.
 */
export async function createClass(data, uid) {
  const prefix = `${data.course || ''}${data.semester || ''}`;
  const key = nameKey(data.name);
  if (!key) throw new Error('Give the class a name.');
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(prefix);
    const created = await runTransaction(db, async (tx) => {
      const nameRef = doc(db, 'classNames', key);
      const classRef = doc(db, 'classes', code);
      const [nameSnap, classSnap] = await Promise.all([tx.get(nameRef), tx.get(classRef)]);
      if (nameSnap.exists()) throw new DuplicateNameError();
      if (classSnap.exists()) return false; // code collision → try another code
      tx.set(nameRef, { code, createdBy: uid, createdAt: serverTimestamp() });
      tx.set(classRef, { ...clean(data), code, createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return true;
    });
    if (created) return code;
  }
  throw new Error('Could not generate a unique class code. Please try again.');
}

/** Updates a class; if the name changed, the new name must also be free. */
export async function updateClass(code, data, previousName) {
  const { code: _c, createdBy: _b, createdAt: _a, updatedAt: _u, ...rest } = clean(data);
  const oldKey = nameKey(previousName);
  const newKey = nameKey(rest.name);
  await runTransaction(db, async (tx) => {
    const classRef = doc(db, 'classes', code);
    if (newKey !== oldKey) {
      const newRef = doc(db, 'classNames', newKey);
      const taken = await tx.get(newRef);
      if (taken.exists()) throw new DuplicateNameError();
      const classSnap = await tx.get(classRef);
      tx.set(newRef, { code, createdBy: classSnap.data().createdBy, createdAt: serverTimestamp() });
      if (oldKey) tx.delete(doc(db, 'classNames', oldKey));
    }
    tx.update(classRef, { ...rest, updatedAt: serverTimestamp() });
  });
}

// ---------- membership (who joined, for student counts) ----------
export async function recordMember(code, user, membership) {
  try {
    await setDoc(doc(db, 'classes', code, 'members', user.uid), {
      name: user.displayName || '',
      email: user.email,
      batch: membership.batch || null,
      joinedAt: serverTimestamp(),
    });
  } catch {
    // Count is informational only.
  }
}

export async function removeMember(code, uid) {
  try {
    await deleteDoc(doc(db, 'classes', code, 'members', uid));
  } catch {
    // ignore (offline or class already deleted)
  }
}

// ---------- admin ----------
export async function listAllClasses() {
  const snap = await getDocs(collection(db, 'classes'));
  const list = snap.docs.map((d) => ({
    ...d.data(),
    code: d.id,
    updatedAt: d.data().updatedAt?.toMillis ? d.data().updatedAt.toMillis() : 0,
    createdAt: d.data().createdAt?.toMillis ? d.data().createdAt.toMillis() : 0,
  }));
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function memberCount(code) {
  try {
    const res = await getCountFromServer(collection(db, 'classes', code, 'members'));
    return res.data().count;
  } catch {
    return null;
  }
}

/** Deletes a class, its member list and its reserved name. */
export async function deleteClass(cls) {
  const members = await getDocs(collection(db, 'classes', cls.code, 'members'));
  await Promise.all(members.docs.map((m) => deleteDoc(m.ref)));
  await deleteDoc(doc(db, 'classes', cls.code));
  const key = nameKey(cls.name);
  if (key) {
    const nameSnap = await getDoc(doc(db, 'classNames', key));
    if (nameSnap.exists() && nameSnap.data().code === cls.code) await deleteDoc(nameSnap.ref);
  }
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
