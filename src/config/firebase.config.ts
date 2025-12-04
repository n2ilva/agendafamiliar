import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyB1_83WDBh63SHS8BUofcIz6uA5wUGOvBo',
  authDomain: 'agenda-familiar-472905.firebaseapp.com',
  projectId: 'agenda-familiar-472905',
  storageBucket: 'agenda-familiar-472905.firebasestorage.app',
  messagingSenderId: '742861794909',
  appId: '1:742861794909:web:ea7acca4fdb466af6aa7b4',
  measurementId: 'G-71GE7E4KZ9'
};

const app = initializeApp(firebaseConfig);

// Analytics apenas para web
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

// Instâncias lazy para evitar problemas em ambiente de testes
let _auth: ReturnType<typeof getAuth> | null = null;
let _db: ReturnType<typeof getFirestore> | null = null;
let _storage: ReturnType<typeof getStorage> | null = null;

function getFirebaseAuth() {
  if (_auth) return _auth;
  try {
    if (Platform.OS !== 'web') {
      try {
        // Evita import estático que quebra no ambiente de testes (Node/Jest)
        // Tenta obter getReactNativePersistence dinamicamente
        let rnAuthModule: any = null;
        try {
          rnAuthModule = require('firebase/auth/react-native');
        } catch (e) {
          // fallback para caminhos antigos (casos raros)
          try {
            rnAuthModule = require('@firebase/auth/dist/rn/index.js');
          } catch (_ignored) {
            rnAuthModule = null;
          }
        }

        const getRNPersistence = rnAuthModule?.getReactNativePersistence;

        if (typeof getRNPersistence === 'function') {
          _auth = initializeAuth(app, {
            persistence: getRNPersistence(AsyncStorage)
          });
        } else {
          // Se não conseguir carregar a persistência RN, recorre ao getAuth simples
          _auth = getAuth(app);
        }
        
      } catch (error: any) {
        if (error?.code === 'auth/already-initialized') {
          _auth = getAuth(app);
          
        } else {
          throw error;
        }
      }
    } else {
      _auth = getAuth(app);
      
    }
  } catch (e) {
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
    // Habilitar persistência IndexedDB no web para acelerar leituras subsequentes
    if (Platform.OS === 'web') {
      try {
        // Ignorar erros de múltiplas abas: o app continua funcionando sem persistência
        // @ts-ignore
        enableIndexedDbPersistence(_db).then(() => {
          habilitada no web');
        }).catch((e: any) => {
          console.warn('ℹ️ Firestore persistence não habilitada (provável múltiplas abas):', e?.code || e);
        });
      } catch (e) {
        console.warn('Falha ao habilitar persistence do Firestore no web:', e);
      }
    }
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

// Cria proxy callable para retornar instância real quando invocado
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
