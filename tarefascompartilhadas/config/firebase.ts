import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Configuração do Firebase
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

// Inicializar Analytics apenas para web
let analytics = null;
if (Platform.OS === 'web') {
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  });
}
// Inicializar Auth
const auth = getAuth(app);

// Inicializar Firestore
const db = getFirestore(app);

// Logs para debug
console.log('🔥 Firebase inicializado para:', Platform.OS);
console.log('🔐 Auth inicializado:', !!auth);
console.log('📊 Firestore inicializado:', !!db);

export { auth, db, analytics };
export default app;