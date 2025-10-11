// Inicialização do Firebase (modular SDK)
import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// ATENÇÃO: estas chaves vieram do arquivo fornecido pelo usuário.
// Mantenha este arquivo seguro e não comite credenciais públicas em repositórios públicos.
const firebaseConfig = {
  apiKey: 'AIzaSyB1_83WDBh63SHS8BUofcIz6uA5wUGOvBo',
  authDomain: 'agenda-familiar-472905.firebaseapp.com',
  projectId: 'agenda-familiar-472905',
  storageBucket: 'agenda-familiar-472905.firebasestorage.app',
  messagingSenderId: '742861794909',
  appId: '1:742861794909:web:ea7acca4fdb466af6aa7b4',
  measurementId: 'G-71GE7E4KZ9'
};

// Inicializar Firebase app imediatamente (não deve causar side-effects grandes)
const app = initializeApp(firebaseConfig);

// Inicializar Analytics apenas na web e quando suportado (não bloqueante)
let analytics: any = null;
if (Platform.OS === 'web') {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        console.warn('Analytics não disponível:', e);
        analytics = null;
      }
    }
  }).catch(err => {
    console.warn('Erro ao verificar suporte a analytics:', err);
  });
}

// Lazy instances to avoid import-time initialization that breaks Node/Jest environment
let _auth: ReturnType<typeof getAuth> | null = null;
let _db: ReturnType<typeof getFirestore> | null = null;
let _storage: ReturnType<typeof getStorage> | null = null;

function getFirebaseAuth() {
  if (_auth) return _auth;
  try {
    _auth = getAuth(app);
  } catch (e) {
    // Em ambientes de teste ou não suportados, retornar um stub vazio
    console.warn('getAuth falhou durante inicialização (ambiente de teste?). Retornando stub.');
    // @ts-ignore
    _auth = {};
  }
  return _auth;
}

function getFirestoreInstance() {
  if (_db) return _db;
  try {
    _db = getFirestore(app);
  } catch (e) {
    console.warn('getFirestore falhou durante inicialização (ambiente de teste?). Retornando stub.');
    // @ts-ignore
    _db = {};
  }
  return _db;
}

function getStorageInstance() {
  if (_storage) return _storage;
  try {
    _storage = getStorage(app);
  } catch (e) {
    console.warn('getStorage falhou durante inicialização (ambiente de teste?). Retornando stub.');
    // @ts-ignore
    _storage = {};
  }
  return _storage;
}

// Helper: create a callable proxy that returns the real instance when called
function createCallableProxy(getInstance: () => any) {
  const callable = function() {
    return getInstance();
  } as any;

  return new Proxy(callable, {
    get(_target, prop) {
      const inst = getInstance();
      if (inst == null) return undefined;
      return (inst as any)[prop];
    },
    apply(_target, thisArg, _args) {
      return getInstance();
    }
  });
}

export const firebaseFirestore = createCallableProxy(getFirestoreInstance);
export const firebaseAuth = createCallableProxy(getFirebaseAuth);
export const firebaseStorage = createCallableProxy(getStorageInstance);

export { app as firebaseApp, analytics };
export default app;