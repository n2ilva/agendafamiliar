/**
 * Logger utility para controlar logs em desenvolvimento vs produção
 * Em DEV: mostra todos os logs
 * Em PROD: desabilita console.logs (mantém errors)
 */

const LOG_ENABLED = __DEV__;

export const logger = {
  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug: (tag: string, data?: any) => {
    if (LOG_ENABLED) {
      console.log(`[${tag}]`, data ?? '');
    }
  },

  /**
   * Log de informação (apenas em desenvolvimento)
   */
  info: (tag: string, message: string, data?: any) => {
    if (LOG_ENABLED) {
      console.log(`[ℹ️ ${tag}] ${message}`, data ?? '');
    }
  },

  /**
   * Log de aviso (sempre mostrado)
   */
  warn: (tag: string, message: string, data?: any) => {
    console.warn(`[⚠️ ${tag}] ${message}`, data ?? '');
  },

  /**
   * Log de erro (sempre mostrado)
   */
  error: (tag: string, message: string, error?: any) => {
    console.error(`[❌ ${tag}] ${message}`, error ?? '');
  },

  /**
   * Log de sucesso (apenas em desenvolvimento)
   */
  success: (tag: string, message: string, data?: any) => {
    if (LOG_ENABLED) {
      console.log(`[✅ ${tag}] ${message}`, data ?? '');
    }
  },
};

export default logger;
