/**
 * Interface do Serviço de Conectividade
 * Define o contrato para monitoramento de conectividade de rede
 * 
 * Princípio SOLID: Dependency Inversion (D)
 */

export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'unknown' | 'none';

export interface ConnectivityState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: ConnectionType;
  details?: {
    isConnectionExpensive?: boolean;
    cellularGeneration?: '2g' | '3g' | '4g' | '5g';
  };
}

export interface IConnectivityService {
  /**
   * Inicializa o serviço de conectividade
   */
  initialize(): Promise<void>;

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean;

  /**
   * Verifica se a internet está alcançável
   */
  isInternetReachable(): boolean;

  /**
   * Obtém o estado atual de conectividade
   */
  getCurrentState(): ConnectivityState;

  /**
   * Obtém o tipo de conexão atual
   */
  getConnectionType(): ConnectionType;

  /**
   * Verifica conectividade ativamente (ping)
   */
  checkConnectivity(): Promise<boolean>;

  /**
   * Registra listener para mudanças de conectividade
   */
  onConnectivityChange(callback: (state: ConnectivityState) => void): () => void;

  /**
   * Registra listener para quando conectar
   */
  onConnect(callback: () => void): () => void;

  /**
   * Registra listener para quando desconectar
   */
  onDisconnect(callback: () => void): () => void;

  /**
   * Desliga o monitoramento
   */
  dispose(): void;
}
