import LocalStorageService, { PendingOperation } from './LocalStorageService';
import ConnectivityService from './ConnectivityService';
import LocalAuthService from './LocalAuthService';
import familyService from './LocalFamilyService';
import { FamilyUser, Family, Task, TaskApproval } from '../types/FamilyTypes';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: number;
  pendingOperations: number;
  hasError: boolean;
  errorMessage?: string;
}

type SyncCallback = (status: SyncStatus) => void;

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
  private static firebaseListeners: Array<() => void> = [];
  private static isInitialized = false;

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
        await this.syncWithFirebase();
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
      await this.syncWithFirebase();
    }

    // Se ficou offline, parar listeners do Firebase
    if (wasOnline && !isNowOnline) {
      console.log('📴 Ficou offline - parando listeners Firebase');
      this.stopFirebaseListeners();
    }
  };

  // Sincronizar com Firebase
  static async syncWithFirebase(): Promise<void> {
    if (this.isSyncing || !ConnectivityService.isConnected()) {
      return;
    }

    this.isSyncing = true;
    this.updateSyncStatus({ isSyncing: true, hasError: false });

    try {
      console.log('🔄 Iniciando sincronização com Firebase');

      // 1. Processar operações pendentes
      await this.processPendingOperations();

      // 2. Baixar dados atualizados do Firebase
      await this.downloadFirebaseData();

      // 3. Configurar listeners para mudanças em tempo real
      this.setupFirebaseListeners();

      // 4. Atualizar timestamp da última sincronização
      await LocalStorageService.updateLastSync();

      // 5. Atualizar status
      const offlineData = await LocalStorageService.getOfflineData();
      this.updateSyncStatus({
        isSyncing: false,
        lastSync: Date.now(),
        pendingOperations: offlineData.pendingOperations.length
      });

      console.log('✅ Sincronização concluída com sucesso');
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
        await this.executeOperation(operation);
        await LocalStorageService.removePendingOperation(operation.id);
        console.log(`✅ Operação processada: ${operation.type} ${operation.collection}`);
      } catch (error) {
        console.error(`❌ Erro ao processar operação ${operation.id}:`, error);
        await LocalStorageService.incrementOperationRetry(operation.id);
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
        if (type === 'delete') {
          await LocalStorageService.removeFromCache('tasks', data.id);
        } else {
          // Use familyService to save task if possible
          try {
            if (data.familyId) {
              await familyService.saveFamilyTask(data as Task, data.familyId);
            } else {
              await LocalStorageService.saveTask(data as Task);
            }
          } catch (e) {
            // fallback to local storage
            await LocalStorageService.saveTask(data as Task);
          }
        }
      } else if (collectionName === 'approvals') {
        if (type === 'delete') {
          await LocalStorageService.removeFromCache('approvals', data.id);
        } else {
          await LocalStorageService.saveApproval(data as TaskApproval);
        }
      } else if (collectionName === 'history') {
        if (type === 'delete') {
          await LocalStorageService.removeFromCache('history', data.id);
        } else {
          try {
            await LocalStorageService.saveHistoryItem(data as any);
          } catch (e) {
            // fallback to familyService which normalizes history items
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

  // Baixar dados do Firebase
  private static async downloadFirebaseData(): Promise<void> {
    // In local-only mode, download from local familyService (which uses AsyncStorage)
    const currentUser = await LocalAuthService.getUserFromLocalStorage();
    if (!currentUser) return;

    console.log('📥 Baixando dados (local-only)');

    try {
      // Save current user to cache
      await LocalStorageService.saveUser(currentUser);

      // Get user's family and download family data
      const userFamily = await familyService.getUserFamily(currentUser.id);
      if (userFamily) {
        await LocalStorageService.saveFamily(userFamily);
        for (const member of userFamily.members) {
          await LocalStorageService.saveUser(member);
        }

        // Tasks
        const familyTasks = await familyService.getFamilyTasks(userFamily.id, currentUser.id);
        for (const task of familyTasks) {
          await LocalStorageService.saveTask(task);
        }

        console.log(`📋 ${familyTasks.length} tarefas da família (incluindo privadas do usuário) salvas no cache`);
      }
    } catch (error) {
      console.error('Erro ao baixar dados (local-only):', error);
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

      // Baixar aprovações a partir do armazenamento local (não há servidor)
      const offlineData = await LocalStorageService.getOfflineData();
      const approvalsMap = offlineData.approvals || {};
      const approvals: TaskApproval[] = Object.values(approvalsMap).filter(a => a && a.familyId === familyId) as TaskApproval[];
      for (const approval of approvals) {
        await LocalStorageService.saveApproval(approval);
      }
      this.notifyApprovalsListeners(approvals);

      // Reconciliar cache local: usar os dados do Firebase como source-of-truth para esta família
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

        // Remover tarefas locais pertencentes aos usuários antigos da família
        for (const [tid, t] of Object.entries(tasksMap)) {
          const task: any = t as any;
          if (!task) continue;
          // Se a tarefa pertence a um usuário que era da família, removemos; também suportar campo familyId se existir
          if ((task.userId && localFamilyUserIds.includes(task.userId)) || (task.familyId && task.familyId === familyId)) {
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

        console.log(`✅ Cache local atualizado com os dados do Firebase para a família ${familyId}`);
      } catch (reconcErr) {
        console.warn('⚠️ Erro durante reconciliação de cache local:', reconcErr);
      }

    } catch (error) {
      console.error('❌ Erro ao baixar dados da família:', error);
      throw error;
    }
  }

  // Configurar listeners do Firebase
  private static setupFirebaseListeners(): void {
    // No realtime listeners in local-only mode. Keep placeholder for API compatibility.
    console.log('⚠️ setupFirebaseListeners skipped in local-only mode');
  }

  // Parar listeners do Firebase
  private static stopFirebaseListeners(): void {
    this.firebaseListeners = [];
    console.log('🛑 Listeners skipped/cleared in local-only mode');
  }

  // Adicionar operação à fila offline
  static async addOfflineOperation(
    type: 'create' | 'update' | 'delete',
    collection: string,
    data: any
  ): Promise<void> {
    await LocalStorageService.addPendingOperation({ type, collection: collection as any, data });
    
    // Atualizar contagem de operações pendentes
    const offlineData = await LocalStorageService.getOfflineData();
    this.updateSyncStatus({ pendingOperations: offlineData.pendingOperations.length });

    // Se estiver online, tentar sincronizar imediatamente
    if (ConnectivityService.isConnected()) {
      await this.syncWithFirebase();
    }
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
      // Baixar dados do Firebase primeiro
      await this.downloadFirebaseData();
      
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
      await this.syncWithFirebase();
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
    this.stopFirebaseListeners();
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
    this.stopFirebaseListeners();
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