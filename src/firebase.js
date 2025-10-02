// Firebase initialization (replace with your real config)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let app;
export function initFirebase() {
  if (!app) {
    const firebaseConfig = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB1_83WDBh63SHS8BUofcIz6uA5wUGOvBo',
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'agenda-familiar-472905.firebaseapp.com',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'agenda-familiar-472905',
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'agenda-familiar-472905.firebasestorage.app',
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '742861794909',
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:742861794909:web:ea7acca4fdb466af6aa7b4'
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
