// Firebase initialization (replace with your real config)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let app;
export function initFirebase() {
  if (!app) {
    const firebaseConfig = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'REPLACE_ME',
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'REPLACE_ME',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'REPLACE_ME',
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'REPLACE_ME',
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'REPLACE_ME',
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'REPLACE_ME'
    };
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getDb() {
  return getFirestore(initFirebase());
}

export function getFirebaseAuth() {
  return getAuth(initFirebase());
}
