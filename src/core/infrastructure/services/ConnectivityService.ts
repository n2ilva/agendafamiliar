import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export interface ConnectivityState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

type ConnectivityCallback = (state: ConnectivityState) => void;

/**
 * Serviço de Conectividade - Clean Architecture
 * Gerencia estado de conexão com internet e notifica mudanças
 */
export class ConnectivityService {
  private static listeners: ConnectivityCallback[] = [];
  private static currentState: ConnectivityState = {
    isConnected: false,
    isInternetReachable: null,
    type: null
  };
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const state = await NetInfo.fetch();
      this.handleConnectivityChange(state);
      NetInfo.addEventListener(this.handleConnectivityChange);
      
      this.isInitialized = true;
      console.log('ConnectivityService inicializado');
    } catch (error) {
      console.error('Erro ao inicializar ConnectivityService:', error);
      
      if (Platform.OS === 'web') {
        this.initializeWebListeners();
      }
    }
  }

  private static initializeWebListeners(): void {
    if (typeof window !== 'undefined') {
      this.currentState = {
        isConnected: navigator.onLine,
        isInternetReachable: navigator.onLine,
        type: 'wifi'
      };

      window.addEventListener('online', this.handleWebOnline);
      window.addEventListener('offline', this.handleWebOffline);
      
      this.isInitialized = true;
      console.log('ConnectivityService inicializado para web');
    }
  }

  private static handleWebOnline = (): void => {
    const newState: ConnectivityState = {
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi'
    };
    this.updateState(newState);
  };

  private static handleWebOffline = (): void => {
    const newState: ConnectivityState = {
      isConnected: false,
      isInternetReachable: false,
      type: null
    };
    this.updateState(newState);
  };

  private static handleConnectivityChange = (state: NetInfoState): void => {
    const connectivityState: ConnectivityState = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type
    };
    this.updateState(connectivityState);
  };

  private static updateState(newState: ConnectivityState): void {
    const wasConnected = this.currentState.isConnected;
    const isNowConnected = newState.isConnected;

    this.currentState = newState;

    console.log('Conectividade alterada:', {
      wasConnected,
      isNowConnected,
      state: newState
    });

    this.listeners.forEach(callback => {
      try {
        callback(newState);
      } catch (error) {
        console.error('Erro ao executar callback de conectividade:', error);
      }
    });

    if (!wasConnected && isNowConnected) {
      this.onBackOnline();
    }
  }

  private static onBackOnline(): void {
    console.log('🌐 Internet restaurada - iniciando sincronização');
  }

  static addConnectivityListener(callback: ConnectivityCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  static getCurrentState(): ConnectivityState {
    return { ...this.currentState };
  }

  static isConnected(): boolean {
    return this.currentState.isConnected;
  }

  static hasInternetAccess(): boolean {
    return this.currentState.isConnected && 
           (this.currentState.isInternetReachable === true || 
            this.currentState.isInternetReachable === null);
  }

  static getConnectionType(): string | null {
    return this.currentState.type;
  }

  static isMobileConnection(): boolean {
    const type = this.currentState.type;
    return type === 'cellular' || type === 'other';
  }

  static isWiFiConnection(): boolean {
    return this.currentState.type === 'wifi';
  }

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

  static cleanup(): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleWebOnline);
      window.removeEventListener('offline', this.handleWebOffline);
    }
    
    this.listeners = [];
    this.isInitialized = false;
    console.log('ConnectivityService limpo');
  }

  static simulateOffline(): void {
    console.log('🔴 Simulando modo offline');
    const offlineState: ConnectivityState = {
      isConnected: false,
      isInternetReachable: false,
      type: null
    };
    this.updateState(offlineState);
  }

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
