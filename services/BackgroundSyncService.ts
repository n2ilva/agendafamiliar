import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
// importar SyncService dinamicamente quando necessário para evitar ciclos e
// evitar carregar módulos nativos em ambiente web.

const BACKGROUND_SYNC_TASK = 'background-sync-task';

// Carrega dinamicamente o módulo de background para evitar warnings/deps em ambientes não suportados.
type BackgroundModule = {
  registerTaskAsync: (taskName: string, options: any) => Promise<void>;
  unregisterTaskAsync: (taskName: string) => Promise<void>;
  Result: { NewData: any; NoData: any; Failed: any };
};

async function getAppOwnership(): Promise<"expo" | "standalone" | "guest" | undefined> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants');
    return Constants?.appOwnership as any;
  } catch {
    return undefined;
  }
}

async function getBackgroundModule(): Promise<BackgroundModule | null> {
  // Não disponível no web
  if (Platform.OS === 'web') return null;

  const ownership = await getAppOwnership();
  // Em Expo Go, evite carregar módulos nativos indisponíveis
  if (ownership === 'expo') return null;

  // Tenta novo pacote primeiro (SDKs recentes)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bgTask = require('expo-background-task');
    const Result = bgTask?.Result ?? bgTask?.BackgroundFetchResult ?? { NewData: 'NewData', NoData: 'NoData', Failed: 'Failed' };
    return {
      registerTaskAsync: bgTask.registerTaskAsync,
      unregisterTaskAsync: bgTask.unregisterTaskAsync,
      Result,
    } as BackgroundModule;
  } catch {}

  // Fallback para pacote antigo (deprecado)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bgFetch = require('expo-background-fetch');
    return {
      registerTaskAsync: bgFetch.registerTaskAsync,
      unregisterTaskAsync: bgFetch.unregisterTaskAsync,
      Result: bgFetch.BackgroundFetchResult,
    } as BackgroundModule;
  } catch (e) {
    console.warn('Nenhum módulo de background disponível:', e);
    return null;
  }
}

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('🔄 Executando tarefa de sincronização em segundo plano...');
    // Import dinâmico para evitar dependência circular e carregamento de módulos
    // nativos quando executando em ambientes que não suportam background tasks.
    try {
      const bg = await getBackgroundModule();
      if (!bg) {
        console.log('Background sync não executado (ambiente não suportado ou Expo Go).');
        return 'NoData';
      }

      // Usar require síncrono para carregar o serviço de sync em runtime.
      let SyncService: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        SyncService = require('./SyncService').default;
      } catch (reqErr) {
        console.warn('Falha ao require SyncService na tarefa de background:', reqErr);
        return (await getBackgroundModule())?.Result.NoData ?? 'NoData';
      }

      const isConnected = await SyncService.isNetworkAvailable();
      if (!isConnected) {
        console.log('🚫 Sem conexão de rede, pulando sincronização em segundo plano.');
        const mod = await getBackgroundModule();
        return mod?.Result.NoData ?? 'NoData';
      }

      await SyncService.performBackgroundSync();
    } catch (e) {
      console.warn('Não foi possível executar SyncService na tarefa de background:', e);
      const mod = await getBackgroundModule();
      return mod?.Result.Failed ?? 'Failed';
    }
    
    console.log('✅ Sincronização em segundo plano concluída com sucesso.');
    const mod = await getBackgroundModule();
    return mod?.Result.NewData ?? 'NewData';
  } catch (error) {
    console.error('❌ Erro na sincronização em segundo plano:', error);
    const mod = await getBackgroundModule();
    return mod?.Result.Failed ?? 'Failed';
  }
});

async function registerBackgroundSyncAsync() {
  try {
    const bg = await getBackgroundModule();
    if (!bg) {
      const ownership = await getAppOwnership();
      const env = Platform.OS === 'web' ? 'web' : ownership === 'expo' ? 'Expo Go' : 'ambiente desconhecido';
      console.log(`Background sync não registrado: executando em ${env}. Para testar, use um Development Build (Dev Client).`);
      return;
    }

    await bg.registerTaskAsync(BACKGROUND_SYNC_TASK, {
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
    const bg = await getBackgroundModule();
    if (!bg) {
      console.log('Background sync não cancelado: ambiente sem suporte');
      return;
    }

    await bg.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log('👋 Tarefa de sincronização em segundo plano cancelada.');
  } catch (error) {
    console.error('👎 Falha ao cancelar tarefa de sincronização em segundo plano:', error);
  }
}

export default {
  registerBackgroundSyncAsync,
  unregisterBackgroundSyncAsync,
};
