// Suporte dual (Mobile nativo & Web): autenticação + Firestore
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { app } from '../config/firebase';

// Imports condicionais
let nativeAuth: any = null;
let nativeFirestore: any = null;
if (Platform.OS !== 'web') {
  try {
    nativeAuth = require('@react-native-firebase/auth').default;
    nativeFirestore = require('@react-native-firebase/firestore').default;
  } catch (e) {
    console.warn('Pacotes nativos de Firebase não disponíveis:', e);
  }
}

// Web SDK modular
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut as webSignOut } from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';

// Defina o tipo para o usuário
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  familyId?: string; // Adicionando familyId
  role?: 'admin' | 'member';
}

// Defina o tipo para o contexto de autenticação
interface AuthContextType {
  user: User | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

// Crie o contexto de autenticação
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Crie o provedor de autenticação
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '742861794909-qtrkl3r2fhhre3734c3heb0sm1l2fatj.apps.googleusercontent.com',
    });

    if (nativeAuth) {
      const subscriber = nativeAuth().onAuthStateChanged(async (firebaseUser: any) => {
        if (firebaseUser) {
          const userDocRef = nativeFirestore().collection('users').doc(firebaseUser.uid);
            const userDoc = await userDocRef.get();
            if (userDoc.exists()) {
              const data = userDoc.data();
              const { uid, email, displayName, photoURL } = firebaseUser;
              setUser({ uid, email, displayName, photoURL, familyId: data?.familyId });
            } else {
              const newFamilyRef = nativeFirestore().collection('families').doc();
              await newFamilyRef.set({ name: `Família de ${firebaseUser.displayName}` });
              const newUser: User = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                familyId: newFamilyRef.id,
                role: 'admin',
              };
              await userDocRef.set(newUser);
              setUser(newUser);
            }
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return subscriber;
    } else {
      // Web
      const authWeb = getAuth(app);
      const db = getFirestore(app);
      const unsubscribe = onAuthStateChanged(authWeb, async (firebaseUser) => {
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data() as any;
            const { uid, email, displayName, photoURL } = firebaseUser;
            setUser({ uid, email: email ?? null, displayName: displayName ?? null, photoURL: photoURL ?? null, familyId: data.familyId });
          } else {
            // cria família e usuário
            const newFamilyId = crypto.randomUUID();
            const familyRef = doc(db, 'families', newFamilyId);
            await setDoc(familyRef, { name: `Família de ${firebaseUser.displayName}` });
            const newUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              familyId: newFamilyId,
              role: 'admin',
            };
            await setDoc(userRef, newUser);
            setUser(newUser);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    }
  }, []);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error('No ID token present after getting tokens.');

      if (nativeAuth) {
        const googleCredential = nativeAuth.GoogleAuthProvider.credential(idToken);
        await nativeAuth().signInWithCredential(googleCredential);
      } else {
        const authWeb = getAuth(app);
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(authWeb, credential);
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Login cancelado');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Login em progresso');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log('Play services não disponível');
      } else {
        console.error(error);
      }
    }
  };

  const signOut = async () => {
    try {
      if (nativeAuth) {
        await nativeAuth().signOut();
      } else {
        const authWeb = getAuth(app);
        await webSignOut(authWeb);
      }
      try {
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
      } catch {}
      setUser(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Crie um hook para usar o contexto de autenticação
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
