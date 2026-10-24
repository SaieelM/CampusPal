// Notes & PYQ exchange: metadata in Firestore, PDF files on Cloudinary,
// downloaded copies kept on the phone for offline reading.
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { cloudinaryConfig, isCloudinaryConfigured, MAX_UPLOAD_MB, REPORTS_TO_HIDE } from './config';
import { db } from './firebase';
import { kvGet, kvSet } from './db';

// ---------- reading ----------
function toNote(snap) {
  const d = snap.data();
  return {
    id: snap.id,
    ...d,
    createdAt: d.createdAt?.toMillis ? d.createdAt.toMillis() : Date.now(),
  };
}

export const avgRating = (n) => (n.ratingCount ? n.ratingSum / n.ratingCount : 0);

/** Higher = better. Upvotes matter most, then rating, then freshness. */
export function noteScore(n) {
  const ageDays = (Date.now() - n.createdAt) / 86400000;
  return (n.upvotes || 0) * 3 + avgRating(n) * (n.ratingCount || 0) - ageDays * 0.05;
}

/**
 * All visible notes for a course. Filtering/sorting is done on the phone so
 * Firestore doesn't need composite indexes (fine at campus scale).
 */
export async function listNotes(course) {
  const q = query(collection(db, 'notes'), where('course', '==', course), limit(500));
  const snap = await getDocs(q);
  const notes = snap.docs.map(toNote).filter((n) => !n.hidden);
  await kvSet(`notesCache:${course}`, notes); // shown when offline
  return notes;
}

export async function cachedNotes(course) {
  return kvGet(`notesCache:${course}`, []);
}

export async function getNote(id) {
  const snap = await getDoc(doc(db, 'notes', id));
  return snap.exists() ? toNote(snap) : null;
}

