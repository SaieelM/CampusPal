// Admin-only demo data for presentations and testing:
//  • two shared classes (MCA Sem III and Sem I, from the GBS timetable)
//  • attendance scenarios on this phone for the Sem III demo class (demoPlan.js)
//  • a handful of notes with real (generated) PDFs on Cloudinary
import * as Print from 'expo-print';
import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore';

import { createClass, fetchClass, findClassByName } from './classes';
import { clearClassData, kvGet, kvSet, setHoliday, setRecord, withTransaction } from './db';
import { planDemoAttendance } from './demoPlan';
import { db } from './firebase';
import { uploadPdf } from './notes';
import { MCA_SEM1_SAMPLE, MCA_SEM3_SAMPLE } from './sampleTimetable';

export const DEMO_SUFFIX = ' (Demo)';

/** Creates the demo classes if they don't exist yet. Returns { sem3, sem1 } class objects. */
export async function ensureDemoClasses(uid) {
  const out = {};
  for (const [key, sample] of [['sem3', MCA_SEM3_SAMPLE], ['sem1', MCA_SEM1_SAMPLE]]) {
    const name = sample.name + DEMO_SUFFIX;
    let code = await findClassByName(name);
    if (!code) code = await createClass({ ...sample, name, demo: true }, uid);
    out[key] = await fetchClass(code);
  }
  return out;
}

/**
 * Replaces this phone's attendance for the Sem III demo class with a test
 * scenario (see SCENARIOS in demoPlan.js). Returns the demo membership.
 */
export async function generateDemoAttendance(cls, scenarioKey) {
  const { membership, holidays, records } = planDemoAttendance(cls, scenarioKey);
  await clearClassData(cls.code);
  await withTransaction(async () => {
    for (const h of holidays) await setHoliday(cls.code, h, true);
    for (const r of records) await setRecord(cls.code, r);
  });
  await kvSet('demoScenario', scenarioKey);
  return { membership, count: records.length };
}

export async function currentDemoScenario() {
  return kvGet('demoScenario');
}

// ---------- demo notes ----------
const DEMO_NOTES = [
  {
    title: 'Unit 1 – Introduction to Cloud Computing',
    subject: 'Cloud Computing', courseCode: 'CSA-6402', professor: 'Sanket Mhamal', type: 'Notes', semester: 3,
    upvotes: 24, ratingSum: 66, ratingCount: 15, downloads: 58, uploaderName: 'Senior – MCA 2025',
    points: ['NIST definition and five essential characteristics', 'Service models: IaaS, PaaS, SaaS', 'Deployment models: public, private, hybrid, community', 'Virtualisation and hypervisors (Type 1 vs Type 2)', 'Benefits, risks and cost model'],
  },
  {
    title: 'PYQ 2025 – Cloud Computing (Sem III)',
    subject: 'Cloud Computing', courseCode: 'CSA-6402', professor: 'Sanket Mhamal', type: 'PYQ', semester: 3,
    upvotes: 31, ratingSum: 92, ratingCount: 20, downloads: 87, uploaderName: 'Senior – MCA 2025',
    points: ['Q1. Explain the NIST cloud model with a neat diagram. (10)', 'Q2. Compare IaaS, PaaS and SaaS with examples. (10)', 'Q3. What is virtualisation? Explain full vs para-virtualisation. (10)', 'Q4. Write short notes on: (a) Elasticity (b) Multi-tenancy (10)'],
  },
  {
    title: 'Mobile App Development – React Native basics',
    subject: 'Mobile Application Development', courseCode: 'CSA-6403', professor: 'Shounak Deshpande', type: 'Notes', semester: 3,
    upvotes: 17, ratingSum: 43, ratingCount: 10, downloads: 39, uploaderName: 'CampusPal Team',
    points: ['Components, props and state', 'Hooks: useState, useEffect, useCallback', 'Navigation with Expo Router', 'Device features: camera, notifications, storage', 'Building an APK with EAS Build'],
  },
  {
    title: 'Cryptography – Lab Manual (RSA, AES, SHA)',
    subject: 'Cryptography and Network Security', courseCode: 'CSA-6002', professor: 'Gaurpriya Chodanker', type: 'Lab Manual', semester: 3,
    upvotes: 12, ratingSum: 34, ratingCount: 8, downloads: 26, uploaderName: 'Senior – MCA 2025',
    points: ['Exp 1: Caesar and Vigenère ciphers', 'Exp 2: RSA key generation, encryption and decryption', 'Exp 3: AES-128 using a library', 'Exp 4: SHA-256 hashing and digital signatures'],
  },
  {
    title: 'Operating Systems – Process Scheduling',
    subject: 'Operating Systems', courseCode: 'CSA-5000', professor: 'Yma Pinto', type: 'Notes', semester: 1,
    upvotes: 20, ratingSum: 55, ratingCount: 12, downloads: 47, uploaderName: 'Senior – MCA 2025',
    points: ['Process states and PCB', 'FCFS, SJF, Priority and Round Robin', 'Gantt charts, waiting and turnaround time', 'Starvation and aging'],
  },
  {
    title: 'PYQ 2025 – Mathematics for Computer Science I',
    subject: 'Mathematics for Computer Science – I', courseCode: 'CSA-5201', professor: 'Rovan Vaz', type: 'PYQ', semester: 1,
    upvotes: 9, ratingSum: 26, ratingCount: 6, downloads: 21, uploaderName: 'CampusPal Team',
    points: ['Q1. Prove by induction: 1 + 2 + … + n = n(n+1)/2. (8)', 'Q2. Find the number of onto functions from A to B. (8)', 'Q3. Solve the recurrence T(n) = 2T(n/2) + n. (10)', 'Q4. Define a lattice and give an example. (6)'],
  },
];

function noteHtml(n) {
  const items = n.points.map((p) => `<li>${p}</li>`).join('');
  return `<html><head><style>
    body { font-family: sans-serif; padding: 40px; color: #14213D; }
    h1 { font-size: 22px; margin-bottom: 4px; } .meta { color: #5B6475; margin-bottom: 24px; }
    li { font-size: 15px; line-height: 1.6; margin-bottom: 8px; }
    .foot { margin-top: 40px; font-size: 12px; color: #9AA5B8; }
  </style></head><body>
    <h1>${n.title}</h1>
    <div class="meta">${n.subject}${n.courseCode ? ` (${n.courseCode})` : ''} · Prof. ${n.professor} · MCA Sem ${n.semester}</div>
    <ol>${items}</ol>
    <div class="foot">Demo document generated by CampusPal.</div>
  </body></html>`;
}

export async function demoNotesExist() {
  const snap = await getDocs(query(collection(db, 'notes'), where('demo', '==', true), limit(1)));
  return !snap.empty;
}

/** Generates a PDF per demo note, uploads it and creates the note. */
export async function createDemoNotes(user, onProgress) {
  let done = 0;
  for (const n of DEMO_NOTES) {
    const { uri } = await Print.printToFileAsync({ html: noteHtml(n), width: 595, height: 842 });
    const uploaded = await uploadPdf({ uri, name: `${n.title.slice(0, 40)}.pdf` });
    const { points, ...meta } = n;
    await addDoc(collection(db, 'notes'), {
      ...meta,
      course: 'MCA',
      fileUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      pages: uploaded.pages || 1,
      bytes: uploaded.bytes || null,
      uploadedBy: user.uid,
      reports: 0,
      hidden: false,
      demo: true,
      createdAt: serverTimestamp(),
    });
    done += 1;
    onProgress?.(done, DEMO_NOTES.length);
  }
  return done;
}

