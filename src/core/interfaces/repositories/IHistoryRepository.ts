/**
 * Interface do Repositório de Histórico
 * Define o contrato para operações de persistência do histórico de ações
 * 
 * Princípio SOLID: Dependency Inversion (D)
 */

export type HistoryAction = 
  | 'task_created'
  | 'task_completed'
  | 'task_uncompleted'
  | 'task_updated'
  | 'task_deleted'
  | 'task_postponed'
  | 'task_approved'
  | 'task_rejected'
  | 'member_joined'
  | 'member_left'
  | 'member_role_changed';

export interface HistoryItem {
  id: string;
  action: HistoryAction;
  timestamp: Date;
  userId: string;
  userName?: string;
  userRole?: string;
  familyId?: string;
  taskId?: string;
  taskTitle?: string;
  details?: Record<string, any>;
}

export interface IHistoryRepository {
  /**
   * Busca um item de histórico pelo ID
   */
  findById(id: string): Promise<HistoryItem | null>;

  /**
   * Busca histórico de uma família
   */
  findByFamily(familyId: string, limit?: number): Promise<HistoryItem[]>;

  /**
   * Busca histórico de um usuário
   */
  findByUser(userId: string, limit?: number): Promise<HistoryItem[]>;

  /**
   * Busca histórico de uma tarefa específica
   */
  findByTask(taskId: string): Promise<HistoryItem[]>;

  /**
   * Busca histórico por tipo de ação
   */
  findByAction(action: HistoryAction, familyId?: string): Promise<HistoryItem[]>;

  /**
   * Adiciona um item ao histórico
   */
  add(item: HistoryItem): Promise<HistoryItem>;

  /**
   * Remove itens antigos do histórico
   */
  deleteOld(daysToKeep: number): Promise<number>;

  /**
   * Limpa todo o histórico de uma família
   */
  clearFamily(familyId: string): Promise<void>;

  /**
   * Inscreve-se para atualizações do histórico em tempo real
   */
  subscribeToChanges(
    familyId: string,
    callback: (items: HistoryItem[]) => void,
    limit?: number
  ): () => void;
}
