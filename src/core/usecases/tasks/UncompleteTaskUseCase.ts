/**
 * Use Case: Reverter Conclusão de Tarefa
 * Responsável por marcar uma tarefa completa como pendente novamente
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { Task } from '../../domain/entities/Task';
import { ITaskRepository } from '../../interfaces/repositories/ITaskRepository';
import { INotificationService } from '../../interfaces/services/INotificationService';
import { IHistoryRepository, HistoryItem } from '../../interfaces/repositories/IHistoryRepository';
import { TaskError } from '../../domain/errors/TaskError';

export interface UncompleteTaskRequest {
  taskId: string;
  uncompletedBy: string;
  uncompletedByName?: string;
  uncompletedByRole?: string;
}

export interface UncompleteTaskResponse {
  task: Task;
  notificationRescheduled: boolean;
  historyRecorded: boolean;
}

export class UncompleteTaskUseCase extends BaseUseCase<UncompleteTaskRequest, UncompleteTaskResponse> {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly notificationService: INotificationService,
    private readonly historyRepository: IHistoryRepository
  ) {
    super();
  }

  protected override validate(request: UncompleteTaskRequest): Result<void> {
    if (!request.taskId) {
      return Result.fail('ID da tarefa é obrigatório', 'VALIDATION_ERROR');
    }

    if (!request.uncompletedBy) {
      return Result.fail('ID do usuário é obrigatório', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(request: UncompleteTaskRequest): AsyncResult<UncompleteTaskResponse> {
    const validation = this.validate(request);
    if (validation.isFailure) {
      return Result.fail(validation.error!, validation.errorCode);
    }

    try {
      // Buscar tarefa existente
      const existingTask = await this.taskRepository.findById(request.taskId);
      if (!existingTask) {
        const error = TaskError.notFound(request.taskId);
        return Result.fail(error.message, error.code);
      }

      // Verificar se está completa
      if (!existingTask.isCompleted()) {
        const error = TaskError.notCompleted(request.taskId);
        return Result.fail(error.message, error.code);
      }

      // Reverter conclusão
      const uncompletedTask = existingTask.uncomplete();
      
      // Persistir
      await this.taskRepository.update(request.taskId, uncompletedTask.toObject());

      // Reagendar notificação se necessário
      let notificationRescheduled = false;
      if (!uncompletedTask.isOverdue()) {
        const notificationId = await this.notificationService.scheduleTaskReminder(uncompletedTask);
        notificationRescheduled = !!notificationId;
      }

      // Registrar no histórico
      let historyRecorded = false;
      try {
        const historyItem: HistoryItem = {
          id: `history_${Date.now()}`,
          action: 'task_uncompleted',
          timestamp: new Date(),
          userId: request.uncompletedBy,
          userName: request.uncompletedByName,
          userRole: request.uncompletedByRole,
          familyId: existingTask.familyId,
          taskId: existingTask.id,
          taskTitle: existingTask.title,
        };
        await this.historyRepository.add(historyItem);
        historyRecorded = true;
      } catch {
        console.warn('Falha ao registrar histórico de reversão');
      }

      return Result.ok({
        task: uncompletedTask,
        notificationRescheduled,
        historyRecorded,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao reverter conclusão da tarefa';
      return Result.fail(message, 'UNCOMPLETE_TASK_ERROR');
    }
  }
}
