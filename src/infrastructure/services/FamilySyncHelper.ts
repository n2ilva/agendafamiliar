import { ConnectivityService } from './ConnectivityService';
import { ITaskRepository } from '../../core/interfaces/repositories/ITaskRepository';
import { IStorageService } from '../../core/interfaces/services/IStorageService';
import { ISyncService } from '../../core/interfaces/services/ISyncService';
import { Task } from '../../core/domain/entities/Task';

/**
 * Helper de Sincronização de Família - Clean Architecture
 * Centraliza lógica de salvar tarefas com fallback offline
 * 
 * Estratégia:
 * 1. Online: Salva no Firestore primeiro, depois no cache local
 * 2. Offline ou erro: Salva localmente e enfileira para sincronização
 */
export class FamilySyncHelper {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly storageService: IStorageService,
    private readonly syncService: ISyncService
  ) {}

  async saveTaskToFamily(
    task: Task,
    familyId: string | null | undefined,
    operationType: 'create' | 'update' | 'delete' = 'update'
  ): Promise<Task | null> {
    const normalizedFamilyId = familyId ?? null;

    // Se online, tentar Firestore primeiro
    if (ConnectivityService.isConnected()) {
      try {
        const savedTask = await this.taskRepository.save(task);
        
        // Atualizar cache local (source-of-truth visual)
        await this.storageService.set(`task_${savedTask.id}`, savedTask);
        
        return savedTask;
      } catch (err) {
        console.error('[FamilySyncHelper] Erro ao salvar no Firestore, fazendo fallback:', err);
        
        // Fallback: salvar localmente e enfileirar
        try {
          await this.storageService.set(`task_${task.id}`, task);
        } catch (e) {
          console.warn('[FamilySyncHelper] Falha ao salvar localmente:', e);
        }
        
        try {
          // Adicionar operação pendente para sincronização futura
          await this.syncService.queueOperation(operationType, 'tasks', task);
        } catch (syncErr) {
          console.warn('[FamilySyncHelper] Falha ao enfileirar operação:', syncErr);
        }
        
        return null;
      }
    }

    // Offline: persistir localmente e enfileirar
    try {
      await this.storageService.set(`task_${task.id}`, task);
    } catch (e) {
      console.warn('[FamilySyncHelper] Falha ao salvar localmente (offline):', e);
    }

    try {
      await this.syncService.queueOperation(operationType, 'tasks', task);
    } catch (syncErr) {
      console.warn('[FamilySyncHelper] Falha ao enfileirar operação (offline):', syncErr);
    }

    return null;
  }

  async deleteTaskFromFamily(taskId: string, familyId: string): Promise<void> {
    if (ConnectivityService.isConnected()) {
      try {
        await this.taskRepository.delete(taskId);
        await this.storageService.remove(`task_${taskId}`);
        return;
      } catch (err) {
        console.error('[FamilySyncHelper] Erro ao deletar do Firestore:', err);
        // Continuar para fallback offline
      }
    }

    // Fallback offline
    await this.storageService.remove(`task_${taskId}`);
    await this.syncService.queueOperation('delete', 'tasks', { id: taskId, familyId });
  }
}

export default FamilySyncHelper;
