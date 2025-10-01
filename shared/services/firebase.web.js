// Web version of Firebase service using static imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase.web';

let app = null;
let auth = null;
let db = null;
let initialized = false;

const ensureWebInitialized = () => {
  if (initialized) return;
  if (typeof window === 'undefined') return;

  try {
    if (firebaseConfig && firebaseConfig.apiKey) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      initialized = true;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to initialize Firebase in web implementation:', err);
  }
};

// Auth functions
export const signIn = async (email, password) => {
  try {
    ensureWebInitialized();
    if (!auth) throw new Error('Firebase not initialized');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    return { user: null, error: error.message };
  }
};

export const signUp = async (email, password) => {
  try {
    ensureWebInitialized();
    if (!auth) throw new Error('Firebase not initialized');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    console.error('Error signing up:', error);
    return { user: null, error: error.message };
  }
};

export const signInWithGoogle = async () => {
  try {
    ensureWebInitialized();
    if (!auth) throw new Error('Firebase not initialized');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return { user: result.user, error: null };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return { user: null, error: error.message };
  }
};

export const logout = async () => {
  try {
    ensureWebInitialized();
    if (!auth) throw new Error('Firebase not initialized');
    await signOut(auth);
    return { error: null };
  } catch (error) {
    console.error('Error logging out:', error);
    return { error: error.message };
  }
};

export const resetPassword = async (email) => {
  try {
    ensureWebInitialized();
    if (!auth) throw new Error('Firebase not initialized');
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { error: error.message };
  }
};

export const onAuthStateChange = (callback) => {
  let unsub = () => {};
  try {
    ensureWebInitialized();
    if (auth) {
      unsub = onAuthStateChanged(auth, callback);
    } else {
      // immediate fallback
      callback(null);
    }
  } catch (error) {
    console.error('Error setting up auth state listener:', error);
    callback(null);
  }
  return () => { try { unsub(); } catch (e) {} };
};

// Firestore functions
export const createDocument = async (collectionName, docId, data) => {
  try {
    ensureWebInitialized();
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data);
    return { error: null };
  } catch (error) {
    console.error('Error creating document:', error);
    return { error: error.message };
  }
};

export const readDocument = async (collectionName, docId) => {
  try {
    ensureWebInitialized();
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { data: docSnap.data(), error: null };
    } else {
      return { data: null, error: 'Document not found' };
    }
  } catch (error) {
    console.error('Error reading document:', error);
    return { data: null, error: error.message };
  }
};

export const updateDocument = async (collectionName, docId, data) => {
  try {
    ensureWebInitialized();
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, data);
    return { error: null };
  } catch (error) {
    console.error('Error updating document:', error);
    return { error: error.message };
  }
};

export const deleteDocument = async (collectionName, docId) => {
  try {
    ensureWebInitialized();
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return { error: null };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { error: error.message };
  }
};

export const queryDocuments = async (collectionName, field, operator, value) => {
  try {
    ensureWebInitialized();
    if (!db) throw new Error('Firestore not initialized');
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, where(field, operator, value));
    const querySnapshot = await getDocs(q);
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return { documents, error: null };
  } catch (error) {
    console.error('Error querying documents:', error);
    return { documents: [], error: error.message };
  }
};

export const getAllDocuments = async (collectionName) => {
  try {
    ensureWebInitialized();
    if (!db) throw new Error('Firestore not initialized');
    const collectionRef = collection(db, collectionName);
    const querySnapshot = await getDocs(collectionRef);
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return { documents, error: null };
  } catch (error) {
    console.error('Error getting all documents:', error);
    return { documents: [], error: error.message };
  }
};

// Export default object for compatibility
export default {
  auth,
  db,
  signIn,
  signUp,
  signInWithGoogle,
  logout,
  resetPassword,
  onAuthStateChange,
  createDocument,
  readDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  getAllDocuments
};
