/**
 * Classe Base de Erro de Domínio
 * Todos os erros de domínio estendem esta classe
 * 
 * Princípio SOLID: Liskov Substitution (L)
 * - Erros especializados podem substituir o erro base
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DomainErrorOptions {
  code: string;
  message: string;
  severity?: ErrorSeverity;
  context?: Record<string, any>;
  cause?: Error;
}

export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public readonly cause?: Error;

  constructor(options: DomainErrorOptions) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.severity = options.severity || 'medium';
    this.context = options.context || {};
    this.timestamp = new Date();
    this.cause = options.cause;

    // Mantém stack trace correto no V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Verifica se é um erro crítico
   */
  isCritical(): boolean {
    return this.severity === 'critical';
  }

  /**
   * Converte para objeto plano (para logging)
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause?.message,
    };
  }

  /**
   * Formata mensagem para usuário
   */
  getUserMessage(): string {
    return this.message;
  }
}
