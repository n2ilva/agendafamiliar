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
      if (!this.isUserLoggedInFirebase()) {
        throw new Error('Usuário não está logado no Firebase');
      }

      await this.setSyncStatus('uploading');

      await firebaseService.uploadAllData(userId, localData, familyData);

      await this.setLastSync();
      await this.setSyncStatus('completed');

      console.log('Sincronização para nuvem concluída!');
      return true;
    } catch (error) {
      await this.setSyncStatus('error');
      console.error('Erro na sincronização para nuvem:', error);
      throw error;
    }
  }

  // Sincronização completa (download do Firebase)
  async syncFromCloud(userId) {
    try {
      if (!this.isUserLoggedInFirebase()) {
        throw new Error('Usuário não está logado no Firebase');
      }

      await this.setSyncStatus('downloading');

      const cloudData = await firebaseService.downloadAllData(userId);

      await this.setLastSync();
      await this.setSyncStatus('completed');

      console.log('Sincronização da nuvem concluída!');
      return cloudData;
    } catch (error) {
      await this.setSyncStatus('error');
      console.error('Erro na sincronização da nuvem:', error);
      throw error;
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