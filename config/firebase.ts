import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1_83WDBh63SHS8BUofcIz6uA5wUGOvBo",
  authDomain: "agenda-familiar-472905.firebaseapp.com",
  projectId: "agenda-familiar-472905",
  storageBucket: "agenda-familiar-472905.firebasestorage.app",
  messagingSenderId: "742861794909",
  appId: "1:742861794909:web:ea7acca4fdb466af6aa7b4",
  measurementId: "G-71GE7E4KZ9"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Analytics apenas na web e quando suportado
let analytics: any = null;
if (Platform.OS === 'web') {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        // Não quebrar se analytics falhar — manter app funcionando
        console.warn('Analytics não disponível:', e);
        analytics = null;
      }
    }
  }).catch(err => {
    console.warn('Erro ao verificar suporte a analytics:', err);
  });
}

// Inicializar Auth, Firestore e Storage
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage, analytics };
export default app;