import { firebaseFirestore, firebaseAuth } from '../config/firebase';
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

const tasksCol = () => collection(firebaseFirestore() as any, 'tasks');
const historyCol = () => collection(firebaseFirestore() as any, 'history');
const approvalsCol = () => collection(firebaseFirestore() as any, 'approvals');

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
    console.log('[checkIsFamilyAdmin] Verificando admin:', { familyId, userId });
    
    if (!userId || !familyId) {
      console.log('[checkIsFamilyAdmin] Parâmetros inválidos');
      return false;
    }

    try {
      const familyRef = doc(firebaseFirestore() as any, 'families', familyId);
      const familySnap = await getDoc(familyRef);
      
      if (!familySnap.exists()) {
        console.log('[checkIsFamilyAdmin] Família não encontrada:', familyId);
        return false;
      }

      const familyData = familySnap.data() as any;
      console.log('[checkIsFamilyAdmin] Dados da família:', {
        adminId: familyData.adminId,
        userId: userId,
        isLegacyAdmin: familyData.adminId === userId
      });
      
      if (familyData.adminId === userId) {
        console.log('[checkIsFamilyAdmin] Usuário é admin legacy');
        return true;
      }

      // Também considerar administradores definidos via members/{userId}.role === 'admin'
      try {
        const memberRef = doc(firebaseFirestore() as any, 'families', familyId, 'members', userId);
        const memberSnap = await getDoc(memberRef);
        
        if (memberSnap.exists()) {
          const memberData = memberSnap.data() as any;
          console.log('[checkIsFamilyAdmin] Dados do membro:', {
            role: memberData?.role,
            isRoleAdmin: memberData?.role === 'admin'
          });
          
          if (memberData && memberData.role === 'admin') {
            console.log('[checkIsFamilyAdmin] Usuário é admin via role');
            return true;
          }
        } else {
          console.log('[checkIsFamilyAdmin] Documento do membro não encontrado');
        }
      } catch (e) {
        console.warn('[checkIsFamilyAdmin] Erro ao verificar role do membro:', e);
      }

      console.log('[checkIsFamilyAdmin] Usuário não é admin');
      return false;
    } catch (error) {
      console.warn('[FirestoreService] checkIsFamilyAdmin falhou:', error);
      return false;
    }
  },

  async saveTask(task: RemoteTask & Record<string, any>) {
    const db = firebaseFirestore() as any;

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
    console.log('[deleteTask] Auth Status:', {
      hasAuth: !!auth,
      hasCurrentUser: !!auth?.currentUser,
      uid: auth?.currentUser?.uid,
      id: auth?.currentUser?.id,
      finalUserId: currentUserId
    });

    if (!currentUserId) {
      console.error('[deleteTask] ERRO: Usuário não autenticado');
      throw new Error('permission-denied');
    }

    const ref = doc(firebaseFirestore() as any, 'tasks', taskId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.log('[deleteTask] Task não encontrada:', taskId);
      return;
    }

    const data = snap.data() as any;
    const isPrivate = (data.private === true) || (data.familyId === null || data.familyId === undefined);

    // Debug detalhado para diagnósticos em produção
    console.log('[deleteTask] Task Details:', {
      user: currentUserId,
      taskId: taskId,
      familyId: data.familyId,
      private: data.private,
      userId: data.userId,
      createdBy: data.createdBy,
      isPrivate: isPrivate
    });

    if (!isPrivate) {
      console.log('[deleteTask] Verificando permissões para família:', data.familyId);
      const canAdmin = await this.checkIsFamilyAdmin(data.familyId, currentUserId);
      const hasDeletePerm = await this.checkHasFamilyPermission(data.familyId, currentUserId, 'delete');
      
      console.log('[deleteTask] Permissões:', {
        canAdmin: canAdmin,
        hasDeletePerm: hasDeletePerm,
        familyId: data.familyId,
        userId: currentUserId
      });
      
      // Admin sempre tem permissão, mesmo sem permissão explícita de delete
      if (!canAdmin && !hasDeletePerm) {
        console.error('[deleteTask] ERRO: Sem permissões para deletar task da família');
        throw new Error('permission-denied');
      }
    } else {
      console.log('[deleteTask] Task privada - verificando propriedade');
      const isOwner = data.userId === currentUserId || data.createdBy === currentUserId;
      console.log('[deleteTask] Propriedade:', {
        isOwner: isOwner,
        taskUserId: data.userId,
        taskCreatedBy: data.createdBy,
        currentUserId: currentUserId
      });
      
      if (!isOwner) {
        console.error('[deleteTask] ERRO: Usuário não é dono da task privada');
        throw new Error('permission-denied');
      }
    }

    console.log('[deleteTask] Executando deleteDoc...');
    await deleteDoc(ref);
    console.log('[deleteTask] Task deletada com sucesso');
  },

  async checkHasFamilyPermission(familyId: string | null | undefined, userId?: string, permKey: 'create' | 'edit' | 'delete' = 'delete'): Promise<boolean> {
    console.log('[checkHasFamilyPermission] Verificando permissão:', { familyId, userId, permKey });
    
    if (!familyId || !userId) {
      console.log('[checkHasFamilyPermission] Parâmetros inválidos');
      return false;
    }
    
    try {
      const memberRef = doc(firebaseFirestore() as any, 'families', familyId, 'members', userId);
      const memberSnap = await getDoc(memberRef);
      
      if (!memberSnap.exists()) {
        console.log('[checkHasFamilyPermission] Membro não encontrado');
        return false;
      }
      
      const memberData = memberSnap.data() as any;
      const perms = (memberData && memberData.permissions) || {};
      
      console.log('[checkHasFamilyPermission] Dados do membro:', {
        permissions: perms,
        hasPermKey: perms.hasOwnProperty(permKey),
        permValue: perms[permKey],
        result: perms[permKey] === true
      });
      
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
          dedupMap.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as any) });
        });
      });

      const tasks = sortTasksByUpdatedAt(Array.from(dedupMap.values()));
      console.log(`✅ FirestoreService.getTasksByUser: ${tasks.length} tarefas encontradas`);
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
          dedupMap.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as any) });
        });
      });

      const tasks = sortTasksByUpdatedAt(Array.from(dedupMap.values()));
      console.log(`✅ FirestoreService.getTasksByFamily: ${tasks.length} tarefas encontradas`);
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
    await setDoc(doc(firebaseFirestore() as any, 'approvals', toSave.id), toSave, { merge: true });
    return { id: toSave.id };
  },

  async deleteApproval(approvalId: string) {
    try {
      await deleteDoc(doc(firebaseFirestore() as any, 'approvals', approvalId));
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
      return () => {};
    }
  }
};

export default FirestoreService;
