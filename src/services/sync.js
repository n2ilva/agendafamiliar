import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseService from './firebase';
import { loadGoogleCredential, removeGoogleCredential } from './storage';

const SYNC_STATUS_KEY = '@AgendaFamiliar:syncStatus';
const LAST_SYNC_KEY = '@AgendaFamiliar:lastSync';

class SyncService {
  constructor() {
    this.isOnline = true; // Por enquanto, assumimos que está online
  }

  // Verifica se o usuário está logado no Firebase
  isUserLoggedInFirebase() {
    return firebaseService.getCurrentUser() !== null;
  }

  // Garante que o estado de autenticação do Firebase foi pelo menos consultado
  // Retorna o usuário atual (pode ser null) após aguardar um curto período
  async ensureFirebaseUserAvailable(timeoutMs = 3000) {
    try {
      // usa forceRefreshCurrentUser que garante tentar obter estado atualizado
      const user = await firebaseService.forceRefreshCurrentUser(timeoutMs);
      return user;
    } catch (error) {
      console.warn('Erro ao aguardar estado de autenticação do Firebase:', error);
      return null;
    }
  }

  // Salva status de sincronização
  async setSyncStatus(status) {
    try {
      await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({
        status,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Erro ao salvar status de sincronização:', error);
    }
  }

  // Obtém status de sincronização
  async getSyncStatus() {
    try {
      const status = await AsyncStorage.getItem(SYNC_STATUS_KEY);
      return status ? JSON.parse(status) : { status: 'idle', timestamp: null };
    } catch (error) {
      console.error('Erro ao obter status de sincronização:', error);
      return { status: 'idle', timestamp: null };
    }
  }

  // Salva timestamp da última sincronização
  async setLastSync(timestamp = new Date().toISOString()) {
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp);
    } catch (error) {
      console.error('Erro ao salvar timestamp da última sincronização:', error);
    }
  }

  // Obtém timestamp da última sincronização
  async getLastSync() {
    try {
      return await AsyncStorage.getItem(LAST_SYNC_KEY);
    } catch (error) {
      console.error('Erro ao obter timestamp da última sincronização:', error);
      return null;
    }
  }

  // Sincronização completa (upload para Firebase)
  async syncToCloud(userId, localData, familyData = null) {
    try {
      // Validação de entrada
      if (!userId || typeof userId !== 'string') {
        throw new Error('ID do usuário é obrigatório');
      }
      if (!localData || typeof localData !== 'object') {
        throw new Error('Dados locais são obrigatórios');
      }

      // Aguarda o estado do Firebase para evitar falso-negativo em onAuthStateChanged
      const fbUser = await this.ensureFirebaseUserAvailable();
      if (!fbUser) {
        throw new Error('Usuário não está logado no Firebase');
      }

      await this.setSyncStatus('uploading');

  // iniciando upload

      const startTime = Date.now();
      // Faz tentativa de upload com retries caso ocorram erros de autenticação
      await this.attemptWithAuthRetry(async () => {
        await firebaseService.uploadAllData(userId, localData, familyData);
      });
      const duration = Date.now() - startTime;

      await this.setLastSync();
      await this.setSyncStatus('completed');

  // sincronização para nuvem concluída
      return true;
    } catch (error) {
      await this.setSyncStatus('error');
      console.error('Erro na sincronização para nuvem:', error);

      // Classifica o tipo de erro
      if (error.message.includes('network') || error.message.includes('timeout')) {
        throw new Error('Erro de conectividade. Verifique sua conexão com a internet.');
      } else if (error.message.includes('permission') || error.message.includes('auth')) {
        throw new Error('Erro de autenticação. Faça login novamente.');
      } else {
        throw error;
      }
    }
  }

  // Sincronização completa (download do Firebase)
  async syncFromCloud(userId) {
    try {
      // Validação de entrada
      if (!userId || typeof userId !== 'string') {
        throw new Error('ID do usuário é obrigatório');
      }

      const fbUser = await this.ensureFirebaseUserAvailable();
      if (!fbUser) {
        throw new Error('Usuário não está logado no Firebase');
      }

      await this.setSyncStatus('downloading');

  // iniciando download

      const startTime = Date.now();
      let cloudData = null;
      await this.attemptWithAuthRetry(async () => {
        cloudData = await firebaseService.downloadAllData(userId);
      });
      const duration = Date.now() - startTime;

      // Validação dos dados baixados
      if (!cloudData || typeof cloudData !== 'object') {
        throw new Error('Dados inválidos recebidos da nuvem');
      }

      await this.setLastSync();
      await this.setSyncStatus('completed');

  // sincronização da nuvem concluída

      return cloudData;
    } catch (error) {
      await this.setSyncStatus('error');
      console.error('Erro na sincronização da nuvem:', error);

      // Classifica o tipo de erro
      if (error.message.includes('network') || error.message.includes('timeout')) {
        throw new Error('Erro de conectividade. Verifique sua conexão com a internet.');
      } else if (error.message.includes('permission') || error.message.includes('auth')) {
        throw new Error('Erro de autenticação. Faça login novamente.');
      } else if (error.message.includes('not found') || error.message.includes('não encontrado')) {
        throw new Error('Dados não encontrados na nuvem. Você pode precisar fazer upload primeiro.');
      } else {
        throw error;
      }
    }
  }

