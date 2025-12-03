/**
 * Entidade de Domínio: Task
 * Representa uma tarefa com regras de negócio encapsuladas
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Gerencia apenas dados e comportamentos da tarefa
 */

import { TaskStatus } from '../value-objects/TaskStatus.js';
import { RepeatConfig } from '../value-objects/RepeatConfig.js';
import { Priority } from '../value-objects/Priority.js';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
  order: number;
  dueDate?: Date;
  dueTime?: Date;
}

export interface TaskProps {
  id: string;
  title: string;
  description?: string;
  category: string;
  categoryColor?: string;
  categoryIcon?: string;
  status: TaskStatus;
  priority: Priority;
  date: Date;
  time?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  completedBy?: string;
  createdBy: string;
  assignedTo?: string;
  familyId?: string;
  userId?: string;
  
  // Repetição
  repeat?: RepeatConfig;
  repeatGroupId?: string;
  
  // Subtarefas
  subtasks: Subtask[];
  
  // Aprovação
  requiresApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  
  // Adiamento
  postponeCount?: number;
  originalDate?: Date;
  postponedBy?: string;
  
  // Anexos e notas
  attachments?: string[];
  notes?: string;
  
  // Sincronização
  syncStatus?: 'synced' | 'pending' | 'conflict';
  lastSyncAt?: Date;
}

export class Task {
  private readonly props: TaskProps;

  private constructor(props: TaskProps) {
    this.props = { ...props };
  }

