/**
 * Use Case: Criar Tarefa
 * Responsável por criar uma nova tarefa
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Apenas cria tarefas
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { Task, TaskProps, Subtask } from '../../domain/entities/Task';
import { ITaskRepository } from '../../interfaces/repositories/ITaskRepository';
import { INotificationService } from '../../interfaces/services/INotificationService';
import { ValidationError } from '../../domain/errors/ValidationError';
import { Priority } from '../../domain/value-objects/Priority';
import { RepeatConfig } from '../../domain/value-objects/RepeatConfig';

export interface CreateTaskRequest {
  title: string;
  description?: string;
  category: string;
  categoryColor?: string;
  categoryIcon?: string;
  priority?: Priority;
  date: Date;
  time?: Date;
  createdBy: string;
  assignedTo?: string;
  familyId?: string;
  userId?: string;
  repeat?: RepeatConfig;
  subtasks?: Array<{ title: string; dueDate?: Date; dueTime?: Date }>;
  requiresApproval?: boolean;
}

export interface CreateTaskResponse {
  task: Task;
  notificationScheduled: boolean;
}

export class CreateTaskUseCase extends BaseUseCase<CreateTaskRequest, CreateTaskResponse> {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly notificationService: INotificationService
  ) {
    super();
  }

  protected override validate(request: CreateTaskRequest): Result<void> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!request.title || request.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Título é obrigatório' });
    } else if (request.title.trim().length > 100) {
      errors.push({ field: 'title', message: 'Título deve ter no máximo 100 caracteres' });
    }

    if (!request.category) {
      errors.push({ field: 'category', message: 'Categoria é obrigatória' });
    }

    if (!request.date) {
      errors.push({ field: 'date', message: 'Data é obrigatória' });
    }

    if (!request.createdBy) {
      errors.push({ field: 'createdBy', message: 'Criador é obrigatório' });
    }

    if (request.description && request.description.length > 500) {
      errors.push({ field: 'description', message: 'Descrição deve ter no máximo 500 caracteres' });
    }

    if (errors.length > 0) {
      const validationError = ValidationError.multiple(errors);
      return Result.fail(validationError.message, 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(request: CreateTaskRequest): AsyncResult<CreateTaskResponse> {
    // Validar entrada
    const validation = this.validate(request);
    if (validation.isFailure) {
      return Result.fail(validation.error!, validation.errorCode);
    }

    try {
      // Criar subtarefas se fornecidas
      const subtasks: Subtask[] = (request.subtasks || []).map((st, index) => ({
        id: `subtask_${Date.now()}_${index}`,
        title: st.title,
        completed: false,
        order: index,
        dueDate: st.dueDate,
        dueTime: st.dueTime,
      }));

      // Criar entidade Task
      const task = Task.create({
        title: request.title.trim(),
        description: request.description?.trim(),
        category: request.category,
        categoryColor: request.categoryColor,
        categoryIcon: request.categoryIcon,
        priority: request.priority || 'medium',
        date: request.date,
        time: request.time,
        createdBy: request.createdBy,
        assignedTo: request.assignedTo,
        familyId: request.familyId,
        userId: request.userId,
        repeat: request.repeat,
        subtasks,
        requiresApproval: request.requiresApproval,
      });

      // Persistir tarefa
      const savedTask = await this.taskRepository.save(task);

      // Agendar notificação se tiver horário
      let notificationScheduled = false;
      if (request.time) {
        const notificationId = await this.notificationService.scheduleTaskReminder(savedTask);
        notificationScheduled = !!notificationId;
      }

      // Agendar lembretes de subtarefas
      if (subtasks.length > 0) {
        const subtasksWithReminders = subtasks.filter(st => st.dueDate || st.dueTime);
        if (subtasksWithReminders.length > 0) {
          await this.notificationService.scheduleSubtaskReminders(
            savedTask.id,
            savedTask.title,
            subtasksWithReminders
          );
        }
      }

      return Result.ok({
        task: savedTask,
        notificationScheduled,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar tarefa';
      return Result.fail(message, 'CREATE_TASK_ERROR');
    }
  }
}
