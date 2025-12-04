/**
 * Hook para operações de tarefas usando Clean Architecture
 * 
 * Este hook expõe os Use Cases de forma simplificada para os componentes React.
 * Substitui gradualmente a lógica em use-task-actions.ts
 */

import { useCallback, useState } from 'react';
import { useService } from '../contexts/di.context';
import { TOKENS } from '../infrastructure/di/tokens';

// Use Cases
import { CreateTaskUseCase } from '../core/usecases/tasks/CreateTaskUseCase';
import { UpdateTaskUseCase } from '../core/usecases/tasks/UpdateTaskUseCase';
import { DeleteTaskUseCase } from '../core/usecases/tasks/DeleteTaskUseCase';
import { CompleteTaskUseCase } from '../core/usecases/tasks/CompleteTaskUseCase';
import { UncompleteTaskUseCase } from '../core/usecases/tasks/UncompleteTaskUseCase';
import { PostponeTaskUseCase } from '../core/usecases/tasks/PostponeTaskUseCase';
import { GetTasksUseCase } from '../core/usecases/tasks/GetTasksUseCase';

import { Task } from '../core/domain/entities/Task';
import { TaskFilters } from '../core/interfaces/repositories/ITaskRepository';

// Logger simplificado para Clean Architecture
const logger = {
  success: (tag: string, message: string) => console.log(`✅ [${tag}] ${message}`),
  error: (tag: string, message: string, err?: unknown) => console.error(`❌ [${tag}] ${message}`, err),
};

export interface UseCleanTasksReturn {
  // Estado
  isLoading: boolean;
  error: Error | null;
  
  // Operações
  createTask: (input: CreateTaskInput) => Promise<Task | null>;
  updateTask: (taskId: string, input: UpdateTaskInput, userId: string) => Promise<Task | null>;
  deleteTask: (taskId: string, userId: string) => Promise<boolean>;
  completeTask: (taskId: string, userId: string) => Promise<Task | null>;
  uncompleteTask: (taskId: string, userId: string) => Promise<Task | null>;
  postponeTask: (taskId: string, newDate: Date, userId: string) => Promise<Task | null>;
  getTasks: (filters?: TaskFilters) => Promise<Task[]>;
  
  // Helpers
  clearError: () => void;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  category: string;
  date: Date;
  time?: Date;
  priority?: 'low' | 'medium' | 'high';
  createdBy: string;
  familyId?: string;
  requiresApproval?: boolean;
  repeat?: any;
  subtasks?: any[];
  private?: boolean;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  category?: string;
  date?: Date;
  time?: Date;
  priority?: 'low' | 'medium' | 'high';
}

export function useCleanTasks(): UseCleanTasksReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Resolver Use Cases do DI Container
  const createTaskUseCase = useService<CreateTaskUseCase>(TOKENS.CreateTaskUseCase);
  const updateTaskUseCase = useService<UpdateTaskUseCase>(TOKENS.UpdateTaskUseCase);
  const deleteTaskUseCase = useService<DeleteTaskUseCase>(TOKENS.DeleteTaskUseCase);
  const completeTaskUseCase = useService<CompleteTaskUseCase>(TOKENS.CompleteTaskUseCase);
  const uncompleteTaskUseCase = useService<UncompleteTaskUseCase>(TOKENS.UncompleteTaskUseCase);
  const postponeTaskUseCase = useService<PostponeTaskUseCase>(TOKENS.PostponeTaskUseCase);
  const getTasksUseCase = useService<GetTasksUseCase>(TOKENS.GetTasksUseCase);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await createTaskUseCase.execute({
        ...input,
        priority: input.priority || 'medium',
      });

      if (result.isSuccess) {
        logger.success('CLEAN_TASKS', 'Tarefa criada com sucesso');
        return result.value.task;
      } else {
        throw new Error(result.error || 'Erro ao criar tarefa');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao criar tarefa');
      setError(error);
      logger.error('CLEAN_TASKS', 'Erro ao criar tarefa', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [createTaskUseCase]);

  const updateTask = useCallback(async (
    taskId: string,
    input: UpdateTaskInput,
    userId: string
  ): Promise<Task | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await updateTaskUseCase.execute({
        taskId,
        ...input,
        updatedBy: userId,
      });

      if (result.isSuccess) {
        logger.success('CLEAN_TASKS', 'Tarefa atualizada com sucesso');
        return result.value.task;
      } else {
        throw new Error(result.error || 'Erro ao atualizar tarefa');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao atualizar tarefa');
      setError(error);
      logger.error('CLEAN_TASKS', 'Erro ao atualizar tarefa', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [updateTaskUseCase]);

  const deleteTask = useCallback(async (taskId: string, userId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await deleteTaskUseCase.execute({ taskId, deletedBy: userId });

      if (result.isSuccess) {
        logger.success('CLEAN_TASKS', 'Tarefa excluída com sucesso');
        return true;
      } else {
        throw new Error(result.error || 'Erro ao excluir tarefa');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao excluir tarefa');
      setError(error);
      logger.error('CLEAN_TASKS', 'Erro ao excluir tarefa', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [deleteTaskUseCase]);

  const completeTask = useCallback(async (taskId: string, userId: string): Promise<Task | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await completeTaskUseCase.execute({ taskId, completedBy: userId });

      if (result.isSuccess) {
        logger.success('CLEAN_TASKS', 'Tarefa concluída com sucesso');
        return result.value.task;
      } else {
        throw new Error(result.error || 'Erro ao concluir tarefa');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao concluir tarefa');
      setError(error);
      logger.error('CLEAN_TASKS', 'Erro ao concluir tarefa', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [completeTaskUseCase]);

  const uncompleteTask = useCallback(async (taskId: string, userId: string): Promise<Task | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await uncompleteTaskUseCase.execute({ taskId, uncompletedBy: userId });

      if (result.isSuccess) {
        logger.success('CLEAN_TASKS', 'Tarefa reaberta com sucesso');
        return result.value.task;
      } else {
        throw new Error(result.error || 'Erro ao reabrir tarefa');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao reabrir tarefa');
      setError(error);
      logger.error('CLEAN_TASKS', 'Erro ao reabrir tarefa', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [uncompleteTaskUseCase]);

  const postponeTask = useCallback(async (
    taskId: string,
    newDate: Date,
    userId: string
  ): Promise<Task | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await postponeTaskUseCase.execute({ taskId, newDate, postponedBy: userId });

      if (result.isSuccess) {
        logger.success('CLEAN_TASKS', 'Tarefa adiada com sucesso');
        return result.value.task;
      } else {
        throw new Error(result.error || 'Erro ao adiar tarefa');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao adiar tarefa');
      setError(error);
      logger.error('CLEAN_TASKS', 'Erro ao adiar tarefa', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [postponeTaskUseCase]);

  const getTasks = useCallback(async (filters?: TaskFilters): Promise<Task[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getTasksUseCase.execute(filters || {});

      if (result.isSuccess) {
        return result.value.tasks;
      } else {
        throw new Error(result.error || 'Erro ao carregar tarefas');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao carregar tarefas');
      setError(error);
      logger.error('CLEAN_TASKS', 'Erro ao carregar tarefas', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getTasksUseCase]);

  return {
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    postponeTask,
    getTasks,
    clearError,
  };
}
