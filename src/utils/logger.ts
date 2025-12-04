/**
 * Sistema de Logging Estruturado
 * 
 * Fornece logging com níveis, tags e formatação consistente.
 * Em produção, silencia logs informativos e mantém apenas erros críticos.
 */

// ============ Types ============
export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  data?: unknown;
}

// ============ Config ============
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  success: 2,
  warn: 3,
  error: 4,
};

const LOG_LEVEL_ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  success: '✅',
  warn: '⚠️',
  error: '❌',
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[34m',  // blue
  success: '\x1b[32m', // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};

const RESET_COLOR = '\x1b[0m';

// ============ Logger Class ============
class Logger {
  private minLevel: LogLevel = __DEV__ ? 'debug' : 'warn';
  private enabledTags: Set<string> = new Set();
  private disabledTags: Set<string> = new Set();
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  /**
   * Configura o nível mínimo de log
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Habilita logs apenas para tags específicas
   */
  enableTags(...tags: string[]): void {
    tags.forEach(tag => this.enabledTags.add(tag));
  }

  /**
   * Desabilita logs para tags específicas
   */
  disableTags(...tags: string[]): void {
    tags.forEach(tag => this.disabledTags.add(tag));
  }

  /**
   * Limpa filtros de tags
   */
  clearTagFilters(): void {
    this.enabledTags.clear();
    this.disabledTags.clear();
  }

  /**
   * Retorna histórico de logs
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Limpa histórico de logs
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Verifica se deve logar baseado no nível e tag
   */
  private shouldLog(level: LogLevel, tag: string): boolean {
    // Verifica nível
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return false;
    }

    // Verifica tags desabilitadas
    if (this.disabledTags.has(tag)) {
      return false;
    }

    // Se há tags habilitadas, verifica se a tag está na lista
    if (this.enabledTags.size > 0 && !this.enabledTags.has(tag)) {
      return false;
    }

    return true;
  }

  /**
   * Formata timestamp
   */
  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().split('T')[1].slice(0, 12);
  }

  /**
   * Método principal de log
   */
  private log(level: LogLevel, tag: string, message: string, data?: unknown): void {
    if (!this.shouldLog(level, tag)) {
      return;
    }

    const timestamp = this.formatTimestamp();
    const icon = LOG_LEVEL_ICONS[level];
    const color = LOG_LEVEL_COLORS[level];

    // Armazena no histórico
    const entry: LogEntry = { timestamp, level, tag, message, data };
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Formata output
    const prefix = `${icon} [${timestamp}] [${tag}]`;
    const formattedMessage = `${color}${prefix}${RESET_COLOR} ${message}`;

    // Log no console
    switch (level) {
      case 'error':
        data !== undefined 
          ? console.error(formattedMessage, data) 
          : console.error(formattedMessage);
        break;
      case 'warn':
        data !== undefined 
          ? console.warn(formattedMessage, data) 
          : console.warn(formattedMessage);
        break;
      default:
        data !== undefined 
          ? console.log(formattedMessage, data) 
          : console.log(formattedMessage);
    }
  }

  // ============ Public Methods ============
  debug(tag: string, message: string, data?: unknown): void {
    this.log('debug', tag, message, data);
  }

  info(tag: string, message: string, data?: unknown): void {
    this.log('info', tag, message, data);
  }

  success(tag: string, message: string, data?: unknown): void {
    this.log('success', tag, message, data);
  }

  warn(tag: string, message: string, data?: unknown): void {
    this.log('warn', tag, message, data);
  }

  error(tag: string, message: string, data?: unknown): void {
    this.log('error', tag, message, data);
  }

  // ============ Grouped Logging ============
  group(tag: string, label: string): void {
    if (!this.shouldLog('info', tag)) return;
    console.group(`📂 [${tag}] ${label}`);
  }

  groupEnd(): void {
    console.groupEnd();
  }

  // ============ Performance Timing ============
  time(label: string): void {
    console.time(label);
  }

  timeEnd(label: string): void {
    console.timeEnd(label);
  }

  // ============ Table Output ============
  table(tag: string, data: unknown[]): void {
    if (!this.shouldLog('info', tag)) return;
    console.log(`📊 [${tag}]`);
    console.table(data);
  }
}

// ============ Singleton Instance ============
export const logger = new Logger();

// ============ Legacy Support ============
/**
 * @deprecated Use logger.setMinLevel() em vez disso
 */
export const setupLogger = () => {
  if (!__DEV__) {
    logger.setMinLevel('warn');
  }
};

export default logger;
