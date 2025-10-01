// Web version of Firebase service using dynamic imports of Firebase modular SDK.
// We use eval("import('...')") to avoid static bundlers trying to resolve
// 'firebase/*' from outside the web package during the server build.
import { firebaseConfig } from '../config/firebase.web';

let app = null;
let auth = null;
let db = null;
let initialized = false;

const ensureWebInitialized = async () => {
  if (initialized) return;
  if (typeof window === 'undefined') return;

  try {
    const { initializeApp } = await eval("import('firebase/app')");
    const authMod = await eval("import('firebase/auth')");
    const firestoreMod = await eval("import('firebase/firestore')");

    if (firebaseConfig && firebaseConfig.apiKey) {
      app = initializeApp(firebaseConfig);
      auth = authMod.getAuth(app);
      db = firestoreMod.getFirestore(app);
      initialized = true;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to dynamically load Firebase SDK in web implementation:', err);
  }
};

// Auth functions
export const signIn = async (email, password) => {
  try {
    await ensureWebInitialized();
    const authMod = await eval("import('firebase/auth')");
    if (!auth) auth = authMod.getAuth(app);
    const userCredential = await authMod.signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    return { user: null, error: error.message };
  }
};

export const signUp = async (email, password) => {
  try {
    await ensureWebInitialized();
    const authMod = await eval("import('firebase/auth')");
    if (!auth) auth = authMod.getAuth(app);
    const userCredential = await authMod.createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    console.error('Error signing up:', error);
    return { user: null, error: error.message };
  }
};

export const signInWithGoogle = async () => {
  try {
    await ensureWebInitialized();
    const authMod = await eval("import('firebase/auth')");
    if (!auth) auth = authMod.getAuth(app);
    const Provider = authMod.GoogleAuthProvider;
    const provider = new Provider();
    const result = await authMod.signInWithPopup(auth, provider);
    return { user: result.user, error: null };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return { user: null, error: error.message };
  }
};

export const logout = async () => {
  try {
    await ensureWebInitialized();
    const authMod = await eval("import('firebase/auth')");
    if (!auth) auth = authMod.getAuth(app);
    await authMod.signOut(auth);
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error: error.message };
  }
};

export const resetPassword = async (email) => {
  try {
    await ensureWebInitialized();
    const authMod = await eval("import('firebase/auth')");
    if (!auth) auth = authMod.getAuth(app);
    await authMod.sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { error: error.message };
  }
};

export const onAuthStateChange = (callback) => {
  let unsub = () => {};
  ensureWebInitialized().then(async () => {
    const authMod = await eval("import('firebase/auth')");
    if (!auth) auth = authMod.getAuth(app);
    unsub = authMod.onAuthStateChanged(auth, callback);
  }).catch(() => {});
  // immediate fallback
  callback(null);
  return () => { try { unsub(); } catch (e) {} };
};

// Firestore functions
export const createDocument = async (collectionName, docId, data) => {
  try {
    await ensureWebInitialized();
    const firestoreMod = await eval("import('firebase/firestore')");
    if (!db) db = firestoreMod.getFirestore(app);
    await firestoreMod.setDoc(firestoreMod.doc(firestoreMod.collection(db, collectionName), docId), data);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error creating document:', error);
    return { success: false, error: error.message };
  }
};

export const readDocument = async (collectionName, docId) => {
  try {
    await ensureWebInitialized();
    const firestoreMod = await eval("import('firebase/firestore')");
    if (!db) db = firestoreMod.getFirestore(app);
    const docSnap = await firestoreMod.getDoc(firestoreMod.doc(firestoreMod.collection(db, collectionName), docId));
    if (docSnap.exists()) return { data: docSnap.data(), error: null };
    return { data: null, error: 'Document does not exist' };
  } catch (error) {
    console.error('Error reading document:', error);
    return { data: null, error: error.message };
  }
};

export const updateDocument = async (collectionName, docId, data) => {
  try {
    await ensureWebInitialized();
    const firestoreMod = await eval("import('firebase/firestore')");
    if (!db) db = firestoreMod.getFirestore(app);
    await firestoreMod.updateDoc(firestoreMod.doc(firestoreMod.collection(db, collectionName), docId), data);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating document:', error);
    return { success: false, error: error.message };
  }
};

export const deleteDocument = async (collectionName, docId) => {
  try {
    await ensureWebInitialized();
    const firestoreMod = await eval("import('firebase/firestore')");
    if (!db) db = firestoreMod.getFirestore(app);
    await firestoreMod.deleteDoc(firestoreMod.doc(firestoreMod.collection(db, collectionName), docId));
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { success: false, error: error.message };
  }
};

export const queryDocuments = async (collectionName, field, operator, value) => {
  try {
    await ensureWebInitialized();
    const firestoreMod = await eval("import('firebase/firestore')");
    if (!db) db = firestoreMod.getFirestore(app);
    const q = firestoreMod.query(firestoreMod.collection(db, collectionName), firestoreMod.where(field, operator, value));
    const querySnapshot = await firestoreMod.getDocs(q);
    const documents = [];
    querySnapshot.forEach((doc) => documents.push({ id: doc.id, ...doc.data() }));
    return { documents, error: null };
  } catch (error) {
    console.error('Error querying documents:', error);
    return { documents: [], error: error.message };
  }
};

export const getAllDocuments = async (collectionName) => {
  try {
    await ensureWebInitialized();
    const firestoreMod = await eval("import('firebase/firestore')");
    if (!db) db = firestoreMod.getFirestore(app);
    const querySnapshot = await firestoreMod.getDocs(firestoreMod.collection(db, collectionName));
    const documents = [];
    querySnapshot.forEach((doc) => documents.push({ id: doc.id, ...doc.data() }));
    return { documents, error: null };
  } catch (error) {
    console.error('Error getting all documents:', error);
    return { documents: [], error: error.message };
  }
};

// Task-specific functions
export const createTask = async (userId, taskData) => {
  try {
    const taskWithUser = { ...taskData, userId, createdAt: new Date() };
    const docRef = doc(collection(db, 'tasks'));
    await setDoc(docRef, taskWithUser);
    return { success: true, taskId: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, taskId: null, error: error.message };
  }
};

export const getTasks = async (userId) => {
  try {
    const q = query(collection(db, 'tasks'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const tasks = [];
    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    return { tasks, error: null };
  } catch (error) {
    console.error('Error getting tasks:', error);
    return { tasks: [], error: error.message };
  }
};

export const updateTask = async (taskId, taskData) => {
  try {
    await updateDoc(doc(db, 'tasks', taskId), taskData);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating task:', error);
    return { success: false, error: error.message };
  }
};

export const deleteTask = async (taskId) => {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: error.message };
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
  getAllDocuments,
  createTask,
  getTasks,
  updateTask,
  deleteTask
};

export default firebaseService;
