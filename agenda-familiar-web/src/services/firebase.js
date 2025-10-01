// Firebase service specifically for the web app
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';

// Firebase configuration for web app
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app = null;
let auth = null;
let db = null;
let initialized = false;

const ensureInitialized = () => {
  if (initialized) return;
  if (typeof window === 'undefined') return;

  try {
    if (firebaseConfig && firebaseConfig.apiKey) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      initialized = true;
      console.log('Firebase initialized successfully');
    } else {
      console.error('Firebase config is missing or incomplete');
    }
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
  }
};

// Auth functions
export const signIn = async (email, password) => {
  try {
    ensureInitialized();
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
    ensureInitialized();
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
    ensureInitialized();
    
    if (!auth) {
      throw new Error('Firebase not initialized');
    }

    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    console.log('Google sign in successful');
    return { user: result.user, error: null };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return { user: null, error: error.message };
  }
};

export const logout = async () => {
  try {
    ensureInitialized();
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
    ensureInitialized();
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
    ensureInitialized();
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
  return () => { try { unsub(); } catch { /* ignore errors on cleanup */ } };
};

// Firestore functions
export const createDocument = async (collectionName, docId, data) => {
  try {
    ensureInitialized();
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
    ensureInitialized();
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
    ensureInitialized();
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
    ensureInitialized();
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
    ensureInitialized();
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
    ensureInitialized();
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

// Task-specific functions
export const createTask = async (userId, taskData) => {
  try {
    ensureInitialized();
    if (!db) throw new Error('Firestore not initialized');
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    // Remove undefined fields from taskData
    const cleanTaskData = Object.fromEntries(
      Object.entries(taskData).filter(([_, value]) => value !== undefined)
    );
    
    const tasksRef = collection(db, 'tasks');
    const docRef = await addDoc(tasksRef, {
      ...cleanTaskData,
      userId,
      createdBy: userId,
      createdByName: auth.currentUser.displayName || auth.currentUser.email,
      updatedBy: userId,
      updatedByName: auth.currentUser.displayName || auth.currentUser.email,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return { success: true, taskId: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, taskId: null, error: error.message };
  }
};

export const getTasks = async (userId) => {
  try {
    ensureInitialized();
    if (!db) throw new Error('Firestore not initialized');
    
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('userId', '==', userId));
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
    ensureInitialized();
    if (!db) throw new Error('Firestore not initialized');
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    // Remove undefined fields from taskData
    const cleanTaskData = Object.fromEntries(
      Object.entries(taskData).filter(([_, value]) => value !== undefined)
    );
    
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...cleanTaskData,
      updatedBy: auth.currentUser.uid,
      updatedByName: auth.currentUser.displayName || auth.currentUser.email,
      updatedAt: new Date()
    });
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating task:', error);
    return { success: false, error: error.message };
  }
};

export const deleteTask = async (taskId) => {
  try {
    ensureInitialized();
    if (!db) throw new Error('Firestore not initialized');
    
    // Validate taskId
    if (!taskId || typeof taskId !== 'string') {
      throw new Error(`Invalid taskId: ${taskId}`);
    }
    
    const taskRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskRef);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: error.message };
  }
};

// Utility function to clean up tasks with invalid IDs (maintenance function)
export const cleanupInvalidTasks = async (userId) => {
  try {
    ensureInitialized();
    if (!db) throw new Error('Firestore not initialized');
    
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const invalidTasks = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Check if task has invalid or empty ID field in data (not the document ID)
      if (!data.id || data.id.trim() === '') {
        invalidTasks.push({
          docId: doc.id,
          data: data
        });
      }
    });
    
    console.log(`Found ${invalidTasks.length} tasks with invalid ID fields`);
    
    return { 
      success: true, 
      invalidTasksFound: invalidTasks.length,
      tasks: invalidTasks,
      error: null 
    };
  } catch (error) {
    console.error('Error cleaning up invalid tasks:', error);
    return { success: false, error: error.message };
  }
};

// Family functions
export const createFamily = async (userId, familyName, userEmail, userDisplayName) => {
  try {
    ensureInitialized();
    if (!db) throw new Error('Firestore not initialized');

    // Generate a unique family code
    const generateFamilyCode = () => {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    };

    const familyCode = generateFamilyCode();
    const familyData = {
      name: familyName,
      code: familyCode,
      adminId: userId,
      members: [{
        id: userId,
        email: userEmail,
        name: userDisplayName || userEmail,
        isAdmin: true,
        joinedAt: new Date().toISOString()
      }],
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'families'), familyData);
    
    return {
      success: true,
      family: {
        id: docRef.id,
        ...familyData
      }
    };
  } catch (error) {
    console.error('Error creating family:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const joinFamily = async (userId, userEmail, userDisplayName, familyCode) => {
  try {
    ensureInitialized();
    if (!db) throw new Error('Firestore not initialized');

    // Find family by code
    const familiesRef = collection(db, 'families');
    const q = query(familiesRef, where('code', '==', familyCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return {
        success: false,
        error: 'Código de família não encontrado'
      };
    }

    const familyDoc = querySnapshot.docs[0];
    const familyData = familyDoc.data();

    // Check if user is already a member
    if (familyData.members.some(member => member.id === userId)) {
      return {
        success: false,
        error: 'Você já é membro desta família'
      };
    }

    // Add user to family
    const newMember = {
      id: userId,
      email: userEmail,
      name: userDisplayName || userEmail,
      isAdmin: false,
      joinedAt: new Date().toISOString()
    };

    const updatedMembers = [...familyData.members, newMember];
    await updateDoc(doc(db, 'families', familyDoc.id), {
      members: updatedMembers
    });

    return {
      success: true,
      family: {
        id: familyDoc.id,
        ...familyData,
        members: updatedMembers
      }
    };
  } catch (error) {
    console.error('Error joining family:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getUserFamilies = async (userId) => {
  try {
    ensureInitialized();
    if (!db) throw new Error('Firestore not initialized');

    const familiesRef = collection(db, 'families');
    const q = query(familiesRef, where('members', 'array-contains-any', [
      { id: userId },
      { id: userId, isAdmin: true },
      { id: userId, isAdmin: false }
    ]));
    
    const querySnapshot = await getDocs(q);
    const families = [];

    for (const docSnapshot of querySnapshot.docs) {
      const familyData = docSnapshot.data();
      const isMember = familyData.members.some(member => member.id === userId);
      
      if (isMember) {
        families.push({
          id: docSnapshot.id,
          ...familyData
        });
      }
    }

    return {
      success: true,
      families: families
    };
  } catch (error) {
    console.error('Error getting user families:', error);
    return {
      success: false,
      error: error.message,
      families: []
    };
  }
};

// Export as default service for compatibility
const firebaseService = async () => ({
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
  deleteTask,
  // Family functions
  createFamily,
  joinFamily,
  getUserFamily
});

export default firebaseService;