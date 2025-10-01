// Web version of Firebase service - stub for build compatibility
// This is a temporary stub to allow the build to pass
// Firebase will be properly initialized at runtime

// This module acts as a platform-aware delegator.
// On the web (client) we dynamically import the implementation at `./firebase.web` so
// the bundler can include the proper Firebase modular SDK. On the server/build we
// expose lightweight stubs so imports don't break the build.

let impl = null;
let implLoading = null;

const loadImpl = async () => {
  if (impl) return impl;
  if (implLoading) return implLoading;

  if (typeof window === 'undefined') {
    // Server: use safe stubs
    impl = {
      auth: {
        signInWithEmailAndPassword: () => Promise.resolve({ user: null }),
        createUserWithEmailAndPassword: () => Promise.resolve({ user: null }),
        signInWithPopup: () => Promise.resolve({ user: null }),
        signOut: () => Promise.resolve(),
        sendPasswordResetEmail: () => Promise.resolve(),
        onAuthStateChanged: (cb) => {
          cb(null);
          return () => {};
        }
      },
      db: {
        collection: () => ({
          doc: () => ({
            set: () => Promise.resolve(),
            get: () => Promise.resolve({ exists: false, data: () => ({}) }),
            update: () => Promise.resolve(),
            delete: () => Promise.resolve()
          }),
          where: () => ({ get: () => Promise.resolve({ forEach: () => {} }) }),
          get: () => Promise.resolve({ forEach: () => {} })
        })
      },
      GoogleAuthProviderClass: class {}
    };
    return impl;
  }

  // Client: dynamically import the web implementation which statically imports
  // 'firebase/auth' and 'firebase/firestore' so Next can bundle them correctly.
  implLoading = import('./firebase.web').then((m) => {
    impl = m;
    implLoading = null;
    return impl;
  }).catch((err) => {
    // In case the web implementation cannot be loaded at runtime, fallback to stubs
    // to avoid breaking the app entirely.
    // eslint-disable-next-line no-console
    console.warn('Could not load firebase.web implementation:', err);
    impl = {
      auth: {
        signInWithEmailAndPassword: () => Promise.resolve({ user: null }),
        createUserWithEmailAndPassword: () => Promise.resolve({ user: null }),
        signInWithPopup: () => Promise.resolve({ user: null }),
        signOut: () => Promise.resolve(),
        sendPasswordResetEmail: () => Promise.resolve(),
        onAuthStateChanged: (cb) => {
          cb(null);
          return () => {};
        }
      },
      db: {
        collection: () => ({
          doc: () => ({
            set: () => Promise.resolve(),
            get: () => Promise.resolve({ exists: false, data: () => ({}) }),
            update: () => Promise.resolve(),
            delete: () => Promise.resolve()
          }),
          where: () => ({ get: () => Promise.resolve({ forEach: () => {} }) }),
          get: () => Promise.resolve({ forEach: () => {} })
        })
      },
      GoogleAuthProviderClass: class {}
    };
    implLoading = null;
    return impl;
  });

  return implLoading;
};

