import LocalStorageService, { PendingOperation } from './LocalStorageService';
import ConnectivityService from './ConnectivityService';
import LocalAuthService from './LocalAuthService';
import familyService from './LocalFamilyService';
import { FamilyUser, Family, Task, TaskApproval } from '../types/FamilyTypes';
import FirestoreService from './FirestoreService';
import { safeToDate } from '../utils/DateUtils';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: number;
  pendingOperations: number;
  hasError: boolean;
  errorMessage?: string;
}

type SyncCallback = (status: SyncStatus) => void;

export enum ConflictPolicy {
  REMOTE_WINS = 'remote_wins',
  LOCAL_WINS = 'local_wins',
  MERGE = 'merge'
}

class SyncService {
  private static listeners: SyncCallback[] = [];
  private static approvalsListeners: Array<(approvals: TaskApproval[]) => void> = [];
  private static isSyncing = false;
  private static syncStatus: SyncStatus = {
    isOnline: false,
    isSyncing: false,
    lastSync: 0,
    pendingOperations: 0,
    hasError: false
  };
  private static remoteListeners: Array<() => void> = [];
  private static isInitialized = false;
  // Política de resolução de conflitos (padrão: local wins)
  private static conflictPolicy: ConflictPolicy = ConflictPolicy.LOCAL_WINS;

  static setConflictPolicy(policy: ConflictPolicy) {
    this.conflictPolicy = policy;
  }

