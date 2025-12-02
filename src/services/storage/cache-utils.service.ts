import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../../types/family.types';
import LocalStorageService, { OfflineData } from './local-storage.service';

/**
 * Extensão do LocalStorageService com utilitários para debug e limpeza de cache
 * Funções para resolver problemas de tarefas órfãs e ocultas
 */
class CacheUtilsService {
    /**
     * Obter TODAS as tarefas do cache, incluindo as que podem estar ocultas
     * Útil para debug e para encontrar tarefas órfãs
     * @returns Array com todas as tarefas no cache, incluindo metadados de sync
     */
    static async getAllTasksIncludingHidden(): Promise<(Task & { __syncMetadata?: any })[]> {
        try {
            const tasks = await LocalStorageService.getTasks();
            const data = await LocalStorageService.getOfflineData();

            return Object.values(data.tasks).map(task => ({
                ...task,
                __syncMetadata: (task as any).__syncMetadata
            })) as any[];
        } catch (error) {
            console.error('[CacheUtils] Erro ao obter todas as tarefas:', error);
            return [];
        }
    }

    /**
     * Limpar tarefas órfãs do cache
     * Remove tarefas que não estão na lista de IDs válidos (vindos do Firebase)
     * @param validTaskIds - Array de IDs de tarefas válidas do Firebase
     * @returns Número de tarefas órfãs removidas
     */
    static async cleanOrphanedTasks(validTaskIds: string[]): Promise<number> {
        try {
            const data = await LocalStorageService.getOfflineData();
            const validIdsSet = new Set(validTaskIds);
            let removedCount = 0;

            const filteredTasks: Record<string, Task> = {};

            Object.entries(data.tasks).forEach(([id, task]) => {
                if (validIdsSet.has(id)) {
                    // Tarefa válida, manter
                    filteredTasks[id] = task;
                } else {
                    // Tarefa órfã, remover
                    console.log(`[CacheUtils] 🗑️ Removendo tarefa órfã: ${id} - "${task.title}"`);
                    removedCount++;
                }
            });

            if (removedCount > 0) {
                data.tasks = filteredTasks;
                await LocalStorageService.saveOfflineData(data);
                console.log(`[CacheUtils] 🧹 ${removedCount} tarefa(s) órfã(s) removida(s) do cache`);
            }

            return removedCount;
        } catch (error) {
            console.error('[CacheUtils] Erro ao limpar tarefas órfãs:', error);
            return 0;
        }
    }

    /**
     * Forçar limpeza completa do cache e preparar para re-sincronização
     * CUIDADO: Esta operação remove TODOS os dados locais
     * @returns true se a limpeza foi bem-sucedida
     */
    static async forceCleanCache(): Promise<boolean> {
        try {
            console.warn('[CacheUtils] ⚠️ Iniciando limpeza completa do cache...');

            await LocalStorageService.clearCache();
            console.log('[CacheUtils] ✅ Cache limpo com sucesso. Re-sincronização necessária.');

            return true;
        } catch (error) {
            console.error('[CacheUtils] ❌ Erro ao limpar cache:', error);
            return false;
        }
    }

    /**
     * Obter estatísticas do cache para debug
     * @returns Objeto com estatísticas do cache
     */
    static async getCacheStats(): Promise<{
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        dirtyTasks: number;
        orphanedTasks: number;
        totalUsers: number;
        totalFamilies: number;
        totalHistory: number;
        pendingOperations: number;
        cacheSize: number;
        lastSync: Date | null;
    }> {
        try {
            const data = await LocalStorageService.getOfflineData();
            const tasks = Object.values(data.tasks);

            const stats = {
                totalTasks: tasks.length,
                completedTasks: tasks.filter(t => t.completed).length,
                pendingTasks: tasks.filter(t => !t.completed).length,
                dirtyTasks: tasks.filter(t => (t as any).__syncMetadata?.isDirty).length,
                orphanedTasks: 0, // Será calculado comparando com Firebase
                totalUsers: Object.keys(data.users).length,
                totalFamilies: Object.keys(data.families).length,
                totalHistory: Object.keys(data.history).length,
                pendingOperations: data.pendingOperations.length,
                cacheSize: JSON.stringify(data).length,
                lastSync: data.lastSync ? new Date(data.lastSync) : null
            };

            return stats;
        } catch (error) {
            console.error('[CacheUtils] Erro ao obter estatísticas do cache:', error);
            return {
                totalTasks: 0,
                completedTasks: 0,
                pendingTasks: 0,
                dirtyTasks: 0,
                orphanedTasks: 0,
                totalUsers: 0,
                totalFamilies: 0,
                totalHistory: 0,
                pendingOperations: 0,
                cacheSize: 0,
                lastSync: null
            };
        }
    }

    /**
     * Limpar rastreamento de notificações órfãs
     * Remove IDs de tarefas que não existem mais do rastreamento de notificações
     * @param validTaskIds - Array de IDs de tarefas válidas
     * @param notificationTrack - Ref do rastreamento de notificações
     * @returns Número de entradas removidas
     */
    static cleanOrphanedNotificationTracking(
        validTaskIds: string[],
        notificationTrack: Record<string, number>
    ): number {
        const validIdsSet = new Set(validTaskIds);
        let removedCount = 0;

        Object.keys(notificationTrack).forEach(taskId => {
            if (!validIdsSet.has(taskId)) {
                delete notificationTrack[taskId];
                removedCount++;
                console.log(`[CacheUtils] 🗑️ Removendo rastreamento de notificação órfã: ${taskId}`);
            }
        });

        if (removedCount > 0) {
            console.log(`[CacheUtils] 🧹 ${removedCount} entrada(s) de rastreamento órfã(s) removida(s)`);
        }

        return removedCount;
    }
}

export default CacheUtilsService;
