import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { firebaseConfig, isFirebaseConfigured } from './config';

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  const isFirstInit = getApps().length === 0;
  app = isFirstInit ? initializeApp(firebaseConfig) : getApp();
  // Keep users logged in between app launches.
  auth = isFirstInit
    ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
    : getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };
