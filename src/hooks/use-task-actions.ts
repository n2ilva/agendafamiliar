import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import * as Clipboard from 'expo-clipboard';
import {
    Task, TaskStatus, RepeatType, TaskApproval, ApprovalNotification,
    RepeatConfig, CategoryConfig, UserRole
} from '../types/family.types';
import { taskToRemoteTask } from './use-tasks';
import LocalStorageService from '../services/storage/local-storage.service';
import FirestoreService from '../services/tasks/firestore.service';
import SyncService from '../services/sync/sync.service';
import NotificationService from '../services/notifications/notification.service';
import FamilySyncHelper from '../services/family/family-sync.helper';
import familyService from '../services/family/local-family.service';
import logger from '../utils/helpers/logger';
import {
    getRepeat,
    calculateMainTaskTimeFromSubtasks,
    calculateMainTaskTimeFromPendingSubtasks
} from '../utils/validators/task.utils';
import {
    safeToDate,
    isUpcoming,
    isTaskOverdue,
    getNextRecurrenceDate,
    isRecurringTaskCompletable,
    formatDate,
    formatTime
} from '../utils/date/date.utils';

interface UseTaskActionsParams {
    user: any;
    currentFamily: any;
    isOffline: boolean;
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    pendingSyncIds: string[];
    setPendingSyncIds: React.Dispatch<React.SetStateAction<string[]>>;
    approvals: TaskApproval[];
    setApprovals: React.Dispatch<React.SetStateAction<TaskApproval[]>>;
    notifications: ApprovalNotification[];
    setNotifications: React.Dispatch<React.SetStateAction<ApprovalNotification[]>>;
    addToHistory: (action: any, title: string, id: string, details?: string) => Promise<void>;
    setLastAction: (action: any) => void;
    setShowUndoButton: (show: boolean) => void;
    undoTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
    overdueNotificationTrackRef: React.MutableRefObject<Record<string, number>>;
    forceRefresh: () => Promise<void>;
    setIsSyncing: (isSyncing: boolean) => void;
    setSyncMessage: (message: string) => void;
}

