// Firebase service for web app
import { initializeApp } from 'firebase/app';
import { getAnalytics, Analytics } from 'firebase/analytics';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

interface TaskData {
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  category?: string;
}

interface TaskWithId extends TaskData {
  id: string;
  userId: string;
  createdAt: Date;
}

interface AuthResult {
  user: User | null;
  error: string | null;
}

interface TaskResult {
  success: boolean;
  taskId?: string | null;
  error: string | null;
}

interface TasksResult {
  tasks: TaskWithId[];
  error: string | null;
}

interface GenericResult {
  success: boolean;
  error: string | null;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics (only on client side)
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Auth functions
export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    return { user: null, error: (error as Error).message };
  }
};

export const signUp = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    console.error('Error signing up:', error);
    return { user: null, error: (error as Error).message };
  }
};

export const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      client_id: '742861794909-qtrkl3r2fhhre3734c3heb0sm1l2fatj.apps.googleusercontent.com',
      prompt: 'select_account'
    });

    // Configurar timeout para o popup (30 segundos)
    const signInPromise = signInWithPopup(auth, provider);

    // Criar promise de timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Authentication timeout: O popup de login demorou muito para responder. Tente novamente.'));
      }, 30000); // 30 segundos
    });

    const result = await Promise.race([signInPromise, timeoutPromise]);
    return { user: result.user, error: null };
  } catch (error) {
    console.error('Error signing in with Google:', error);

    // Tratamento específico de diferentes tipos de erro
    let errorMessage = 'Erro desconhecido no login com Google';

    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string; message: string };
      switch (firebaseError.code) {
        case 'auth/popup-blocked':
          errorMessage = 'Popup bloqueado: Permita popups para este site e tente novamente.';
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = 'Login cancelado: Você fechou a janela de login.';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Login cancelado: Múltiplas tentativas de login detectadas.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erro de rede: Verifique sua conexão com a internet.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas: Aguarde alguns minutos antes de tentar novamente.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Conta desabilitada: Entre em contato com o suporte.';
          break;
        default:
          errorMessage = `Erro de autenticação: ${firebaseError.message}`;
      }
    } else if (error instanceof Error && (error.message?.includes('timeout') || error.message?.includes('demorou'))) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = `Erro inesperado: ${error.message || 'Tente novamente mais tarde.'}`;
    }

    return { user: null, error: errorMessage };
  }
};

export const logout = async (): Promise<{ error: string | null }> => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error: (error as Error).message };
  }
};

export const resetPassword = async (email: string): Promise<{ error: string | null }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { error: (error as Error).message };
  }
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Task-specific functions
export const createTask = async (userId: string, taskData: TaskData): Promise<TaskResult> => {
  try {
    const taskWithUser = { ...taskData, userId, createdAt: new Date() };
    const docRef = doc(collection(db, 'tasks'));
    await setDoc(docRef, taskWithUser);
    return { success: true, taskId: docRef.id, error: null };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, taskId: null, error: (error as Error).message };
  }
};

export const getTasks = async (userId: string): Promise<TasksResult> => {
  try {
    const q = query(collection(db, 'tasks'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const tasks: TaskWithId[] = [];
    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() } as TaskWithId);
    });
    return { tasks, error: null };
  } catch (error) {
    console.error('Error getting tasks:', error);
    return { tasks: [], error: (error as Error).message };
  }
};

export const updateTask = async (taskId: string, taskData: Partial<TaskData>): Promise<GenericResult> => {
  try {
    await updateDoc(doc(db, 'tasks', taskId), taskData);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating task:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const deleteTask = async (taskId: string): Promise<GenericResult> => {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Default export
const firebaseService = {
  auth,
  db,
  analytics,
  signIn,
  signUp,
  signInWithGoogle,
  logout,
  resetPassword,
  onAuthStateChange,
  createTask,
  getTasks,
  updateTask,
  deleteTask
};

export default firebaseService;