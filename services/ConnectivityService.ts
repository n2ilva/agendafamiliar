import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export interface ConnectivityState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

type ConnectivityCallback = (state: ConnectivityState) => void;

class ConnectivityService {
  private static listeners: ConnectivityCallback[] = [];
  private static currentState: ConnectivityState = {
    isConnected: false,
    isInternetReachable: null,
    type: null
  };
  private static isInitialized = false;

  // Inicializar o serviço de conectividade
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Obter estado atual
      const state = await NetInfo.fetch();
      this.handleConnectivityChange(state);

      // Escutar mudanças de conectividade
      NetInfo.addEventListener(this.handleConnectivityChange);
      
      this.isInitialized = true;
      console.log('ConnectivityService inicializado');
    } catch (error) {
      console.error('Erro ao inicializar ConnectivityService:', error);
      
      // Fallback para web ou em caso de erro
      if (Platform.OS === 'web') {
        this.initializeWebListeners();
      }
    }
  }

  // Inicializar listeners para web
  private static initializeWebListeners(): void {
    if (typeof window !== 'undefined') {
      // Estado inicial para web
      this.currentState = {
        isConnected: navigator.onLine,
        isInternetReachable: navigator.onLine,
        type: 'wifi' // Assumir wifi para web
      };

      // Escutar eventos de conectividade no web
      window.addEventListener('online', this.handleWebOnline);
      window.addEventListener('offline', this.handleWebOffline);
      
      this.isInitialized = true;
      console.log('ConnectivityService inicializado para web');
    }
  }

  // Handler para conectividade online no web
  private static handleWebOnline = (): void => {
    const newState: ConnectivityState = {
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi'
    };
    this.updateState(newState);
  };

  // Handler para conectividade offline no web
  private static handleWebOffline = (): void => {
    const newState: ConnectivityState = {
      isConnected: false,
      isInternetReachable: false,
      type: null
    };
    this.updateState(newState);
  };

  // Handler para mudanças de conectividade (React Native)
  private static handleConnectivityChange = (state: NetInfoState): void => {
    const connectivityState: ConnectivityState = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type
    };
    this.updateState(connectivityState);
  };

  // Atualizar estado e notificar listeners
  private static updateState(newState: ConnectivityState): void {
    const wasConnected = this.currentState.isConnected;
    const isNowConnected = newState.isConnected;

    this.currentState = newState;

    // Log da mudança de estado
    console.log('Conectividade alterada:', {
      wasConnected,
      isNowConnected,
      state: newState
    });

    // Notificar todos os listeners
    this.listeners.forEach(callback => {
      try {
        callback(newState);
      } catch (error) {
        console.error('Erro ao executar callback de conectividade:', error);
      }
    });

    // Se ficou online após estar offline, disparar evento especial
    if (!wasConnected && isNowConnected) {
      this.onBackOnline();
    }
  }

  // Callback especial quando volta a ter internet
  private static onBackOnline(): void {
    console.log('🌐 Internet restaurada - iniciando sincronização');
    // Este evento será usado pelo SyncService para sincronizar dados pendentes
  }

  // Adicionar listener para mudanças de conectividade
  static addConnectivityListener(callback: ConnectivityCallback): () => void {
    this.listeners.push(callback);

    // Retornar função para remover o listener
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Obter estado atual de conectividade
  static getCurrentState(): ConnectivityState {
    return { ...this.currentState };
  }

  // Verificar se está conectado
  static isConnected(): boolean {
    return this.currentState.isConnected;
  }

  // Verificar se tem acesso à internet
  static hasInternetAccess(): boolean {
    return this.currentState.isConnected && 
           (this.currentState.isInternetReachable === true || 
            this.currentState.isInternetReachable === null);
  }

  // Verificar tipo de conexão
  static getConnectionType(): string | null {
    return this.currentState.type;
  }

  // Verificar se está em conexão mobile (celular)
  static isMobileConnection(): boolean {
    const type = this.currentState.type;
    return type === 'cellular' || type === 'other';
  }

  // Verificar se está em WiFi
  static isWiFiConnection(): boolean {
    return this.currentState.type === 'wifi';
  }

  // Forçar verificação de conectividade
  static async checkConnectivity(): Promise<ConnectivityState> {
    try {
      if (Platform.OS === 'web') {
        const isOnline = navigator.onLine;
        this.currentState = {
          isConnected: isOnline,
          isInternetReachable: isOnline,
          type: isOnline ? 'wifi' : null
        };
      } else {
        const state = await NetInfo.fetch();
        this.handleConnectivityChange(state);
      }
    } catch (error) {
      console.error('Erro ao verificar conectividade:', error);
    }

    return this.getCurrentState();
  }

  // Cleanup - remover listeners
  static cleanup(): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleWebOnline);
      window.removeEventListener('offline', this.handleWebOffline);
    }
    
    this.listeners = [];
    this.isInitialized = false;
    console.log('ConnectivityService limpo');
  }

  // Simular perda de conexão (para testes)
  static simulateOffline(): void {
    console.log('🔴 Simulando modo offline');
    const offlineState: ConnectivityState = {
      isConnected: false,
      isInternetReachable: false,
      type: null
    };
    this.updateState(offlineState);
  }

  // Simular volta da conexão (para testes)
  static simulateOnline(): void {
    console.log('🟢 Simulando modo online');
    const onlineState: ConnectivityState = {
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi'
    };
    this.updateState(onlineState);
  }
}

export default ConnectivityService;