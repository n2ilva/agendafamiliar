/**
 * Implementação do Serviço de Sincronização
 * 
 * Princípios SOLID aplicados:
 * - Single Responsibility: Responsável apenas por sincronização online/offline
 * - Dependency Inversion: Implementa a interface ISyncService
 */

import NetInfo from '@react-native-community/netinfo';
import {
  ISyncService,
  PendingOperation,
  SyncStatus,
  SyncResult,
  OperationType,
  EntityType,
  ConflictResolution,
} from '../../core/interfaces/services/ISyncService';
import { IStorageService } from '../../core/interfaces/services/IStorageService';

export class SyncService implements ISyncService {
  private isOnlineState: boolean = true;
  private isSyncingState: boolean = false;
  private lastSyncTime: number = 0;
  private statusCallbacks: Array<(status: SyncStatus) => void> = [];
  private onlineCallbacks: Array<() => void> = [];
  private offlineCallbacks: Array<() => void> = [];
  private approvalsCallbacks: Array<(approvals: any[]) => void> = [];
  private conflictResolutions: Map<EntityType, ConflictResolution> = new Map();
  private isPaused: boolean = false;
  private netInfoUnsubscribe?: () => void;

  private readonly QUEUE_KEY = 'sync:queue';
  private readonly CONFLICTS_KEY = 'sync:conflicts';

  constructor(private storageService: IStorageService) {}

  async initialize(): Promise<void> {
    // Monitorar conectividade
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = this.isOnlineState;
      this.isOnlineState = state.isConnected ?? true;

      if (!wasOnline && this.isOnlineState) {
        this.onlineCallbacks.forEach(cb => cb());
        if (!this.isPaused) {
          this.processQueue().catch(console.error);
        }
      } else if (wasOnline && !this.isOnlineState) {
        this.offlineCallbacks.forEach(cb => cb());
      }

      this.notifyStatusChange();
    });

    // Verificar estado inicial
    const state = await NetInfo.fetch();
    this.isOnlineState = state.isConnected ?? true;
  }

  isOnline(): boolean {
    return this.isOnlineState;
  }

  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnlineState,
      isSyncing: this.isSyncingState,
      lastSync: this.lastSyncTime,
      pendingOperations: 0, // Será atualizado
      hasError: false,
    };
  }

  async queueOperation(type: OperationType, entity: EntityType, data: any): Promise<void> {
    const operation: PendingOperation = {
      id: `${entity}_${type}_${Date.now()}_${Math.random()}`,
      type,
      entity,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const queue = await this.getPendingOperations();
    queue.push(operation);
    await this.storageService.set(this.QUEUE_KEY, queue);

    this.notifyStatusChange();

    // Se está online e não pausado, processar imediatamente
    if (this.isOnlineState && !this.isPaused && !this.isSyncingState) {
      this.processQueue().catch(console.error);
    }
  }

  async processQueue(): Promise<SyncResult> {
    if (this.isSyncingState) {
      return { success: false, syncedCount: 0, failedCount: 0, errors: [] };
    }

    if (!this.isOnlineState) {
      return { success: false, syncedCount: 0, failedCount: 0, errors: [] };
    }

    this.isSyncingState = true;
    this.notifyStatusChange();

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      const queue = await this.getPendingOperations();
      const remaining: PendingOperation[] = [];

      for (const operation of queue) {
        try {
          await this.executeOperation(operation);
          result.syncedCount++;
        } catch (error) {
          result.failedCount++;
          operation.retryCount++;
          operation.lastError = error instanceof Error ? error.message : String(error);

          if (operation.retryCount < 3) {
            remaining.push(operation);
          }

          result.errors.push({ operation, error: operation.lastError });
        }
      }

      await this.storageService.set(this.QUEUE_KEY, remaining);
      this.lastSyncTime = Date.now();
    } catch (error) {
      console.error('Error processing queue:', error);
      result.success = false;
    } finally {
      this.isSyncingState = false;
      this.notifyStatusChange();
    }

    return result;
  }

  async forceFullSync(): Promise<SyncResult> {
    // Implementação simplificada - apenas processa fila
    return this.processQueue();
  }

  async syncEntity(entity: EntityType): Promise<SyncResult> {
    const queue = await this.getPendingOperations();
    const entityQueue = queue.filter(op => op.entity === entity);

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    for (const operation of entityQueue) {
      try {
        await this.executeOperation(operation);
        result.syncedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          operation,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Remover operações sincronizadas
    const remaining = queue.filter(
      op => op.entity !== entity || result.errors.some(e => e.operation.id === op.id)
    );
    await this.storageService.set(this.QUEUE_KEY, remaining);

    return result;
  }

  cancelSync(): void {
    this.isSyncingState = false;
    this.notifyStatusChange();
  }

  async clearQueue(): Promise<void> {
    await this.storageService.remove(this.QUEUE_KEY);
    this.notifyStatusChange();
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    return (await this.storageService.get<PendingOperation[]>(this.QUEUE_KEY)) || [];
  }

  setConflictResolution(entity: EntityType, resolution: ConflictResolution): void {
    this.conflictResolutions.set(entity, resolution);
  }

  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  onOnline(callback: () => void): () => void {
    this.onlineCallbacks.push(callback);
    return () => {
      this.onlineCallbacks = this.onlineCallbacks.filter(cb => cb !== callback);
    };
  }

  onOffline(callback: () => void): () => void {
    this.offlineCallbacks.push(callback);
    return () => {
      this.offlineCallbacks = this.offlineCallbacks.filter(cb => cb !== callback);
    };
  }

  onApprovalsUpdate(callback: (approvals: any[]) => void): () => void {
    this.approvalsCallbacks.push(callback);
    return () => {
      this.approvalsCallbacks = this.approvalsCallbacks.filter(cb => cb !== callback);
    };
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
    if (this.isOnlineState && !this.isSyncingState) {
      this.processQueue().catch(console.error);
    }
  }

  async stopBackgroundSync(): Promise<void> {
    this.pause();
  }

  async startBackgroundSync(): Promise<void> {
    this.resume();
  }

  async hasConflicts(): Promise<boolean> {
    const conflicts = await this.storageService.get(this.CONFLICTS_KEY);
    return !!conflicts && (conflicts as any[]).length > 0;
  }

  async getConflicts(): Promise<Array<{ local: any; remote: any; entity: EntityType }>> {
    return (await this.storageService.get(this.CONFLICTS_KEY)) || [];
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merged',
    mergedData?: any
  ): Promise<void> {
    // Implementação simplificada
    const conflicts = await this.getConflicts();
    const remaining = conflicts.filter((_, index) => index.toString() !== conflictId);
    await this.storageService.set(this.CONFLICTS_KEY, remaining);
  }

  private async executeOperation(operation: PendingOperation): Promise<void> {
    // Esta é uma implementação simplificada
    // Em produção, isso deveria chamar os repositórios apropriados
    console.log('Executing sync operation:', operation);
    
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 100));

    // Em uma implementação real, você chamaria:
    // const repository = this.getRepository(operation.entity);
    // switch (operation.type) {
    //   case 'create': await repository.save(operation.data); break;
    //   case 'update': await repository.update(operation.data.id, operation.data); break;
    //   case 'delete': await repository.delete(operation.data.id); break;
    // }
  }

  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusCallbacks.forEach(cb => cb(status));
  }

  // Cleanup
  destroy(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
    }
    this.statusCallbacks = [];
    this.onlineCallbacks = [];
    this.offlineCallbacks = [];
    this.approvalsCallbacks = [];
  }
}
