/**
 * Use Case: Buscar Tarefas
 * Responsável por buscar tarefas com filtros
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { Task } from '../../domain/entities/Task';
import { ITaskRepository, TaskFilters } from '../../interfaces/repositories/ITaskRepository';
import { TaskStatus } from '../../domain/value-objects/TaskStatus';
import { DateRange } from '../../domain/value-objects/DateRange';

export interface GetTasksRequest {
  familyId?: string;
  userId?: string;
  status?: TaskStatus;
  category?: string;
  assignedTo?: string;
  dateRange?: DateRange;
  searchTerm?: string;
  todayOnly?: boolean;
  overdueOnly?: boolean;
  upcomingOnly?: boolean;
  limit?: number;
}

export interface GetTasksResponse {
  tasks: Task[];
  totalCount: number;
  overdueCount: number;
  todayCount: number;
  completedCount: number;
}

export class GetTasksUseCase extends BaseUseCase<GetTasksRequest, GetTasksResponse> {
  constructor(
    private readonly taskRepository: ITaskRepository
  ) {
    super();
  }

  async execute(request: GetTasksRequest): AsyncResult<GetTasksResponse> {
    try {
      let tasks: Task[] = [];

      // Buscar baseado nos filtros especiais
      if (request.todayOnly) {
        tasks = await this.taskRepository.findToday(request.familyId, request.userId);
      } else if (request.overdueOnly) {
        tasks = await this.taskRepository.findOverdue(request.familyId);
      } else if (request.upcomingOnly) {
        tasks = await this.taskRepository.findUpcoming(request.familyId, request.userId);
      } else {
        // Buscar com filtros genéricos
        const filters: TaskFilters = {
          familyId: request.familyId,
          userId: request.userId,
          status: request.status,
          category: request.category,
          assignedTo: request.assignedTo,
          dateRange: request.dateRange,
          searchTerm: request.searchTerm,
        };

        tasks = await this.taskRepository.findAll(filters);
      }

      // Aplicar filtros adicionais em memória se necessário
      if (request.searchTerm && !request.todayOnly && !request.overdueOnly) {
        const searchLower = request.searchTerm.toLowerCase();
        tasks = tasks.filter(task =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
        );
      }

      // Aplicar limite se especificado
      if (request.limit && tasks.length > request.limit) {
        tasks = tasks.slice(0, request.limit);
      }

      // Calcular contadores
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const allTasks = await this.taskRepository.findAll({
        familyId: request.familyId,
        userId: request.userId,
      });

      const overdueCount = allTasks.filter(t => t.isOverdue()).length;
      const todayCount = allTasks.filter(t => t.isToday()).length;
      const completedCount = allTasks.filter(t => t.isCompleted()).length;

      return Result.ok({
        tasks,
        totalCount: tasks.length,
        overdueCount,
        todayCount,
        completedCount,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao buscar tarefas';
      return Result.fail(message, 'GET_TASKS_ERROR');
    }
  }
}