  /**
   * Factory method para criar uma nova tarefa
   */
  static create(props: Omit<TaskProps, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'subtasks'> & { 
    id?: string; 
    subtasks?: Subtask[];
    status?: TaskStatus;
  }): Task {
    const now = new Date();
    return new Task({
      ...props,
      id: props.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      status: props.status || 'pending',
      subtasks: props.subtasks || [],
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Factory method para reconstruir tarefa do armazenamento
   */
  static fromPersistence(props: TaskProps): Task {
    return new Task(props);
  }

  // ============ Getters ============

  get id(): string {
    return this.props.id;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get category(): string {
    return this.props.category;
  }

  get categoryColor(): string | undefined {
    return this.props.categoryColor;
  }

  get categoryIcon(): string | undefined {
    return this.props.categoryIcon;
  }

  get status(): TaskStatus {
    return this.props.status;
  }

  get priority(): Priority {
    return this.props.priority;
  }

  get date(): Date {
    return this.props.date;
  }

  get time(): Date | undefined {
    return this.props.time;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get assignedTo(): string | undefined {
    return this.props.assignedTo;
  }

  get familyId(): string | undefined {
    return this.props.familyId;
  }

  get userId(): string | undefined {
    return this.props.userId;
  }

  get repeat(): RepeatConfig | undefined {
    return this.props.repeat;
  }

  get repeatGroupId(): string | undefined {
    return this.props.repeatGroupId;
  }

  get subtasks(): Subtask[] {
    return [...this.props.subtasks];
  }

  get requiresApproval(): boolean {
    return this.props.requiresApproval ?? false;
  }

  get approvalStatus(): 'pending' | 'approved' | 'rejected' | undefined {
    return this.props.approvalStatus;
  }

  get postponeCount(): number {
    return this.props.postponeCount ?? 0;
  }

  // ============ Métodos de Negócio ============

  /**
   * Verifica se a tarefa está completa
   */
  isCompleted(): boolean {
    return this.props.status === 'completed';
  }

  /**
   * Verifica se a tarefa está pendente
   */
  isPending(): boolean {
    return this.props.status === 'pending';
  }

  /**
   * Verifica se a tarefa está atrasada
   */
  isOverdue(): boolean {
    if (this.isCompleted()) return false;
    
    const now = new Date();
    const taskDate = new Date(this.props.date);
    
    if (this.props.time) {
      const time = new Date(this.props.time);
      taskDate.setHours(time.getHours(), time.getMinutes());
    } else {
      taskDate.setHours(23, 59, 59);
    }
    
    return now > taskDate;
  }

  /**
   * Verifica se a tarefa é para hoje
   */
  isToday(): boolean {
    const today = new Date();
    const taskDate = new Date(this.props.date);
    
    return (
      today.getFullYear() === taskDate.getFullYear() &&
      today.getMonth() === taskDate.getMonth() &&
      today.getDate() === taskDate.getDate()
    );
  }

  /**
   * Verifica se a tarefa tem repetição
   */
  isRecurring(): boolean {
    return !!this.props.repeat && this.props.repeat.enabled;
  }

  /**
   * Verifica se todas as subtarefas estão completas
   */
  allSubtasksCompleted(): boolean {
    if (this.props.subtasks.length === 0) return true;
    return this.props.subtasks.every(st => st.completed);
  }

  /**
   * Obtém progresso das subtarefas (0-100)
   */
  getSubtaskProgress(): number {
    if (this.props.subtasks.length === 0) return 100;
    const completed = this.props.subtasks.filter(st => st.completed).length;
    return Math.round((completed / this.props.subtasks.length) * 100);
  }

  /**
   * Verifica se aguarda aprovação
   */
  isPendingApproval(): boolean {
    return this.props.requiresApproval === true && 
           this.props.approvalStatus === 'pending';
  }

  /**
   * Verifica se pode ser editada
   */
  canEdit(): boolean {
    return !this.isCompleted() && !this.isPendingApproval();
  }

  /**
   * Verifica se pode ser adiada
   */
  canPostpone(): boolean {
    return !this.isCompleted();
  }

  /**
   * Marca a tarefa como completa
   */
  complete(completedBy: string): Task {
    if (this.isCompleted()) {
      throw new Error('Tarefa já está completa');
    }

    return new Task({
      ...this.props,
      status: 'completed',
      completedAt: new Date(),
      completedBy,
      updatedAt: new Date(),
      // Se requer aprovação de filho, muda para pending approval
      approvalStatus: this.props.requiresApproval ? 'pending' : undefined,
    });
  }

  /**
   * Reverte para pendente
   */
  uncomplete(): Task {
    if (!this.isCompleted()) {
      throw new Error('Tarefa não está completa');
    }

    return new Task({
      ...this.props,
      status: 'pending',
      completedAt: undefined,
      completedBy: undefined,
      approvalStatus: undefined,
      approvedBy: undefined,
      approvedAt: undefined,
      updatedAt: new Date(),
    });
  }

  /**
   * Adia a tarefa para nova data
   */
  postpone(newDate: Date, postponedBy: string): Task {
    return new Task({
      ...this.props,
      originalDate: this.props.originalDate || this.props.date,
      date: newDate,
      postponeCount: (this.props.postponeCount || 0) + 1,
      postponedBy,
      updatedAt: new Date(),
    });
  }

  /**
   * Aprova a conclusão da tarefa
   */
  approve(approvedBy: string): Task {
    if (!this.props.requiresApproval) {
      throw new Error('Tarefa não requer aprovação');
    }
    if (this.props.approvalStatus !== 'pending') {
      throw new Error('Tarefa não está pendente de aprovação');
    }

    return new Task({
      ...this.props,
      approvalStatus: 'approved',
      approvedBy,
      approvedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Rejeita a conclusão da tarefa
   */
  reject(rejectedBy: string): Task {
    if (!this.props.requiresApproval) {
      throw new Error('Tarefa não requer aprovação');
    }

    return new Task({
      ...this.props,
      status: 'pending',
      completedAt: undefined,
      completedBy: undefined,
      approvalStatus: 'rejected',
      approvedBy: rejectedBy,
      approvedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Atualiza os dados da tarefa
   */
  update(data: Partial<Pick<TaskProps, 
    'title' | 'description' | 'category' | 'categoryColor' | 'categoryIcon' | 
    'priority' | 'date' | 'time' | 'assignedTo' | 'repeat' | 'notes'
  >>): Task {
    return new Task({
      ...this.props,
      ...data,
      updatedAt: new Date(),
    });
  }

  /**
   * Adiciona subtarefa
   */
  addSubtask(subtask: Omit<Subtask, 'id' | 'completed' | 'order'>): Task {
    const newSubtask: Subtask = {
      ...subtask,
      id: `subtask_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      completed: false,
      order: this.props.subtasks.length,
    };

    return new Task({
      ...this.props,
      subtasks: [...this.props.subtasks, newSubtask],
      updatedAt: new Date(),
    });
  }

  /**
   * Atualiza subtarefa
   */
  updateSubtask(subtaskId: string, data: Partial<Subtask>): Task {
    const subtasks = this.props.subtasks.map(st =>
      st.id === subtaskId ? { ...st, ...data } : st
    );

    return new Task({
      ...this.props,
      subtasks,
      updatedAt: new Date(),
    });
  }

  /**
   * Marca subtarefa como completa
   */
  completeSubtask(subtaskId: string, completedBy: string): Task {
    const subtasks = this.props.subtasks.map(st =>
      st.id === subtaskId
        ? { ...st, completed: true, completedAt: new Date(), completedBy }
        : st
    );

    return new Task({
      ...this.props,
      subtasks,
      updatedAt: new Date(),
    });
  }

  /**
   * Remove subtarefa
   */
  removeSubtask(subtaskId: string): Task {
    const subtasks = this.props.subtasks
      .filter(st => st.id !== subtaskId)
      .map((st, index) => ({ ...st, order: index }));

    return new Task({
      ...this.props,
      subtasks,
      updatedAt: new Date(),
    });
  }

  /**
   * Reordena subtarefas
   */
  reorderSubtasks(orderedIds: string[]): Task {
    const subtaskMap = new Map(this.props.subtasks.map(st => [st.id, st]));
    const subtasks = orderedIds
      .filter(id => subtaskMap.has(id))
      .map((id, index) => ({ ...subtaskMap.get(id)!, order: index }));

    return new Task({
      ...this.props,
      subtasks,
      updatedAt: new Date(),
    });
  }

  /**
   * Converte para objeto plano (persistência)
   */
  toObject(): TaskProps {
    return { ...this.props };
  }

  /**
   * Verifica igualdade com outra tarefa
   */
  equals(other: Task): boolean {
    return this.props.id === other.id;
  }
}
