/**
 * Erros de Rede
 * Erros relacionados a conectividade e sincronização
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { DomainError } from './DomainError';

export class NetworkError extends DomainError {
  constructor(
    code: string,
    message: string,
    context?: Record<string, any>
  ) {
    super({
      code: `NETWORK_${code}`,
      message,
      severity: 'medium',
      context,
    });
  }

  /**
   * Sem conexão
   */
  static noConnection(): NetworkError {
    return new NetworkError(
      'NO_CONNECTION',
      'Sem conexão com a internet'
    );
  }

  /**
   * Timeout
   */
  static timeout(operation?: string): NetworkError {
    const message = operation
      ? `A operação "${operation}" excedeu o tempo limite`
      : 'A operação excedeu o tempo limite';
    return new NetworkError('TIMEOUT', message, { operation });
  }

  /**
   * Servidor indisponível
   */
  static serverUnavailable(): NetworkError {
    return new NetworkError(
      'SERVER_UNAVAILABLE',
      'O servidor está temporariamente indisponível. Tente novamente mais tarde'
    );
  }

  /**
   * Erro de sincronização
   */
  static syncFailed(reason?: string): NetworkError {
    return new NetworkError(
      'SYNC_FAILED',
      `Falha na sincronização: ${reason || 'erro desconhecido'}`,
      { reason }
    );
  }

  /**
   * Conflito de sincronização
   */
  static syncConflict(entity: string): NetworkError {
    return new NetworkError(
      'SYNC_CONFLICT',
      `Conflito detectado ao sincronizar ${entity}`,
      { entity }
    );
  }

  /**
   * Erro de API
   */
  static apiError(statusCode: number, message?: string): NetworkError {
    return new NetworkError(
      'API_ERROR',
      message || `Erro do servidor (${statusCode})`,
      { statusCode }
    );
  }

  /**
   * Dados offline salvos
   */
  static savedOffline(entity: string): NetworkError {
    return new NetworkError(
      'SAVED_OFFLINE',
      `${entity} salvo localmente. Será sincronizado quando online`,
      { entity }
    );
  }

  /**
   * Operação não disponível offline
   */
  static offlineNotSupported(operation: string): NetworkError {
    return new NetworkError(
      'OFFLINE_NOT_SUPPORTED',
      `"${operation}" não está disponível offline`,
      { operation }
    );
  }
}