// Auth functions (stub implementations)
export const signIn = async (email, password) => {
  try {
    const m = await loadImpl();
    if (m && m.signIn) return m.signIn(email, password);
    // Fallback: try auth object shape
    if (m && m.auth && typeof m.auth.signInWithEmailAndPassword === 'function') {
      const userCredential = await m.auth.signInWithEmailAndPassword(email, password);
      return { user: userCredential.user, error: null };
    }
    return { user: null, error: 'Auth not available' };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const signUp = async (email, password) => {
  try {
    const m = await loadImpl();
    if (m && m.signUp) return m.signUp(email, password);
    if (m && m.auth && typeof m.auth.createUserWithEmailAndPassword === 'function') {
      const userCredential = await m.auth.createUserWithEmailAndPassword(email, password);
      return { user: userCredential.user, error: null };
    }
    return { user: null, error: 'Auth not available' };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const signInWithGoogle = async () => {
  try {
    const m = await loadImpl();
    if (m && m.signInWithGoogle) return m.signInWithGoogle();

    // Fallback using provider class if available
    if (m && m.GoogleAuthProviderClass) {
      const provider = new m.GoogleAuthProviderClass();
      if (m.auth && typeof m.auth.signInWithPopup === 'function') {
        const result = await m.auth.signInWithPopup(provider);
        return { user: result.user, error: null };
      }
    }

    return { user: null, error: 'Auth not available' };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const logout = async () => {
  try {
    const m = await loadImpl();
    if (m && m.logout) return m.logout();
    if (m && m.auth && typeof m.auth.signOut === 'function') {
      await m.auth.signOut();
      return { error: null };
    }
    return { error: 'Auth not available' };
  } catch (error) {
    return { error: error.message };
  }
};

export const resetPassword = async (email) => {
  try {
    const m = await loadImpl();
    if (m && m.resetPassword) return m.resetPassword(email);
    if (m && m.auth && typeof m.auth.sendPasswordResetEmail === 'function') {
      await m.auth.sendPasswordResetEmail(email);
      return { error: null };
    }
    return { error: 'Auth not available' };
  } catch (error) {
    return { error: error.message };
  }
};

export const onAuthStateChange = (callback) => {
  let unsub = () => {};
  loadImpl().then((m) => {
    if (!m) return;
    if (typeof m.onAuthStateChange === 'function') {
      unsub = m.onAuthStateChange(callback);
      return;
    }
    if (m.auth && typeof m.auth.onAuthStateChanged === 'function') {
      unsub = m.auth.onAuthStateChanged(callback);
    }
  }).catch(() => {});

  // Immediate fallback
  callback(null);
  return () => {
    try { unsub(); } catch (e) {}
  };
};

// Firestore functions (stub implementations)
export const createDocument = async (collectionName, docId, data) => {
  try {
    const m = await loadImpl();
    if (m && m.createDocument) return m.createDocument(collectionName, docId, data);
    // Fallback: try db stub
    if (m && m.db && typeof m.db.collection === 'function') {
      await m.db.collection(collectionName).doc(docId).set(data);
      return { success: true, error: null };
    }
    return { success: false, error: 'Firestore not available' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const readDocument = async (collectionName, docId) => {
  try {
    const m = await loadImpl();
    if (m && m.readDocument) return m.readDocument(collectionName, docId);
    if (m && m.db && typeof m.db.collection === 'function') {
      const docSnap = await m.db.collection(collectionName).doc(docId).get();
      if (docSnap.exists) return { data: docSnap.data(), error: null };
      return { data: null, error: 'Document does not exist' };
    }
    return { data: null, error: 'Firestore not available' };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const updateDocument = async (collectionName, docId, data) => {
  try {
    const m = await loadImpl();
    if (m && m.updateDocument) return m.updateDocument(collectionName, docId, data);
    if (m && m.db && typeof m.db.collection === 'function') {
      await m.db.collection(collectionName).doc(docId).update(data);
      return { success: true, error: null };
    }
    return { success: false, error: 'Firestore not available' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteDocument = async (collectionName, docId) => {
  try {
    const m = await loadImpl();
    if (m && m.deleteDocument) return m.deleteDocument(collectionName, docId);
    if (m && m.db && typeof m.db.collection === 'function') {
      await m.db.collection(collectionName).doc(docId).delete();
      return { success: true, error: null };
    }
    return { success: false, error: 'Firestore not available' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const queryDocuments = async (collectionName, field, operator, value) => {
  try {
    const m = await loadImpl();
    if (m && m.queryDocuments) return m.queryDocuments(collectionName, field, operator, value);
    if (m && m.db && typeof m.db.collection === 'function') {
      const querySnapshot = await m.db.collection(collectionName).where(field, operator, value).get();
      const documents = [];
      querySnapshot.forEach((doc) => documents.push({ id: doc.id, ...doc.data() }));
      return { documents, error: null };
    }
    return { documents: [], error: 'Firestore not available' };
  } catch (error) {
    return { documents: [], error: error.message };
  }
};

export const getAllDocuments = async (collectionName) => {
  try {
    const m = await loadImpl();
    if (m && m.getAllDocuments) return m.getAllDocuments(collectionName);
    if (m && m.db && typeof m.db.collection === 'function') {
      const querySnapshot = await m.db.collection(collectionName).get();
      const documents = [];
      querySnapshot.forEach((doc) => documents.push({ id: doc.id, ...doc.data() }));
      return { documents, error: null };
    }
    return { documents: [], error: 'Firestore not available' };
  } catch (error) {
    return { documents: [], error: error.message };
  }
};

// Default export
const firebaseService = () => loadImpl().then((m) => ({
  auth: m.auth,
  db: m.db,
  signIn: m.signIn || signIn,
  signUp: m.signUp || signUp,
  signInWithGoogle: m.signInWithGoogle || signInWithGoogle,
  logout: m.logout || logout,
  resetPassword: m.resetPassword || resetPassword,
  onAuthStateChange: m.onAuthStateChange || onAuthStateChange,
  createDocument: m.createDocument || createDocument,
  readDocument: m.readDocument || readDocument,
  updateDocument: m.updateDocument || updateDocument,
  deleteDocument: m.deleteDocument || deleteDocument,
  queryDocuments: m.queryDocuments || queryDocuments,
  getAllDocuments: m.getAllDocuments || getAllDocuments
}));

export default firebaseService;