import LocalStorageService, { PendingOperation } from './LocalStorageService';
import ConnectivityService from './ConnectivityService';
import FirebaseAuthService from './FirebaseAuthService';
import familyService from './FirebaseFamilyService';
import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  addDoc, // Importar addDoc
  query, 
  where,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
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
  private static firebaseListeners: Unsubscribe[] = [];
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
    const collRef = collection(db, collectionName);
    const payload: any = this.sanitizeForFirestore(data);

    switch (type) {
      case 'create':
        if (payload.id && typeof payload.id === 'string' && !payload.id.startsWith('temp_') && payload.id !== 'temp') {
          // Preservar o ID fornecido
          const targetRef = doc(db, collectionName, payload.id);
          await setDoc(targetRef, payload);
          console.log(`✅ Documento criado com ID preservado: ${payload.id}`);
        } else {
          // Sem ID ou temporário: deixar o Firestore gerar um ID
          const newDocRef = await addDoc(collRef, payload);
          console.log(`✅ Documento criado com novo ID: ${newDocRef.id}`);
        }
        break;
      
      case 'update':
        // Se o ID for temporário, tratar como 'create'
        if (payload.id && (payload.id.startsWith('temp_') || payload.id === 'temp')) {
          const newDocRefFromUpdate = await addDoc(collRef, payload);
          console.log(`✅ Documento (de update) criado com novo ID: ${newDocRefFromUpdate.id}`);
        } else {
          // Se o ID for real, verificar se existe antes de atualizar
          const docRef = doc(db, collectionName, payload.id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            await updateDoc(docRef, payload);
          } else {
            // Se não existe, cria com o ID especificado (pode ter sido deletado)
            console.log(`⚠️ Documento ${data.id} não encontrado para update, criando novo.`);
            await setDoc(docRef, payload);
          }
        }
        break;
      
      case 'delete':
        // Deletar documento se houver um ID válido
        if (data.id && typeof data.id === 'string') {
          await deleteDoc(doc(db, collectionName, data.id));
        } else {
          console.warn(`⚠️ Operação de delete ignorada: ID inválido em ${collectionName}`, data);
        }
        break;
      
      default:
        throw new Error(`Tipo de operação não suportado: ${type}`);
    }
  }

  // Baixar dados do Firebase
  private static async downloadFirebaseData(): Promise<void> {
    const currentUser = FirebaseAuthService.getCurrentUser();
    if (!currentUser) return;

    console.log('📥 Baixando dados do Firebase');

    try {
      // Baixar dados do usuário
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() } as FamilyUser;
        await LocalStorageService.saveUser(userData);
        
        // Baixar dados da família se o usuário tiver uma
        const userFamily = await familyService.getUserFamily(currentUser.uid);
        if (userFamily) {
          await this.downloadFamilyData(userFamily.id);
        }
      }

    } catch (error) {
      console.error('Erro ao baixar dados do Firebase:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      // Propagar erro com contexto adicional
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`downloadFirebaseData falhou: ${msg}`);
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
  const currentUser = FirebaseAuthService.getCurrentUser();
  const userId = currentUser ? currentUser.uid : undefined;
  const familyTasks = await familyService.getFamilyTasks(familyId, userId);
      for (const task of familyTasks) {
        await LocalStorageService.saveTask(task);
      }

      console.log(`📋 ${familyTasks.length} tarefas da família (incluindo privadas do usuário) baixadas e salvas no cache`);

      // Baixar aprovações da família
      const approvalsQuery = query(
        collection(db, 'approvals'),
        where('familyId', '==', familyId)
      );
      const approvalsSnapshot = await getDocs(approvalsQuery);
      
      const approvals: TaskApproval[] = [];
      for (const approvalDoc of approvalsSnapshot.docs) {
        const raw = approvalDoc.data();
        const approvalData: TaskApproval = {
          id: approvalDoc.id,
          taskId: raw.taskId,
          dependenteId: raw.dependenteId,
          dependenteName: raw.dependenteName,
          adminId: raw.adminId,
          status: raw.status,
          requestedAt: (raw.requestedAt && typeof raw.requestedAt.toDate === 'function') ? raw.requestedAt.toDate() : (raw.requestedAt ? new Date(raw.requestedAt) : new Date()),
          resolvedAt: (raw.resolvedAt && typeof raw.resolvedAt.toDate === 'function') ? raw.resolvedAt.toDate() : (raw.resolvedAt ? new Date(raw.resolvedAt) : undefined),
          adminComment: raw.adminComment,
          familyId: raw.familyId || familyId,
        };
        await LocalStorageService.saveApproval(approvalData);
        approvals.push(approvalData);
      }
      // Notificar interessados na lista de approvals
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
          for (const member of familyData.members) {``
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

        // Adicionar tarefas baixadas do servidor
        for (const t of familyTasks) {
          tasksMap[t.id] = t;
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
    const currentUser = FirebaseAuthService.getCurrentUser();
    if (!currentUser) return;

    console.log('👂 Configurando listeners Firebase');

    // Listener para mudanças do usuário
    const userListener = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (doc) => {
        if (doc.exists()) {
          const userData = { id: doc.id, ...doc.data() } as FamilyUser;
          LocalStorageService.saveUser(userData);
          console.log('🔄 Dados do usuário atualizados');
        }
      },
      (error) => console.error('Erro no listener do usuário:', error)
    );

    this.firebaseListeners.push(userListener);

    // Listener em tempo real para approvals da família do usuário (se houver)
    familyService.getUserFamily(currentUser.uid).then(family => {
      if (!family) return;
      const q = query(
        collection(db, 'approvals'),
        where('familyId', '==', family.id)
      );
      const approvalsListener = onSnapshot(q, async (snapshot) => {
        const removals: string[] = [];
        snapshot.docChanges().forEach(async change => {
          const data = change.doc.data() as any;
          const approval: TaskApproval = {
            id: change.doc.id,
            taskId: data.taskId,
            dependenteId: data.dependenteId,
            dependenteName: data.dependenteName,
            adminId: data.adminId,
            status: data.status,
            requestedAt: (data.requestedAt && typeof data.requestedAt.toDate === 'function') ? data.requestedAt.toDate() : (data.requestedAt ? new Date(data.requestedAt) : new Date()),
            resolvedAt: (data.resolvedAt && typeof data.resolvedAt.toDate === 'function') ? data.resolvedAt.toDate() : (data.resolvedAt ? new Date(data.resolvedAt) : undefined),
            adminComment: data.adminComment,
            familyId: data.familyId || family.id,
          };
          // Somente salvar ou remover no cache; derivação de UI acontece na tela
          if (change.type === 'removed') {
            removals.push(approval.id);
            await LocalStorageService.removeFromCache('approvals' as any, approval.id);
          } else {
            // evitar re-inserir itens que tenham sido removidos nesta rodada
            if (!removals.includes(approval.id)) {
              await LocalStorageService.saveApproval(approval);
            }
          }
        });
        // Após aplicar mudanças, carregar todas approvals do cache e notificar
        const allApprovals = await LocalStorageService.getApprovals();
        const filtered = allApprovals.filter(a => !removals.includes((a as any).id));
        this.notifyApprovalsListeners(filtered);
        console.log('🔔 Atualizações de approvals recebidas em tempo real');
      }, (error) => {
        console.error('Erro no listener de approvals:', error);
      });

      this.firebaseListeners.push(approvalsListener);
    }).catch(err => console.error('Erro ao obter família para listener de approvals:', err));
  }

  // Parar listeners do Firebase
  private static stopFirebaseListeners(): void {
    this.firebaseListeners.forEach(unsubscribe => unsubscribe());
    this.firebaseListeners = [];
    console.log('🛑 Listeners Firebase parados');
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
      const currentUser = FirebaseAuthService.getCurrentUser();
      if (currentUser) {
        const userFamily = await familyService.getUserFamily(currentUser.uid);
        if (userFamily) {
          // Apenas um exemplo de download leve: buscar tarefas (incluir privadas do usuário)
          const familyTasks = await familyService.getFamilyTasks(userFamily.id, currentUser.uid);
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