  // Sincronização bidirecional (merge de dados)
  async syncBidirectional(userId, localData, familyData = null) {
    try {
      const fbUser = await this.ensureFirebaseUserAvailable();
      if (!fbUser) return localData;

      await this.setSyncStatus('syncing');

      // Tenta fazer download dos dados da nuvem (com retries/auth reattempt se necessário)
      let cloudData = null;
      try {
        await this.attemptWithAuthRetry(async () => {
          cloudData = await firebaseService.downloadAllData(userId);
        });
      } catch (downloadError) {
        console.warn('Erro ao fazer download, usando apenas dados locais:', downloadError);
        cloudData = null;
      }

      // Estratégia de merge: dados locais têm prioridade sobre dados da nuvem
      // para tarefas e histórico, mas dados da família são mesclados
      const mergedData = {
        user: localData.user || cloudData?.user || null,
        userType: localData.userType || cloudData?.userType || null,
        tasks: localData.tasks || cloudData?.tasks || [],
        history: localData.history || cloudData?.history || [],
        family: localData.family || cloudData?.family || null
      };

      // Upload dos dados mesclados
      await this.attemptWithAuthRetry(async () => {
        await firebaseService.uploadAllData(userId, mergedData, mergedData.family);
      });

      await this.setLastSync();
      await this.setSyncStatus('completed');

  // sincronização bidirecional concluída
      return mergedData;
    } catch (error) {
      await this.setSyncStatus('error');
      console.error('Erro na sincronização bidirecional:', error);
      // Em caso de erro, retorna dados locais
      return localData;
    }
  }

  // Helper para tentar uma operação e, em caso de erro de autenticação,
  // tentar reautenticar silenciosamente usando credencial do Google armazenada
  // e refazer a operação com backoff. Lança o erro final se não for resolvido.
  async attemptWithAuthRetry(operationFn, maxAttempts = 3) {
    let attempt = 0;
    let lastError = null;

    while (attempt < maxAttempts) {
      try {
        await operationFn();
        return;
      } catch (error) {
        lastError = error;
        const msg = (error && error.message) ? error.message.toLowerCase() : '';

        // Se for erro de autenticação/permissão, tentamos reautenticar
        if (msg.includes('auth') || msg.includes('permission') || msg.includes('authentication')) {
          attempt += 1;
          console.warn(`Erro de autenticação detectado durante sync (tentativa ${attempt}/${maxAttempts}):`, error);

          // Tenta reautenticação silenciosa usando credencial Google salva
          try {
            const credential = await loadGoogleCredential();
            if (credential) {
              try {
                await firebaseService.signInWithGoogle(credential);
                // reautenticação silenciosa bem-sucedida
              } catch (reauthErr) {
                console.warn('Reautenticação silenciosa falhou:', reauthErr);
                // Se falhar reautenticação, removemos credencial para evitar loops
                try { await removeGoogleCredential(); } catch (e) { /* ignore */ }
              }
            } else {
              // nenhuma credencial do Google armazenada para reautenticação
            }
          } catch (e) {
            console.warn('Erro ao tentar reautenticação silenciosa:', e);
          }

          // Aguarda antes de tentar novamente (backoff exponencial)
          const backoffMs = 1000 * Math.pow(3, attempt - 1);
          await new Promise(res => setTimeout(res, backoffMs));
          continue; // próxima tentativa
        }

        // Se não for erro de autenticação, interrompe e repassa
        throw error;
      }
    }

    // Exauriu tentativas
    throw lastError;
  }

  // Método para sincronização automática (chamado após login)
  async autoSyncAfterLogin(userId, localData, familyData = null) {
    try {
      const lastSync = await this.getLastSync();
      const now = new Date();
      const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);
      const hoursSinceLastSync = (now - lastSyncDate) / (1000 * 60 * 60);

      // Se não sincronizou nas últimas 24 horas, faz upload
      if (hoursSinceLastSync > 24) {
        await this.syncToCloud(userId, localData, familyData);
      }
    } catch (error) {
      console.warn('Erro na sincronização automática:', error);
      // Não lança erro para não interromper o login
    }
  }

  // Método para verificar conectividade (simplificado)
  setOnlineStatus(isOnline) {
    this.isOnline = isOnline;
  }

  isOnline() {
    return this.isOnline;
  }
}

// Exporta uma instância singleton
export const syncService = new SyncService();
export default syncService;