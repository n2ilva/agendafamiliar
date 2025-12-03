/**
 * Interface do Serviço de Notificações
 * Define o contrato para operações de notificação push/local
 * 
 * Princípio SOLID: Dependency Inversion (D)
 */

import { Task } from '../../domain/entities/Task';

export interface NotificationPermissions {
  granted: boolean;
  canAskAgain: boolean;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: boolean;
  badge?: number;
  categoryId?: string;
}

export interface NotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface ScheduledNotification {
  id: string;
  taskId?: string;
  scheduledAt: Date;
  payload: NotificationPayload;
}

export interface INotificationService {
  /**
   * Inicializa o serviço de notificações
   */
  initialize(): Promise<NotificationPermissions>;

  /**
   * Solicita permissão para notificações
   */
  requestPermissions(): Promise<NotificationPermissions>;

  /**
   * Verifica status atual das permissões
   */
  getPermissions(): Promise<NotificationPermissions>;

  /**
   * Envia notificação para um usuário específico
   */
  send(notification: NotificationRequest): Promise<string | null>;

  /**
   * Agenda lembrete para uma tarefa
   */
  scheduleTaskReminder(task: Task): Promise<string | null>;

  /**
   * Agenda lembretes para subtarefas
   */
  scheduleSubtaskReminders(
    taskId: string,
    taskTitle: string,
    subtasks: Array<{ id: string; title: string; dueDate?: Date; dueTime?: Date }>
  ): Promise<string[]>;

  /**
   * Cancela lembrete de uma tarefa
   */
  cancelTaskReminder(taskId: string): Promise<void>;

  /**
   * Cancela lembretes de subtarefas
   */
  cancelSubtaskReminders(taskId: string): Promise<void>;

  /**
   * Reagenda lembrete de uma tarefa (após edição)
   */
  rescheduleTaskReminder(task: Task): Promise<string | null>;

  /**
   * Envia notificação de tarefa vencida
   */
  sendOverdueNotification(task: Task): Promise<string | null>;

  /**
   * Envia notificação imediata
   */
  sendImmediate(payload: NotificationPayload): Promise<string | null>;

  /**
   * Lista todas as notificações agendadas
   */
  getScheduled(): Promise<ScheduledNotification[]>;

  /**
   * Cancela todas as notificações
   */
  cancelAll(): Promise<void>;

  /**
   * Limpa notificações órfãs (tarefas que não existem mais)
   */
  cleanupOrphaned(activeTaskIds: string[]): Promise<number>;

  /**
   * Atualiza o badge do app
   */
  setBadgeCount(count: number): Promise<void>;

  /**
   * Obtém o token de push notification (para servidor)
   */
  getPushToken(): Promise<string | null>;

  /**
   * Listener para notificações recebidas
   */
  onNotificationReceived(
    callback: (payload: NotificationPayload) => void
  ): () => void;

  /**
   * Listener para ações de notificação (botões de ação)
   */
  onNotificationAction(
    callback: (actionId: string, taskId?: string) => void
  ): () => void;
}
