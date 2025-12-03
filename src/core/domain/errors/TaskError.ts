/**
 * Erros de Tarefa
 * Erros relacionados a operações com tarefas
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { DomainError } from './DomainError';

export class TaskError extends DomainError {
  constructor(
    code: string,
    message: string,
    context?: Record<string, any>
  ) {
    super({
      code: `TASK_${code}`,
      message,
      severity: 'medium',
      context,
    });
  }

  /**
   * Tarefa não encontrada
   */
  static notFound(taskId: string): TaskError {
    return new TaskError(
      'NOT_FOUND',
      'Tarefa não encontrada',
      { taskId }
    );
  }

  /**
   * Tarefa já completa
   */
  static alreadyCompleted(taskId: string): TaskError {
    return new TaskError(
      'ALREADY_COMPLETED',
      'Esta tarefa já foi concluída',
      { taskId }
    );
  }

  /**
   * Tarefa não está completa
   */
  static notCompleted(taskId: string): TaskError {
    return new TaskError(
      'NOT_COMPLETED',
      'Esta tarefa não está concluída',
      { taskId }
    );
  }

  /**
   * Sem permissão para editar
   */
  static cannotEdit(taskId: string, reason?: string): TaskError {
    return new TaskError(
      'CANNOT_EDIT',
      reason || 'Você não tem permissão para editar esta tarefa',
      { taskId, reason }
    );
  }

  /**
   * Sem permissão para deletar
   */
  static cannotDelete(taskId: string, reason?: string): TaskError {
    return new TaskError(
      'CANNOT_DELETE',
      reason || 'Você não tem permissão para excluir esta tarefa',
      { taskId, reason }
    );
  }

  /**
   * Tarefa aguardando aprovação
   */
  static pendingApproval(taskId: string): TaskError {
    return new TaskError(
      'PENDING_APPROVAL',
      'Esta tarefa está aguardando aprovação',
      { taskId }
    );
  }

  /**
   * Não pode aprovar (não autorizado)
   */
  static cannotApprove(taskId: string): TaskError {
    return new TaskError(
      'CANNOT_APPROVE',
      'Você não tem permissão para aprovar esta tarefa',
      { taskId }
    );
  }

  /**
   * Não pode adiar
   */
  static cannotPostpone(taskId: string, reason?: string): TaskError {
    return new TaskError(
      'CANNOT_POSTPONE',
      reason || 'Esta tarefa não pode ser adiada',
      { taskId, reason }
    );
  }

  /**
   * Subtarefa não encontrada
   */
  static subtaskNotFound(taskId: string, subtaskId: string): TaskError {
    return new TaskError(
      'SUBTASK_NOT_FOUND',
      'Subtarefa não encontrada',
      { taskId, subtaskId }
    );
  }

  /**
   * Erro ao criar tarefa
   */
  static creationFailed(reason: string): TaskError {
    return new TaskError(
      'CREATION_FAILED',
      `Falha ao criar tarefa: ${reason}`,
      { reason }
    );
  }

  /**
   * Erro ao atualizar tarefa
   */
  static updateFailed(taskId: string, reason: string): TaskError {
    return new TaskError(
      'UPDATE_FAILED',
      `Falha ao atualizar tarefa: ${reason}`,
      { taskId, reason }
    );
  }

  /**
   * Erro ao deletar tarefa
   */
  static deletionFailed(taskId: string, reason: string): TaskError {
    return new TaskError(
      'DELETION_FAILED',
      `Falha ao excluir tarefa: ${reason}`,
      { taskId, reason }
    );
  }

  /**
   * Limite de tarefas atingido
   */
  static limitReached(limit: number): TaskError {
    return new TaskError(
      'LIMIT_REACHED',
      `Limite de ${limit} tarefas atingido`,
      { limit }
    );
  }

  /**
   * Erro de sincronização
   */
  static syncFailed(taskId: string, reason: string): TaskError {
    return new TaskError(
      'SYNC_FAILED',
      `Falha ao sincronizar tarefa: ${reason}`,
      { taskId, reason }
    );
  }
}
