/**
 * Interface do Serviço de Sincronização
 * Define o contrato para operações de sincronização online/offline
 * 
 * Princípio SOLID: Dependency Inversion (D)
 */

export type OperationType = 'create' | 'update' | 'delete';
export type EntityType = 'tasks' | 'families' | 'users' | 'approvals' | 'history' | 'categories';

export interface PendingOperation {
  id: string;
  type: OperationType;
  entity: EntityType;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: number;
  pendingOperations: number;
  hasError: boolean;
  errorMessage?: string;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ operation: PendingOperation; error: string }>;
}

export interface ConflictResolution {
  strategy: 'local_wins' | 'remote_wins' | 'merge' | 'manual';
  resolver?: (local: any, remote: any) => any;
}

export interface ISyncService {
  /**
   * Inicializa o serviço de sincronização
   */
  initialize(): Promise<void>;

  /**
   * Verifica se está online
   */
  isOnline(): boolean;

  /**
   * Obtém status atual da sincronização
   */
  getStatus(): SyncStatus;

  /**
   * Adiciona operação à fila de sincronização
   */
  queueOperation(type: OperationType, entity: EntityType, data: any): Promise<void>;

  /**
   * Processa fila de operações pendentes
   */
  processQueue(): Promise<SyncResult>;

  /**
   * Força sincronização completa (full sync)
   */
  forceFullSync(): Promise<SyncResult>;

  /**
   * Sincroniza apenas uma entidade específica
   */
  syncEntity(entity: EntityType): Promise<SyncResult>;

  /**
   * Cancela sincronização em andamento
   */
  cancelSync(): void;

  /**
   * Limpa fila de operações pendentes
   */
  clearQueue(): Promise<void>;

  /**
   * Obtém operações pendentes
   */
  getPendingOperations(): Promise<PendingOperation[]>;

  /**
   * Define estratégia de resolução de conflitos
   */
  setConflictResolution(entity: EntityType, resolution: ConflictResolution): void;

  /**
   * Registra listener para mudanças de status
   */
  onStatusChange(callback: (status: SyncStatus) => void): () => void;

  /**
   * Registra listener para quando voltar online
   */
  onOnline(callback: () => void): () => void;

  /**
   * Registra listener para quando ficar offline
   */
  onOffline(callback: () => void): () => void;

  /**
   * Listener para atualizações de aprovações
   */
  onApprovalsUpdate(callback: (approvals: any[]) => void): () => void;

  /**
   * Pausa sincronização automática
   */
  pause(): void;

  /**
   * Retoma sincronização automática
   */
  resume(): void;

  /**
   * Para sincronização em background
   */
  stopBackgroundSync(): Promise<void>;

  /**
   * Inicia sincronização em background
   */
  startBackgroundSync(): Promise<void>;

  /**
   * Verifica se há conflitos pendentes
   */
  hasConflicts(): Promise<boolean>;

  /**
   * Obtém conflitos pendentes para resolução manual
   */
  getConflicts(): Promise<Array<{ local: any; remote: any; entity: EntityType }>>;

  /**
   * Resolve conflito manualmente
   */
  resolveConflict(conflictId: string, resolution: 'local' | 'remote' | 'merged', mergedData?: any): Promise<void>;
}
