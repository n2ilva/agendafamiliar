/**
 * Interface do Repositório de Tarefas
 * Define o contrato para operações de persistência de tarefas
 * 
 * Princípio SOLID: Dependency Inversion (D)
 * - Módulos de alto nível não dependem de módulos de baixo nível
 * - Ambos dependem de abstrações
 */

import { Task } from '../../domain/entities/Task';
import { TaskStatus } from '../../domain/value-objects/TaskStatus';
import { DateRange } from '../../domain/value-objects/DateRange';

export interface TaskFilters {
  status?: TaskStatus;
  category?: string;
  assignedTo?: string;
  createdBy?: string;
  dateRange?: DateRange;
  familyId?: string;
  userId?: string;
  searchTerm?: string;
  priority?: string;
}

export interface ITaskRepository {
  /**
   * Busca uma tarefa pelo ID
   */
  findById(id: string): Promise<Task | null>;

  /**
   * Busca todas as tarefas com filtros opcionais
   */
  findAll(filters?: TaskFilters): Promise<Task[]>;

  /**
   * Busca tarefas de uma família específica
   */
  findByFamily(familyId: string, userId?: string): Promise<Task[]>;

  /**
   * Busca tarefas de um usuário específico
   */
  findByUser(userId: string): Promise<Task[]>;

  /**
   * Busca tarefas por status
   */
  findByStatus(status: TaskStatus, familyId?: string): Promise<Task[]>;

  /**
   * Busca tarefas vencidas
   */
  findOverdue(familyId?: string): Promise<Task[]>;

  /**
   * Busca tarefas de hoje
   */
  findToday(familyId?: string, userId?: string): Promise<Task[]>;

  /**
   * Busca tarefas futuras (upcoming)
   */
  findUpcoming(familyId?: string, userId?: string): Promise<Task[]>;

  /**
   * Busca tarefas atribuídas a um usuário
   */
  findByAssigned(userId: string, familyId?: string): Promise<Task[]>;

  /**
   * Salva uma nova tarefa
   */
  save(task: Task): Promise<Task>;

  /**
   * Atualiza uma tarefa existente
   */
  update(id: string, data: Partial<Task>): Promise<Task>;

  /**
   * Remove uma tarefa
   */
  delete(id: string): Promise<void>;

  /**
   * Remove tarefas antigas completadas
   */
  deleteOldCompleted(daysToKeep: number): Promise<number>;

  /**
   * Verifica se uma tarefa existe
   */
  exists(id: string): Promise<boolean>;

  /**
   * Conta tarefas com filtros opcionais
   */
  count(filters?: TaskFilters): Promise<number>;

  /**
   * Inscreve-se para atualizações em tempo real
   * Retorna função de cleanup para cancelar a inscrição
   */
  subscribeToChanges(
    familyId: string,
    callback: (tasks: Task[]) => void,
    userId?: string
  ): () => void;

  /**
   * Salva múltiplas tarefas em batch
   */
  saveBatch(tasks: Task[]): Promise<Task[]>;

  /**
   * Atualiza múltiplas tarefas em batch
   */
  updateBatch(updates: Array<{ id: string; data: Partial<Task> }>): Promise<Task[]>;
}
