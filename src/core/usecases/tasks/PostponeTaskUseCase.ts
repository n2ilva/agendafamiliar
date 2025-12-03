/**
 * Use Case: Adiar Tarefa
 * Responsável por adiar uma tarefa para nova data
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { Task } from '../../domain/entities/Task';
import { ITaskRepository } from '../../interfaces/repositories/ITaskRepository';
import { INotificationService } from '../../interfaces/services/INotificationService';
import { IHistoryRepository, HistoryItem } from '../../interfaces/repositories/IHistoryRepository';
import { TaskError } from '../../domain/errors/TaskError';

export interface PostponeTaskRequest {
  taskId: string;
  newDate: Date;
  newTime?: Date;
  postponedBy: string;
  postponedByName?: string;
  reason?: string;
}

export interface PostponeTaskResponse {
  task: Task;
  previousDate: Date;
  postponeCount: number;
  notificationRescheduled: boolean;
}

export class PostponeTaskUseCase extends BaseUseCase<PostponeTaskRequest, PostponeTaskResponse> {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly notificationService: INotificationService,
    private readonly historyRepository: IHistoryRepository
  ) {
    super();
  }

  protected override validate(request: PostponeTaskRequest): Result<void> {
    if (!request.taskId) {
      return Result.fail('ID da tarefa é obrigatório', 'VALIDATION_ERROR');
    }

    if (!request.newDate) {
      return Result.fail('Nova data é obrigatória', 'VALIDATION_ERROR');
    }

    if (!request.postponedBy) {
      return Result.fail('ID do usuário é obrigatório', 'VALIDATION_ERROR');
    }

    // Verificar se nova data não é no passado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newDate = new Date(request.newDate);
    newDate.setHours(0, 0, 0, 0);
    
    if (newDate < today) {
      return Result.fail('Nova data não pode ser no passado', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(request: PostponeTaskRequest): AsyncResult<PostponeTaskResponse> {
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

      // Verificar se pode adiar
      if (!existingTask.canPostpone()) {
        const error = TaskError.cannotPostpone(request.taskId);
        return Result.fail(error.message, error.code);
      }

      const previousDate = existingTask.date;

      // Adiar tarefa
      let postponedTask = existingTask.postpone(request.newDate, request.postponedBy);
      
      // Atualizar horário se fornecido
      if (request.newTime) {
        postponedTask = postponedTask.update({ time: request.newTime });
      }

      // Persistir
      await this.taskRepository.update(request.taskId, postponedTask.toObject());

      // Reagendar notificação
      let notificationRescheduled = false;
      await this.notificationService.cancelTaskReminder(request.taskId);
      if (request.newTime || existingTask.time) {
        const notificationId = await this.notificationService.scheduleTaskReminder(postponedTask);
        notificationRescheduled = !!notificationId;
      }

      // Registrar no histórico
      try {
        const historyItem: HistoryItem = {
          id: `history_${Date.now()}`,
          action: 'task_postponed',
          timestamp: new Date(),
          userId: request.postponedBy,
          userName: request.postponedByName,
          familyId: existingTask.familyId,
          taskId: existingTask.id,
          taskTitle: existingTask.title,
          details: {
            previousDate,
            newDate: request.newDate,
            reason: request.reason,
            postponeCount: postponedTask.postponeCount,
          },
        };
        await this.historyRepository.add(historyItem);
      } catch {
        console.warn('Falha ao registrar histórico de adiamento');
      }

      return Result.ok({
        task: postponedTask,
        previousDate,
        postponeCount: postponedTask.postponeCount,
        notificationRescheduled,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao adiar tarefa';
      return Result.fail(message, 'POSTPONE_TASK_ERROR');
    }
  }
}
