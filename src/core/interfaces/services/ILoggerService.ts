/**
 * Interface do Serviço de Logging
 * Define o contrato para operações de log
 * 
 * Princípio SOLID: Dependency Inversion (D)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  data?: any;
  timestamp: Date;
  stackTrace?: string;
}

export interface ILoggerService {
  /**
   * Log de debug (desenvolvimento)
   */
  debug(tag: string, message: string, data?: any): void;

  /**
   * Log de informação
   */
  info(tag: string, message: string, data?: any): void;

  /**
   * Log de aviso
   */
  warn(tag: string, message: string, data?: any): void;

  /**
   * Log de erro
   */
  error(tag: string, message: string, error?: any): void;

  /**
   * Log de sucesso
   */
  success(tag: string, message: string, data?: any): void;

  /**
   * Define o nível mínimo de log
   */
  setLogLevel(level: LogLevel): void;

  /**
   * Obtém o nível atual de log
   */
  getLogLevel(): LogLevel;

  /**
   * Habilita/desabilita logs
   */
  setEnabled(enabled: boolean): void;

  /**
   * Verifica se logs estão habilitados
   */
  isEnabled(): boolean;

  /**
   * Obtém histórico de logs (se habilitado)
   */
  getHistory(limit?: number): LogEntry[];

  /**
   * Limpa histórico de logs
   */
  clearHistory(): void;

  /**
   * Exporta logs para análise
   */
  export(): Promise<string>;

  /**
   * Envia logs para serviço remoto (crash reporting)
   */
  sendToRemote(entry: LogEntry): Promise<void>;
}
