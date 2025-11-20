import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';

const BACKGROUND_SYNC_TASK = 'background-sync-task';

// Flag para controlar se a task foi definida
let taskDefined = false;

// Background tasks não estão disponíveis no Expo Go.
// Para usar essa funcionalidade, é necessário criar um Development Build (Dev Client).
// Veja: https://docs.expo.dev/develop/development-builds/introduction/

async function isExpoGo(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants');
    return Constants?.appOwnership === 'expo';
  } catch {
    return false;
  }
}

// Define a tarefa de background (funciona apenas em Development Build/Standalone, não em Expo Go)
// Esta função pode ser chamada várias vezes, mas só define a task uma vez
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

        // Import dinâmico para reduzir custo de inicialização e evitar ciclos
        const { default: SyncService } = await import('./SyncService');

        const ok = await SyncService.performBackgroundSync();
        console.log(`✅ [BG] Tarefa concluída. Alterações: ${ok ? 'sim' : 'não'}`);
        return ok
          ? BackgroundFetch.BackgroundFetchResult.NewData
          : BackgroundFetch.BackgroundFetchResult.NoData;
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
    console.log('   Para usar background tasks, crie um Development Build.');
    return;
  }

  // Garantir que a task está definida antes de registrar
  await defineBackgroundSyncTask();

  const status = await BackgroundFetch.getStatusAsync();
  if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || status === BackgroundFetch.BackgroundFetchStatus.Denied) {
    console.warn('⚠️ Background Fetch desativado nas configurações do sistema.');
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  if (!isRegistered) {
    try {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutos (Android respeita; iOS é oportunista)
        stopOnTerminate: false,   // Android: continuar após fechamento
        startOnBoot: true         // Android: iniciar no boot
      });
      console.log('✅ Background sync registrado.');
    } catch (e) {
      console.error('❌ Falha ao registrar background sync:', e);
    }
  } else {
    console.log('ℹ️ Background sync já estava registrado.');
  }
}

async function unregisterBackgroundSyncAsync() {
  if (Platform.OS === 'web' || await isExpoGo()) {
    console.log('⚠️ Background sync não precisa ser cancelado (não está ativo).');
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

export default {
  registerBackgroundSyncAsync,
  unregisterBackgroundSyncAsync,
  defineBackgroundSyncTask,
};
