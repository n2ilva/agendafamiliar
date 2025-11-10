import AsyncStorage from '@react-native-async-storage/async-storage';
import { FamilyUser, Family, Task, TaskApproval, UserRole } from '../types/FamilyTypes';
import { safeToDate } from '../utils/DateUtils';

export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: 'users' | 'families' | 'tasks' | 'approvals' | 'history';
  data: any;
  timestamp: number;
  retry: number;
}

export interface HistoryItem {
  id: string;
  action: 'created' | 'completed' | 'uncompleted' | 'edited' | 'deleted' | 'approval_requested' | 'approved' | 'rejected';
  taskTitle: string;
  taskId: string;
  timestamp: Date;
  details?: string;
  // Informações de autoria
  userId: string;
  userName: string;
  userRole?: string;
}

export interface OfflineData {
  users: Record<string, FamilyUser>;
  families: Record<string, Family>;
  tasks: Record<string, Task>;
  approvals: Record<string, TaskApproval>;
  history: Record<string, HistoryItem>;
  pendingOperations: PendingOperation[];
  lastSync: number;
  // Mapa de notificações lidas (por id de notificação/approval)
  notificationReads?: Record<string, boolean>;
}

class LocalStorageService {
  private static readonly STORAGE_KEY = 'familyApp_offlineData';
  public static readonly MAX_RETRIES = 3;

  // Helper function to fix date fields in tasks
  private static fixTaskDates(task: any): Task {
    const fixed: Task = {
      ...task,
      dueDate: safeToDate(task.dueDate),
      dueTime: safeToDate(task.dueTime),
      createdAt: safeToDate(task.createdAt) || new Date(),
      editedAt: safeToDate(task.editedAt)
    } as any;

    // Normalizar datas das subtarefas, se existirem
    if (Array.isArray((task as any).subtasks)) {
      fixed.subtasks = (task as any).subtasks.map((st: any) => ({
        ...st,
        dueDate: safeToDate(st?.dueDate),
        dueTime: safeToDate(st?.dueTime),
        completedAt: safeToDate(st?.completedAt)
      }));
    }

    return fixed;
  }

