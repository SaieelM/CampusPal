import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { ALLOWED_EMAIL_DOMAIN } from './config';
import { auth, db } from './firebase';
import { kvGet, kvSet } from './db';

const AuthContext = createContext(null);

export function isCollegeEmail(email) {
  const e = (email || '').trim().toLowerCase();
  return e.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`) || e.endsWith(`.${ALLOWED_EMAIL_DOMAIN}`);
}

/**
 * Reads hints from a university email such as mca2025.1234.abcd@unigoa.ac.in
 * → { course: 'MCA', batchYear: 2025 }. Formats differ by course, so these
 * are only suggestions the student can change.
 */
export function parseCollegeEmail(email) {
  const local = (email || '').split('@')[0].toLowerCase();
  // The year can be 4 digits (mca2025.…) or 2 digits (mca25.…).
  const m = local.match(/^([a-z]+)(\d{4}|\d{2})(?!\d)/);
  if (!m) return {};
  const year = Number(m[2]);
  return { course: m[1].toUpperCase(), batchYear: year < 100 ? 2000 + year : year };
}

/** Rough current semester from the batch year (odd sem from July, even from January). */
export function guessSemester(batchYear) {
  if (!batchYear) return null;
  const now = new Date();
  const yearsIn = now.getFullYear() - batchYear;
  const sem = now.getMonth() >= 6 ? yearsIn * 2 + 1 : yearsIn * 2;
  return sem >= 1 && sem <= 10 ? sem : null;
}

export function friendlyAuthError(e) {
  const code = e?.code || '';
  const map = {
    'auth/invalid-email': 'That email address looks invalid.',
    'auth/email-already-in-use': 'An account already exists with this email. Try logging in.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
    'auth/network-request-failed': 'No internet connection. Please check your network.',
  };
  return map[code] || e?.message || 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [verified, setVerified] = useState(false);
  const [initialising, setInitialising] = useState(true);

  const loadProfile = useCallback(async (u) => {
    if (!u) {
      setProfile(null);
      return null;
    }
    // Cached copy first so the app opens offline.
    const cached = await kvGet(`profile:${u.uid}`);
    if (cached) setProfile(cached);
    try {
      const snap = await getDoc(doc(db, 'users', u.uid));
      const p = snap.exists() ? snap.data() : null;
      const usable = p && p.semester ? { ...p, createdAt: null } : null;
      setProfile(usable);
      await kvSet(`profile:${u.uid}`, usable);
      return usable;
    } catch {
      return cached;
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setVerified(Boolean(u?.emailVerified));
      await loadProfile(u);
      setInitialising(false);
    });
    return unsub;
  }, [loadProfile]);

  const signUp = useCallback(async ({ name, email, password }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!isCollegeEmail(cleanEmail)) {
      throw new Error(`Please use your college email ending with @${ALLOWED_EMAIL_DOMAIN}.`);
    }
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    await updateProfile(cred.user, { displayName: name.trim() });
    await sendEmailVerification(cred.user);
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email) => {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  }, []);

  /** Re-checks whether the email link has been clicked. */
  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    // Refresh the ID token so Firestore rules see email_verified = true straight away.
    if (auth.currentUser.emailVerified) {
      await auth.currentUser.getIdToken(true);
      await loadProfile(auth.currentUser);
    }
    setVerified(auth.currentUser.emailVerified);
    return auth.currentUser.emailVerified;
  }, [loadProfile]);

  const resendVerification = useCallback(async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  }, []);

  const saveProfile = useCallback(async (data) => {
    const u = auth.currentUser;
    const p = {
      name: data.name.trim(),
      email: u.email,
      course: data.course.trim().toUpperCase(),
      semester: Number(data.semester),
      batchYear: data.batchYear || null,
    };
    await setDoc(doc(db, 'users', u.uid), { ...p, updatedAt: serverTimestamp() }, { merge: true });
    if (p.name !== u.displayName) await updateProfile(u, { displayName: p.name });
    setProfile(p);
    await kvSet(`profile:${u.uid}`, p);
  }, []);

  const value = useMemo(
    () => ({
      user,
      verified,
      profile,
      initialising,
      signUp,
      signIn,
      signOut,
      resetPassword,
      refreshUser,
      resendVerification,
      saveProfile,
    }),
    [user, verified, profile, initialising, signUp, signIn, signOut, resetPassword, refreshUser, resendVerification, saveProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
