import LocalStorageService, { PendingOperation } from '../storage/local-storage.service';
import ConnectivityService from './connectivity.service';
import LocalAuthService from '../auth/local-auth.service';
import familyService from '../family/local-family.service';
import { FamilyUser, Family, Task, TaskApproval } from '../../types/family.types';
import FirestoreService from '../tasks/firestore.service';
import { safeToDate } from '../../utils/date/date.utils';

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
  // Intervalo periódico de sincronização (30 segundos)
  private static periodicSyncInterval: NodeJS.Timeout | null = null;
  private static readonly SYNC_INTERVAL_MS = 30000; // 30 segundos
  // Delta Sync: rastrear última sincronização por tipo de dado
  private static lastSyncTimestamps: Record<string, number> = {
    'user_tasks': 0,
    'family_tasks': 0,
    'users': 0,
    'families': 0,
    'approvals': 0
  };
  // Cache de hashes para evitar downloads desnecessários
  private static dataHashes: Record<string, string> = {};

  static setConflictPolicy(policy: ConflictPolicy) {
    this.conflictPolicy = policy;
  }

  // Gerar hash simples de um objeto para evitar downloads desnecessários
  private static generateHash(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converter para 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Comparar dados remotos com locais para verificar se há mudanças reais
   * Evita atualizar cache com dados idênticos
   * @param remoteData - Dados do Firestore
   * @param localData - Dados do cache local
   * @returns true se os dados diferem realmente
   */
  private static hasRealChanges(remoteData: any, localData: any): boolean {
    if (!localData) return true; // Novo item, sempre sincronizar
    if (!remoteData) return false; // Item foi deletado remotamente

    // Comparar apenas campos importantes (ignorar metadata de sincronização)
    const remoteHash = this.generateHash({
      title: remoteData.title,
      description: remoteData.description,
      completed: remoteData.completed,
      status: remoteData.status,
      category: remoteData.category,
      priority: remoteData.priority,
      updatedAt: remoteData.updatedAt,
      dueDate: remoteData.dueDate,
      dueTime: remoteData.dueTime,
      userId: remoteData.userId,
      editedBy: remoteData.editedBy
    });

    const localHash = this.generateHash({
      title: localData.title,
      description: localData.description,
      completed: localData.completed,
      status: localData.status,
      category: localData.category,
      priority: localData.priority,
      updatedAt: (localData as any).updatedAt,
      dueDate: (localData as any).dueDate,
      dueTime: (localData as any).dueTime,
      userId: (localData as any).userId,
      editedBy: (localData as any).editedBy
    });

    return remoteHash !== localHash;
  }

  // Processar múltiplas operações em batch para melhor performance
  private static async executeBatchOperations(operations: PendingOperation[]): Promise<void> {
    if (operations.length === 0) return;

    console.log(`📦 Processando ${operations.length} operações em batch`);
    
    // Agrupar operações por tipo e coleção
    const groups: Record<string, PendingOperation[]> = {};
    for (const op of operations) {
      const key = `${op.collection}:${op.type}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(op);
    }

    // Processar cada grupo sequencialmente
    for (const [key, ops] of Object.entries(groups)) {
      const [collection, type] = key.split(':');
      console.log(`📋 Processando ${ops.length} operações: ${type} em ${collection}`);
      
      for (const op of ops) {
        try {
          await this.executeOperation(op);
          await LocalStorageService.removePendingOperation(op.id);
        } catch (e) {
          console.warn(`❌ Falha em operação ${op.id}, tentando novamente na próxima sincronização`);
          await LocalStorageService.incrementOperationRetry(op.id);
        }
      }
    }
  }

  // Delta Sync: Sincronizar apenas dados que mudaram
  private static async downloadDeltaData(): Promise<void> {
    if (!ConnectivityService.isConnected()) return;

    const currentUser = await LocalAuthService.getUserFromLocalStorage();
    if (!currentUser) return;

    const uid = (currentUser as any).uid || (currentUser as any).id;
    const now = Date.now();

    try {
      // Sincronizar apenas tarefas que mudaram desde a última sincronização
      const lastUserSync = this.lastSyncTimestamps['user_tasks'];
      if (now - lastUserSync > 60000) { // 1 minuto
        const userTasks = await FirestoreService.getTasksByUser(uid);
        const offlineData = await LocalStorageService.getOfflineData();
        
        for (const task of userTasks) {
          const tt: any = { ...task };
          tt.createdAt = safeToDate(tt.createdAt) || new Date();
          tt.updatedAt = safeToDate(tt.updatedAt) || safeToDate(tt.createdAt) || new Date();

          const localTask = offlineData.tasks[tt.id];
          const remoteUpdated = safeToDate(tt.updatedAt) || new Date();
          
          if (!localTask || remoteUpdated.getTime() > (safeToDate((localTask as any).editedAt)?.getTime() || 0)) {
            await LocalStorageService.saveTask(tt as any);
          }
        }
        this.lastSyncTimestamps['user_tasks'] = now;
        console.log(`✅ Delta sync de tarefas do usuário concluído`);
      }

      // Similiar para tarefas da família
      const userFamily = await familyService.getUserFamily(uid);
      if (userFamily) {
        const lastFamilySync = this.lastSyncTimestamps['family_tasks'];
        if (now - lastFamilySync > 60000) { // 1 minuto
          const familyTasks = await FirestoreService.getTasksByFamily(userFamily.id);
          const offlineData = await LocalStorageService.getOfflineData();
          
          for (const task of familyTasks) {
            const tt: any = { ...task };
            tt.createdAt = safeToDate(tt.createdAt) || new Date();
            tt.updatedAt = safeToDate(tt.updatedAt) || safeToDate(tt.createdAt) || new Date();

            const localTask = offlineData.tasks[tt.id];
            const remoteUpdated = safeToDate(tt.updatedAt) || new Date();
            
            if (!localTask || remoteUpdated.getTime() > (safeToDate((localTask as any).editedAt)?.getTime() || 0)) {
              await LocalStorageService.saveTask(tt as any);
            }
          }
          this.lastSyncTimestamps['family_tasks'] = now;
          console.log(`✅ Delta sync de tarefas da família concluído`);
        }
      }
    } catch (e) {
      console.warn('Erro durante delta sync:', e);
    }
  }

  /**
   * NOVO: Delta Sync Inteligente - Sincroniza apenas tarefas modificadas
   * Em vez de baixar todas as tarefas a cada sincronização, compara timestamps
   * e só baixa as que foram realmente alteradas desde a última sincronização
   */
  private static async downloadIncrementalData(): Promise<void> {
    if (!ConnectivityService.isConnected()) return;

    const currentUser = await LocalAuthService.getUserFromLocalStorage();
    if (!currentUser) return;

    const uid = (currentUser as any).uid || (currentUser as any).id;
    const lastSyncTime = await LocalStorageService.getLastSyncTime();
    const minimumInterval = 30000; // Esperar pelo menos 30 segundos entre syncs incrementais

    if (Date.now() - lastSyncTime < minimumInterval) return;

    try {
      console.log(`🔄 Iniciando sincronização incremental desde ${new Date(lastSyncTime).toISOString()}`);

      // 1. Obter IDs de tarefas que foram modificadas no Firestore desde a última sincronização
      let modifiedTaskIds: string[] = [];
      try {
        const userTasks = await FirestoreService.getTasksByUser(uid);
        modifiedTaskIds = userTasks
          .filter(task => {
            const taskUpdated = safeToDate((task as any).updatedAt || (task as any).createdAt);
            return (taskUpdated?.getTime() ?? 0) > lastSyncTime;
          })
          .map(task => task.id);
      } catch (e) {
        console.warn('Erro ao obter IDs de tarefas modificadas do Firestore:', e);
      }

      // 2. Se houver tarefas modificadas, baixar apenas essas
      if (modifiedTaskIds.length > 0) {
        console.log(`📥 ${modifiedTaskIds.length} tarefas modificadas detectadas - fazendo download`);
        const offlineData = await LocalStorageService.getOfflineData();
        
        const userTasks = await FirestoreService.getTasksByUser(uid);
        
        // Filtrar para não sincronizar tarefas completadas há mais de 7 dias
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const tasksToUpdate = userTasks.filter(t => {
          if (!modifiedTaskIds.includes(t.id)) return false;
          
          // Se a tarefa está concluída, verificar se é recente
          if ((t as any).completed) {
            const completedDate = safeToDate((t as any).completedAt || (t as any).updatedAt || (t as any).createdAt);
            if (completedDate && completedDate.getTime() < sevenDaysAgo) {
              console.log(`⏭️  Pulando tarefa concluída antiga: ${t.title}`);
              return false;
            }
          }
          
          return true;
        });
        
        // Salvar em batch para melhor performance
        await LocalStorageService.saveBatchTasks(
          tasksToUpdate.map(task => {
            const fixed: any = { ...task };
            fixed.createdAt = safeToDate(fixed.createdAt) || new Date();
            fixed.updatedAt = safeToDate(fixed.updatedAt) || safeToDate(fixed.createdAt) || new Date();
            return fixed as Task;
          })
        );

        console.log(`✅ ${tasksToUpdate.length} tarefas atualizadas no cache local`);
      } else {
        console.log(`✓ Nenhuma tarefa nova ou modificada desde a última sincronização`);
      }

      // 3. Sincronizar tarefas da família se aplicável
      const userFamily = await familyService.getUserFamily(uid);
      if (userFamily) {
        try {
          const familyTasks = await FirestoreService.getTasksByFamily(userFamily.id);
          const modifiedFamilyTaskIds = familyTasks
            .filter(task => {
              const taskUpdated = safeToDate((task as any).updatedAt || (task as any).createdAt);
              return (taskUpdated?.getTime() ?? 0) > lastSyncTime;
            })
            .map(task => task.id);

          if (modifiedFamilyTaskIds.length > 0) {
            console.log(`👨‍👩‍👧‍👦 ${modifiedFamilyTaskIds.length} tarefas da família modificadas - fazendo download`);
            
            // Filtrar para não sincronizar tarefas completadas há mais de 7 dias
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const tasksToUpdate = familyTasks.filter(t => {
              if (!modifiedFamilyTaskIds.includes(t.id)) return false;
              
              // Se a tarefa está concluída, verificar se é recente
              if ((t as any).completed) {
                const completedDate = safeToDate((t as any).completedAt || (t as any).updatedAt || (t as any).createdAt);
                if (completedDate && completedDate.getTime() < sevenDaysAgo) {
                  console.log(`⏭️  Pulando tarefa da família concluída antiga: ${t.title}`);
                  return false;
                }
              }
              
              return true;
            });
            
            await LocalStorageService.saveBatchTasks(
              tasksToUpdate.map(task => {
                const fixed: any = { ...task };
                fixed.createdAt = safeToDate(fixed.createdAt) || new Date();
                fixed.updatedAt = safeToDate(fixed.updatedAt) || safeToDate(fixed.createdAt) || new Date();
                return fixed as Task;
              })
            );

            console.log(`✅ ${tasksToUpdate.length} tarefas da família atualizadas no cache`);
          }
        } catch (e) {
          console.warn('Erro ao sincronizar tarefas da família incrementalmente:', e);
        }
      }

    } catch (error) {
      console.warn('Erro durante sincronização incremental:', error);
    }
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
      // Usar getPendingOperations para contar apenas operações que ainda podem ser processadas
      const validPendingOps = await LocalStorageService.getPendingOperations();

      this.syncStatus = {
        isOnline: connectivityState.isConnected,
        isSyncing: false,
        lastSync: offlineData.lastSync,
        pendingOperations: validPendingOps.length,
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

    // Se voltou a ficar online, sincronizar e iniciar sincronização periódica
    if (!wasOnline && isNowOnline) {
      console.log('🔄 Conexão restaurada - iniciando sincronização');
      await this.syncWithRemote();
      this.startPeriodicSync(); // Iniciar sincronização periódica
    }

    // Se ficou offline, parar listeners remotos e sincronização periódica
    if (wasOnline && !isNowOnline) {
      console.log('📴 Ficou offline - parando listeners remotos');
      this.stopRemoteListeners();
      this.stopPeriodicSync(); // Parar sincronização periódica
    }
  };

  // Iniciar sincronização periódica
  private static startPeriodicSync(): void {
    if (this.periodicSyncInterval) {
      console.log('ℹ️ Sincronização periódica já ativa');
      return;
    }

    console.log('🔄 Iniciando sincronização periódica (a cada ' + (this.SYNC_INTERVAL_MS / 1000) + 's)');
    this.periodicSyncInterval = setInterval(async () => {
      if (ConnectivityService.isConnected() && !this.isSyncing) {
        try {
          await this.syncWithRemote();
        } catch (e) {
          console.warn('Erro durante sincronização periódica:', e);
        }
      }
    }, this.SYNC_INTERVAL_MS);
  }

  // Parar sincronização periódica
  private static stopPeriodicSync(): void {
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
      this.periodicSyncInterval = null;
      console.log('⏹️ Sincronização periódica parada');
    }
  }

  // Sincronizar com o servidor remoto (modo local: sem listeners ativos)
  static async syncWithRemote(): Promise<void> {
    if (this.isSyncing || !ConnectivityService.isConnected()) {
      return;
    }

    this.isSyncing = true;
    this.updateSyncStatus({ isSyncing: true, hasError: false });

    try {

  console.log('🔄 Iniciando sincronização remota');

  // 1. Processar operações pendentes em batch (tenta aplicar as operações que falharam antes)
  await this.processPendingOperations();

  // 2. NOVO: Delta Sync Inteligente - Sincroniza apenas tarefas modificadas (mais eficiente)
  await this.downloadIncrementalData();

  // 3. Delta Sync legado: Baixar apenas dados que mudaram (fallback)
  await this.downloadDeltaData();

  // 4. Baixar dados atualizados do servidor remoto (reconciliação local para dados que não temos)
  await this.downloadRemoteData();

  // 5. Configurar listeners remotos
  this.setupRemoteListeners();

  // 6. Atualizar timestamp da última sincronização
  await LocalStorageService.updateLastSync();

  // 7. Compactar cache (a cada 2 sincronizações - aprox 1 minuto)
  if (Math.random() < 0.5) {
    try {
      await LocalStorageService.compactCache();
    } catch (e) {
      console.warn('Erro ao compactar cache (ignorado):', e);
    }
  }

      // 7. Atualizar status - usar getPendingOperations para contar apenas operações válidas
      const validPendingOps = await LocalStorageService.getPendingOperations();
      this.updateSyncStatus({
        isSyncing: false,
        lastSync: Date.now(),
        pendingOperations: validPendingOps.length
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

  // Processar operações pendentes com batch para melhor performance
  private static async processPendingOperations(): Promise<void> {
    const pendingOps = await LocalStorageService.getPendingOperations();
    if (pendingOps.length === 0) return;

    console.log(`📤 Processando ${pendingOps.length} operações pendentes`);

    // Separar operações que podem ser feitas em batch vs. sequencial
    const batchableOps = pendingOps.filter(op => op.type === 'create' || op.type === 'update');
    const sequentialOps = pendingOps.filter(op => op.type === 'delete'); // deletes devem ser sequenciais

    // Processar em batch primeiro (mais rápido)
    if (batchableOps.length > 0) {
      await this.executeBatchOperations(batchableOps);
    }

    // Depois operações sequenciais
    for (const operation of sequentialOps) {
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
    console.log('📥 Baixando dados (remoto/local híbrido - apenas delta)');

    try {
      // Save current user to cache
      await LocalStorageService.saveUser(currentUser);

      const uid = (currentUser as any).uid || (currentUser as any).id;

      // Download tasks by user (reconciliação por timestamp - apenas se não sincronizado recentemente)
      if (ConnectivityService.isConnected() && (Date.now() - this.lastSyncTimestamps['user_tasks']) > 300000) { // 5 minutos
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
            
            // Usar comparação inteligente de mudanças antes de salvar
            if (this.hasRealChanges(tt, localTaskRaw)) {
              await LocalStorageService.saveTask(tt as any);
              savedCount++;
            }
          }
          if (savedCount > 0) {
            console.log(`📋 ${savedCount} tarefas do usuário com mudanças reais atualizadas no cache`);
          } else {
            console.log(`✓ Nenhuma tarefa do usuário com mudanças para sincronizar`);
          }
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
              
              // Usar comparação inteligente: verificar se há mudanças REAIS antes de salvar
              // Isto evita sobrescrever cache com dados idênticos e economiza writes
              if (this.hasRealChanges(tt, localTaskRaw)) {
                await LocalStorageService.saveTask(tt as any);
                savedFamilyCount++;
              }
            }
            if (savedFamilyCount > 0) {
              console.log(`📋 ${savedFamilyCount} tarefas da família com mudanças reais atualizadas no cache`);
            } else {
              console.log(`✓ Nenhuma tarefa da família com mudanças para sincronizar`);
            }
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
      
      // Limpar tarefas antigas do cache (mesma lógica do Firestore: > 7 dias)
      await LocalStorageService.clearOldCompletedTasks(7);
      
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

  // Pausar sincronização periódica (economiza bateria)
  static pausePeriodicSync(): void {
    this.stopPeriodicSync();
    console.log('⏸️ Sincronização periódica pausada');
  }

  // Retomar sincronização periódica
  static resumePeriodicSync(): void {
    if (ConnectivityService.isConnected()) {
      this.startPeriodicSync();
      console.log('▶️ Sincronização periódica retomada');
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