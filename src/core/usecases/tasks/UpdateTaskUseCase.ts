/**
 * Use Case: Atualizar Tarefa
 * Responsável por atualizar uma tarefa existente
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { Task } from '../../domain/entities/Task';
import { ITaskRepository } from '../../interfaces/repositories/ITaskRepository';
import { INotificationService } from '../../interfaces/services/INotificationService';
import { TaskError } from '../../domain/errors/TaskError';
import { Priority } from '../../domain/value-objects/Priority';
import { RepeatConfig } from '../../domain/value-objects/RepeatConfig';

export interface UpdateTaskRequest {
  taskId: string;
  title?: string;
  description?: string;
  category?: string;
  categoryColor?: string;
  categoryIcon?: string;
  priority?: Priority;
  date?: Date;
  time?: Date;
  assignedTo?: string;
  repeat?: RepeatConfig;
  notes?: string;
  updatedBy: string;
}

export interface UpdateTaskResponse {
  task: Task;
  notificationRescheduled: boolean;
}

export class UpdateTaskUseCase extends BaseUseCase<UpdateTaskRequest, UpdateTaskResponse> {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly notificationService: INotificationService
  ) {
    super();
  }

  protected override validate(request: UpdateTaskRequest): Result<void> {
    if (!request.taskId) {
      return Result.fail('ID da tarefa é obrigatório', 'VALIDATION_ERROR');
    }

    if (request.title !== undefined && request.title.trim().length === 0) {
      return Result.fail('Título não pode ser vazio', 'VALIDATION_ERROR');
    }

    if (request.title && request.title.length > 100) {
      return Result.fail('Título deve ter no máximo 100 caracteres', 'VALIDATION_ERROR');
    }

    if (request.description && request.description.length > 500) {
      return Result.fail('Descrição deve ter no máximo 500 caracteres', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(request: UpdateTaskRequest): AsyncResult<UpdateTaskResponse> {
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

      // Verificar se pode editar
      if (!existingTask.canEdit()) {
        const error = TaskError.cannotEdit(request.taskId, 'Tarefa não pode ser editada');
        return Result.fail(error.message, error.code);
      }

      // Preparar dados de atualização
      const updateData: Partial<{
        title: string;
        description: string;
        category: string;
        categoryColor: string;
        categoryIcon: string;
        priority: Priority;
        date: Date;
        time: Date;
        assignedTo: string;
        repeat: RepeatConfig;
        notes: string;
      }> = {};

      if (request.title !== undefined) updateData.title = request.title.trim();
      if (request.description !== undefined) updateData.description = request.description.trim();
      if (request.category !== undefined) updateData.category = request.category;
      if (request.categoryColor !== undefined) updateData.categoryColor = request.categoryColor;
      if (request.categoryIcon !== undefined) updateData.categoryIcon = request.categoryIcon;
      if (request.priority !== undefined) updateData.priority = request.priority;
      if (request.date !== undefined) updateData.date = request.date;
      if (request.time !== undefined) updateData.time = request.time;
      if (request.assignedTo !== undefined) updateData.assignedTo = request.assignedTo;
      if (request.repeat !== undefined) updateData.repeat = request.repeat;
      if (request.notes !== undefined) updateData.notes = request.notes;

      // Atualizar tarefa
      const updatedTask = existingTask.update(updateData);
      await this.taskRepository.update(request.taskId, updatedTask.toObject());

      // Reagendar notificação se data/hora mudou
      let notificationRescheduled = false;
      if (request.date !== undefined || request.time !== undefined) {
        const notificationId = await this.notificationService.rescheduleTaskReminder(updatedTask);
        notificationRescheduled = !!notificationId;
      }

      return Result.ok({
        task: updatedTask,
        notificationRescheduled,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar tarefa';
      return Result.fail(message, 'UPDATE_TASK_ERROR');
    }
  }
}
