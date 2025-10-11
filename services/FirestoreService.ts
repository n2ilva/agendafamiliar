import { firebaseFirestore } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';

// Tipos simples para tasks/history — adapte conforme o modelo do app
export type RemoteTask = {
  id?: string;
  title: string;
  description?: string;
  completed?: boolean;
  userId: string;
  familyId: string | null; // explicitamente null para privado
  createdAt?: any;
  updatedAt?: any;
};

export type RemoteHistoryItem = {
  id?: string;
  type: string;
  message?: string;
  userId: string;
  familyId: string | null;
  createdAt?: any;
};

const tasksCol = () => collection(firebaseFirestore() as any, 'tasks');
const historyCol = () => collection(firebaseFirestore() as any, 'history');

function ensureFamilyId(val: string | null | undefined) {
  return val === undefined ? null : val;
}

export const FirestoreService = {
  // Save or update a task. If task.id is provided, write to that doc, otherwise add a new doc.
  async saveTask(task: RemoteTask) {
    const taskToSave = {
      ...task,
      familyId: ensureFamilyId(task.familyId),
      updatedAt: serverTimestamp(),
      createdAt: task.createdAt || serverTimestamp()
    } as any;

    try {
      if (task.id) {
        const ref = doc(firebaseFirestore() as any, 'tasks', task.id);
        await setDoc(ref, taskToSave, { merge: true });
        console.log('[FirestoreService] saveTask: updated task id=', task.id);
        return { id: task.id };
      } else {
        const ref = await addDoc(tasksCol() as any, taskToSave);
        console.log('[FirestoreService] saveTask: created task id=', ref.id);
        return { id: ref.id };
      }
    } catch (err) {
      console.error('[FirestoreService] saveTask ERROR:', err, 'payload=', taskToSave);
      throw err;
    }
  },

  async deleteTask(taskId: string) {
  const ref = doc(firebaseFirestore() as any, 'tasks', taskId);
    await deleteDoc(ref);
  },

  // Query tasks created by a user
  async getTasksByUser(userId: string) {
  const q = query(tasksCol() as any, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  },

  // Query tasks for a family (familyId can be null — Firestore stores null as a value)
  async getTasksByFamily(familyId: string | null) {
  const q = query(tasksCol() as any, where('familyId', '==', ensureFamilyId(familyId)), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  },

  // Subscribe to tasks by userId AND familyId combination. Callback receives array of docs.
  subscribeToUserAndFamilyTasks(userId: string, familyId: string | null, callback: (items: any[]) => void) {
    // We'll run two queries and merge results: by userId and by familyId (if familyId != null)
  const userQ = query(tasksCol() as any, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const unsubUser = onSnapshot(userQ, snap => {
  const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      callback(docs);
    });

    if (familyId !== null) {
  const familyQ = query(tasksCol() as any, where('familyId', '==', familyId), orderBy('createdAt', 'desc'));
      const unsubFamily = onSnapshot(familyQ, snap => {
  const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        callback(docs);
      });

      return () => { unsubUser(); unsubFamily(); };
    }

    return () => { unsubUser(); };
  },

  // History methods
  async addHistoryItem(item: RemoteHistoryItem) {
    const toSave = {
      ...item,
      familyId: ensureFamilyId(item.familyId),
      createdAt: serverTimestamp()
    } as any;
    const ref = await addDoc(historyCol() as any, toSave);
    return { id: ref.id };
  },

  async getHistoryByUser(userId: string) {
  const q = query(historyCol() as any, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  },

  async getHistoryByFamily(familyId: string | null) {
  const q = query(historyCol() as any, where('familyId', '==', ensureFamilyId(familyId)), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  }
};

export default FirestoreService;
