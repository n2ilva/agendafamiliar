import { firebaseFirestore, firebaseAuth } from '../../config/firebase.config';
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

export type RemoteTask = {
  id?: string;
  title: string;
  description?: string;
  completed?: boolean;
  userId: string;
  familyId: string | null;
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

// Obter instância real do Firestore ao invés de usar o proxy
const getDb = () => {
  const db = firebaseFirestore();
  // Se firebaseFirestore retornar uma função, invoca novamente
  return typeof db === 'function' ? db() : db;
};

const tasksCol = () => collection(getDb(), 'tasks');
const historyCol = () => collection(getDb(), 'history');
const approvalsCol = () => collection(getDb(), 'approvals');

function ensureFamilyId(val: string | null | undefined) {
  return val === undefined ? null : val;
}

function mapSnapshot(snap: any) {
  return snap.docs.map((docSnap: any) => ({ id: docSnap.id, ...(docSnap.data() as any) }));
}

function timestampToMillis(value: any): number {
  if (!value) {
    return 0;
  }
  if (typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return new Date(value).getTime();
}

function sortTasksByUpdatedAt(tasks: any[]): any[] {
  return tasks.sort((a, b) => {
    const aTime = timestampToMillis(a.updatedAt || a.editedAt || a.createdAt);
    const bTime = timestampToMillis(b.updatedAt || b.editedAt || b.createdAt);
    return bTime - aTime;
  });
}

// Remove recursivamente qualquer valor undefined de objetos/arrays
function deepSanitize<T = any>(value: T): T {
  // Deixa passar falsy válidos (0, '', null, false) e FieldValue de Firestore
  if (value === undefined) return undefined as any;
  if (value === null) return value;

  if (Array.isArray(value)) {
    const arr = (value as any[])
      .map(v => deepSanitize(v))
      .filter(v => v !== undefined);
    return arr as any;
  }

  if (typeof value === 'object') {
    // Preservar Date, Timestamp e FieldValue (serverTimestamp etc.)
    if (value instanceof Date) return value;
    const asAny: any = value;
    if (asAny && typeof asAny.toDate === 'function' && typeof asAny.toMillis === 'function') return value; // Timestamp
    if (asAny && typeof asAny._methodName === 'string') return value; // FieldValue

    const obj = value as Record<string, any>;
    const out: Record<string, any> = {};
    Object.keys(obj).forEach(k => {
      const v = deepSanitize(obj[k]);
      if (v !== undefined) {
        out[k] = v;
      }
    });
    return out as any;
  }

  return value;
}

export const FirestoreService = {
  async checkIsFamilyAdmin(familyId: string | null | undefined, userId?: string): Promise<boolean> {


    if (!userId || !familyId) {

      return false;
    }

    try {
      const familyRef = doc(getDb(), 'families', familyId);
      const familySnap = await getDoc(familyRef);

      if (!familySnap.exists()) {

        return false;
      }

      const familyData = familySnap.data() as any;


      if (familyData.adminId === userId) {

        return true;
      }

      // Também considerar administradores definidos via members/{userId}.role === 'admin'
      try {
        const memberRef = doc(getDb(), 'families', familyId, 'members', userId);
        const memberSnap = await getDoc(memberRef);

        if (memberSnap.exists()) {
          const memberData = memberSnap.data() as any;


          if (memberData && memberData.role === 'admin') {

            return true;
          }
        } else {

        }
      } catch (e) {
        console.warn('[checkIsFamilyAdmin] Erro ao verificar role do membro:', e);
      }


      return false;
    } catch (error) {
      console.warn('[FirestoreService] checkIsFamilyAdmin falhou:', error);
      return false;
    }
  },

  async saveTask(task: RemoteTask & Record<string, any>) {
    const db = getDb();

    const taskToSaveBase: any = {
      ...task,
      familyId: ensureFamilyId(task.familyId ?? null),
      updatedAt: serverTimestamp()
    };

    if (!task.id) {
      taskToSaveBase.createdAt = task.createdAt || serverTimestamp();
    } else if (!taskToSaveBase.createdAt) {
      taskToSaveBase.createdAt = task.createdAt || serverTimestamp();
    }

    if (taskToSaveBase.private === true && taskToSaveBase.familyId !== null) {
      console.error('❌ Tarefa privada com familyId não nulo detectada:', taskToSaveBase);
      throw new Error('Tarefas privadas devem ter familyId = null');
    }

    // Validação explícita de campos obrigatórios para evitar erro de permissão silencioso
    if (!taskToSaveBase.userId) {
      console.error('❌ [saveTask] ERRO CRÍTICO: userId ausente no payload:', taskToSaveBase);
      throw new Error('userId é obrigatório');
    }
    if (!taskToSaveBase.title) {
      console.error('❌ [saveTask] ERRO CRÍTICO: title ausente no payload:', taskToSaveBase);
      throw new Error('title é obrigatório');
    }

    // Sanitiza valores undefined (inclui repeatIntervalDays, repeatDurationMonths, campos opcionais de subtarefas, etc.)
    const taskToSave = deepSanitize(taskToSaveBase);

    try {
      if (task.id) {
        await setDoc(doc(db, 'tasks', task.id), taskToSave, { merge: true });
        return { id: task.id };
      }

      const ref = await addDoc(tasksCol() as any, taskToSave);
      return { id: ref.id };
    } catch (error) {
      console.error('[FirestoreService] saveTask erro:', error, taskToSave);
      throw error;
    }
  },

  async deleteTask(taskId: string) {
    const auth = firebaseAuth() as any;
    const currentUserId = auth.currentUser?.uid || auth.currentUser?.id;

    // Log detalhado da autenticação


    if (!currentUserId) {
      console.error('[deleteTask] ERRO: Usuário não autenticado');
      throw new Error('permission-denied');
    }

    const ref = doc(getDb(), 'tasks', taskId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {

      return;
    }

    const data = snap.data() as any;
    const isPrivate = (data.private === true) || (data.familyId === null || data.familyId === undefined);

    // Debug detalhado para diagnósticos em produção


    if (!isPrivate) {

      const canAdmin = await this.checkIsFamilyAdmin(data.familyId, currentUserId);
      const hasDeletePerm = await this.checkHasFamilyPermission(data.familyId, currentUserId, 'delete');



      // Admin sempre tem permissão, mesmo sem permissão explícita de delete
      if (!canAdmin && !hasDeletePerm) {
        console.error('[deleteTask] ERRO: Sem permissões para deletar task da família');
        throw new Error('permission-denied');
      }
    } else {

      const isOwner = data.userId === currentUserId || data.createdBy === currentUserId;


      if (!isOwner) {
        console.error('[deleteTask] ERRO: Usuário não é dono da task privada');
        throw new Error('permission-denied');
      }
    }


    await deleteDoc(ref);

  },

  async checkHasFamilyPermission(familyId: string | null | undefined, userId?: string, permKey: 'create' | 'edit' | 'delete' = 'delete'): Promise<boolean> {


    if (!familyId || !userId) {

      return false;
    }

    try {
      const memberRef = doc(getDb(), 'families', familyId, 'members', userId);
      const memberSnap = await getDoc(memberRef);

      if (!memberSnap.exists()) {

        return false;
      }

      const memberData = memberSnap.data() as any;
      const perms = (memberData && memberData.permissions) || {};



      return perms[permKey] === true;
    } catch (e) {
      console.warn('[FirestoreService] checkHasFamilyPermission falhou:', e);
      return false;
    }
  },

  async getTasksByUser(userId: string) {
    try {
      const auth = firebaseAuth() as any;
      if (!auth.currentUser) {
        console.warn('⚠️ FirestoreService.getTasksByUser: Usuário não autenticado, retornando array vazio');
        return [];
      }

      // Data limite: 7 dias atrás (tarefas concluídas mais antigas serão ignoradas)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Duas consultas separadas para respeitar privacidade:
      // 1) Tarefas criadas pelo usuário (inclui privadas)
      const createdByQuery = query(tasksCol() as any, where('createdBy', '==', userId));
      // 2) Tarefas atribuídas ao usuário, mas APENAS públicas (private == false)
      const assignedPublicQuery = query(
        tasksCol() as any,
        where('userId', '==', userId),
        where('private', '==', false)
      );

      const queries = [createdByQuery, assignedPublicQuery];

      const snapshots = await Promise.all(queries.map(q => getDocs(q)));
      const dedupMap = new Map<string, any>();
      const iterateSnap = (snap: any, cb: (docSnap: any) => void) => {
        if (snap && typeof snap.forEach === 'function') {
          snap.forEach(cb);
        } else if (snap && Array.isArray(snap.docs)) {
          snap.docs.forEach(cb);
        } else if (Array.isArray(snap)) {
          snap.forEach(cb);
        }
      };
      snapshots.forEach(snap => {
        iterateSnap(snap, (docSnap: any) => {
          const data = docSnap.data() as any;
          // Filtrar tarefas concluídas há mais de 7 dias
          if (data.completed && data.completedAt) {
            const completedDate = data.completedAt.toDate ? data.completedAt.toDate() : new Date(data.completedAt);
            if (completedDate < sevenDaysAgo) {
              return; // Ignorar tarefa antiga concluída
            }
          }
          dedupMap.set(docSnap.id, { id: docSnap.id, ...data });
        });
      });

      const tasks = sortTasksByUpdatedAt(Array.from(dedupMap.values()));

      return tasks;
    } catch (error: any) {
      console.error('❌ FirestoreService.getTasksByUser: Erro ao buscar tarefas:', error);
      return [];
    }
  },

  async getTasksByFamily(familyId: string | null) {
    try {
      const auth = firebaseAuth() as any;
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.warn('⚠️ FirestoreService.getTasksByFamily: Usuário não autenticado, retornando array vazio');
        return [];
      }

      if (!familyId || familyId.startsWith('local_')) {
        return [];
      }

      // Data limite: 7 dias atrás (tarefas concluídas mais antigas serão ignoradas)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const publicQuery = query(
        tasksCol() as any,
        where('familyId', '==', ensureFamilyId(familyId)),
        where('private', '==', false)
      );

      const snapshots = [await getDocs(publicQuery)];

      const userId = currentUser.uid || currentUser.id;
      if (userId) {
        // Incluir tarefas privadas do criador com familyId null para aparecerem na visão da família
        const privateQuery = query(
          tasksCol() as any,
          where('familyId', '==', null),
          where('private', '==', true),
          where('createdBy', '==', userId)
        );
        snapshots.push(await getDocs(privateQuery));
      }

      const dedupMap = new Map<string, any>();
      const iterateSnap = (snap: any, cb: (docSnap: any) => void) => {
        if (snap && typeof snap.forEach === 'function') {
          snap.forEach(cb);
        } else if (snap && Array.isArray(snap.docs)) {
          snap.docs.forEach(cb);
        } else if (Array.isArray(snap)) {
          snap.forEach(cb);
        }
      };
      snapshots.forEach(snap => {
        iterateSnap(snap, (docSnap: any) => {
          const data = docSnap.data() as any;
          // Filtrar tarefas concluídas há mais de 7 dias
          if (data.completed && data.completedAt) {
            const completedDate = data.completedAt.toDate ? data.completedAt.toDate() : new Date(data.completedAt);
            if (completedDate < sevenDaysAgo) {
              return; // Ignorar tarefa antiga concluída
            }
          }
          dedupMap.set(docSnap.id, { id: docSnap.id, ...data });
        });
      });

      const tasks = sortTasksByUpdatedAt(Array.from(dedupMap.values()));

      return tasks;
    } catch (error: any) {
      console.error('❌ FirestoreService.getTasksByFamily: Erro ao buscar tarefas:', error);
      if (error.code === 'permission-denied') {
        console.warn('⚠️ Permissão negada - verifique as regras de segurança do Firestore para consultas de tarefas');
      }
      return [];
    }
  },

  subscribeToUserAndFamilyTasks(userId: string, familyId: string | null, callback: (items: any[]) => void) {
    const segments = {
      createdBy: new Map<string, any>(),
      user: new Map<string, any>(),
      family: new Map<string, any>()
    };

    const emit = () => {
      const merged = new Map<string, any>();
      segments.family.forEach((value, key) => merged.set(key, value));
      segments.createdBy.forEach((value, key) => merged.set(key, value));
      segments.user.forEach((value, key) => merged.set(key, value));
      const all = Array.from(merged.values());
      // Filtro defensivo: nunca emitir tarefas privadas de outros usuários
      const filtered = all.filter(t => !(t?.private === true && t?.createdBy !== userId));
      callback(sortTasksByUpdatedAt(filtered));
    };

    const unsubscribers: Array<() => void> = [];

    const createdByQuery = query(tasksCol() as any, where('createdBy', '==', userId));
    unsubscribers.push(
      onSnapshot(createdByQuery, snap => {
        segments.createdBy.clear();
        snap.forEach(docSnap => {
          segments.createdBy.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as any) });
        });
        emit();
      })
    );

    // Assinatura de tarefas atribuídas ao usuário: somente públicas
    const userQuery = query(
      tasksCol() as any,
      where('userId', '==', userId),
      where('private', '==', false)
    );
    unsubscribers.push(
      onSnapshot(userQuery, snap => {
        segments.user.clear();
        snap.forEach(docSnap => {
          segments.user.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as any) });
        });
        emit();
      })
    );

    if (familyId) {
      const familyQuery = query(
        tasksCol() as any,
        where('familyId', '==', ensureFamilyId(familyId)),
        where('private', '==', false)
      );

      unsubscribers.push(
        onSnapshot(familyQuery, snap => {
          segments.family.clear();
          snap.forEach(docSnap => {
            segments.family.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as any) });
          });
          emit();
        })
      );
    }

    return () => {
      unsubscribers.forEach(unsub => {
        try {
          unsub();
        } catch (error) {
          console.warn('[FirestoreService] Erro ao cancelar inscrição de listener:', error);
        }
      });
    };
  },

  async addHistoryItem(item: RemoteHistoryItem) {
    const sanitize = (obj: Record<string, any>) =>
      Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
    const toSave = sanitize({
      ...item,
      familyId: ensureFamilyId(item.familyId),
      createdAt: serverTimestamp()
    }) as any;
    const ref = await addDoc(historyCol() as any, toSave);
    return { id: ref.id };
  },

  async getHistoryByUser(userId: string) {
    const q = query(historyCol() as any, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return mapSnapshot(snap);
  },

  async getHistoryByFamily(familyId: string | null) {
    const q = query(historyCol() as any, where('familyId', '==', ensureFamilyId(familyId)), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return mapSnapshot(snap);
  },

  // ===================== APPROVALS =====================
  async saveApproval(approval: any) {
    // Normalizar timestamps: requestedAt serverTimestamp() se novo; resolvedAt somente se existir
    const toSave: any = {
      ...approval,
      familyId: ensureFamilyId(approval.familyId ?? null),
    };

    // Se não houver id, cria novo doc
    if (!toSave.id) {
      toSave.requestedAt = toSave.requestedAt || serverTimestamp();
      const ref = await addDoc(approvalsCol() as any, toSave);
      return { id: ref.id };
    }

    // Atualização/merge
    if (!toSave.requestedAt) {
      toSave.requestedAt = serverTimestamp();
    }
    await setDoc(doc(getDb(), 'approvals', toSave.id), toSave, { merge: true });
    return { id: toSave.id };
  },

  async deleteApproval(approvalId: string) {
    try {
      await deleteDoc(doc(getDb(), 'approvals', approvalId));
    } catch (e) {
      console.error('[FirestoreService] deleteApproval erro:', e);
      throw e;
    }
  },

  async getApprovalsByFamily(familyId: string | null) {
    if (!familyId) return [];
    try {
      const q = query(approvalsCol() as any, where('familyId', '==', ensureFamilyId(familyId)));
      const snap = await getDocs(q);
      return mapSnapshot(snap).map((a: any) => ({
        ...a,
        requestedAt: (a as any).requestedAt,
        resolvedAt: (a as any).resolvedAt
      }));
    } catch (e) {
      console.warn('[FirestoreService] getApprovalsByFamily falhou:', e);
      return [];
    }
  },

  subscribeToFamilyApprovals(familyId: string, callback: (items: any[]) => void) {
    try {
      const q = query(approvalsCol() as any, where('familyId', '==', ensureFamilyId(familyId)));
      const unsub = onSnapshot(q, snap => {
        const list: any[] = [];
        snap.forEach(docSnap => list.push({ id: docSnap.id, ...(docSnap.data() as any) }));
        callback(list);
      });
      return unsub;
    } catch (e) {
      console.warn('[FirestoreService] subscribeToFamilyApprovals falhou:', e);
      return () => { };
    }
  }
};

export default FirestoreService;
