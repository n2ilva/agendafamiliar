/**
 * Use Case: Deletar Tarefa
 * Responsável por remover uma tarefa
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { ITaskRepository } from '../../interfaces/repositories/ITaskRepository';
import { INotificationService } from '../../interfaces/services/INotificationService';
import { TaskError } from '../../domain/errors/TaskError';

export interface DeleteTaskRequest {
  taskId: string;
  deletedBy: string;
  deleteRecurring?: boolean; // Se true, deleta todas as tarefas recorrentes do grupo
}

export interface DeleteTaskResponse {
  deletedCount: number;
  notificationsCancelled: boolean;
}

export class DeleteTaskUseCase extends BaseUseCase<DeleteTaskRequest, DeleteTaskResponse> {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly notificationService: INotificationService
  ) {
    super();
  }

  protected override validate(request: DeleteTaskRequest): Result<void> {
    if (!request.taskId) {
      return Result.fail('ID da tarefa é obrigatório', 'VALIDATION_ERROR');
    }

    if (!request.deletedBy) {
      return Result.fail('ID do usuário é obrigatório', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(request: DeleteTaskRequest): AsyncResult<DeleteTaskResponse> {
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

      let deletedCount = 0;

      // Se é recorrente e deve deletar todas
      if (request.deleteRecurring && existingTask.repeatGroupId) {
        // Buscar todas as tarefas do grupo
        const recurringTasks = await this.taskRepository.findAll({
          // Filtrar por repeatGroupId seria ideal, mas usamos familyId por simplicidade
          familyId: existingTask.familyId,
        });

        const tasksToDelete = recurringTasks.filter(
          t => t.repeatGroupId === existingTask.repeatGroupId
        );

        // Deletar todas e cancelar notificações
        for (const task of tasksToDelete) {
          await this.taskRepository.delete(task.id);
          await this.notificationService.cancelTaskReminder(task.id);
          await this.notificationService.cancelSubtaskReminders(task.id);
          deletedCount++;
        }
      } else {
        // Deletar apenas esta tarefa
        await this.taskRepository.delete(request.taskId);
        deletedCount = 1;
      }

      // Cancelar notificações
      await this.notificationService.cancelTaskReminder(request.taskId);
      await this.notificationService.cancelSubtaskReminders(request.taskId);

      return Result.ok({
        deletedCount,
        notificationsCancelled: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao deletar tarefa';
      return Result.fail(message, 'DELETE_TASK_ERROR');
    }
  }
}
