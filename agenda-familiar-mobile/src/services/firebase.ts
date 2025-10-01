// Firebase configuration for React Native
import { initializeApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB1_83WDBh63SHS8BUofcIz6uA5wUGOvBo",
  authDomain: "agenda-familiar-472905.firebaseapp.com",
  projectId: "agenda-familiar-472905",
  storageBucket: "agenda-familiar-472905.firebasestorage.app",
  messagingSenderId: "742861794909",
  appId: "1:742861794909:android:967badc5ae126af56aa7b4",
  measurementId: "G-71GE7E4KZ9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { auth, firestore };
export default app;