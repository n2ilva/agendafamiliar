import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, RepeatType, TaskStatus } from '../types/family.types';
import { RemoteTask } from '../services/tasks/firestore.service';
import { safeToDate } from '../utils/date/date.utils';
import LocalStorageService from '../services/storage/local-storage.service';
import { familyService } from '../services/family/local-family.service';
import SyncService from '../services/sync/sync.service';
import logger from '../utils/helpers/logger';
import { useAuth } from '../contexts/auth.context';

// Funções de conversão (extraídas para fora do componente para serem puras/reutilizáveis)
export const taskToRemoteTask = (task: Task, familyId: string | undefined): RemoteTask => {
  const remoteTask: any = {
    id: task.id,
    title: task.title,
    description: task.description || '',
    completed: task.completed,
    status: task.status,
    category: task.category,
    priority: 'media',
    createdAt: task.createdAt,
    updatedAt: task.editedAt || new Date(),
    dueDate: task.dueDate || null,
    dueTime: task.dueTime || null,
    repeatOption: task.repeatOption || 'nenhum',
    repeatDays: task.repeatDays || null,
    repeatIntervalDays: (task as any).repeatIntervalDays || null,
    repeatDurationMonths: (task as any).repeatDurationMonths || null,
    repeatStartDate: (task as any).repeatStartDate || (task as any).createdAt || task.dueDate || null,
    userId: task.userId,
    familyId: (task as any)?.private === true ? null : (familyId ?? null),
    createdBy: task.createdBy,
    createdByName: task.createdByName,
    private: (task as any).private === true,
  };

  if (Array.isArray(task.subtasks)) {
    remoteTask.subtasks = task.subtasks.map(st => ({
      id: st.id,
      title: st.title,
      done: !!st.done,
      completedById: st.completedById || null,
      completedByName: st.completedByName || null,
      completedAt: st.completedAt || null,
      dueDate: st.dueDate || null,
      dueTime: st.dueTime || null,
    }));
  }

  if (task.completed) remoteTask.completedAt = new Date();
  if (task.approvalId) remoteTask.approvalId = task.approvalId;
  if (task.editedBy) remoteTask.editedBy = task.editedBy;
  if (task.editedByName) remoteTask.editedByName = task.editedByName;
  if (task.editedAt) remoteTask.editedAt = task.editedAt;

  return remoteTask as RemoteTask;
};

export const remoteTaskToTask = (remoteTask: RemoteTask): Task => {
  const remote = remoteTask as any;
  const dueDate = safeToDate(remote.dueDate);
  const dueTime = safeToDate(remote.dueTime);

  const repeatOption = remote.repeatOption === 'diario' ? 'diario' :
    remote.repeatOption === 'semanal' ? 'semanal' :
    remote.repeatOption === 'mensal' ? 'mensal' :
    remote.repeatOption === 'intervalo' ? 'intervalo' : 'nenhum';
  
  const repeatDays = Array.isArray(remote.repeatDays) ? remote.repeatDays : [];

  return {
    id: remoteTask.id || '',
    title: remoteTask.title,
    description: remote.description || '',
    completed: remoteTask.completed || false,
    status: remote.status || 'pendente' as TaskStatus,
    category: remote.category || 'work',
    priority: remote.priority || 'media',
    familyId: remote.familyId ?? null,
    dueDate: dueDate,
    dueTime: dueTime,
    repeatOption: repeatOption,
    repeatDays: repeatDays,
    repeatIntervalDays: remote.repeatIntervalDays,
    repeatDurationMonths: remote.repeatDurationMonths,
    repeatStartDate: safeToDate(remote.repeatStartDate),
    repeat: {
      type: repeatOption === 'diario' ? RepeatType.DAILY : 
            repeatOption === 'mensal' ? RepeatType.MONTHLY : 
            repeatOption === 'semanal' ? RepeatType.CUSTOM : 
            repeatOption === 'intervalo' ? RepeatType.INTERVAL : RepeatType.NONE,
      days: repeatDays || [],
      intervalDays: remote.repeatIntervalDays,
      durationMonths: remote.repeatDurationMonths
    },
    userId: remoteTask.userId,
    approvalId: remote.approvalId,
    createdAt: safeToDate(remoteTask.createdAt) || new Date(),
    updatedAt: safeToDate(remoteTask.updatedAt) || safeToDate(remote.editedAt) || safeToDate(remoteTask.createdAt) || new Date(),
    completedAt: safeToDate(remote.completedAt) || undefined,
    subtasks: Array.isArray(remote.subtasks) ? remote.subtasks.map((st: any) => ({
      id: st.id,
      title: st.title,
      done: !!st.done,
      completedById: st.completedById || undefined,
      completedByName: st.completedByName || undefined,
      completedAt: safeToDate(st.completedAt) || undefined,
      dueDate: safeToDate(st.dueDate) || undefined,
      dueTime: safeToDate(st.dueTime) || undefined,
    })) : [],
    subtaskCategories: [], // Simplificado por enquanto
    createdBy: remote.createdBy || remoteTask.userId,
    createdByName: remote.createdByName || 'Usuário',
    editedBy: remote.editedBy,
    editedByName: remote.editedByName,
    editedAt: safeToDate(remote.editedAt),
    private: remote.private
  } as Task;
};