  // Remove chaves com valor undefined de objetos/arrays (recursivo)
  private static sanitizeForFirestore<T = any>(value: T): T {
    if (value === null || value === undefined) {
      return value as any;
    }
    if (Array.isArray(value)) {
      return (value
        .map((v) => this.sanitizeForFirestore(v))
        .filter((v) => v !== undefined)) as any;
    }
    if (typeof value === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(value as any)) {
        if (v === undefined) continue;
        out[k] = this.sanitizeForFirestore(v as any);
      }
      return out;
    }
    return value;
  }

  // Inicializar o serviço de sincronização
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Limpar operações pendentes antigas antes de inicializar
      await LocalStorageService.cleanupOldOperations();
      
      // Inicializar conectividade
      await ConnectivityService.initialize();

      // Escutar mudanças de conectividade
      ConnectivityService.addConnectivityListener(this.handleConnectivityChange);

      // Obter status inicial (após limpeza)
      const connectivityState = ConnectivityService.getCurrentState();
      const offlineData = await LocalStorageService.getOfflineData();

      this.syncStatus = {
        isOnline: connectivityState.isConnected,
        isSyncing: false,
        lastSync: offlineData.lastSync,
        pendingOperations: offlineData.pendingOperations.length,
        hasError: false
      };

      console.log(`🔄 SyncService inicializado com ${offlineData.pendingOperations.length} operações pendentes`);

      // Se estiver online, iniciar sincronização
      if (connectivityState.isConnected) {
        await this.syncWithRemote();
      }

      this.isInitialized = true;
      this.notifyListeners();
      console.log('SyncService inicializado');
    } catch (error) {
      console.error('Erro ao inicializar SyncService:', error);
      this.updateSyncStatus({ hasError: true, errorMessage: (error as Error).message });
    }
  }

  // Handler para mudanças de conectividade
  private static handleConnectivityChange = async (connectivityState: any): Promise<void> => {
    const wasOnline = this.syncStatus.isOnline;
    const isNowOnline = connectivityState.isConnected;

    this.updateSyncStatus({ isOnline: isNowOnline });

    // Se voltou a ficar online, sincronizar
    if (!wasOnline && isNowOnline) {
      console.log('🔄 Conexão restaurada - iniciando sincronização');
      await this.syncWithRemote();
    }

    // Se ficou offline, parar listeners remotos
    if (wasOnline && !isNowOnline) {
      console.log('📴 Ficou offline - parando listeners remotos');
      this.stopRemoteListeners();
    }
  };

  // Sincronizar com o servidor remoto (modo local: sem listeners ativos)
  static async syncWithRemote(): Promise<void> {
    if (this.isSyncing || !ConnectivityService.isConnected()) {
      return;
    }

    this.isSyncing = true;
    this.updateSyncStatus({ isSyncing: true, hasError: false });

    try {

  console.log('🔄 Iniciando sincronização remota');

  // 1. Processar operações pendentes (tenta aplicar as operações que falharam antes)
  await this.processPendingOperations();

  // 2. Baixar dados atualizados do servidor remoto (reconciliação local)
  await this.downloadRemoteData();

  // 3. Configurar listeners remotos
  this.setupRemoteListeners();

  // 4. Atualizar timestamp da última sincronização
  await LocalStorageService.updateLastSync();

      // 5. Atualizar status
      const offlineData = await LocalStorageService.getOfflineData();
      this.updateSyncStatus({
        isSyncing: false,
        lastSync: Date.now(),
        pendingOperations: offlineData.pendingOperations.length
      });

      console.log('✅ Sincronização remota concluída com sucesso');
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      this.updateSyncStatus({ 
        isSyncing: false, 
        hasError: true, 
        errorMessage: (error as Error).message 
      });
    } finally {
      this.isSyncing = false;
    }
  }

  // Processar operações pendentes
  private static async processPendingOperations(): Promise<void> {
    const pendingOps = await LocalStorageService.getPendingOperations();
    console.log(`📤 Processando ${pendingOps.length} operações pendentes`);

    for (const operation of pendingOps) {
      try {
        // Try to execute operation preferring remote (Firestore) when online.
        await this.executeOperation(operation);
        // If executed successfully, remove from queue
        await LocalStorageService.removePendingOperation(operation.id);
        // Log padronizado: incluir id da operação, tipo, coleção, taskId e familyId quando disponíveis
        const opTaskId = operation.data && operation.data.id ? operation.data.id : undefined;
        const opFamilyId = operation.data && (operation.data.familyId !== undefined) ? operation.data.familyId : undefined;
        console.log(`✅ Operação processada: id=${operation.id} type=${operation.type} collection=${operation.collection}` +
          `${opTaskId ? ` taskId=${opTaskId}` : ''}` +
          `${opFamilyId !== undefined ? ` familyId=${opFamilyId}` : ''}`);
      } catch (error) {
        console.error(`❌ Erro ao processar operação ${operation.id}:`, error);
        // incrementar retry e aguardar backoff com jitter antes de continuar
        await LocalStorageService.incrementOperationRetry(operation.id);
        const offlineData = await LocalStorageService.getOfflineData();
        const updatedOp = offlineData.pendingOperations.find(op => op.id === operation.id);
        const retryCount = updatedOp ? updatedOp.retry : (operation.retry || 0);
        // expoential backoff com jitter (entre 0.5x e 1.5x)
        const base = Math.min(30000, 1000 * Math.pow(2, retryCount));
        const jitter = 0.5 + Math.random();
        const delay = Math.floor(base * jitter);
        console.log(`⏱️ Aguardando ${delay}ms (retry #${retryCount}) antes da próxima tentativa para ${operation.id}`);
        await this.sleep(delay);
      }
    }

    // Força a atualização do contador de operações pendentes
    const remainingOps = await LocalStorageService.getPendingOperations();
    this.updateSyncStatus({ pendingOperations: remainingOps.length });
    console.log(`📊 Status de fila atualizado. Operações restantes: ${remainingOps.length}`);
  }

  // Executar operação pendente
  private static async executeOperation(operation: PendingOperation): Promise<void> {
    const { type, collection: collectionName, data } = operation;
    // Apply operations to local cache using LocalStorageService or familyService
    try {
      if (collectionName === 'users') {
        if (type === 'delete') {
          await LocalStorageService.removeFromCache('users', data.id);
        } else {
          await LocalStorageService.saveUser(data as FamilyUser);
        }
      } else if (collectionName === 'families') {
        if (type === 'delete') {
          await LocalStorageService.removeFromCache('families', data.id);
        } else {
          await LocalStorageService.saveFamily(data as Family);
        }
      } else if (collectionName === 'tasks') {
        // Normalize familyId explicit e, se ausente, tentar inferir do cache local
        let normalizedFamilyId = data.familyId === undefined ? null : data.familyId;
        if (normalizedFamilyId === null) {
          try {
            const offlineData = await LocalStorageService.getOfflineData();
            const localTaskRaw = offlineData.tasks && offlineData.tasks[data.id];
            if (localTaskRaw && (localTaskRaw as any).familyId !== undefined) {
              normalizedFamilyId = (localTaskRaw as any).familyId;
            }
          } catch (e) {
            // ignore inference errors
          }
        }
        const isLocalFamily = normalizedFamilyId && typeof normalizedFamilyId === 'string' && (normalizedFamilyId as string).startsWith('local_');

        if (type === 'delete') {
          // Se for família local, não tenta deletar no Firestore
          if (isLocalFamily) {
            console.log('ℹ️ Task de família local - deletando apenas do cache');
            await LocalStorageService.removeFromCache('tasks', data.id);
            return; // Operação concluída
          }
          
          // If online, try delete remote first
          if (ConnectivityService.isConnected()) {
            try {
              await FirestoreService.deleteTask(data.id);
            } catch (e) {
              console.warn('Falha ao deletar task no Firestore:', e);
              throw e;
            }
          }

          // Remove local cache
          await LocalStorageService.removeFromCache('tasks', data.id);
        } else {
          // Se for família local, salva apenas no cache
          if (isLocalFamily) {
            console.log('ℹ️ Task de família local - salvando apenas no cache');
            const savedLocal = { ...data, familyId: normalizedFamilyId } as any;
            await LocalStorageService.saveTask(savedLocal as Task);
            return; // Operação concluída
          }
          
          // When online, prefer writing remote first so Firestore is source-of-truth
          if (ConnectivityService.isConnected()) {
            try {
              const toSave = { ...data, familyId: normalizedFamilyId } as any;
              // FirestoreService will create or update
              const res = await FirestoreService.saveTask(toSave as any);

              // If Firestore returned an id for create, ensure local id matches
              if (!data.id && res && (res as any).id) {
                data.id = (res as any).id;
              }

              // After remote success, update local cache: write to LocalStorageService and keep familyId on the task
              const savedLocal = { ...data, familyId: normalizedFamilyId } as any;
              await LocalStorageService.saveTask(savedLocal as Task);
            } catch (e) {
              console.warn('Falha ao salvar task no Firestore:', e);
              // If remote write fails, throw to let retry/enqueue logic handle it
              throw e;
            }
          } else {
            // Offline: save locally and let processPendingOperations handle remote when online
            if (normalizedFamilyId) {
              await familyService.saveFamilyTask(data as Task, normalizedFamilyId);
            } else {
              await LocalStorageService.saveTask(data as Task);
            }
          }
        }
      } else if (collectionName === 'approvals') {
        // Suporte remoto para approvals
        if (type === 'delete') {
          // Tentar deletar remoto primeiro se online
            if (ConnectivityService.isConnected()) {
              try { await FirestoreService.deleteApproval(data.id); } catch (e) { console.warn('Falha ao deletar approval remoto (continuando local):', e); }
            }
            await LocalStorageService.removeFromCache('approvals', data.id);
        } else {
          // create/update
          if (ConnectivityService.isConnected()) {
            try {
              const res = await FirestoreService.saveApproval(data);
              if (!data.id && res?.id) data.id = res.id;
            } catch (e) {
              console.warn('Falha ao salvar approval remoto, mantendo apenas local:', e);
            }
          }
          await LocalStorageService.saveApproval(data as TaskApproval);
        }
      } else if (collectionName === 'history') {
        if (type === 'delete') {
          await LocalStorageService.removeFromCache('history', data.id);
          // no remote delete implemented for history
        } else {
          // For history we try to push to Firestore when online, then save locally
          if (ConnectivityService.isConnected()) {
            try {
              const sanitize = (obj: Record<string, any>) =>
                Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
              const toSave = sanitize({ ...data, familyId: (data as any).familyId === undefined ? null : (data as any).familyId }) as any;
              await FirestoreService.addHistoryItem(toSave);
            } catch (e) {
              console.warn('Falha ao salvar history no Firestore:', e);
              // don't throw - history is best-effort
            }
          }

          try {
            const sanitizedLocal = Object.fromEntries(Object.entries(data as any).filter(([_, v]) => v !== undefined));
            await LocalStorageService.saveHistoryItem(sanitizedLocal as any);
          } catch (e) {
            if (data.familyId) await familyService.addFamilyHistoryItem(data.familyId, data);
          }
        }
      } else {
        console.warn('Operação em coleção desconhecida (local-only):', collectionName);
      }
    } catch (err) {
      console.error('Erro ao executar operação local:', err);
      throw err;
    }
  }

  // Baixar dados do servidor remoto (reconciliação local)
  private static async downloadRemoteData(): Promise<void> {
    // In local-only mode, download from local familyService (which uses AsyncStorage)
    const currentUser = await LocalAuthService.getUserFromLocalStorage();
    if (!currentUser) return;
    console.log('📥 Baixando dados (remoto/local híbrido)');

    try {
      // Save current user to cache
      await LocalStorageService.saveUser(currentUser);

      const uid = (currentUser as any).uid || (currentUser as any).id;

      // Download tasks by user (reconciliação por timestamp)
      if (ConnectivityService.isConnected()) {
        try {
          const userTasks = await FirestoreService.getTasksByUser(uid);
          const offlineData = await LocalStorageService.getOfflineData();
          let savedCount = 0;
          for (const t of userTasks) {
            const tt: any = { ...t };
            // normalize timestamps
            tt.createdAt = safeToDate(tt.createdAt) || new Date();
            tt.updatedAt = safeToDate(tt.updatedAt) || safeToDate(tt.createdAt) || new Date();

            const localTaskRaw = offlineData.tasks[tt.id];
            if (localTaskRaw) {
              const localUpdated = safeToDate((localTaskRaw as any).editedAt) || safeToDate((localTaskRaw as any).createdAt) || new Date();
              const remoteUpdated = safeToDate(tt.updatedAt) || new Date();
              // Se o remoto for mais recente, sobrescrever o cache local
              if (remoteUpdated.getTime() > localUpdated.getTime()) {
                await LocalStorageService.saveTask(tt as any);
                savedCount++;
              }
            } else {
              await LocalStorageService.saveTask(tt as any);
              savedCount++;
            }
          }
          console.log(`📋 ${savedCount} tarefas do usuário baixadas/reconciliadas e salvas no cache`);
        } catch (e) {
          console.warn('Falha ao baixar tarefas do usuário do Firestore:', e);
        }
      }

      // Get user's family and download family data (local source-of-truth for family metadata)
      let userFamily = await familyService.getUserFamily(currentUser.id);
      // Fallback: se não conseguir pelo membership (ex.: Auth ainda não pronto), tentar pelo familyId salvo no usuário
      if (!userFamily && (currentUser as any).familyId && typeof (currentUser as any).familyId === 'string' && !((currentUser as any).familyId as string).startsWith('local_')) {
        try {
          userFamily = await familyService.getFamilyById((currentUser as any).familyId as string);
        } catch (e) {
          console.warn('Fallback getFamilyById falhou:', e);
        }
      }
      if (userFamily) {
        await LocalStorageService.saveFamily(userFamily);
        for (const member of userFamily.members) {
          await LocalStorageService.saveUser(member);
        }

        // Tasks by family (if online) - reconciliação por timestamp
        if (ConnectivityService.isConnected()) {
          try {
            const familyTasks = await FirestoreService.getTasksByFamily(userFamily.id);
            const offlineData = await LocalStorageService.getOfflineData();
            let savedFamilyCount = 0;
            for (const task of familyTasks) {
              const tt: any = { ...task };
              tt.createdAt = safeToDate(tt.createdAt) || new Date();
              tt.updatedAt = safeToDate(tt.updatedAt) || safeToDate(tt.createdAt) || new Date();

              const localTaskRaw = offlineData.tasks[tt.id];
              if (localTaskRaw) {
                const localUpdated = safeToDate((localTaskRaw as any).editedAt) || safeToDate((localTaskRaw as any).createdAt) || new Date();
                const remoteUpdated = safeToDate(tt.updatedAt) || new Date();
                if (remoteUpdated.getTime() > localUpdated.getTime()) {
                  await LocalStorageService.saveTask(tt as any);
                  savedFamilyCount++;
                }
              } else {
                await LocalStorageService.saveTask(tt as any);
                savedFamilyCount++;
              }
            }
            console.log(`📋 ${savedFamilyCount} tarefas da família baixadas/reconciliadas e salvas no cache`);
          } catch (e) {
            console.warn('Falha ao baixar tarefas da família do Firestore:', e);
          }
        } else {
          // offline fallback: load from local familyService
          const familyTasks = await familyService.getFamilyTasks(userFamily.id, currentUser.id);
          for (const task of familyTasks) {
            await LocalStorageService.saveTask(task);
          }
          console.log(`📋 ${familyTasks.length} tarefas da família (offline) salvas no cache`);
        }
      }

    } catch (error) {
      console.error('Erro ao baixar dados (hybrido):', error);
      throw error;
    }
  }

  // Baixar dados da família
  private static async downloadFamilyData(familyId: string): Promise<void> {
    try {
      console.log('👨‍👩‍👧‍👦 Baixando dados da família:', familyId);
      
      // Baixar família usando o familyService
      const familyData = await familyService.getFamilyById(familyId);
      if (familyData) {
        await LocalStorageService.saveFamily(familyData);

        // Baixar membros da família
        for (const member of familyData.members) {
          await LocalStorageService.saveUser(member);
        }
        
        console.log(`👥 ${familyData.members.length} membros da família salvos no cache`);
      }

  // Baixar tarefas da família usando o familyService (incluir tarefas privadas do usuário se possível)
  const currentUser = await LocalAuthService.getUserFromLocalStorage();
  const userId = currentUser ? ((currentUser as any).uid || (currentUser as any).id) : undefined;
  const familyTasks = await familyService.getFamilyTasks(familyId, userId);
      for (const task of familyTasks) {
        await LocalStorageService.saveTask(task);
      }

      console.log(`📋 ${familyTasks.length} tarefas da família (incluindo privadas do usuário) baixadas e salvas no cache`);

      // Baixar aprovações da família (remoto se online, senão cache existente)
      let approvals: TaskApproval[] = [];
      if (ConnectivityService.isConnected()) {
        try {
          const remoteApprovals = await FirestoreService.getApprovalsByFamily(familyId);
          approvals = remoteApprovals as TaskApproval[];
        } catch (e) {
          console.warn('Falha ao baixar approvals remotas, fallback cache local:', e);
        }
      }
      if (approvals.length === 0) {
        const offlineData = await LocalStorageService.getOfflineData();
        const approvalsMap = offlineData.approvals || {};
        approvals = Object.values(approvalsMap).filter(a => a && (a as any).familyId === familyId) as TaskApproval[];
      }
      for (const approval of approvals) {
        await LocalStorageService.saveApproval(approval);
      }
      this.notifyApprovalsListeners(approvals);

  // Reconciliar cache local: usar os dados remotos como source-of-truth para esta família
  try {
        const offlineData = await LocalStorageService.getOfflineData();

        // Preparar mapas iniciais copiando o que existe (mantendo outras famílias)
        const usersMap: Record<string, any> = { ...offlineData.users };
        const familiesMap: Record<string, any> = { ...offlineData.families };
        const tasksMap: Record<string, any> = { ...offlineData.tasks };
        const approvalsMap: Record<string, any> = { ...offlineData.approvals };

        // Identificar IDs de usuários locais pertencentes a esta família (para remover tarefas/usuários antigos)
        const localFamilyUserIds = Object.values(offlineData.users)
          .filter((u: any) => u && u.familyId === familyId)
          .map((u: any) => u.id);

        // Remover usuários locais da família
        for (const uid of localFamilyUserIds) {
          delete usersMap[uid];
        }

        // Adicionar/atualizar membros da família baixados do servidor
          if (familyData && Array.isArray(familyData.members)) {
          for (const member of familyData.members) {
            usersMap[member.id] = member;
          }
          // Atualizar família
          familiesMap[familyData.id] = familyData;
        }

        // Remover apenas tarefas públicas da família atual (preservar privadas do usuário com familyId === null)
        for (const [tid, t] of Object.entries(tasksMap)) {
          const task: any = t as any;
          if (!task) continue;
          const isFamilyTask = task.familyId && task.familyId === familyId;
          if (isFamilyTask) {
            delete tasksMap[tid];
          }
        }

        // Adicionar tarefas baixadas do servidor (normalizar datas)
        for (const t of familyTasks) {
          const tt: any = { ...t };
          if (tt.createdAt && typeof tt.createdAt === 'string') tt.createdAt = new Date(tt.createdAt);
          if (tt.editedAt && typeof tt.editedAt === 'string') tt.editedAt = new Date(tt.editedAt);
          tasksMap[tt.id] = tt;
        }

        // Remover approvals locais desta família
        for (const [aid, a] of Object.entries(approvalsMap)) {
          const app: any = a as any;
          if (!app) continue;
          if (app.familyId === familyId) {
            delete approvalsMap[aid];
          }
        }

        // Adicionar approvals baixados
        for (const a of approvals) {
          approvalsMap[a.id] = a;
        }

        // Salvar estado reconciliado (substitui as chaves afetadas)
        await LocalStorageService.saveOfflineData({
          users: usersMap,
          families: familiesMap,
          tasks: tasksMap,
          approvals: approvalsMap,
          lastSync: Date.now()
        });

        console.log(`✅ Cache local atualizado com os dados remotos para a família ${familyId}`);
      } catch (reconcErr) {
        console.warn('⚠️ Erro durante reconciliação de cache local:', reconcErr);
      }

    } catch (error) {
      console.error('❌ Erro ao baixar dados da família:', error);
      throw error;
    }
  }

  // Configurar listeners remotos (noop em local-only)
  private static setupRemoteListeners(): void {
    // Setup Firestore realtime listeners for user's tasks and family tasks when online
    if (!ConnectivityService.isConnected()) {
      console.log('⚠️ setupRemoteListeners skipped - offline');
      return;
    }

    (async () => {
      try {
        const currentUser = await LocalAuthService.getUserFromLocalStorage();
        if (!currentUser) return;
        const uid = (currentUser as any).uid || (currentUser as any).id;

        const userFamily = await familyService.getUserFamily(uid);
        const familyId = userFamily ? userFamily.id : null;

        // Subscribe to user tasks
        const unsubUser = FirestoreService.subscribeToUserAndFamilyTasks(uid, familyId, async (items) => {
          // items may be from user or family query; deduplicate before saving to local cache
          try {
            const offlineData = await LocalStorageService.getOfflineData();
            for (const it of items) {
              try {
                const incoming: any = { ...it };
                const localRaw = offlineData.tasks[incoming.id];

                // If no local copy exists, save directly
                if (!localRaw) {
                  await LocalStorageService.saveTask(incoming as any);
                  continue;
                }

                // Compare timestamps
                const localUpdated = safeToDate((localRaw as any).editedAt) || safeToDate((localRaw as any).createdAt) || new Date();
                const remoteUpdated = safeToDate(incoming.updatedAt) || safeToDate(incoming.editedAt) || safeToDate(incoming.createdAt) || new Date();

                if (remoteUpdated.getTime() === localUpdated.getTime()) {
                  // Same timestamp — compare important fields to avoid overwrite
                  const fieldsToCompare = ['title','description','completed','category','userId','familyId'];
                  const normalizeDate = (d: any) => {
                    const dt = safeToDate(d);
                    return dt ? dt.toISOString() : null;
                  };

                  const isSame = fieldsToCompare.every(f => ((localRaw as any)[f] || null) === (incoming[f] || null))
                    && normalizeDate((localRaw as any).dueDate) === normalizeDate(incoming.dueDate)
                    && normalizeDate((localRaw as any).dueTime) === normalizeDate(incoming.dueTime);

                  if (isSame) continue; // identical, skip
                }

                // Resolve according to policy
                if (this.conflictPolicy === ConflictPolicy.LOCAL_WINS) {
                  // Skip remote change
                  continue;
                }

                if (this.conflictPolicy === ConflictPolicy.MERGE && localRaw) {
                  // Merge simple: prefer non-null local fields, otherwise remote
                  const merged = { ...incoming };
                  for (const k of Object.keys(localRaw)) {
                    const lv = (localRaw as any)[k];
                    if (lv !== undefined && lv !== null) merged[k] = lv;
                  }
                  await LocalStorageService.saveTask(merged as any);
                  continue;
                }

                // Default: remote wins if remote is newer
                if (remoteUpdated.getTime() >= localUpdated.getTime()) {
                  await LocalStorageService.saveTask(incoming as any);
                }
              } catch (e) {
                console.warn('Erro ao salvar task recebida por listener:', e);
              }
            }
          } catch (e) {
            console.warn('Erro no listener de tasks (dedup):', e);
          }
        });

        this.remoteListeners.push(unsubUser);
        console.log('✅ Listeners remotos configurados para tarefas do usuário/família');

        // Listener de approvals da família (apenas se houver família)
        if (familyId) {
          try {
            const unsubApprovals = FirestoreService.subscribeToFamilyApprovals(familyId, async (items) => {
              try {
                // Salvar cada approval no cache e notificar
                for (const it of items) {
                  await LocalStorageService.saveApproval(it as any);
                }
                this.notifyApprovalsListeners(items as TaskApproval[]);
              } catch (e) {
                console.warn('Erro ao processar approvals em tempo real:', e);
              }
            });
            this.remoteListeners.push(unsubApprovals);
            console.log('✅ Listener remoto configurado para approvals da família');
          } catch (e) {
            console.warn('Falha ao configurar listener de approvals:', e);
          }
        }
      } catch (e) {
        console.warn('Erro ao configurar listeners remotos:', e);
      }
    })();
  }

  // Parar listeners remotos
  private static stopRemoteListeners(): void {
    // Call unsubscribe functions if any
    try {
      for (const unsub of this.remoteListeners) {
        try { unsub(); } catch (e) { /* ignore individual errors */ }
      }
    } finally {
      this.remoteListeners = [];
    }
    console.log('🛑 Listeners remotos cancelados');
  }

  // Small sleep helper for backoff
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Adicionar operação à fila offline
  static async addOfflineOperation(
    type: 'create' | 'update' | 'delete',
    collection: string,
    data: any
  ): Promise<void> {
    // Normalize private tasks: if payload explicitly declares private=true, ensure familyId is null
    if (collection === 'tasks' && data && (data as any).private === true) {
      data.familyId = null;
    }

    // If online, try to apply immediately to remote (Firestore). If it fails, enqueue for retry.
    if (ConnectivityService.isConnected()) {
      try {
        // Execute directly as a PendingOperation to reuse execution logic
        const tempOp: PendingOperation = {
          id: `immediate_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
          type,
          collection: collection as any,
          data,
          timestamp: Date.now(),
          retry: 0
        };
        await this.executeOperation(tempOp);
        // After successful execution, update status and return
        const offlineData = await LocalStorageService.getOfflineData();
        this.updateSyncStatus({ pendingOperations: offlineData.pendingOperations.length });
        return;
      } catch (e) {
        console.warn('Falha ao executar operação remota imediatamente, enfileirando para retry:', e);
        // fallthrough to enqueue
      }
    }

  // Fallback: add to pending operations queue. For private tasks, familyId remains null.
  await LocalStorageService.addPendingOperation({ type, collection: collection as any, data });

    // Atualizar contagem de operações pendentes
    const offlineData = await LocalStorageService.getOfflineData();
    this.updateSyncStatus({ pendingOperations: offlineData.pendingOperations.length });
  }

  // Adicionar listener para status de sincronização
  static addSyncListener(callback: SyncCallback): () => void {
    this.listeners.push(callback);
    
    // Chamar imediatamente com estado atual
    callback(this.syncStatus);

    // Retornar função para remover listener
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Atualizar status de sincronização
  private static updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.notifyListeners();
  }

  // Notificar listeners
  private static notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.syncStatus);
      } catch (error) {
        console.error('Erro ao executar callback de sync:', error);
      }
    });
  }

  // Notificar listeners de approvals
  private static notifyApprovalsListeners(approvals: TaskApproval[]): void {
    this.approvalsListeners.forEach(cb => {
      try {
        cb(approvals);
      } catch (error) {
        console.error('Erro ao executar callback de approvals:', error);
      }
    });
  }

  // Adicionar listener para lista de approvals (tempo real)
  static addApprovalsListener(callback: (approvals: TaskApproval[]) => void): () => void {
    this.approvalsListeners.push(callback);
    // Retornar função para remover listener
    return () => {
      this.approvalsListeners = this.approvalsListeners.filter(l => l !== callback);
    };
  }

  // Obter status atual
  static getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Forçar sincronização completa (incluindo download de dados da família)
  static async forceFullSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('🔄 Sincronização já em andamento');
      return;
    }

    console.log('🔄 Iniciando sincronização completa...');
    this.updateSyncStatus({ isSyncing: true, hasError: false });

    try {
      // Baixar dados remotos primeiro
      await this.downloadRemoteData();
      
      // Depois processar operações pendentes
      await this.processPendingOperations();
      
      this.updateSyncStatus({ 
        lastSync: Date.now(),
        isSyncing: false 
      });
      
      console.log('✅ Sincronização completa finalizada');
    } catch (error) {
      console.error('❌ Erro na sincronização completa:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      this.updateSyncStatus({ 
        isSyncing: false, 
        hasError: true, 
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Forçar sincronização manual
  static async forcSync(): Promise<void> {
    if (ConnectivityService.isConnected()) {
      await this.syncWithRemote();
    } else {
      console.log('📴 Sem conexão - sincronização adiada');
    }
  }

  // Verificar se há dados pendentes
  static async hasPendingData(): Promise<boolean> {
    const offlineData = await LocalStorageService.getOfflineData();
    return offlineData.pendingOperations.length > 0;
  }

  // Limpar dados e reinicializar
  static async reset(): Promise<void> {
    this.stopRemoteListeners();
    await LocalStorageService.clearCache();
    this.updateSyncStatus({
      lastSync: 0,
      pendingOperations: 0,
      hasError: false,
      errorMessage: undefined
    });
    console.log('🔄 SyncService resetado');
  }

  // Cleanup
  static cleanup(): void {
    this.stopRemoteListeners();
    ConnectivityService.cleanup();
    this.listeners = [];
    this.isInitialized = false;
    console.log('SyncService limpo');
  }

  /**
   * Verifica se a rede está disponível.
   * Usado pelo serviço de background para evitar execuções desnecessárias.
   */
  static isNetworkAvailable(): boolean {
    return ConnectivityService.isConnected();
  }

  /**
   * Executa uma sincronização leve em background.
   * Foco em processar operações pendentes e fazer downloads essenciais.
   */
  static async performBackgroundSync(): Promise<boolean> {
    if (this.isSyncing || !this.isNetworkAvailable()) {
      console.log('🔄 [BG] Sincronização em background pulada (em andamento ou offline).');
      return false;
    }

    this.isSyncing = true;
    console.log('🔄 [BG] Iniciando sincronização em background...');

    try {
      // 1. Processar operações pendentes
      await this.processPendingOperations();

      // 2. Baixar dados essenciais (versão leve do download)
      const currentUser = await LocalAuthService.getUserFromLocalStorage();
      if (currentUser) {
        const uid = (currentUser as any).uid || (currentUser as any).id;
        const userFamily = await familyService.getUserFamily(uid);
        if (userFamily) {
          // Apenas um exemplo de download leve: buscar tarefas (incluir privadas do usuário)
          const familyTasks = await familyService.getFamilyTasks(userFamily.id, uid);
          for (const task of familyTasks) {
            await LocalStorageService.saveTask(task);
          }
          console.log(`🔄 [BG] ${familyTasks.length} tarefas atualizadas.`);
        }
      }

      // 3. Atualizar timestamp da última sincronização
      await LocalStorageService.updateLastSync();
      
      console.log('✅ [BG] Sincronização em background concluída com sucesso.');
      this.isSyncing = false;
      return true;

    } catch (error) {
      console.error('❌ [BG] Erro na sincronização em background:', error);
      this.isSyncing = false;
      return false;
    }
  }
}

export default SyncService;