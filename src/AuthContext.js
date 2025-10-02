import React, { createContext, useContext, useEffect, useState } from 'react';
import { getFirebaseAuth, getDb } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // {uid, role, avatarUrl?}
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setUser(firebaseUser);
      // load profile
      const db = getDb();
      const ref = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setProfile(snap.data());
      } else {
        // fallback create basic profile if missing
  const baseProfile = { uid: firebaseUser.uid, role: 'kid', createdAt: Date.now(), avatarUrl: '' };
        await setDoc(ref, baseProfile);
        setProfile(baseProfile);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function signUp(email, password) {
    const auth = getFirebaseAuth();
    const db = getDb();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // decide role: first user becomes admin
    let role = 'kid';
    const q = query(collection(db, 'users'));
    const existing = await getDocs(q);
    if (existing.empty) role = 'admin';
  const profileData = { uid: cred.user.uid, role, createdAt: Date.now(), avatarUrl: '' };
    await setDoc(doc(db, 'users', cred.user.uid), profileData);
    setProfile(profileData);
    return cred.user;
  }

  async function signIn(email, password) {
    const auth = getFirebaseAuth();
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    const auth = getFirebaseAuth();
    await signOut(auth);
  }

  async function updateAvatar(url) {
    if (!user) return;
    const db = getDb();
    const ref = doc(db, 'users', user.uid);
    await setDoc(ref, { ...profile, avatarUrl: url }, { merge: true });
    setProfile(p => ({ ...p, avatarUrl: url }));
  }

  const value = { user, profile, loading, signUp, signIn, logout, updateAvatar };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
