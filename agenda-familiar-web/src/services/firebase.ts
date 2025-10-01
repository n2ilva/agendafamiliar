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

// Import family types
import { Family, FamilyUser, UserRole, TaskApproval, FamilySettings } from '../types/family';

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

interface FamilyResult {
  success: boolean;
  family?: Family;
  error: string | null;
}

interface FamiliesResult {
  families: Family[];
  error: string | null;
}

interface ApprovalsResult {
  approvals: TaskApproval[];
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

// ==================== FAMILY FUNCTIONS ====================

// Função para gerar código único para família
const generateFamilyCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Criar uma nova família
export const createFamily = async (userId: string, familyName: string, creatorEmail: string, creatorDisplayName?: string): Promise<FamilyResult> => {
  try {
    let familyCode: string;
    let isCodeUnique = false;
    
    // Gerar código único
    do {
      familyCode = generateFamilyCode();
      const existingFamilyQuery = query(collection(db, 'families'), where('code', '==', familyCode));
      const existingSnapshot = await getDocs(existingFamilyQuery);
      isCodeUnique = existingSnapshot.empty;
    } while (!isCodeUnique);

    const defaultSettings: FamilySettings = {
      allowKidsCreateTasks: true,
      requireApprovalForKidsCompletion: true,
      allowUserManageMembers: false
    };

    const creator: FamilyUser = {
      id: userId,
      email: creatorEmail,
      displayName: creatorDisplayName,
      role: UserRole.ADMIN,
      joinedAt: new Date(),
      lastActive: new Date()
    };

    const familyData: Omit<Family, 'id'> = {
      name: familyName,
      code: familyCode,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [creator],
      settings: defaultSettings
    };

    const docRef = doc(collection(db, 'families'));
    const family: Family = { ...familyData, id: docRef.id };
    
    // Filtrar campos undefined
    const cleanFamilyData = Object.fromEntries(
      Object.entries(family).filter(([_, value]) => value !== undefined)
    );

    await setDoc(docRef, cleanFamilyData);
    
    return { success: true, family, error: null };
  } catch (error) {
    console.error('Error creating family:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Entrar em uma família usando código
export const joinFamily = async (userId: string, familyCode: string, userEmail: string, userDisplayName?: string): Promise<FamilyResult> => {
  try {
    const familyQuery = query(collection(db, 'families'), where('code', '==', familyCode.toUpperCase()));
    const familySnapshot = await getDocs(familyQuery);
    
    if (familySnapshot.empty) {
      return { success: false, error: 'Código de família inválido' };
    }

    const familyDoc = familySnapshot.docs[0];
    const familyData = familyDoc.data() as Family;
    
    // Verificar se usuário já é membro
    const isAlreadyMember = familyData.members.some(member => member.id === userId);
    if (isAlreadyMember) {
      return { success: false, error: 'Você já é membro desta família' };
    }

    // Adicionar novo membro como USER por padrão
    const newMember: FamilyUser = {
      id: userId,
      email: userEmail,
      displayName: userDisplayName,
      role: UserRole.USER,
      joinedAt: new Date(),
      lastActive: new Date()
    };

    const updatedMembers = [...familyData.members, newMember];
    
    await updateDoc(doc(db, 'families', familyDoc.id), {
      members: updatedMembers,
      updatedAt: new Date()
    });

    const updatedFamily: Family = {
      ...familyData,
      id: familyDoc.id,
      members: updatedMembers,
      updatedAt: new Date()
    };

    return { success: true, family: updatedFamily, error: null };
  } catch (error) {
    console.error('Error joining family:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Obter famílias do usuário
export const getUserFamilies = async (userId: string): Promise<FamiliesResult> => {
  try {
    const familiesQuery = query(collection(db, 'families'));
    const familiesSnapshot = await getDocs(familiesQuery);
    
    const userFamilies: Family[] = [];
    
    familiesSnapshot.forEach(doc => {
      const familyData = doc.data() as Family;
      const isMember = familyData.members.some(member => member.id === userId);
      
      if (isMember) {
        userFamilies.push({ ...familyData, id: doc.id });
      }
    });

    return { families: userFamilies, error: null };
  } catch (error) {
    console.error('Error getting user families:', error);
    return { families: [], error: (error as Error).message };
  }
};

// Atualizar papel do usuário na família (apenas ADMIN pode fazer)
export const updateUserRole = async (familyId: string, userId: string, newRole: UserRole, adminId: string): Promise<GenericResult> => {
  try {
    const familyDoc = await getDocs(query(collection(db, 'families'), where('id', '==', familyId)));
    
    if (familyDoc.empty) {
      return { success: false, error: 'Família não encontrada' };
    }

    const familyData = familyDoc.docs[0].data() as Family;
    
    // Verificar se quem está alterando é admin
    const admin = familyData.members.find(member => member.id === adminId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      return { success: false, error: 'Apenas administradores podem alterar papéis de usuários' };
    }

    // Atualizar papel do usuário
    const updatedMembers = familyData.members.map(member => 
      member.id === userId ? { ...member, role: newRole } : member
    );

    await updateDoc(doc(db, 'families', familyId), {
      members: updatedMembers,
      updatedAt: new Date()
    });

    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Remover membro da família (apenas ADMIN pode fazer)
export const removeFamilyMember = async (familyId: string, userIdToRemove: string, adminId: string): Promise<GenericResult> => {
  try {
    const familyDoc = await getDocs(query(collection(db, 'families'), where('id', '==', familyId)));
    
    if (familyDoc.empty) {
      return { success: false, error: 'Família não encontrada' };
    }

    const familyData = familyDoc.docs[0].data() as Family;
    
    // Verificar se quem está removendo é admin
    const admin = familyData.members.find(member => member.id === adminId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      return { success: false, error: 'Apenas administradores podem remover membros' };
    }

    // Não permitir que admin remova a si mesmo se for o único admin
    if (userIdToRemove === adminId) {
      const adminCount = familyData.members.filter(member => member.role === UserRole.ADMIN).length;
      if (adminCount === 1) {
        return { success: false, error: 'Não é possível remover o último administrador da família' };
      }
    }

    // Remover membro
    const updatedMembers = familyData.members.filter(member => member.id !== userIdToRemove);

    await updateDoc(doc(db, 'families', familyId), {
      members: updatedMembers,
      updatedAt: new Date()
    });

    return { success: true, error: null };
  } catch (error) {
    console.error('Error removing family member:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Atualizar nome da família (apenas ADMIN pode fazer)
export const updateFamilyName = async (familyId: string, newName: string, adminId: string): Promise<GenericResult> => {
  try {
    const familyDoc = await getDocs(query(collection(db, 'families'), where('id', '==', familyId)));
    
    if (familyDoc.empty) {
      return { success: false, error: 'Família não encontrada' };
    }

    const familyData = familyDoc.docs[0].data() as Family;
    
    // Verificar se quem está alterando é admin
    const admin = familyData.members.find(member => member.id === adminId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      return { success: false, error: 'Apenas administradores podem alterar o nome da família' };
    }

    await updateDoc(doc(db, 'families', familyId), {
      name: newName.trim(),
      updatedAt: new Date()
    });

    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating family name:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Criar solicitação de aprovação para tarefa (KIDS)
export const createTaskApproval = async (taskId: string, familyId: string, kidsId: string): Promise<GenericResult> => {
  try {
    const approvalData: Omit<TaskApproval, 'id'> = {
      taskId,
      familyId,
      requestedBy: kidsId,
      requestedAt: new Date(),
      status: 'pending'
    };

    const docRef = doc(collection(db, 'taskApprovals'));
    
    // Filtrar campos undefined
    const cleanApprovalData = Object.fromEntries(
      Object.entries(approvalData).filter(([_, value]) => value !== undefined)
    );

    await setDoc(docRef, cleanApprovalData);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error creating task approval:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Aprovar/rejeitar tarefa (ADMIN ou USER)
export const processTaskApproval = async (approvalId: string, action: 'approved' | 'rejected', approverId: string, rejectionReason?: string): Promise<GenericResult> => {
  try {
    const updateData: any = {
      status: action,
      approvedBy: approverId,
      approvedAt: new Date()
    };

    if (action === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    await updateDoc(doc(db, 'taskApprovals', approvalId), updateData);
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error processing task approval:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Obter aprovações pendentes para uma família
export const getPendingApprovals = async (familyId: string): Promise<ApprovalsResult> => {
  try {
    const approvalsQuery = query(
      collection(db, 'taskApprovals'), 
      where('familyId', '==', familyId),
      where('status', '==', 'pending')
    );
    const approvalsSnapshot = await getDocs(approvalsQuery);
    
    const approvals: TaskApproval[] = [];
    approvalsSnapshot.forEach(doc => {
      approvals.push({ id: doc.id, ...doc.data() } as TaskApproval);
    });

    return { approvals, error: null };
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    return { approvals: [], error: (error as Error).message };
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
  deleteTask,
  // Family functions
  createFamily,
  joinFamily,
  getUserFamilies,
  updateUserRole,
  removeFamilyMember,
  updateFamilyName,
  createTaskApproval,
  processTaskApproval,
  getPendingApprovals
};

export default firebaseService;