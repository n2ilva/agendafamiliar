/**
 * Value Object: Priority
 * Representa a prioridade de uma tarefa
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Encapsula lógica de prioridade
 */

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export const PRIORITY = {
  LOW: 'low' as Priority,
  MEDIUM: 'medium' as Priority,
  HIGH: 'high' as Priority,
  URGENT: 'urgent' as Priority,
} as const;

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#808080',
  medium: '#4A90D9',
  high: '#FFA500',
  urgent: '#FF6B6B',
};

export const PRIORITY_ICONS: Record<Priority, string> = {
  low: 'arrow-down',
  medium: 'minus',
  high: 'arrow-up',
  urgent: 'alert-triangle',
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Verifica se é uma prioridade válida
 */
export function isValidPriority(priority: string): priority is Priority {
  return ['low', 'medium', 'high', 'urgent'].includes(priority);
}

/**
 * Obtém label da prioridade
 */
export function getPriorityLabel(priority: Priority): string {
  return PRIORITY_LABELS[priority] || priority;
}

/**
 * Obtém cor da prioridade
 */
export function getPriorityColor(priority: Priority): string {
  return PRIORITY_COLORS[priority] || '#808080';
}

/**
 * Obtém ícone da prioridade
 */
export function getPriorityIcon(priority: Priority): string {
  return PRIORITY_ICONS[priority] || 'minus';
}

/**
 * Compara duas prioridades (para ordenação)
 */
export function comparePriority(a: Priority, b: Priority): number {
  return PRIORITY_ORDER[a] - PRIORITY_ORDER[b];
}

/**
 * Obtém todas as prioridades ordenadas
 */
export function getAllPriorities(): Priority[] {
  return ['urgent', 'high', 'medium', 'low'];
}
