import ConnectivityService from './ConnectivityService';
import FirestoreService from './FirestoreService';
import LocalStorageService from './LocalStorageService';
import familyService from './LocalFamilyService';
import SyncService from './SyncService';

/**
 * Helper que centraliza a lógica de salvar uma tarefa na família
 * Preferência: Firestore quando online. Em caso de falha/offline,
 * grava no armazenamento local de família (fallback) e enfileira
 * a operação para sincronização posterior.
 */
const FamilySyncHelper = {
  async saveTaskToFamily(task: any, familyId: string | null | undefined, operationType: 'create' | 'update' | 'delete' = 'update') {
    const normalizedFamilyId = familyId ?? null;
    const payload = { ...task, familyId: normalizedFamilyId };

    // Se estivermos online, tentar Firestore primeiro
    if (ConnectivityService.isConnected()) {
      try {
        const res = await FirestoreService.saveTask(payload);
        // Atualizar cache local (source-of-truth visual)
        await LocalStorageService.saveTask({ ...payload, id: payload.id || (res && (res as any).id) });
        return res;
      } catch (err) {
        console.error('[FamilySyncHelper] Erro ao salvar no Firestore, fazendo fallback para local:', err);
        // Fallback local e enfileirar
        try {
          await familyService.saveFamilyTask(task, normalizedFamilyId as string);
        } catch (e) {
          console.warn('[FamilySyncHelper] Falha ao salvar localmente na familyService:', e);
        }
        try {
          await SyncService.addOfflineOperation(operationType, 'tasks', { ...task, familyId: normalizedFamilyId });
        } catch (syncErr) {
          console.warn('[FamilySyncHelper] Falha ao enfileirar operação após fallback:', syncErr);
        }
        return null;
      }
    }

    // Offline: persistir localmente e enfileirar
    try {
      await familyService.saveFamilyTask(task, normalizedFamilyId as string);
    } catch (e) {
      console.warn('[FamilySyncHelper] Falha ao salvar localmente (offline):', e);
    }

    try {
      await SyncService.addOfflineOperation(operationType, 'tasks', { ...task, familyId: normalizedFamilyId });
    } catch (syncErr) {
      console.warn('[FamilySyncHelper] Falha ao enfileirar operação (offline):', syncErr);
    }

    return null;
  }
};

export default FamilySyncHelper;