export function useTaskActions({
    user,
    currentFamily,
    isOffline,
    tasks,
    setTasks,
    pendingSyncIds,
    setPendingSyncIds,
    approvals,
    setApprovals,
    notifications,
    setNotifications,
    addToHistory,
    setLastAction,
    setShowUndoButton,
    undoTimeoutRef,
    overdueNotificationTrackRef,
    forceRefresh,
    setIsSyncing,
    setSyncMessage
}: UseTaskActionsParams) {

    const ensureFamilyPermission = useCallback(async (action: 'create' | 'edit' | 'delete'): Promise<boolean> => {
        if (!currentFamily) return true; // Se não tem família, tem permissão total
        if (user.role === 'admin') return true; // Admin tem permissão total

        // Verificar permissões específicas do dependente
        // Por enquanto, assumimos que dependente pode criar/editar se tiver permissão explícita
        // Mas a lógica atual do app parece permitir dependentes criarem tarefas públicas
        // Vamos manter a lógica simples por enquanto:
        return true;
        // TODO: Implementar verificação real de permissões se necessário
    }, [currentFamily, user.role]);

    const saveTask = useCallback(async (
        taskData: Partial<Task>,
        isEditing: boolean,
        editingTaskId: string | null,
        subtasksDraft: any[],
        subtaskCategories: any[],
        newTaskPrivate: boolean
    ) => {
        try {
            if (isEditing && editingTaskId) {
                // Atualizar tarefa existente
                const originalTask = tasks.find(t => t.id === editingTaskId);
                const previousTaskState = originalTask ? { ...originalTask } : null;

                const updatedTasks = tasks.map(task =>
                    task.id === editingTaskId
                        ? {
                            ...task,
                            ...taskData,
                            subtasks: subtasksDraft.map(st => ({ ...st })),
                            subtaskCategories: subtaskCategories.map(cat => ({ ...cat })),
                            editedBy: user.id,
                            editedByName: user.name,
                            editedAt: new Date(),
                            private: newTaskPrivate
                        } as Task
                        : task
                );

                const updatedTask = updatedTasks.find(t => t.id === editingTaskId);
                if (!updatedTask) return;

                setTasks(updatedTasks);
                setPendingSyncIds(prev => [...prev, editingTaskId]);

                // Salvar no cache local
                const remoteTask = taskToRemoteTask(updatedTask as any, currentFamily?.id);
                await LocalStorageService.saveTask(remoteTask as any);

                // Reagendar notificações
                try {
                    await NotificationService.rescheduleTaskReminder(updatedTask as any);
                    await NotificationService.cancelAllSubtaskReminders(updatedTask.id);
                    if (Array.isArray(updatedTask.subtasks) && updatedTask.subtasks.length > 0) {
                        await NotificationService.scheduleSubtaskReminders(
                            updatedTask.id,
                            updatedTask.title,
                            updatedTask.subtasks
                        );
                    }
                } catch (e) {
                    logger.warn('NOTIFY', 'Falha ao reagendar notificações', e);
                }

                const isTemporaryId = updatedTask.id.startsWith('temp_') || updatedTask.id === 'temp';
                const operationType = isTemporaryId ? 'create' : 'update';

                await SyncService.addOfflineOperation(operationType, 'tasks', remoteTask as any);

                if (currentFamily && (remoteTask as any)?.private !== true) {
                    try {
                        if (!isOffline) {
                            const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
                            const res = await FirestoreService.saveTask(toSave);
                            await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
                        } else {
                            await SyncService.addOfflineOperation(operationType, 'tasks', {
                                ...remoteTask,
                                familyId: currentFamily.id
                            });
                        }
                    } catch (error) {
                        logger.error('SAVE_FAMILY_TASK', 'Erro ao sincronizar tarefa na família', error);
                        try {
                            await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, operationType);
                        } catch (e) {
                            logger.warn('FAMILY_SYNC_FALLBACK', 'saveTaskToFamily falhou');
                        }
                    }
                }

                // Histórico e Undo
                await addToHistory('edited', updatedTask.title, editingTaskId);

                if (previousTaskState && updatedTask) {
                    setLastAction({
                        type: 'edit',
                        task: updatedTask,
                        previousState: previousTaskState,
                        timestamp: Date.now()
                    });
                    setShowUndoButton(true);
                    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
                    undoTimeoutRef.current = setTimeout(() => {
                        setShowUndoButton(false);
                        setLastAction(null);
                    }, 10000);
                }

            } else {
                // Criar nova tarefa
                const newTask: Task = {
                    ...taskData,
                    id: uuidv4(),
                    completed: false,
                    status: 'pendente' as TaskStatus,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    createdBy: user.id,
                    createdByName: user.name,
                    subtasks: subtasksDraft.map(st => ({ ...st })),
                    subtaskCategories: subtaskCategories.map(cat => ({ ...cat })),
                } as Task;

                if (currentFamily) {
                    if (newTaskPrivate) {
                        (newTask as any).private = true;
                        (newTask as any).familyId = undefined;
                    } else {
                        (newTask as any).familyId = currentFamily.id;
                        (newTask as any).private = false;
                    }
                }

                const updatedTasks = [newTask, ...tasks];
                setPendingSyncIds(prev => [...prev, newTask.id]);
                setTasks(updatedTasks);

                // Notificações
                try {
                    await NotificationService.scheduleTaskReminder(newTask as any);
                    if (Array.isArray(subtasksDraft) && subtasksDraft.length > 0) {
                        await NotificationService.scheduleSubtaskReminders(newTask.id, newTask.title, subtasksDraft);
                    }
                } catch (e) {
                    logger.warn('NOTIFY', 'Falha ao agendar notificações', e);
                }

                // Salvar
                const remoteTask = taskToRemoteTask({ ...newTask, private: newTaskPrivate } as any, currentFamily?.id);
                await LocalStorageService.saveTask(remoteTask as any);
                await SyncService.addOfflineOperation('create', 'tasks', remoteTask);

                if (currentFamily && (remoteTask as any)?.private !== true) {
                    try {
                        if (!isOffline) {
                            const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
                            const res = await FirestoreService.saveTask(toSave);
                            await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
                            setPendingSyncIds(prev => prev.filter(id => id !== newTask.id));
                        } else {
                            await SyncService.addOfflineOperation('create', 'tasks', { ...remoteTask, familyId: currentFamily.id });
                            setTimeout(() => {
                                setPendingSyncIds(prev => prev.filter(id => id !== newTask.id));
                            }, 1000);
                        }
                    } catch (error) {
                        logger.error('SAVE_FAMILY_TASK', 'Erro ao salvar tarefa na família', error);
                        try { await FamilySyncHelper.saveTaskToFamily(remoteTask, currentFamily.id, 'create'); } catch (e) { }
                        await SyncService.addOfflineOperation('create', 'tasks', { ...remoteTask, familyId: currentFamily.id });
                        setTimeout(() => {
                            setPendingSyncIds(prev => prev.filter(id => id !== newTask.id));
                        }, 2000);
                    }
                } else {
                    setTimeout(() => {
                        setPendingSyncIds(prev => prev.filter(id => id !== newTask.id));
                    }, 1000);
                }

                await addToHistory('created', newTask.title, newTask.id);
            }

            // Force refresh logic moved to component or handled here?
            // Component handles UI refresh (setIsSyncing, forceRefresh)
            setIsSyncing(true);
            await new Promise(resolve => setTimeout(resolve, 300));
            await forceRefresh();
            setIsSyncing(false);
            setSyncMessage('');

        } catch (error) {
            logger.error('SAVE_TASK', 'Erro ao salvar tarefa', error);
            Alert.alert('Erro', 'Não foi possível salvar a tarefa. Tente novamente.');
            setIsSyncing(false);
            setSyncMessage('');
        }
    }, [tasks, user, currentFamily, isOffline, addToHistory, forceRefresh, setIsSyncing, setSyncMessage, setTasks, setPendingSyncIds, setLastAction, setShowUndoButton]);

    const deleteTask = useCallback(async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const isFamilyTask = (task as any).familyId && (task as any).private !== true;
        if (user.role === 'dependente' && isFamilyTask) {
            const ok = await ensureFamilyPermission('delete');
            if (!ok) {
                Alert.alert('Sem permissão', 'Você não tem permissão para excluir tarefas da família.');
                return;
            }
        }

        Alert.alert(
            'Excluir Tarefa',
            'Tem certeza que deseja excluir esta tarefa?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    onPress: async () => {
                        try {
                            const taskToDelete = { ...task };
                            const deletedTask = {
                                ...task,
                                deleted: true,
                                status: 'excluida' as const,
                                deletedBy: user.id,
                                deletedByName: user.name,
                                deletedAt: new Date()
                            };
                            
                            setTasks(prev => prev.filter(t => t.id !== taskId));

                            await NotificationService.cancelTaskReminder(taskId).catch(() => { });
                            try {
                                await NotificationService.cancelAllSubtaskReminders(taskId);
                            } catch (e) { }

                            const remoteTask = taskToRemoteTask(deletedTask as any, currentFamily?.id);
                            await LocalStorageService.saveTask(remoteTask as any);
                            await SyncService.addOfflineOperation('update', 'tasks', remoteTask);

                            if (currentFamily && !isOffline) {
                                if (isFamilyTask) {
                                    try {
                                        await FirestoreService.saveTask({ ...remoteTask, familyId: currentFamily.id } as any);
                                    } catch (e) {
                                        try { await FamilySyncHelper.saveTaskToFamily(remoteTask, currentFamily.id, 'update'); } catch (_) { }
                                        await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
                                    }
                                }
                            }

                            await addToHistory('deleted', task.title, taskId);

                            setLastAction({
                                type: 'delete',
                                task: taskToDelete,
                                previousState: taskToDelete,
                                timestamp: Date.now()
                            });
                            setShowUndoButton(true);
                            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
                            undoTimeoutRef.current = setTimeout(() => {
                                setShowUndoButton(false);
                                setLastAction(null);
                            }, 10000);

                        } catch (error) {
                            logger.error('DELETE_TASK', 'Erro ao excluir tarefa', error);
                            setTasks(prev => [...prev, task]); // Reverter
                            Alert.alert('Erro', 'Não foi possível excluir a tarefa.');
                        }
                    },
                    style: 'destructive'
                }
            ]
        );
    }, [tasks, user, currentFamily, isOffline, ensureFamilyPermission, addToHistory, setTasks, setLastAction, setShowUndoButton]);

    const requestTaskApproval = useCallback(async (task: Task) => {
        const approval: TaskApproval = {
            id: Date.now().toString(),
            taskId: task.id,
            dependenteId: user.id,
            dependenteName: user.name,
            status: 'pendente',
            requestedAt: new Date(),
            ...(currentFamily?.id ? { familyId: currentFamily.id } as any : (user.familyId ? { familyId: user.familyId } as any : {})),
        };

        setApprovals(prev => [...prev, approval]);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'pendente_aprovacao', approvalId: approval.id } : t));

        try {
            const updated = { ...task, status: 'pendente_aprovacao' as TaskStatus, approvalId: approval.id };
            const remoteTask = taskToRemoteTask(updated as any, currentFamily?.id);
            await LocalStorageService.saveTask(remoteTask as any);
            await SyncService.addOfflineOperation('update', 'tasks', remoteTask);

            if (currentFamily && !isOffline) {
                try {
                    const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
                    const res = await FirestoreService.saveTask(toSave);
                    await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
                } catch (e) {
                    try { await FamilySyncHelper.saveTaskToFamily(remoteTask, currentFamily.id, 'update'); } catch (_) { }
                    await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
                }
            }

            await LocalStorageService.saveApproval(approval as any);
            let familyIdToSend = approval.familyId;
            if (!familyIdToSend) {
                try {
                    const fam = await familyService.getUserFamily(user.id);
                    familyIdToSend = fam?.id;
                } catch { }
            }
            await SyncService.addOfflineOperation('create', 'approvals', {
                ...approval,
                ...(familyIdToSend ? { familyId: familyIdToSend } : {}),
            });

        } catch (err) {
            logger.error('APPROVAL', 'Erro ao persistir status pendente_aprovacao', err);
        }

        Alert.alert('Solicitação Enviada', 'Sua solicitação para completar a tarefa foi enviada para aprovação dos administradores.', [{ text: 'OK' }]);
        await addToHistory('approval_requested', task.title, task.id);
    }, [user, currentFamily, isOffline, addToHistory, setTasks, setApprovals]);

    const handleTaskToggle = useCallback(async (task: Task) => {
        if (user.role === 'dependente') {
            if (!task.completed) {
                await requestTaskApproval(task);
            } else {
                Alert.alert('Permissão necessária', 'Somente administradores podem reabrir tarefas.');
            }
            return;
        }

        setLastAction({
            type: 'toggle',
            task: { ...task },
            previousState: { ...task },
            timestamp: Date.now()
        });
        setShowUndoButton(true);
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = setTimeout(() => {
            setShowUndoButton(false);
            setLastAction(null);
        }, 10000);

        let updatedTasks: Task[];

        if (!task.completed) {
            // Marcando como concluída
            const repeatConfig = getRepeat(task);
            if (repeatConfig.type !== RepeatType.NONE) {
                // Lógica de recorrência
                if (repeatConfig.durationMonths && (task as any).repeatStartDate) {
                    const start = safeToDate((task as any).repeatStartDate) || new Date();
                    const end = new Date(start);
                    end.setMonth(end.getMonth() + (repeatConfig.durationMonths || 0));
                    const current = safeToDate(task.dueDate) || new Date();
                    if (current >= end) {
                        const updated = tasks.map(t => t.id === task.id ? { ...t, completed: true, status: 'concluida' as TaskStatus } : t);
                        setTasks(updated);
                        await LocalStorageService.deleteTaskFromCache(task.id);
                        return;
                    }
                }

                let nextDate: Date;
                if (repeatConfig.type === RepeatType.INTERVAL) {
                    const step = Math.max(1, repeatConfig.intervalDays || (task as any).repeatIntervalDays || 1);
                    const startDate = (task as any).repeatStartDate ? safeToDate((task as any).repeatStartDate) : task.dueDate;
                    const base = startDate || new Date();
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    nextDate = new Date(base);
                    nextDate.setHours(0, 0, 0, 0);
                    if (nextDate < hoje) {
                        const diffTime = hoje.getTime() - nextDate.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const cyclesPassed = Math.ceil(diffDays / step);
                        nextDate.setDate(base.getDate() + (cyclesPassed * step));
                    } else {
                        nextDate.setDate(nextDate.getDate() + step);
                    }
                } else {
                    nextDate = getNextRecurrenceDate(task.dueDate || new Date(), repeatConfig.type, repeatConfig.days);
                }

                let nextDateTime: Date | undefined = undefined;
                if (task.dueTime) {
                    const originalTime = safeToDate(task.dueTime);
                    if (originalTime) {
                        nextDateTime = new Date(nextDate);
                        nextDateTime.setHours(originalTime.getHours(), originalTime.getMinutes(), originalTime.getSeconds(), originalTime.getMilliseconds());
                    }
                }

                const resetSubtasks = Array.isArray((task as any).subtasks)
                    ? (task as any).subtasks.map((st: any) => ({ ...st, done: false, completedById: undefined, completedByName: undefined, completedAt: undefined }))
                    : undefined;

                const nextTask: Task = {
                    ...task,
                    id: uuidv4(),
                    completed: false,
                    completedAt: undefined,
                    status: 'pendente',
                    dueDate: nextDate,
                    dueTime: nextDateTime,
                    subtasks: resetSubtasks,
                    createdAt: new Date(),
                    createdBy: user.id,
                    createdByName: user.name,
                    editedBy: user.id,
                    editedByName: user.name,
                    editedAt: new Date()
                } as any;

                updatedTasks = tasks.map(t =>
                    t.id === task.id ? {
                        ...t,
                        completed: true,
                        status: 'concluida' as TaskStatus,
                        editedBy: user.id,
                        editedByName: user.name,
                        editedAt: new Date()
                    } : t
                );
                updatedTasks.push(nextTask);
                setTasks(updatedTasks);

                try { await NotificationService.cancelTaskReminder(task.id); } catch (e) { }
                await LocalStorageService.deleteTaskFromCache(task.id);

                try {
                    const remoteNextTask = taskToRemoteTask(nextTask as any, currentFamily?.id);
                    await LocalStorageService.saveTask(remoteNextTask as any);
                    await SyncService.addOfflineOperation('create', 'tasks', remoteNextTask);

                    if (currentFamily && !isOffline) {
                        try {
                            const toSave = { ...remoteNextTask, familyId: currentFamily.id } as any;
                            const res = await FirestoreService.saveTask(toSave);
                            await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
                        } catch (e) {
                            try { await FamilySyncHelper.saveTaskToFamily(remoteNextTask as any, currentFamily.id, 'create'); } catch (_) { }
                            await SyncService.addOfflineOperation('create', 'tasks', { ...remoteNextTask, familyId: currentFamily.id });
                        }
                    } else if (currentFamily) {
                        await SyncService.addOfflineOperation('create', 'tasks', { ...remoteNextTask, familyId: currentFamily.id });
                    }
                    try { await NotificationService.scheduleTaskReminder(nextTask as any); } catch (e) { }
                } catch (error) {
                    logger.error('REPEAT', 'Erro ao sincronizar nova tarefa recorrente', error);
                    Alert.alert('Aviso', 'Problema na sincronização da tarefa recorrente.');
                }

            } else {
                // Tarefa normal
                updatedTasks = tasks.map(t =>
                    t.id === task.id ? {
                        ...t,
                        completed: true,
                        status: 'concluida' as TaskStatus,
                        editedBy: user.id,
                        editedByName: user.name,
                        editedAt: new Date()
                    } : t
                );
                setTasks(updatedTasks);
                try { await NotificationService.cancelTaskReminder(task.id); } catch (e) { }
                await LocalStorageService.deleteTaskFromCache(task.id);
            }
        } else {
            // Reabrindo tarefa
            const repeatConfig = getRepeat(task);
            if (repeatConfig.type === RepeatType.NONE) {
                updatedTasks = tasks.map(t =>
                    t.id === task.id ? {
                        ...t,
                        completed: false,
                        status: 'pendente' as TaskStatus,
                        editedBy: user.id,
                        editedByName: user.name,
                        editedAt: new Date()
                    } : t
                );
                setTasks(updatedTasks);
                const t = updatedTasks.find(x => x.id === task.id);
                if (t) {
                    try { await NotificationService.rescheduleTaskReminder(t as any); } catch (e) { }
                }
            } else {
                Alert.alert('Tarefa Recorrente', 'Tarefas recorrentes não podem ser desmarcadas.');
                return;
            }
        }

        // Persistir e sincronizar
        const updatedTask = updatedTasks.find(t => t.id === task.id);
        if (updatedTask) {
            try {
                const remoteTask = taskToRemoteTask(updatedTask as any, currentFamily?.id);
                if (updatedTask.completed) {
                    await LocalStorageService.deleteTaskFromCache(updatedTask.id);
                } else {
                    await LocalStorageService.saveTask(remoteTask as any);
                }

                const isTemporaryId = updatedTask.id.startsWith('temp_') || updatedTask.id === 'temp';
                const operationType = isTemporaryId ? 'create' : 'update';
                await SyncService.addOfflineOperation(operationType, 'tasks', remoteTask);

                if (currentFamily && !isOffline) {
                    try {
                        const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
                        const res = await FirestoreService.saveTask(toSave);
                        await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
                    } catch (error) {
                        try { await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, operationType); } catch (e) { }
                        await SyncService.addOfflineOperation(operationType, 'tasks', { ...remoteTask, familyId: currentFamily.id });
                    }
                } else if (currentFamily) {
                    await SyncService.addOfflineOperation(operationType, 'tasks', { ...remoteTask, familyId: currentFamily.id });
                }
            } catch (error) {
                logger.error('SAVE_TASK', 'Erro ao sincronizar toggle da tarefa', error);
            }
        }

        await addToHistory(!task.completed ? 'completed' : 'uncompleted', task.title, task.id);

    }, [tasks, user, currentFamily, isOffline, addToHistory, requestTaskApproval, setTasks, setLastAction, setShowUndoButton]);



    const toggleTask = useCallback(async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (user.role === 'dependente') {
            if (!task.completed) {
                await requestTaskApproval(task);
            } else {
                Alert.alert('Permissão necessária', 'Somente administradores podem reabrir tarefas.');
            }
            return;
        }

        const repeatConfig = getRepeat(task);
        if (!task.completed && repeatConfig.type !== RepeatType.NONE) {
            if (!isRecurringTaskCompletable(task.dueDate, true)) {
                Alert.alert('Tarefa Recorrente', 'Esta tarefa recorrente só pode ser concluída na data de vencimento ou após.', [{ text: 'OK' }]);
                return;
            }
        }

        await handleTaskToggle(task);
    }, [tasks, user, handleTaskToggle, requestTaskApproval]);

    const toggleLockTask = useCallback(async (taskId: string) => {
        // Apenas admin pode bloquear/desbloquear
        if (user.role !== 'admin') {
            Alert.alert('Permissão negada', 'Apenas administradores podem bloquear/desbloquear tarefas.');
            return;
        }

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const isCurrentlyUnlocked = (task as any).unlocked === true;
        const newUnlockedState = !isCurrentlyUnlocked;

        const updatedTask: Task = {
            ...task,
            unlocked: newUnlockedState,
            unlockedBy: newUnlockedState ? user.id : undefined,
            unlockedAt: newUnlockedState ? new Date() : undefined,
            updatedAt: new Date(),
        } as Task;

        // Atualizar localmente primeiro para feedback imediato
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

        // Sincronizar com Firebase
        try {
            const isFamilyTask = (task as any).familyId && !(task as any).private;

            if (isFamilyTask && !isOffline) {
                // Tarefa da família online - atualizar no Firestore
                const toSave = {
                    ...updatedTask,
                    familyId: (task as any).familyId
                } as any;
                await FirestoreService.saveTask(toSave);
                await LocalStorageService.saveTask(toSave);
                logger.debug('SAVE_TASK', `Status de bloqueio atualizado no Firestore: ${newUnlockedState ? 'DESBLOQUEADO' : 'BLOQUEADO'}`);
            } else {
                // Tarefa privada ou offline - salvar localmente
                await LocalStorageService.saveTask(updatedTask as any);

                // Se for tarefa da família mas estiver offline, enfileirar
                if (isFamilyTask) {
                    await SyncService.addOfflineOperation('update', 'tasks', {
                        ...updatedTask,
                        familyId: (task as any).familyId
                    });
                    logger.debug('OFFLINE_SYNC', `Status de bloqueio enfileirado (offline): ${newUnlockedState ? 'DESBLOQUEADO' : 'BLOQUEADO'}`);
                }
            }
        } catch (error) {
            logger.error('SAVE_TASK', 'Erro ao atualizar status de bloqueio', error);
            // Reverter em caso de erro
            setTasks(prev => prev.map(t => t.id === taskId ? task : t));
            Alert.alert('Erro', 'Não foi possível atualizar o status de bloqueio da tarefa.');
        }
    }, [user, tasks, isOffline, setTasks]);

    const postponeTask = useCallback(async (task: Task, newDate: Date, newTime: Date) => {
        // Apenas admin pode adiar tarefas da família
        if (user.role !== 'admin' && (task as any).familyId) {
            Alert.alert('Permissão negada', 'Apenas administradores podem adiar tarefas da família.');
            return;
        }

        // Normalizar fuso: alinhar dueDate ao início do dia local e dueTime ao horário na mesma data
        const normalizedDate = new Date(newDate);
        normalizedDate.setHours(0, 0, 0, 0);
        const normalizedTime = new Date(normalizedDate);
        const pt = new Date(newTime);
        normalizedTime.setHours(pt.getHours(), pt.getMinutes(), 0, 0);

        const updatedTask: Task = {
            ...task,
            dueDate: normalizedDate,
            dueTime: normalizedTime,
            updatedAt: new Date(),
            editedBy: user.id,
            editedByName: user.name || 'Usuário',
            editedAt: new Date(),
        } as Task;

        // Atualizar localmente
        setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));

        // Sincronizar com Firebase
        try {
            const isFamilyTask = (task as any).familyId && !(task as any).private;

            if (isFamilyTask && !isOffline) {
                const toSave = {
                    ...updatedTask,
                    familyId: (task as any).familyId
                } as any;
                await FirestoreService.saveTask(toSave);
                await LocalStorageService.saveTask(toSave);
                logger.debug('SAVE_TASK', 'Data e horário da tarefa atualizados no Firestore');
            } else {
                await LocalStorageService.saveTask(updatedTask as any);

                if (isFamilyTask) {
                    await SyncService.addOfflineOperation('update', 'tasks', {
                        ...updatedTask,
                        familyId: (task as any).familyId
                    });
                    logger.debug('OFFLINE_SYNC', 'Atualização de data/horário enfileirada (offline)');
                }
            }

            // Reagendar notificações para a nova data/hora
            try {
                await NotificationService.rescheduleTaskReminder(updatedTask as any);
                logger.debug('NOTIFY', 'Notificações reagendadas para nova data/hora');
            } catch (e) {
                logger.warn('NOTIFY', 'Falha ao reagendar notificações', e);
            }

            Alert.alert('Sucesso', 'Data e horário da tarefa atualizados.');
        } catch (error) {
            logger.error('SAVE_TASK', 'Erro ao atualizar data/horário da tarefa', error);
            setTasks(prev => prev.map(t => t.id === task.id ? task : t));
            Alert.alert('Erro', 'Não foi possível atualizar a tarefa.');
        }
    }, [user, isOffline, setTasks]);

    const handleSkipOccurrence = useCallback(async (task: Task) => {
        const repeatConfig = getRepeat(task);

        // Só funciona para tarefas recorrentes não concluídas
        if (repeatConfig.type === RepeatType.NONE || task.completed) {
            Alert.alert('Ação inválida', 'Esta ação só está disponível para tarefas recorrentes não concluídas.');
            return;
        }

        // Confirmar ação
        Alert.alert(
            'Pular Ocorrência',
            'Deseja pular esta ocorrência? A tarefa será reagendada para a próxima data sem ser marcada como concluída.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Pular',
                    onPress: async () => {
                        try {
                            // Calcular próxima data
                            let nextDate: Date;
                            if (repeatConfig.type === RepeatType.INTERVAL) {
                                const step = Math.max(1, repeatConfig.intervalDays || (task as any).repeatIntervalDays || 1);
                                nextDate = new Date(task.dueDate || new Date());
                                nextDate.setDate(nextDate.getDate() + step);
                            } else {
                                nextDate = getNextRecurrenceDate(
                                    task.dueDate || new Date(),
                                    repeatConfig.type,
                                    repeatConfig.days
                                );
                            }

                            // Preservar horário original
                            let nextDateTime: Date | undefined = undefined;
                            if (task.dueTime) {
                                const originalTime = safeToDate(task.dueTime);
                                if (originalTime) {
                                    nextDateTime = new Date(nextDate);
                                    nextDateTime.setHours(
                                        originalTime.getHours(),
                                        originalTime.getMinutes(),
                                        originalTime.getSeconds(),
                                        originalTime.getMilliseconds()
                                    );
                                }
                            }

                            // Atualizar tarefa com nova data
                            const updatedTask: Task = {
                                ...task,
                                dueDate: nextDate,
                                dueTime: nextDateTime,
                                editedBy: user.id,
                                editedByName: user.name,
                                editedAt: new Date()
                            };

                            // Atualizar estado local
                            const updatedTasks = tasks.map(t => t.id === task.id ? updatedTask : t);
                            setTasks(updatedTasks);

                            // Salvar e sincronizar
                            const remoteTask = taskToRemoteTask(updatedTask as any, currentFamily?.id);
                            await LocalStorageService.saveTask(remoteTask as any);
                            await SyncService.addOfflineOperation('update', 'tasks', remoteTask);

                            if (currentFamily && !isOffline) {
                                try {
                                    const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
                                    await FirestoreService.saveTask(toSave);
                                    logger.debug('SYNC', `Ocorrência pulada e sincronizada: taskId=${task.id}`);
                                } catch (error) {
                                    logger.warn('SYNC', 'Erro ao sincronizar pulo de ocorrência', error);
                                }
                            }

                            // Reagendar notificação
                            try {
                                await NotificationService.rescheduleTaskReminder(updatedTask as any);
                            } catch (e) {
                                logger.warn('NOTIFY', 'rescheduleTaskReminder falhou', e);
                            }

                            // Adicionar ao histórico
                            await addToHistory('skipped', task.title, task.id);

                            logger.success('REPEAT', `Ocorrência pulada: ${task.title}, próxima data: ${nextDate}`);
                        } catch (error) {
                            logger.error('REPEAT', 'Erro ao pular ocorrência', error);
                            Alert.alert('Erro', 'Não foi possível pular a ocorrência.');
                        }
                    }
                }
            ]
        );
    }, [tasks, user, currentFamily, isOffline, addToHistory, setTasks]);

    const toggleSubtask = useCallback(async (taskId: string, subtaskId: string, categoryId?: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        let subtaskToCheck: any = null;

        // Se categoryId foi fornecido, procurar na categoria específica
        if (categoryId) {
            const category = (task as any).subtaskCategories?.find((cat: any) => cat.id === categoryId);
            subtaskToCheck = category?.subtasks?.find((st: any) => st.id === subtaskId);
        } else {
            // Caso contrário, procurar nas subtarefas simples
            subtaskToCheck = (task as any).subtasks?.find((st: any) => st.id === subtaskId);
        }

        // Verificar se a subtarefa pode ser concluída (data de vencimento)
        if (subtaskToCheck && !subtaskToCheck.done && subtaskToCheck.dueDate) {
            const now = new Date();
            const dueDate = safeToDate(subtaskToCheck.dueDate);

            if (dueDate) {
                // Se tem hora definida, considerar data+hora, senão apenas data
                if (subtaskToCheck.dueTime) {
                    const dueTime = safeToDate(subtaskToCheck.dueTime);
                    if (dueTime) {
                        const dueDateTimeCheck = new Date(dueDate);
                        dueDateTimeCheck.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);

                        if (now < dueDateTimeCheck) {
                            Alert.alert(
                                'Subtarefa Agendada',
                                `Esta subtarefa só pode ser concluída a partir de ${formatDate(dueDate)} às ${formatTime(dueTime)}.`
                            );
                            return;
                        }
                    }
                } else {
                    // Apenas data, comparar início do dia
                    const dueDateStart = new Date(dueDate);
                    dueDateStart.setHours(0, 0, 0, 0);
                    const nowStart = new Date(now);
                    nowStart.setHours(0, 0, 0, 0);

                    if (nowStart < dueDateStart) {
                        Alert.alert(
                            'Subtarefa Agendada',
                            `Esta subtarefa só pode ser concluída a partir de ${formatDate(dueDate)}.`
                        );
                        return;
                    }
                }
            }
        }

        // Dependente pode marcar subtarefa, mas a conclusão da tarefa principal pode exigir aprovação
        const now = new Date();
        const updatedTasks = tasks.map(t => {
            if (t.id !== taskId) return t;

            // Atualizar subtarefas simples ou categorias dependendo do tipo
            let updatedSubtasks = (t as any).subtasks || [];
            let updatedSubtaskCategories = (t as any).subtaskCategories || [];

            if (categoryId) {
                // Atualizar subtarefa dentro de uma categoria
                updatedSubtaskCategories = updatedSubtaskCategories.map((cat: any) => {
                    if (cat.id !== categoryId) return cat;
                    return {
                        ...cat,
                        subtasks: cat.subtasks?.map((st: any) => {
                            if (st.id !== subtaskId) return st;
                            const newDone = !st.done;
                            return {
                                ...st,
                                done: newDone,
                                completedById: newDone ? user.id : undefined,
                                completedByName: newDone ? user.name : undefined,
                                completedAt: newDone ? now : undefined,
                            };
                        }) || []
                    };
                });
            } else {
                // Atualizar subtarefa simples
                updatedSubtasks = (t as any).subtasks?.map((st: any) => {
                    if (st.id !== subtaskId) return st;
                    const newDone = !st.done;
                    return {
                        ...st,
                        done: newDone,
                        completedById: newDone ? user.id : undefined,
                        completedByName: newDone ? user.name : undefined,
                        completedAt: newDone ? now : undefined,
                    };
                }) || [];
            }

            // Coletar todas as subtarefas para recalcular tempo
            const allSubtasks = [
                ...updatedSubtasks,
                ...updatedSubtaskCategories.flatMap((cat: any) => cat.subtasks || [])
            ];

            // Recalcular data/hora da tarefa principal baseado nas subtarefas pendentes
            const subtaskBasedTime = calculateMainTaskTimeFromPendingSubtasks(allSubtasks);
            const shouldUpdateMainTaskTime = subtaskBasedTime.date || subtaskBasedTime.time;

            return {
                ...t,
                subtasks: updatedSubtasks,
                subtaskCategories: updatedSubtaskCategories,
                // Atualizar data/hora da tarefa principal se houver subtarefas pendentes com data/hora
                dueDate: shouldUpdateMainTaskTime ? (subtaskBasedTime.date || t.dueDate) : t.dueDate,
                dueTime: shouldUpdateMainTaskTime ? (subtaskBasedTime.time || t.dueTime) : t.dueTime,
                editedBy: user.id,
                editedByName: user.name,
                editedAt: now,
            } as any;
        });

        setTasks(updatedTasks);

        const updatedTask = updatedTasks.find(t => t.id === taskId)!;
        let subtask: any = null;

        if (categoryId) {
            const category = (updatedTask as any).subtaskCategories?.find((cat: any) => cat.id === categoryId);
            subtask = category?.subtasks?.find((st: any) => st.id === subtaskId);
        } else {
            subtask = (updatedTask as any).subtasks?.find((st: any) => st.id === subtaskId);
        }

        // Adicionar ao histórico com detalhes da subtarefa
        if (subtask) {
            const action = subtask.done ? 'completed' : 'uncompleted';
            const details = `Subtarefa: "${subtask.title}"`;
            await addToHistory(action, updatedTask.title, taskId, details);
        }

        // Cancelar notificação da subtarefa se foi marcada como concluída
        if (subtask?.done) {
            try {
                await NotificationService.cancelSubtaskReminder(taskId, subtaskId);
            } catch (e) {
                logger.warn('NOTIFY', 'Falha ao cancelar notificação de subtarefa', e);
            }
        }

        try {
            const remoteTask = taskToRemoteTask(updatedTask as any, currentFamily?.id);
            await LocalStorageService.saveTask(remoteTask as any);
            await SyncService.addOfflineOperation('update', 'tasks', remoteTask);
            if (currentFamily) {
                if (!isOffline) {
                    try {
                        const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
                        const res = await FirestoreService.saveTask(toSave);
                        await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
                    } catch (e) {
                        try { await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, 'update'); } catch (_) { }
                        await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
                    }
                } else {
                    await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
                }
            }
        } catch (e) {
            logger.error('SAVE_TASK', 'Erro ao sincronizar subtarefa', e);
        }

        // Se todas subtarefas concluídas, agir sobre a tarefa principal
        try {
            const allDone = Array.isArray((updatedTask as any).subtasks) && (updatedTask as any).subtasks.length > 0 && (updatedTask as any).subtasks.every((st: any) => st.done);
            if (allDone && !updatedTask.completed) {
                if (user.role === 'admin') {
                    // Admin pode concluir diretamente (reutiliza fluxo do handleTaskToggle)
                    await handleTaskToggle(updatedTask);
                } else {
                    // Dependente: solicitar aprovação para concluir tarefa
                    await requestTaskApproval(updatedTask);
                }
            }
        } catch (e) {
            logger.warn('SAVE_TASK', 'Erro ao processar conclusão automática por subtarefas', e);
        }
    }, [tasks, user, currentFamily, isOffline, addToHistory, handleTaskToggle, requestTaskApproval, setTasks]);

    const approveTask = useCallback(async (approvalId: string, adminComment?: string) => {
        const approval = approvals.find(a => a.id === approvalId);
        if (!approval || user.role !== 'admin') return;

        // Atualizar aprovação
        setApprovals(approvals.map(a =>
            a.id === approvalId ? {
                ...a,
                status: 'aprovada',
                adminId: user.id,
                resolvedAt: new Date(),
                adminComment
            } : a
        ));

        // Completar tarefa
        setTasks(tasks.map(t =>
            t.id === approval.taskId ? {
                ...t,
                completed: true,
                status: 'aprovada'
            } : t
        ));
        // cancelar notificação
        try {
            await NotificationService.cancelTaskReminder(approval.taskId);
        } catch (e) {
            logger.warn('NOTIFY', 'cancelTaskReminder falhou', e);
        }

        // Persistir aprovação e atualizar tarefa (cache + fila + família)
        try {
            const updatedApproval = {
                ...approval,
                status: 'aprovada' as const,
                adminId: user.id,
                resolvedAt: new Date(),
                adminComment
            };
            await LocalStorageService.saveApproval(updatedApproval as any);
            await SyncService.addOfflineOperation('update', 'approvals', updatedApproval);

            const t = tasks.find(t => t.id === approval.taskId);
            if (t) {
                const updatedTask = {
                    ...t,
                    completed: true,
                    status: 'aprovada' as TaskStatus,
                    completedAt: new Date(),
                    editedAt: new Date(),
                    editedBy: user.id,
                    editedByName: user.name,
                };
                const remoteTask = taskToRemoteTask(updatedTask as any, currentFamily?.id);

                // Tarefa aprovada/concluída: remover do cache local (mantém no Firebase para histórico)
                await LocalStorageService.deleteTaskFromCache(updatedTask.id);
                console.log('🗑️ Tarefa aprovada removida do cache local:', updatedTask.id);

                await SyncService.addOfflineOperation('update', 'tasks', remoteTask);
                if (currentFamily && !isOffline) {
                    try {
                        const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
                        await FirestoreService.saveTask(toSave);
                    } catch (e) {
                        logger.warn('APPROVAL', 'Falha ao salvar aprovação/tarefa aprovada no Firestore, delegando ao FamilySyncHelper', e);
                        try { await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, 'update'); } catch (_) { }
                        await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
                    }
                }
            }
        } catch (e) {
            logger.error('APPROVAL', 'Erro ao persistir aprovação/tarefa aprovada', e);
        }

        // Remover notificação e a própria aprovação (local e remoto)
        setNotifications(notifications.filter(n => n.taskId !== approval.taskId));
        setApprovals(prev => prev.filter(a => a.id !== approvalId));
        try {
            await LocalStorageService.removeFromCache('approvals' as any, approvalId);
            await SyncService.addOfflineOperation('delete', 'approvals', { id: approvalId });
        } catch (e) {
            logger.error('APPROVAL', 'Erro ao remover aprovação após aprovar', e);
        }

        await addToHistory('approved', approval.dependenteName + ' - ' + tasks.find(t => t.id === approval.taskId)?.title || '', approval.taskId, adminComment);

        Alert.alert('Tarefa Aprovada', 'A tarefa foi aprovada e marcada como concluída.');
    }, [approvals, user, tasks, currentFamily, isOffline, notifications, addToHistory, setApprovals, setTasks, setNotifications]);

    const rejectTask = useCallback(async (approvalId: string, adminComment?: string) => {
        const approval = approvals.find(a => a.id === approvalId);
        if (!approval || user.role !== 'admin') return;

        // Atualizar aprovação
        setApprovals(approvals.map(a =>
            a.id === approvalId ? {
                ...a,
                status: 'rejeitada',
                adminId: user.id,
                resolvedAt: new Date(),
                adminComment
            } : a
        ));

        // Reverter tarefa para pendente
        setTasks(tasks.map(t =>
            t.id === approval.taskId ? {
                ...t,
                status: 'rejeitada',
                approvalId: undefined
            } : t
        ));
        // reprogramar lembrete se necessário
        const t = tasks.find(x => x.id === approval.taskId);
        if (t) {
            try {
                await NotificationService.rescheduleTaskReminder(t as any);
            } catch (e) {
                logger.warn('NOTIFY', 'rescheduleTaskReminder falhou', e);
            }
        }

        // Persistir aprovação rejeitada e atualizar tarefa (cache + fila + família)
        try {
            const updatedApproval = {
                ...approval,
                status: 'rejeitada' as const,
                adminId: user.id,
                resolvedAt: new Date(),
                adminComment
            };
            await LocalStorageService.saveApproval(updatedApproval as any);
            await SyncService.addOfflineOperation('update', 'approvals', updatedApproval);

            const t2 = tasks.find(x => x.id === approval.taskId);
            if (t2) {
                const updatedTask = {
                    ...t2,
                    status: 'rejeitada' as TaskStatus,
                    approvalId: undefined,
                    editedAt: new Date(),
                    editedBy: user.id,
                    editedByName: user.name,
                };
                const remoteTask = taskToRemoteTask(updatedTask as any, currentFamily?.id);
                await LocalStorageService.saveTask(remoteTask as any);
                await SyncService.addOfflineOperation('update', 'tasks', remoteTask);
                if (currentFamily && !isOffline) {
                    try {
                        const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
                        const res = await FirestoreService.saveTask(toSave);
                        await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
                    } catch (e) {
                        logger.warn('APPROVAL', 'Falha ao salvar aprovação/tarefa rejeitada no Firestore, delegando ao FamilySyncHelper', e);
                        try { await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, 'update'); } catch (_) { }
                        await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
                    }
                }
            }
        } catch (e) {
            logger.error('APPROVAL', 'Erro ao persistir aprovação/tarefa rejeitada', e);
        }

        // Remover notificação e a própria aprovação (local e remoto)
        setNotifications(notifications.filter(n => n.taskId !== approval.taskId));
        setApprovals(prev => prev.filter(a => a.id !== approvalId));
        try {
            await LocalStorageService.removeFromCache('approvals' as any, approvalId);
            await SyncService.addOfflineOperation('delete', 'approvals', { id: approvalId });
        } catch (e) {
            logger.error('APPROVAL', 'Erro ao remover aprovação após rejeitar', e);
        }

        await addToHistory('rejected', approval.dependenteName + ' - ' + tasks.find(t => t.id === approval.taskId)?.title || '', approval.taskId, adminComment);

        Alert.alert('Tarefa Rejeitada', 'A solicitação de conclusão foi rejeitada.');
    }, [approvals, user, tasks, currentFamily, isOffline, notifications, addToHistory, setApprovals, setTasks, setNotifications]);

    return {
        saveTask,
        deleteTask,
        toggleTask,
        requestTaskApproval,
        ensureFamilyPermission,
        toggleLockTask,
        postponeTask,
        handleSkipOccurrence,
        toggleSubtask,
        approveTask,
        rejectTask
    };
}
