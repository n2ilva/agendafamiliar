/**
 * Context para gerenciamento de Tasks usando Use Cases
 * 
 * Princípios SOLID aplicados:
 * - Single Responsibility: Gerencia apenas estado e operações de tasks
 * - Dependency Inversion: Depende de abstrações (Use Cases)
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Task } from '../core/domain/entities/Task';
import { useService } from './di.context';
import { TOKENS } from '../infrastructure/di/tokens';
import { CreateTaskUseCase } from '../core/usecases/tasks/CreateTaskUseCase';
import { UpdateTaskUseCase } from '../core/usecases/tasks/UpdateTaskUseCase';
import { DeleteTaskUseCase } from '../core/usecases/tasks/DeleteTaskUseCase';
import { CompleteTaskUseCase } from '../core/usecases/tasks/CompleteTaskUseCase';
import { UncompleteTaskUseCase } from '../core/usecases/tasks/UncompleteTaskUseCase';
import { PostponeTaskUseCase } from '../core/usecases/tasks/PostponeTaskUseCase';
import { GetTasksUseCase } from '../core/usecases/tasks/GetTasksUseCase';
import { TaskFilters } from '../core/interfaces/repositories/ITaskRepository';

interface CreateTaskInput {
  title: string;
  description?: string;
  category: string;
  date: Date;
  time?: Date;
  priority: 'low' | 'medium' | 'high';
  createdBy: string;
  familyId?: string;
  requiresApproval?: boolean;
  repeat?: any;
  subtasks?: any[];
}

interface UpdateTaskInput {
  title?: string;
  description?: string;
  category?: string;
  date?: Date;
  time?: Date;
  priority?: 'low' | 'medium' | 'high';
}

interface TaskContextValue {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  
  // Operações
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (taskId: string, input: UpdateTaskInput, userId: string) => Promise<Task>;
  deleteTask: (taskId: string, userId: string) => Promise<void>;
  completeTask: (taskId: string, userId: string) => Promise<Task>;
  uncompleteTask: (taskId: string, userId: string) => Promise<Task>;
  postponeTask: (taskId: string, newDate: Date, userId: string) => Promise<Task>;
  
  // Consultas
  refreshTasks: (filters?: TaskFilters) => Promise<void>;
  getTaskById: (taskId: string) => Task | undefined;
}

const TaskContext = createContext<TaskContextValue | null>(null);

interface TaskProviderProps {
  children: ReactNode;
  initialFamilyId?: string;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children, initialFamilyId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
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

  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await createTaskUseCase.execute(input);

      if (result.isSuccess) {
        const newTask = result.value.task;
        setTasks(prev => [...prev, newTask]);
        return newTask;
      } else {
        throw new Error(result.error || 'Erro ao criar tarefa');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao criar tarefa');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [createTaskUseCase]);

  const updateTask = useCallback(async (
    taskId: string,
    input: UpdateTaskInput,
    userId: string
  ): Promise<Task> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await updateTaskUseCase.execute({ 
        taskId, 
        ...input, 
        updatedBy: userId 
      });

      if (result.isSuccess) {
        const updatedTask = result.value.task;
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        return updatedTask;
      } else {
        throw new Error(result.error || 'Erro ao atualizar tarefa');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao atualizar tarefa');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateTaskUseCase]);

  const deleteTask = useCallback(async (taskId: string, userId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await deleteTaskUseCase.execute({ taskId, deletedBy: userId });

      if (result.isSuccess) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        throw new Error(result.error || 'Erro ao deletar tarefa');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao deletar tarefa');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [deleteTaskUseCase]);

  const completeTask = useCallback(async (taskId: string, userId: string): Promise<Task> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await completeTaskUseCase.execute({ taskId, completedBy: userId });

      if (result.isSuccess) {
        const completedTask = result.value.task;
        setTasks(prev => prev.map(t => t.id === taskId ? completedTask : t));
        return completedTask;
      } else {
        throw new Error(result.error || 'Erro ao completar tarefa');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao completar tarefa');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [completeTaskUseCase]);

  const uncompleteTask = useCallback(async (taskId: string, userId: string): Promise<Task> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await uncompleteTaskUseCase.execute({ taskId, uncompletedBy: userId });

      if (result.isSuccess) {
        const uncompletedTask = result.value.task;
        setTasks(prev => prev.map(t => t.id === taskId ? uncompletedTask : t));
        return uncompletedTask;
      } else {
        throw new Error(result.error || 'Erro ao descompletar tarefa');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao descompletar tarefa');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [uncompleteTaskUseCase]);

  const postponeTask = useCallback(async (
    taskId: string,
    newDate: Date,
    userId: string
  ): Promise<Task> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await postponeTaskUseCase.execute({ taskId, newDate, postponedBy: userId });

      if (result.isSuccess) {
        const postponedTask = result.value.task;
        setTasks(prev => prev.map(t => t.id === taskId ? postponedTask : t));
        return postponedTask;
      } else {
        throw new Error(result.error || 'Erro ao adiar tarefa');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao adiar tarefa');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [postponeTaskUseCase]);

  const refreshTasks = useCallback(async (filters?: TaskFilters): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getTasksUseCase.execute(filters || {});

      if (result.isSuccess) {
        setTasks(result.value.tasks);
      } else {
        throw new Error(result.error || 'Erro ao carregar tarefas');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao carregar tarefas');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [getTasksUseCase]);

  const getTaskById = useCallback((taskId: string): Task | undefined => {
    return tasks.find(t => t.id === taskId);
  }, [tasks]);

  // Carregar tarefas inicialmente
  useEffect(() => {
    const filters: TaskFilters = initialFamilyId ? { familyId: initialFamilyId } : {};
    refreshTasks(filters);
  }, [initialFamilyId, refreshTasks]);

  const value: TaskContextValue = {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    postponeTask,
    refreshTasks,
    getTaskById,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

/**
 * Hook para acessar o contexto de Tasks
 */
export function useTaskContext(): TaskContextValue {
  const context = useContext(TaskContext);
  
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }

  return context;
}
