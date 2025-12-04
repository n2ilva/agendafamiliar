/**
 * Logger utility para controlar logs em desenvolvimento vs produção
 * Em DEV: mostra logs baseado no nível de verbosidade
 * Em PROD: desabilita todos os logs (mantém apenas errors críticos)
 * 
 * Níveis de verbosidade:
 * 0 - Silencioso (apenas erros críticos)
 * 1 - Mínimo (erros + warnings + eventos importantes)
 * 2 - Normal (+ info de sincronização e auth)
 * 3 - Verbose (todos os logs de debug)
 */

const LOG_ENABLED = __DEV__;

// Nível de verbosidade: 0=silent, 1=minimal, 2=normal, 3=verbose
// Altere para 1 para reduzir logs, 3 para debug completo
const VERBOSITY_LEVEL = 1;

export const logger = {
  /**
   * Log de debug (apenas em desenvolvimento, verbosidade >= 3)
   */
  debug: (tag: string, message?: string, data?: any) => {
    if (LOG_ENABLED && VERBOSITY_LEVEL >= 3) {
      console.log(`[${tag}]`, message ?? '', data ?? '');
    }
  },

  /**
   * Log de informação (apenas em desenvolvimento, verbosidade >= 2)
   */
  info: (tag: string, message: string, data?: any) => {
    if (LOG_ENABLED && VERBOSITY_LEVEL >= 2) {
      console.log(`[ℹ️ ${tag}] ${message}`, data ?? '');
    }
  },

  /**
   * Log de aviso (verbosidade >= 1)
   */
  warn: (tag: string, message: string, data?: any) => {
    if (VERBOSITY_LEVEL >= 1) {
      console.warn(`[⚠️ ${tag}] ${message}`, data ?? '');
    }
  },

  /**
   * Log de erro (sempre mostrado)
   */
  error: (tag: string, message: string, error?: any) => {
    console.error(`[❌ ${tag}] ${message}`, error ?? '');
  },

  /**
   * Log de sucesso (apenas em desenvolvimento, verbosidade >= 2)
   */
  success: (tag: string, message: string, data?: any) => {
    if (LOG_ENABLED && VERBOSITY_LEVEL >= 2) {
      console.log(`[✅ ${tag}] ${message}`, data ?? '');
    }
  },
  
  /**
   * Log importante - eventos críticos de sistema (verbosidade >= 1)
   * Use para: auth completo, sync completo, erros recuperáveis
   */
  important: (tag: string, message: string, data?: any) => {
    if (LOG_ENABLED && VERBOSITY_LEVEL >= 1) {
      console.log(`[📌 ${tag}] ${message}`, data ?? '');
    }
  },
};

export default logger;
