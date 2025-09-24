import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseService from './firebase';

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

      if (!this.isUserLoggedInFirebase()) {
        throw new Error('Usuário não está logado no Firebase');
      }

      await this.setSyncStatus('uploading');

      console.log(`Iniciando upload para usuário ${userId}...`);

      const startTime = Date.now();
      await firebaseService.uploadAllData(userId, localData, familyData);
      const duration = Date.now() - startTime;

      await this.setLastSync();
      await this.setSyncStatus('completed');

      console.log(`Sincronização para nuvem concluída em ${duration}ms!`);
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

      if (!this.isUserLoggedInFirebase()) {
        throw new Error('Usuário não está logado no Firebase');
      }

      await this.setSyncStatus('downloading');

      console.log(`Iniciando download para usuário ${userId}...`);

      const startTime = Date.now();
      const cloudData = await firebaseService.downloadAllData(userId);
      const duration = Date.now() - startTime;

      // Validação dos dados baixados
      if (!cloudData || typeof cloudData !== 'object') {
        throw new Error('Dados inválidos recebidos da nuvem');
      }

      await this.setLastSync();
      await this.setSyncStatus('completed');

      console.log(`Sincronização da nuvem concluída em ${duration}ms!`);
      console.log(`Dados baixados: ${cloudData.tasks?.length || 0} tarefas, ${cloudData.history?.length || 0} itens de histórico`);

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
      if (!this.isUserLoggedInFirebase()) {
        console.log('Usuário não logado no Firebase, pulando sincronização');
        return localData;
      }

      await this.setSyncStatus('syncing');

      // Tenta fazer download dos dados da nuvem
      let cloudData;
      try {
        cloudData = await firebaseService.downloadAllData(userId);
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
      await firebaseService.uploadAllData(userId, mergedData, mergedData.family);

      await this.setLastSync();
      await this.setSyncStatus('completed');

      console.log('Sincronização bidirecional concluída!');
      return mergedData;
    } catch (error) {
      await this.setSyncStatus('error');
      console.error('Erro na sincronização bidirecional:', error);
      // Em caso de erro, retorna dados locais
      return localData;
    }
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
        console.log('Fazendo sincronização automática após login...');
        await this.syncToCloud(userId, localData, familyData);
      } else {
        console.log('Sincronização recente encontrada, pulando upload automático');
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