import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
// importar SyncService dinamicamente quando necessário para evitar ciclos e
// evitar carregar módulos nativos em ambiente web.

const BACKGROUND_SYNC_TASK = 'background-sync-task';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('🔄 Executando tarefa de sincronização em segundo plano...');
    // Import dinâmico para evitar dependência circular e carregamento de módulos
    // nativos quando executando em ambientes que não suportam BackgroundFetch.
    try {
      // No web não executamos a lógica de sync em background — retornar cedo evita
      // a inclusão de imports dinâmicos/peças nativas no bundle web.
      if (Platform.OS === 'web') {
        console.log('Background sync não executado em web (tarefa definida, mas ignorada).');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      // Usar require síncrono para carregar o serviço de sync em runtime.
      let SyncService: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        SyncService = require('./SyncService').default;
      } catch (reqErr) {
        console.warn('Falha ao require SyncService na tarefa de background:', reqErr);
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      const isConnected = await SyncService.isNetworkAvailable();
      if (!isConnected) {
        console.log('🚫 Sem conexão de rede, pulando sincronização em segundo plano.');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      await SyncService.performBackgroundSync();
    } catch (e) {
      console.warn('Não foi possível executar SyncService na tarefa de background:', e);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
    console.log('✅ Sincronização em segundo plano concluída com sucesso.');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('❌ Erro na sincronização em segundo plano:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

async function registerBackgroundSyncAsync() {
  try {
    // No web não tentamos registrar tarefas nativas (expo-background-fetch não está disponível)
    if (Platform.OS === 'web') {
      console.log('Background sync não registrado: execução em web detectada');
      return;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutos em segundos
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('👍 Tarefa de sincronização em segundo plano registrada com sucesso.');
  } catch (error) {
    console.error('👎 Falha ao registrar tarefa de sincronização em segundo plano:', error);
  }
}

async function unregisterBackgroundSyncAsync() {
  try {
    if (Platform.OS === 'web') {
      console.log('Background sync não cancelado: execução em web detectada');
      return;
    }

    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log('👋 Tarefa de sincronização em segundo plano cancelada.');
  } catch (error) {
    console.error('👎 Falha ao cancelar tarefa de sincronização em segundo plano:', error);
  }
}

export default {
  registerBackgroundSyncAsync,
  unregisterBackgroundSyncAsync,
};