  // Salvar dados no cache local
  static async saveOfflineData(data: Partial<OfflineData>): Promise<void> {
    try {
      const existingData = await this.getOfflineData();
      const updatedData: OfflineData = {
        ...existingData,
        ...data,
        lastSync: data.lastSync || existingData.lastSync
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData));
    } catch (error) {
      console.error('Erro ao salvar dados offline:', error);
    }
  }

  // Recuperar dados do cache local
  static async getOfflineData(): Promise<OfflineData> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // garantir estrutura do novo campo
        if (!parsed.notificationReads) parsed.notificationReads = {};
        return parsed;
      }
    } catch (error) {
      console.error('Erro ao recuperar dados offline:', error);
    }

    // Retornar estrutura vazia se não houver dados
    return {
      users: {},
      families: {},
      tasks: {},
      approvals: {},
      history: {},
      pendingOperations: [],
      lastSync: 0,
      notificationReads: {}
    };
  }

  // Salvar usuário no cache
  static async saveUser(user: FamilyUser): Promise<void> {
    const data = await this.getOfflineData();
    data.users[user.id] = user;
    await this.saveOfflineData(data);
  }

  // Salvar família no cache
  static async saveFamily(family: Family): Promise<void> {
    const data = await this.getOfflineData();
    data.families[family.id] = family;
    await this.saveOfflineData(data);
  }

  // Salvar tarefa no cache
  static async saveTask(task: Task): Promise<void> {
    const data = await this.getOfflineData();
    data.tasks[task.id] = task;
    await this.saveOfflineData(data);
  }

  // Salvar aprovação no cache
  static async saveApproval(approval: TaskApproval): Promise<void> {
    const data = await this.getOfflineData();
    data.approvals[approval.id] = {
      ...approval,
      requestedAt: approval.requestedAt instanceof Date ? approval.requestedAt : (approval.requestedAt ? new Date(approval.requestedAt as any) : new Date()),
      resolvedAt: approval.resolvedAt instanceof Date ? approval.resolvedAt : (approval.resolvedAt ? new Date(approval.resolvedAt as any) : undefined)
    } as any;
    await this.saveOfflineData(data);
  }

  // Recuperar usuário do cache
  static async getUser(userId: string): Promise<FamilyUser | null> {
    const data = await this.getOfflineData();
    return data.users[userId] || null;
  }

  // Recuperar família do cache
  static async getFamily(familyId: string): Promise<Family | null> {
    const data = await this.getOfflineData();
    return data.families[familyId] || null;
  }

  // Recuperar todas as tarefas do cache
  static async getTasks(): Promise<Task[]> {
    const data = await this.getOfflineData();
    return Object.values(data.tasks).map(task => this.fixTaskDates(task));
  }

  // Recuperar tarefas por família
  static async getTasksByFamily(familyId: string): Promise<Task[]> {
    const tasks = await this.getTasks();
    const data = await this.getOfflineData();
    
    // Buscar usuários da família
    const familyUsers = Object.values(data.users).filter(user => user.familyId === familyId);
    const userIds = familyUsers.map(user => user.id);
    
    // Retornar tarefas dos usuários da família
    return tasks.filter(task => userIds.includes(task.userId));
  }

  // Recuperar aprovações do cache
  static async getApprovals(): Promise<TaskApproval[]> {
    const data = await this.getOfflineData();
    return Object.values(data.approvals).map((a: any) => ({
      ...a,
      requestedAt: safeToDate(a.requestedAt) || new Date(),
      resolvedAt: safeToDate(a.resolvedAt)
    }));
  }

  // Métodos para histórico
  static async saveHistoryItem(historyItem: HistoryItem): Promise<void> {
    const data = await this.getOfflineData();
    
    // Garantir que o objeto history existe
    if (!data.history) {
      data.history = {};
    }
    
    data.history[historyItem.id] = historyItem;
    await this.saveOfflineData(data);
  }

  static async getHistory(limit?: number): Promise<HistoryItem[]> {
    const data = await this.getOfflineData();
    const historyItems = Object.values(data.history)
      .map(item => ({
        ...item,
        timestamp: safeToDate(item.timestamp) || new Date()
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Limitar quantidade se especificado
    return limit ? historyItems.slice(0, limit) : historyItems;
  }

  static async clearOldHistory(daysToKeep: number = 7): Promise<void> {
    const data = await this.getOfflineData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Filtrar histórico mantendo apenas itens recentes
    const filteredHistory: Record<string, HistoryItem> = {};
    Object.entries(data.history).forEach(([id, item]) => {
      const itemDate = safeToDate(item.timestamp);
      if (itemDate && itemDate >= cutoffDate) {
        filteredHistory[id] = item;
      }
    });
    
    data.history = filteredHistory;
    await this.saveOfflineData(data);
  }

  static async getHistoryByUserId(userId: string, limit?: number): Promise<HistoryItem[]> {
    const allHistory = await this.getHistory();
    const userHistory = allHistory.filter(item => item.userId === userId);
    return limit ? userHistory.slice(0, limit) : userHistory;
  }

  // Adicionar operação pendente
  static async addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retry'>): Promise<void> {
    const data = await this.getOfflineData();
    const pendingOp: PendingOperation = {
      ...operation,
      id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retry: 0
    };

    data.pendingOperations.push(pendingOp);
    await this.saveOfflineData(data);
    const opTaskId = pendingOp.data && pendingOp.data.id ? pendingOp.data.id : undefined;
    const opFamilyId = pendingOp.data && (pendingOp.data.familyId !== undefined) ? pendingOp.data.familyId : undefined;
    console.log('Operação adicionada à fila offline:', `id=${pendingOp.id} type=${pendingOp.type} collection=${pendingOp.collection}` +
      `${opTaskId ? ` taskId=${opTaskId}` : ''}` +
      `${opFamilyId !== undefined ? ` familyId=${opFamilyId}` : ''}`);
  }

  // Obter operações pendentes
  static async getPendingOperations(): Promise<PendingOperation[]> {
    const data = await this.getOfflineData();
    return data.pendingOperations.filter(op => op.retry < this.MAX_RETRIES);
  }

  // Remover operação pendente
  static async removePendingOperation(operationId: string): Promise<void> {
    const data = await this.getOfflineData();
    data.pendingOperations = data.pendingOperations.filter(op => op.id !== operationId);
    await this.saveOfflineData(data);
  }

  // Incrementar retry de operação
  static async incrementOperationRetry(operationId: string): Promise<void> {
    const data = await this.getOfflineData();
    const operation = data.pendingOperations.find(op => op.id === operationId);
    if (operation) {
      operation.retry += 1;
      await this.saveOfflineData(data);
    }
  }

  // Remover item do cache
  static async removeFromCache(collection: keyof OfflineData, id: string): Promise<void> {
    const data = await this.getOfflineData();
    if (collection !== 'pendingOperations' && collection !== 'lastSync') {
      delete (data[collection] as Record<string, any>)[id];
      await this.saveOfflineData(data);
    }
  }

  // Limpar cache
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('Cache local limpo');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  // Verificar se há dados no cache
  static async hasCachedData(): Promise<boolean> {
    const data = await this.getOfflineData();
    return Object.keys(data.users).length > 0 || 
           Object.keys(data.families).length > 0 || 
           Object.keys(data.tasks).length > 0 ||
           Object.keys(data.history).length > 0;
  }

  // Obter tamanho do cache
  static async getCacheSize(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? data.length : 0;
    } catch (error) {
      console.error('Erro ao obter tamanho do cache:', error);
      return 0;
    }
  }

  // Atualizar timestamp da última sincronização
  static async updateLastSync(): Promise<void> {
    await this.saveOfflineData({ lastSync: Date.now() });
  }

  // ================== Notificações (estado lido) ==================
  static async getNotificationReads(): Promise<Record<string, boolean>> {
    const data = await this.getOfflineData();
    return data.notificationReads || {};
  }

  static async setNotificationsRead(ids: string[], read: boolean = true): Promise<void> {
    const data = await this.getOfflineData();
    const reads = { ...(data.notificationReads || {}) };
    ids.forEach(id => {
      reads[id] = read;
    });
    data.notificationReads = reads;
    await this.saveOfflineData(data);
  }

  // Verificar se os dados estão desatualizados (mais de 1 hora)
  static async isDataStale(): Promise<boolean> {
    const data = await this.getOfflineData();
    const oneHour = 60 * 60 * 1000; // 1 hora em milissegundos
    return (Date.now() - data.lastSync) > oneHour;
  }

  // Limpar operações pendentes antigas (mais de 24 horas) ou que falharam muito
  static async cleanupOldOperations(): Promise<void> {
    const data = await this.getOfflineData();
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
    const now = Date.now();
    
    const initialCount = data.pendingOperations.length;
    
    data.pendingOperations = data.pendingOperations.filter(op => {
      // Remover operações muito antigas (mais de 24 horas)
      if (now - op.timestamp > twentyFourHours) {
        console.log(`🗑️ Removendo operação antiga: ${op.type} ${op.collection} (${new Date(op.timestamp).toLocaleString()})`);
        return false;
      }
      
      // Remover operações que falharam muitas vezes
      if (op.retry >= this.MAX_RETRIES) {
        console.log(`🗑️ Removendo operação que falhou ${op.retry} vezes: ${op.type} ${op.collection}`);
        return false;
      }
      
      return true;
    });
    
    if (data.pendingOperations.length !== initialCount) {
      await this.saveOfflineData(data);
      console.log(`🧹 Limpeza concluída: ${initialCount - data.pendingOperations.length} operações removidas`);
    }
  }

  // Forçar limpeza de todas as operações pendentes (para debug)
  static async clearAllPendingOperations(): Promise<void> {
    const data = await this.getOfflineData();
    const count = data.pendingOperations.length;
    data.pendingOperations = [];
    await this.saveOfflineData(data);
    console.log(`🧹 Todas as ${count} operações pendentes foram removidas`);
  }
}

export default LocalStorageService;