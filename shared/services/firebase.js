// Web version of Firebase service - stub for build compatibility
// This is a temporary stub to allow the build to pass
// Firebase will be properly initialized at runtime

import { firebaseConfig } from '../config/firebase';

// Use modular Firebase where possible. Keep guarded stubs for environments
// where firebase isn't available (e.g. during certain build steps).
let auth = null;
let db = null;
let GoogleAuthProviderClass = null;
let _initialized = false;

const ensureInitialized = async () => {
  if (_initialized) return;
  // Only initialize on client side
  if (typeof window === 'undefined') return;

  try {
  const { initializeApp } = await eval("import('firebase/app')");
  const authMod = await eval("import('firebase/auth')");
  const firestoreMod = await eval("import('firebase/firestore')");

    if (firebaseConfig && firebaseConfig.apiKey) {
      const app = initializeApp(firebaseConfig);
      auth = authMod.getAuth(app);
      db = firestoreMod.getFirestore(app);
      GoogleAuthProviderClass = authMod.GoogleAuthProvider;
      _initialized = true;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Firebase modular SDK not available during client init, using stubs');
    // leave auth/db as stubs which may be set below
  }
};

// Provide minimal stubs so this module can be imported during server/build
// without errors. These are replaced by real implementations on the client
// after ensureInitialized() runs.
auth = {
  signInWithEmailAndPassword: () => Promise.resolve({ user: null }),
  createUserWithEmailAndPassword: () => Promise.resolve({ user: null }),
  signInWithPopup: () => Promise.resolve({ user: null }),
  signOut: () => Promise.resolve(),
  sendPasswordResetEmail: () => Promise.resolve(),
  onAuthStateChanged: (callback) => {
    callback(null);
    return () => {};
  }
};

db = {
  collection: () => ({
    doc: () => ({
      set: () => Promise.resolve(),
      get: () => Promise.resolve({ exists: false, data: () => ({}) }),
      update: () => Promise.resolve(),
      delete: () => Promise.resolve()
    }),
    where: () => ({
      get: () => Promise.resolve({ forEach: () => {} })
    }),
    get: () => Promise.resolve({ forEach: () => {} })
  })
};

GoogleAuthProviderClass = class {};

// Auth functions (stub implementations)
export const signIn = async (email, password) => {
  try {
    await ensureInitialized();

    // If auth has instance methods (compat/stub), use them
    if (auth && typeof auth.signInWithEmailAndPassword === 'function') {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      return { user: userCredential.user, error: null };
    }

    // Otherwise use modular helper
  const mod = await eval("import('firebase/auth')");
    if (mod && mod.signInWithEmailAndPassword) {
      const userCredential = await mod.signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, error: null };
    }

    return { user: null, error: 'Auth not available' };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const signUp = async (email, password) => {
  try {
    await ensureInitialized();

    if (auth && typeof auth.createUserWithEmailAndPassword === 'function') {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      return { user: userCredential.user, error: null };
    }

  const mod = await eval("import('firebase/auth')");
    if (mod && mod.createUserWithEmailAndPassword) {
      const userCredential = await mod.createUserWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, error: null };
    }

    return { user: null, error: 'Auth not available' };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const signInWithGoogle = async () => {
  try {
    await ensureInitialized();

  const authMod = await eval("import('firebase/auth')");
    const Provider = GoogleAuthProviderClass || authMod.GoogleAuthProvider;
    const provider = new Provider();

    if (auth && typeof auth.signInWithPopup === 'function') {
      const result = await auth.signInWithPopup(provider);
      return { user: result.user, error: null };
    }

    if (authMod && authMod.signInWithPopup) {
      const result = await authMod.signInWithPopup(auth, provider);
      return { user: result.user, error: null };
    }

    return { user: null, error: 'Auth not available' };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const logout = async () => {
  try {
    await ensureInitialized();

    if (auth && typeof auth.signOut === 'function') {
      await auth.signOut();
      return { error: null };
    }

  const mod = await eval("import('firebase/auth')");
    if (mod && mod.signOut) {
      await mod.signOut(auth);
      return { error: null };
    }

    return { error: 'Auth not available' };
  } catch (error) {
    return { error: error.message };
  }
};

export const resetPassword = async (email) => {
  try {
    await ensureInitialized();

    if (auth && typeof auth.sendPasswordResetEmail === 'function') {
      await auth.sendPasswordResetEmail(email);
      return { error: null };
    }

  const mod = await eval("import('firebase/auth')");
    if (mod && mod.sendPasswordResetEmail) {
      await mod.sendPasswordResetEmail(auth, email);
      return { error: null };
    }

    return { error: 'Auth not available' };
  } catch (error) {
    return { error: error.message };
  }
};

export const onAuthStateChange = (callback) => {
  if (auth && typeof auth.onAuthStateChanged === 'function') {
    return auth.onAuthStateChanged(callback);
  }

  // Try to initialize in background and attach listener when ready
  ensureInitialized().then(async () => {
    if (auth && typeof auth.onAuthStateChanged === 'function') {
      return auth.onAuthStateChanged(callback);
    }
    const mod = await eval("import('firebase/auth')");
    if (mod && mod.onAuthStateChanged) {
      return mod.onAuthStateChanged(auth, callback);
    }
    return null;
  }).catch(() => {});

  // Fallback: immediately call with null and return noop unsubscribe
  callback(null);
  return () => {};
};

// Firestore functions (stub implementations)
export const createDocument = async (collectionName, docId, data) => {
  try {
    await ensureInitialized();
    const modFirestore = await import('firebase/firestore');
    if (modFirestore && modFirestore.setDoc) {
      const { setDoc, doc: docFn, collection: collectionFn } = modFirestore;
      await setDoc(docFn(collectionFn(db, collectionName), docId), data);
      return { success: true, error: null };
    }

    await db.collection(collectionName).doc(docId).set(data);
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const readDocument = async (collectionName, docId) => {
  try {
    await ensureInitialized();
    const modFirestore = await import('firebase/firestore');
    if (modFirestore && modFirestore.getDoc) {
      const { getDoc, doc: docFn, collection: collectionFn } = modFirestore;
      const docSnap = await getDoc(docFn(collectionFn(db, collectionName), docId));
      if (docSnap.exists()) {
        return { data: docSnap.data(), error: null };
      }
      return { data: null, error: 'Document does not exist' };
    }

    const docSnap = await db.collection(collectionName).doc(docId).get();
    if (docSnap.exists) {
      return { data: docSnap.data(), error: null };
    }
    return { data: null, error: 'Document does not exist' };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const updateDocument = async (collectionName, docId, data) => {
  try {
    await ensureInitialized();
    const modFirestore = await import('firebase/firestore');
    if (modFirestore && modFirestore.updateDoc) {
      const { updateDoc, doc: docFn, collection: collectionFn } = modFirestore;
      await updateDoc(docFn(collectionFn(db, collectionName), docId), data);
      return { success: true, error: null };
    }

    await db.collection(collectionName).doc(docId).update(data);
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteDocument = async (collectionName, docId) => {
  try {
    await ensureInitialized();
    const modFirestore = await import('firebase/firestore');
    if (modFirestore && modFirestore.deleteDoc) {
      const { deleteDoc, doc: docFn, collection: collectionFn } = modFirestore;
      await deleteDoc(docFn(collectionFn(db, collectionName), docId));
      return { success: true, error: null };
    }

    await db.collection(collectionName).doc(docId).delete();
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const queryDocuments = async (collectionName, field, operator, value) => {
  try {
    await ensureInitialized();
    const modFirestore = await import('firebase/firestore');
    if (modFirestore && modFirestore.query) {
      const { query: qFn, where: whereFn, collection: collectionFn, getDocs } = modFirestore;
      const q = qFn(collectionFn(db, collectionName), whereFn(field, operator, value));
      const querySnapshot = await getDocs(q);
      const documents = [];
      querySnapshot.forEach((doc) => documents.push({ id: doc.id, ...doc.data() }));
      return { documents, error: null };
    }

    const querySnapshot = await db.collection(collectionName).where(field, operator, value).get();
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return { documents, error: null };
  } catch (error) {
    return { documents: [], error: error.message };
  }
};

export const getAllDocuments = async (collectionName) => {
  try {
    await ensureInitialized();
    const modFirestore = await import('firebase/firestore');
    if (modFirestore && modFirestore.getDocs) {
      const { getDocs, collection: collectionFn } = modFirestore;
      const querySnapshot = await getDocs(collectionFn(db, collectionName));
      const documents = [];
      querySnapshot.forEach((doc) => documents.push({ id: doc.id, ...doc.data() }));
      return { documents, error: null };
    }

    const querySnapshot = await db.collection(collectionName).get();
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return { documents, error: null };
  } catch (error) {
    return { documents: [], error: error.message };
  }
};

// Default export
const firebaseService = {
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

export default firebaseService;