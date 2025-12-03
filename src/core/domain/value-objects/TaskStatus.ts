/**
 * Value Object: TaskStatus
 * Representa o status de uma tarefa
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Encapsula lógica de transição de status
 */

export type TaskStatus = 'pending' | 'completed' | 'cancelled';

export const TASK_STATUS = {
  PENDING: 'pending' as TaskStatus,
  COMPLETED: 'completed' as TaskStatus,
  CANCELLED: 'cancelled' as TaskStatus,
} as const;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendente',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: '#FFA500',
  completed: '#50C878',
  cancelled: '#FF6B6B',
};

/**
 * Verifica se é um status válido
 */
export function isValidTaskStatus(status: string): status is TaskStatus {
  return ['pending', 'completed', 'cancelled'].includes(status);
}

/**
 * Verifica se a transição de status é válida
 */
export function isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    pending: ['completed', 'cancelled'],
    completed: ['pending'], // Permite reverter
    cancelled: ['pending'], // Permite reabrir
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Obtém label do status
 */
export function getStatusLabel(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status] || status;
}

/**
 * Obtém cor do status
 */
export function getStatusColor(status: TaskStatus): string {
  return TASK_STATUS_COLORS[status] || '#808080';
}
