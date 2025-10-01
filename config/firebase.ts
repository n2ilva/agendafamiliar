// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyB1_83WDBh63SHS8BUofcIz6uA5wUGOvBo",
  authDomain: "agenda-familiar-472905.firebaseapp.com",
  projectId: "agenda-familiar-472905",
  storageBucket: "agenda-familiar-472905.firebaseapp.com",
  messagingSenderId: "742861794909",
  appId: "1:742861794909:web:ea7acca4fdb466af6aa7b4",
  measurementId: "G-71GE7E4KZ9"
};

// Initialize Firebase (avoid re-initializing in web env hot reload)
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);

// This file is intentionally minimal because on React Native we rely on
// '@react-native-firebase/*' native modules and on Web we consume the
// modular JS SDK. Importing this file early (see app/_layout.tsx) ensures
// that a default app exists before any context/provider tries to access
// Firestore (web path) preventing 'No Firebase App [DEFAULT]' errors.