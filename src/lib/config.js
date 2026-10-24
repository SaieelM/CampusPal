// Values come from campuspal/.env. Expo only inlines EXPO_PUBLIC_* variables
// when they are referenced literally like below (no dynamic lookups).
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const cloudinaryConfig = {
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
  uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
};

export const ALLOWED_EMAIL_DOMAIN = process.env.EXPO_PUBLIC_ALLOWED_EMAIL_DOMAIN || 'unigoa.ac.in';

export const missingConfig = [
  ...Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => `Firebase: ${k}`),
];

export const isFirebaseConfigured = missingConfig.length === 0;
export const isCloudinaryConfigured = Boolean(cloudinaryConfig.cloudName && cloudinaryConfig.uploadPreset);

// Attendance rules (University ordinance)
export const SUBJECT_MIN = { num: 1, den: 2 }; // 50% in every course
export const OVERALL_MIN = { num: 3, den: 4 }; // 75% overall

export const NOTE_TYPES = ['Notes', 'PYQ', 'Lab Manual', 'Assignment'];
export const MAX_UPLOAD_MB = 10;
export const REPORTS_TO_HIDE = 3;
