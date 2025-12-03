/**
 * Use Case: Completar Tarefa
 * Responsável por marcar uma tarefa como completa
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { Task } from '../../domain/entities/Task';
import { ITaskRepository } from '../../interfaces/repositories/ITaskRepository';
import { INotificationService } from '../../interfaces/services/INotificationService';
import { IHistoryRepository, HistoryItem } from '../../interfaces/repositories/IHistoryRepository';
import { TaskError } from '../../domain/errors/TaskError';

export interface CompleteTaskRequest {
  taskId: string;
  completedBy: string;
  completedByName?: string;
  completedByRole?: string;
}

export interface CompleteTaskResponse {
  task: Task;
  requiresApproval: boolean;
  historyRecorded: boolean;
}

export class CompleteTaskUseCase extends BaseUseCase<CompleteTaskRequest, CompleteTaskResponse> {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly notificationService: INotificationService,
    private readonly historyRepository: IHistoryRepository
  ) {
    super();
  }

  protected override validate(request: CompleteTaskRequest): Result<void> {
    if (!request.taskId) {
      return Result.fail('ID da tarefa é obrigatório', 'VALIDATION_ERROR');
    }

    if (!request.completedBy) {
      return Result.fail('ID do usuário é obrigatório', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(request: CompleteTaskRequest): AsyncResult<CompleteTaskResponse> {
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

      // Verificar se já está completa
      if (existingTask.isCompleted()) {
        const error = TaskError.alreadyCompleted(request.taskId);
        return Result.fail(error.message, error.code);
      }

      // Completar a tarefa
      const completedTask = existingTask.complete(request.completedBy);
      
      // Persistir
      await this.taskRepository.update(request.taskId, completedTask.toObject());

      // Cancelar notificação
      await this.notificationService.cancelTaskReminder(request.taskId);
      await this.notificationService.cancelSubtaskReminders(request.taskId);

      // Registrar no histórico
      let historyRecorded = false;
      try {
        const historyItem: HistoryItem = {
          id: `history_${Date.now()}`,
          action: 'task_completed',
          timestamp: new Date(),
          userId: request.completedBy,
          userName: request.completedByName,
          userRole: request.completedByRole,
          familyId: existingTask.familyId,
          taskId: existingTask.id,
          taskTitle: existingTask.title,
          details: {
            completedAt: completedTask.completedAt,
          },
        };
        await this.historyRepository.add(historyItem);
        historyRecorded = true;
      } catch {
        // Falha no histórico não deve bloquear a operação
        console.warn('Falha ao registrar histórico de conclusão');
      }

      return Result.ok({
        task: completedTask,
        requiresApproval: completedTask.requiresApproval,
        historyRecorded,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao completar tarefa';
      return Result.fail(message, 'COMPLETE_TASK_ERROR');
    }
  }
}
