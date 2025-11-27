import AsyncStorage from '@react-native-async-storage/async-storage';
import { FamilyUser, Family, Task, TaskApproval, UserRole } from '../../types/family.types';
import { safeToDate } from '../../utils/date/date.utils';

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

  // Deletar tarefa do cache local (mantém no Firebase para histórico)
  static async deleteTaskFromCache(taskId: string): Promise<void> {
    const data = await this.getOfflineData();
    if (data.tasks[taskId]) {
      delete data.tasks[taskId];
      await this.saveOfflineData(data);
      console.log('🗑️ Tarefa removida do cache local:', taskId);
    }
  }

  // Deletar múltiplas tarefas do cache local
  static async deleteTasksFromCache(taskIds: string[]): Promise<void> {
    const data = await this.getOfflineData();
    let count = 0;
    for (const taskId of taskIds) {
      if (data.tasks[taskId]) {
        delete data.tasks[taskId];
        count++;
      }
    }
    if (count > 0) {
      await this.saveOfflineData(data);
      console.log(`🗑️ ${count} tarefas removidas do cache local`);
    }
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

  // Limpar tarefas concluídas há mais de X dias do cache (mesma lógica do Firestore)
  static async clearOldCompletedTasks(daysToKeep: number = 7): Promise<number> {
    const data = await this.getOfflineData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let removedCount = 0;
    const filteredTasks: Record<string, Task> = {};
    
    Object.entries(data.tasks).forEach(([id, task]) => {
      // Se não está concluída, mantém
      if (!task.completed) {
        filteredTasks[id] = task;
        return;
      }
      
      // Se está concluída, verificar data de conclusão
      const completedAt = safeToDate((task as any).completedAt);
      if (!completedAt) {
        // Sem data de conclusão, mantém por segurança
        filteredTasks[id] = task;
        return;
      }
      
      // Mantém apenas se foi concluída nos últimos X dias
      if (completedAt >= cutoffDate) {
        filteredTasks[id] = task;
      } else {
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      data.tasks = filteredTasks;
      await this.saveOfflineData(data);
      console.log(`🧹 Cache: ${removedCount} tarefas antigas removidas`);
    }
    
    return removedCount;
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
    const sevenDays = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos
    const now = Date.now();
    
    const initialCount = data.pendingOperations.length;
    const reasons: { old: number; maxRetries: number } = { old: 0, maxRetries: 0 };
    
    data.pendingOperations = data.pendingOperations.filter(op => {
      // Remover operações muito antigas (mais de 7 dias)
      if (now - op.timestamp > sevenDays) {
        console.log(`🗑️ Removendo operação antiga: ${op.type} ${op.collection} (${new Date(op.timestamp).toLocaleString()})`);
        reasons.old++;
        return false;
      }
      
      // Remover operações que falharam muitas vezes
      if (op.retry >= this.MAX_RETRIES) {
        console.log(`🗑️ Removendo operação que falhou ${op.retry} vezes: ${op.type} ${op.collection}`);
        reasons.maxRetries++;
        return false;
      }
      
      return true;
    });
    
    if (data.pendingOperations.length !== initialCount) {
      await this.saveOfflineData(data);
      console.log(`🧹 Limpeza concluída: ${initialCount - data.pendingOperations.length} operações removidas (${reasons.old} antigas, ${reasons.maxRetries} max retries)`);
    }
  }

  // Forçar limpeza de todas as operações pendentes
  static async clearAllPendingOperations(): Promise<void> {
    const data = await this.getOfflineData();
    const count = data.pendingOperations.length;
    data.pendingOperations = [];
    await this.saveOfflineData(data);
    console.log(`🧹 Todas as ${count} operações pendentes foram removidas`);
  }

  // Compactar cache removendo dados redundantes e muito antigos
  static async compactCache(): Promise<void> {
    try {
      const data = await this.getOfflineData();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const initialSize = JSON.stringify(data).length;

      // Remover tarefas concluídas há mais de 7 dias
      const tasksToKeep: Record<string, Task> = {};
      let tasksRemoved = 0;
      for (const [id, task] of Object.entries(data.tasks)) {
        const taskDate = safeToDate((task as any).completedAt || (task as any).editedAt || (task as any).createdAt);
        const isOldAndCompleted = (task as any).completed && taskDate && taskDate.getTime() < sevenDaysAgo;
        
        if (!isOldAndCompleted) {
          tasksToKeep[id] = task;
        } else {
          tasksRemoved++;
        }
      }

      // Remover histórico muito antigo (mais de 60 dias)
      const sixtyDaysAgo = Date.now() - (60 * 24 * 60 * 60 * 1000);
      const historyToKeep: Record<string, any> = {};
      let historyRemoved = 0;
      for (const [id, item] of Object.entries(data.history)) {
        const itemDate = safeToDate((item as any).timestamp);
        if (itemDate && itemDate.getTime() < sixtyDaysAgo) {
          historyRemoved++;
        } else {
          historyToKeep[id] = item;
        }
      }

      // Salvar dados compactados
      data.tasks = tasksToKeep;
      data.history = historyToKeep;
      await this.saveOfflineData(data);

      const finalSize = JSON.stringify(data).length;
      const savedBytes = initialSize - finalSize;
      console.log(`🗜️ Cache compactado: ${tasksRemoved} tarefas antigas removidas, ${historyRemoved} itens de histórico removidos`);
      console.log(`📉 Espaço economizado: ${(savedBytes / 1024).toFixed(2)}KB`);
    } catch (error) {
      console.error('Erro ao compactar cache:', error);
    }
  }

  // ==================== DELTA SYNC - SINCRONIZAÇÃO INCREMENTAL ====================

  /**
   * Gera hash simples de um objeto para detecção de mudanças
   * Usado para verificar se dados realmente mudaram antes de fazer download
   */
  private static generateDataHash(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converter para 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Obter tarefas que foram modificadas desde um timestamp
   * Retorna apenas IDs das tarefas que foram modificadas
   * @param sinceTimestamp - Sincronizar apenas tarefas modificadas após este timestamp
   * @returns Array com IDs das tarefas modificadas
   */
  static async getModifiedTaskIds(sinceTimestamp: number): Promise<string[]> {
    try {
      const data = await this.getOfflineData();
      return Object.entries(data.tasks)
        .filter(([_, task]) => {
          const taskUpdated = safeToDate((task as any).updatedAt || (task as any).createdAt || new Date());
          return (taskUpdated?.getTime() ?? 0) > sinceTimestamp;
        })
        .map(([id, _]) => id);
    } catch (error) {
      console.warn('Erro ao obter IDs modificadas:', error);
      return [];
    }
  }

  /**
   * Obter tarefas específicas por IDs
   * Usado para retornar apenas os dados que precisam sincronizar
   * @param taskIds - Array de IDs das tarefas a recuperar
   */
  static async getTasksByIds(taskIds: string[]): Promise<Task[]> {
    try {
      const data = await this.getOfflineData();
      return taskIds
        .map(id => data.tasks[id])
        .filter(task => task !== undefined) as Task[];
    } catch (error) {
      console.warn('Erro ao obter tarefas por IDs:', error);
      return [];
    }
  }

  /**
   * Salvar múltiplas tarefas em batch (otimizado para delta sync)
   * Atualiza apenas os dados fornecidos, preservando o resto
   * @param tasks - Array de tarefas a salvar/atualizar
   */
  static async saveBatchTasks(tasks: Task[]): Promise<void> {
    try {
      const data = await this.getOfflineData();
      
      for (const task of tasks) {
        // Fixar datas antes de salvar
        const fixedTask = this.fixTaskDates(task);
        data.tasks[task.id] = fixedTask;
      }

      await this.saveOfflineData(data);
    } catch (error) {
      console.error('Erro ao salvar batch de tarefas:', error);
    }
  }

  /**
   * Atualizar apenas metadata de sincronização de uma tarefa
   * Sem modificar os dados da tarefa em si
   * @param taskId - ID da tarefa
   * @param lastSyncTime - Timestamp da última sincronização
   * @param dataHash - Hash dos dados
   */
  static async updateTaskSyncMetadata(
    taskId: string,
    lastSyncTime: number,
    dataHash: string
  ): Promise<void> {
    try {
      const data = await this.getOfflineData();
      if (data.tasks[taskId]) {
        const task = data.tasks[taskId];
        (task as any).__syncMetadata = {
          lastSyncTime,
          dataHash,
          isDirty: false,
          version: ((task as any).__syncMetadata?.version || 0) + 1
        };
        await this.saveOfflineData(data);
      }
    } catch (error) {
      console.warn('Erro ao atualizar metadata de sincronização:', error);
    }
  }

  /**
   * Marcar uma tarefa como "dirty" (precisa sincronizar)
   * @param taskId - ID da tarefa
   */
  static async markTaskAsDirty(taskId: string): Promise<void> {
    try {
      const data = await this.getOfflineData();
      if (data.tasks[taskId]) {
        const task = data.tasks[taskId];
        const metadata = (task as any).__syncMetadata || {};
        (task as any).__syncMetadata = {
          ...metadata,
          isDirty: true,
          version: (metadata.version || 0) + 1
        };
        await this.saveOfflineData(data);
      }
    } catch (error) {
      console.warn('Erro ao marcar tarefa como dirty:', error);
    }
  }

  /**
   * Obter todas as tarefas marcadas como dirty (precisam sincronizar)
   * @returns Array de tarefas que foram modificadas localmente
   */
  static async getDirtyTasks(): Promise<Task[]> {
    try {
      const data = await this.getOfflineData();
      return Object.values(data.tasks)
        .filter(task => (task as any).__syncMetadata?.isDirty === true) as Task[];
    } catch (error) {
      console.warn('Erro ao obter tarefas dirty:', error);
      return [];
    }
  }

  /**
   * Limpar flag de dirty de uma tarefa após sincronizar com sucesso
   * @param taskId - ID da tarefa
   */
  static async clearDirtyFlag(taskId: string): Promise<void> {
    try {
      const data = await this.getOfflineData();
      if (data.tasks[taskId]) {
        const task = data.tasks[taskId];
        const metadata = (task as any).__syncMetadata || {};
        (task as any).__syncMetadata = {
          ...metadata,
          isDirty: false
        };
        await this.saveOfflineData(data);
      }
    } catch (error) {
      console.warn('Erro ao limpar dirty flag:', error);
    }
  }

  /**
   * Obter timestamp da última sincronização global
   * @returns Timestamp em ms da última sincronização bem-sucedida
   */
  static async getLastSyncTime(): Promise<number> {
    try {
      const data = await this.getOfflineData();
      return data.lastSync || 0;
    } catch (error) {
      console.warn('Erro ao obter último sync time:', error);
      return 0;
    }
  }
}

export default LocalStorageService;