export function useTasks(user: any, currentFamily: any, isOffline: boolean) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendingSyncIds, setPendingSyncIds] = useState<string[]>([]);
  const { isAuthReady, isDataReady } = useAuth();
  
  // Carregar tarefas
  const loadTasks = useCallback(async () => {
    // Aguardar Firebase Auth e dados estarem prontos antes de carregar
    if (!user?.id || !isAuthReady || !isDataReady) {
      logger.debug('TASKS_LOAD', 'Aguardando autenticação e dados completos antes de carregar tarefas');
      return;
    }

    try {
      // 1. Cache Local (apenas tarefas pendentes)
      const cachedTasks = await LocalStorageService.getTasks();
      if (cachedTasks.length > 0) {
        // Filtrar: apenas tarefas não concluídas + privacidade
        const filtered = cachedTasks.filter(t => {
          // Excluir tarefas concluídas
          if (t.completed) return false;
          // Filtro de privacidade
          const isPrivate = (t as any).private === true;
          return !(isPrivate && t.createdBy && t.createdBy !== user.id);
        });
        setTasks(filtered);
      }

      // 2. Remoto (se online e com família)
      if (!isOffline && currentFamily?.id) {
        const familyTasks = await familyService.getFamilyTasks(currentFamily.id, user.id);
        const convertedTasks = familyTasks;
        
        // Filtrar: não incluir tarefas concluídas na UI (vêm do Firebase apenas para sync)
        const pendingTasks = convertedTasks.filter(t => !t.completed);
        
        // Merge logic simplificada (pode ser refinada depois)
        setTasks(prev => {
          // Remover tarefas concluídas do estado anterior também
          const pendingPrev = prev.filter(t => !t.completed);
          const merged = new Map(pendingPrev.map(t => [t.id, t]));
          pendingTasks.forEach(t => merged.set(t.id, t));
          return Array.from(merged.values());
        });

        // Atualizar cache apenas com tarefas NÃO concluídas
        for (const task of pendingTasks) {
          await LocalStorageService.saveTask(taskToRemoteTask(task, currentFamily.id) as any);
        }
      }
    } catch (error) {
      logger.error('TASKS_LOAD', 'Erro ao carregar tarefas', error);
    }
  }, [user?.id, currentFamily?.id, isOffline, isAuthReady, isDataReady]);

  // Recarregar quando dependências mudam
  useEffect(() => {
    if (isAuthReady && isDataReady) {
      loadTasks();
    }
  }, [loadTasks, isAuthReady, isDataReady]);

  return {
    tasks,
    setTasks,
    loadTasks,
    pendingSyncIds,
    setPendingSyncIds
  };
}