export async function myUploads(uid) {
  const snap = await getDocs(query(collection(db, 'notes'), where('uploadedBy', '==', uid), limit(200)));
  return snap.docs.map(toNote).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getMyVote(noteId, uid) {
  const snap = await getDoc(doc(db, 'notes', noteId, 'votes', uid));
  return snap.exists() ? snap.data() : { upvoted: false, stars: 0 };
}

// ---------- voting / rating / reporting ----------
/** Toggle upvote and/or set a 1–5 star rating; keeps totals on the note in sync. */
export async function vote(noteId, uid, { upvoted, stars }) {
  const noteRef = doc(db, 'notes', noteId);
  const voteRef = doc(db, 'notes', noteId, 'votes', uid);
  await runTransaction(db, async (tx) => {
    const [noteSnap, voteSnap] = await Promise.all([tx.get(noteRef), tx.get(voteRef)]);
    if (!noteSnap.exists()) throw new Error('This note was removed.');
    const prev = voteSnap.exists() ? voteSnap.data() : { upvoted: false, stars: 0 };
    const next = {
      upvoted: upvoted ?? prev.upvoted,
      stars: stars ?? prev.stars,
    };
    const upDelta = (next.upvoted ? 1 : 0) - (prev.upvoted ? 1 : 0);
    const sumDelta = next.stars - prev.stars;
    const countDelta = (next.stars ? 1 : 0) - (prev.stars ? 1 : 0);
    tx.set(voteRef, { ...next, updatedAt: serverTimestamp() });
    tx.update(noteRef, {
      upvotes: increment(upDelta),
      ratingSum: increment(sumDelta),
      ratingCount: increment(countDelta),
    });
  });
}

/** One report per user; the note hides itself after REPORTS_TO_HIDE reports. */
export async function reportNote(noteId, uid, reason) {
  const noteRef = doc(db, 'notes', noteId);
  const reportRef = doc(db, 'notes', noteId, 'reports', uid);
  return runTransaction(db, async (tx) => {
    const [noteSnap, reportSnap] = await Promise.all([tx.get(noteRef), tx.get(reportRef)]);
    if (reportSnap.exists()) return 'already';
    if (!noteSnap.exists()) return 'missing';
    const reports = (noteSnap.data().reports || 0) + 1;
    tx.set(reportRef, { reason, createdAt: serverTimestamp() });
    tx.update(noteRef, { reports, hidden: reports >= REPORTS_TO_HIDE });
    return 'reported';
  });
}

export async function deleteNote(note) {
  await deleteDoc(doc(db, 'notes', note.id));
  await removeDownload(note.id);
}

// ---------- creating ----------
/**
 * Turns photos of pages into one A4 PDF on the phone.
 * `images` are ImagePicker assets taken with `base64: true`.
 */
export async function imagesToPdf(images) {
  const pages = images
    .map(
      (img) => `<div class="page"><img src="data:image/jpeg;base64,${img.base64}" /></div>`
    )
    .join('');
  const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page { margin: 0; }
      body { margin: 0; }
      .page { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; page-break-after: always; }
      .page:last-child { page-break-after: auto; }
      img { max-width: 100%; max-height: 100%; object-fit: contain; }
    </style></head><body>${pages}</body></html>`;
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  return { uri, size: new File(uri).size || 0 };
}

/** Uploads a local PDF to Cloudinary using the unsigned preset. Reports progress 0–1. */
export function uploadPdf({ uri, name }, onProgress) {
  if (!isCloudinaryConfigured) {
    return Promise.reject(new Error('File uploads are not set up yet (Cloudinary values missing in .env).'));
  }
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`;
  const form = new FormData();
  form.append('file', { uri, type: 'application/pdf', name: name || 'notes.pdf' });
  form.append('upload_preset', cloudinaryConfig.uploadPreset);
  form.append('folder', 'campuspal');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(res);
        else reject(new Error(res?.error?.message || `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed. Check your internet connection.'));
    xhr.send(form);
  });
}

export function checkSize(bytes) {
  if (bytes && bytes > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(`File is too large. Maximum size is ${MAX_UPLOAD_MB} MB.`);
  }
}

export async function createNote(meta, uploaded, user) {
  const data = {
    title: meta.title.trim(),
    subject: meta.subject.trim(),
    courseCode: (meta.courseCode || '').trim().toUpperCase(),
    professor: (meta.professor || '').trim(),
    type: meta.type,
    course: meta.course,
    semester: Number(meta.semester),
    fileUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
    pages: uploaded.pages || null,
    bytes: uploaded.bytes || null,
    uploadedBy: user.uid,
    uploaderName: user.displayName || 'Student',
    upvotes: 0,
    ratingSum: 0,
    ratingCount: 0,
    downloads: 0,
    reports: 0,
    hidden: false,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'notes'), data);
  try {
    await setDoc(doc(db, 'users', user.uid), { uploadCount: increment(1) }, { merge: true });
  } catch {
    // counter is cosmetic
  }
  return ref.id;
}

// ---------- downloads (offline copies) ----------
const notesDir = () => new Directory(Paths.document, 'notes');

export async function getDownloads() {
  return kvGet('downloads', {});
}

export async function isDownloaded(noteId) {
  const all = await getDownloads();
  const entry = all[noteId];
  if (!entry) return null;
  return new File(entry.uri).exists ? entry : null;
}

export async function downloadNote(note) {
  const dir = notesDir();
  if (!dir.exists) dir.create({ intermediates: true });
  const target = new File(dir, `${note.id}.pdf`);
  if (target.exists) target.delete();
  const file = await File.downloadFileAsync(note.fileUrl, target);
  const all = await getDownloads();
  all[note.id] = {
    id: note.id,
    title: note.title,
    subject: note.subject,
    type: note.type,
    semester: note.semester,
    uri: file.uri,
    savedAt: Date.now(),
  };
  await kvSet('downloads', all);
  try {
    await updateDoc(doc(db, 'notes', note.id), { downloads: increment(1) });
  } catch {
    // counter is cosmetic
  }
  return all[note.id];
}

export async function removeDownload(noteId) {
  const all = await getDownloads();
  const entry = all[noteId];
  if (entry) {
    const f = new File(entry.uri);
    if (f.exists) f.delete();
    delete all[noteId];
    await kvSet('downloads', all);
  }
}

/** Opens a downloaded PDF in the phone's PDF viewer. */
export async function openPdf(uri, title) {
  if (Platform.OS === 'android') {
    try {
      const contentUri = await getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/pdf',
      });
      return;
    } catch {
      // No PDF viewer installed → fall back to the share sheet.
    }
  }
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title, UTI: 'com.adobe.pdf' });
}

// ---------- feedback ----------
export async function sendFeedback(user, { type, message }) {
  await addDoc(collection(db, 'feedback'), {
    type,
    message: message.trim(),
    uid: user.uid,
    email: user.email,
    platform: Platform.OS,
    createdAt: serverTimestamp(),
  });
}
