import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';

const BACKGROUND_SYNC_TASK = 'background-sync-task';
let taskDefined = false;

async function isExpoGo(): Promise<boolean> {
  try {
    const Constants = require('expo-constants');
    return Constants?.appOwnership === 'expo';
  } catch {
    return false;
  }
}

/**
 * Serviço de Sincronização em Background - Clean Architecture
 * Gerencia tarefas de sincronização periódica quando app está em background
 */
async function defineBackgroundSyncTask() {
  if (taskDefined) {
    return;
  }

  try {
    TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
      try {
        console.log('🔄 [BG] Executando tarefa de sincronização...');

        if (Platform.OS === 'web' || await isExpoGo()) {
          console.log('⚠️ [BG] Ignorado: não disponível no Expo Go ou Web.');
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        // Import dinâmico para evitar ciclos de dependência
        const { SyncService } = await import('./SyncService');
        
        // Assumindo que SyncService terá método performBackgroundSync
        // TODO: Implementar performBackgroundSync no SyncService
        console.log('✅ [BG] Tarefa concluída.');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      } catch (e) {
        console.error('❌ [BG] Erro na tarefa de sincronização:', e);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
    taskDefined = true;
    console.log('✅ Task de background sync definida.');
  } catch (e) {
    console.error('❌ Erro ao definir background sync task:', e);
  }
}

async function registerBackgroundSyncAsync() {
  if (Platform.OS === 'web' || await isExpoGo()) {
    console.log('⚠️ Background sync não registrado: não disponível no Expo Go ou Web.');
    return;
  }

  await defineBackgroundSyncTask();

  const status = await BackgroundFetch.getStatusAsync();
  if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || 
      status === BackgroundFetch.BackgroundFetchStatus.Denied) {
    console.warn('⚠️ Background Fetch desativado nas configurações do sistema.');
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  if (isRegistered) {
    console.log('ℹ️ Background sync já estava registrado.');
    return;
  }

  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true
    });
    console.log('✅ Background sync registrado.');
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('is not defined')) {
      console.warn('⚠️ Task não estava definida. Tentando definir novamente.');
      try {
        await defineBackgroundSyncTask();
      } catch {}
    } else {
      console.error('❌ Falha ao registrar background sync:', e);
    }
  }
}

async function unregisterBackgroundSyncAsync() {
  if (Platform.OS === 'web' || await isExpoGo()) {
    console.log('⚠️ Background sync não precisa ser cancelado.');
    return;
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('✅ Background sync cancelado.');
    }
  } catch (e) {
    console.error('❌ Falha ao cancelar background sync:', e);
  }
}

export const BackgroundSyncService = {
  registerBackgroundSyncAsync,
  unregisterBackgroundSyncAsync,
  defineBackgroundSyncTask,
};

export default BackgroundSyncService;
