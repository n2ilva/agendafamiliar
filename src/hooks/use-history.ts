import { useState, useCallback, useEffect } from 'react';
import { HistoryItem as StoredHistoryItem } from '../types/storage.types';
import { HistoryItem } from '../types/family.types';
import LocalStorageService from '../services/storage/local-storage.service';
import familyService from '../services/family/local-family.service';
import SyncService from '../services/sync/sync.service';
import logger from '../utils/helpers/logger';
import { safeToDate } from '../utils/date/date.utils';

export const HISTORY_DAYS_TO_KEEP = 7;

export function useHistory(user: any, currentFamily: any, isOffline: boolean) {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    const clearOldHistory = useCallback(async () => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - HISTORY_DAYS_TO_KEEP);

        setHistory(prev => prev
            .filter(item => {
                const itemDate = item.timestamp instanceof Date ? item.timestamp : safeToDate(item.timestamp);
                return !!itemDate && itemDate >= cutoffDate;
            })
            .sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime())
        );

        // Também limpar do storage local
        try {
            await LocalStorageService.clearOldHistory(HISTORY_DAYS_TO_KEEP);
        } catch (e) {
            logger.warn('HISTORY', 'Falha ao limpar histórico antigo do storage', e);
        }
    }, []);

    const addToHistory = useCallback(async (
        action: 'created' | 'completed' | 'uncompleted' | 'edited' | 'deleted' | 'approval_requested' | 'approved' | 'rejected' | 'skipped',
        taskTitle: string,
        taskId: string,
        details?: string,
        actionUserId?: string,
        actionUserName?: string
    ) => {
        if (!user) return;

        const historyItem: StoredHistoryItem = {
            id: Date.now().toString(),
            action,
            taskTitle,
            taskId,
            timestamp: new Date(),
            details,
            // Informações de autoria (usar usuário atual se não fornecido)
            userId: actionUserId || user.id,
            userName: actionUserName || user.name,
            userRole: user.role
        };

        // Adicionar ao histórico local (estado da aplicação)
        setHistory(prev => {
            const newHistory = [historyItem, ...prev];
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - HISTORY_DAYS_TO_KEEP);

            return newHistory
                .filter(item => {
                    const itemDate = item.timestamp instanceof Date ? item.timestamp : safeToDate(item.timestamp);
                    return !!itemDate && itemDate >= cutoffDate;
                })
                .sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime());
        });

        // Salvar no cache local (LocalStorage)
        try {
            await LocalStorageService.saveHistoryItem(historyItem);
            logger.debug('HISTORY', 'Item de histórico salvo no cache local');
        } catch (error) {
            logger.error('HISTORY', 'Erro ao salvar histórico no cache', error);
        }

        // Se o usuário pertence a uma família, adicionar também ao histórico da família
        if (currentFamily && !isOffline) {
            try {
                await familyService.addFamilyHistoryItem(currentFamily.id, {
                    action,
                    taskTitle,
                    taskId,
                    userId: historyItem.userId,
                    userName: historyItem.userName,
                    userRole: historyItem.userRole,
                    details,
                    timestamp: historyItem.timestamp
                });
                logger.debug('HISTORY', 'Item adicionado ao histórico da família');
            } catch (error) {
                logger.error('HISTORY', 'Erro ao adicionar ao histórico da família', error);

                // Se falhou salvar no Firebase, adicionar à fila de sincronização
                try {
                    const toQueue = { ...historyItem, familyId: currentFamily.id } as any;
                    // remover undefined defensivamente
                    Object.keys(toQueue).forEach(k => (toQueue as any)[k] === undefined && delete (toQueue as any)[k]);
                    await SyncService.addOfflineOperation('create', 'history', toQueue);
                    logger.debug('HISTORY', 'Item de histórico adicionado à fila de sincronização');
                } catch (syncError) {
                    logger.error('HISTORY', 'Erro ao adicionar histórico à fila de sincronização', syncError);
                }
            }
        } else if (!currentFamily) {
            // Se usuário não tem família, adicionar à fila para sincronização futura
            try {
                const toQueue = { ...historyItem, familyId: null } as any;
                Object.keys(toQueue).forEach(k => (toQueue as any)[k] === undefined && delete (toQueue as any)[k]);
                await SyncService.addOfflineOperation('create', 'history', toQueue);
                logger.debug('HISTORY', 'Item de histórico adicionado à fila de sincronização (sem família)');
            } catch (syncError) {
                logger.error('HISTORY', 'Erro ao adicionar histórico à fila', syncError);
            }
        }
    }, [user, currentFamily, isOffline]);

    // Carregar histórico inicial
    useEffect(() => {
        let unsubscribeHistory: (() => void) | null = null;

        const loadHistory = async () => {
            try {
                if (!user || !user.id) return;

                // Carregar do cache local
                const localHistory = await LocalStorageService.getHistory(100);
                setHistory(localHistory.sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime()));

                // Limpar antigo
                await clearOldHistory();

                if (currentFamily && currentFamily.id && !isOffline) {
                    // Carregar histórico inicial da família
                    const familyHistory = await familyService.getFamilyHistory(currentFamily.id, 50);

                    if (familyHistory && Array.isArray(familyHistory)) {
                        const convertedHistory: HistoryItem[] = familyHistory.map(item => ({
                            id: (item as any).id || 'unknown-' + Date.now(),
                            action: (item as any).action || 'created',
                            taskTitle: (item as any).taskTitle || 'Tarefa desconhecida',
                            taskId: (item as any).taskId || '',
                            timestamp: safeToDate((item as any).createdAt) || safeToDate((item as any).timestamp) || new Date(),
                            details: (item as any).details || '',
                            userId: (item as any).userId || '',
                            userName: (item as any).userName || 'Usuário desconhecido',
                            userRole: (item as any).userRole || ''
                        }));

                        setHistory(prevHistory => {
                            const localOnlyHistory = prevHistory.filter(localItem => {
                                const localTs = localItem.timestamp instanceof Date ? localItem.timestamp : safeToDate(localItem.timestamp);
                                return !convertedHistory.some(familyItem => {
                                    const famTs = familyItem.timestamp instanceof Date ? familyItem.timestamp : safeToDate(familyItem.timestamp);
                                    return familyItem.taskId === localItem.taskId &&
                                        familyItem.action === localItem.action &&
                                        famTs && localTs &&
                                        Math.abs(famTs.getTime() - localTs.getTime()) < 5000;
                                });
                            });
                            const mergedHistory = [...convertedHistory, ...localOnlyHistory];
                            return mergedHistory.sort((a, b) => {
                                const aTs = a.timestamp instanceof Date ? a.timestamp : safeToDate(a.timestamp);
                                const bTs = b.timestamp instanceof Date ? b.timestamp : safeToDate(b.timestamp);
                                return (bTs?.getTime() || 0) - (aTs?.getTime() || 0);
                            });
                        });
                    }

                    // Subscribe
                    unsubscribeHistory = familyService.subscribeToFamilyHistory(
                        currentFamily.id,
                        (updatedHistory) => {
                            const convertedUpdatedHistory: HistoryItem[] = updatedHistory.map(item => ({
                                id: (item as any).id,
                                action: (item as any).action,
                                taskTitle: (item as any).taskTitle,
                                taskId: (item as any).taskId,
                                timestamp: safeToDate((item as any).createdAt) || safeToDate((item as any).timestamp) || new Date(),
                                details: (item as any).details,
                                userId: (item as any).userId,
                                userName: (item as any).userName,
                                userRole: (item as any).userRole
                            }));

                            setHistory(prev => {
                                const cutoffDate = new Date();
                                cutoffDate.setDate(cutoffDate.getDate() - HISTORY_DAYS_TO_KEEP);
                                const combined = [...convertedUpdatedHistory, ...prev];
                                const result: HistoryItem[] = [];
                                for (const item of combined) {
                                    const itemDate = item.timestamp instanceof Date ? item.timestamp : safeToDate(item.timestamp);
                                    if (!itemDate || itemDate < cutoffDate) continue;

                                    const duplicateIndex = result.findIndex(r =>
                                        r.taskId === item.taskId &&
                                        r.action === item.action &&
                                        Math.abs((r.timestamp as Date).getTime() - itemDate.getTime()) < 5000
                                    );
                                    if (duplicateIndex === -1) {
                                        result.push({ ...item, timestamp: itemDate });
                                    }
                                }
                                return result.sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime()).slice(0, 100);
                            });
                        },
                        50
                    );
                }
            } catch (error) {
                logger.error('HISTORY_LOAD', 'Erro ao carregar histórico', error);
            }
        };

        loadHistory();

        return () => {
            if (unsubscribeHistory) unsubscribeHistory();
        };
    }, [user?.id, currentFamily?.id, isOffline, clearOldHistory]);

    return {
        history,
        setHistory,
        addToHistory,
        clearOldHistory
    };
}
