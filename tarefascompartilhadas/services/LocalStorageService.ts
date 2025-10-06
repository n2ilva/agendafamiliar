import AsyncStorage from '@react-native-async-storage/async-storage';
import { FamilyUser, Family, Task, TaskApproval } from '../types/FamilyTypes';

export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: 'users' | 'families' | 'tasks' | 'approvals';
  data: any;
  timestamp: number;
  retry: number;
}

export interface OfflineData {
  users: Record<string, FamilyUser>;
  families: Record<string, Family>;
  tasks: Record<string, Task>;
  approvals: Record<string, TaskApproval>;
  pendingOperations: PendingOperation[];
  lastSync: number;
}

class LocalStorageService {
  private static readonly STORAGE_KEY = 'familyApp_offlineData';
  private static readonly MAX_RETRIES = 3;

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
      console.log('Dados salvos no cache local:', Object.keys(data));
    } catch (error) {
      console.error('Erro ao salvar dados offline:', error);
    }
  }

  // Recuperar dados do cache local
  static async getOfflineData(): Promise<OfflineData> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
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
      pendingOperations: [],
      lastSync: 0
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
    data.approvals[approval.id] = approval;
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
    return Object.values(data.tasks);
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
    return Object.values(data.approvals);
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
    console.log('Operação adicionada à fila offline:', pendingOp.type, pendingOp.collection);
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
           Object.keys(data.tasks).length > 0;
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

  // Verificar se os dados estão desatualizados (mais de 1 hora)
  static async isDataStale(): Promise<boolean> {
    const data = await this.getOfflineData();
    const oneHour = 60 * 60 * 1000; // 1 hora em milissegundos
    return (Date.now() - data.lastSync) > oneHour;
  }
}

export default LocalStorageService;