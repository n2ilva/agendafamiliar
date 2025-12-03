/**
 * Erros de Validação
 * Erros relacionados a validação de dados
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Cada tipo de erro encapsula um contexto específico
 */

import { DomainError, ErrorSeverity } from './DomainError';

export interface ValidationIssue {
  field: string;
  message: string;
  value?: any;
}

export class ValidationError extends DomainError {
  public readonly issues: ValidationIssue[];

  constructor(
    message: string,
    issues: ValidationIssue[] = [],
    context?: Record<string, any>
  ) {
    super({
      code: 'VALIDATION_ERROR',
      message,
      severity: 'low',
      context: { ...context, issues },
    });
    this.issues = issues;
  }

  /**
   * Cria erro de campo obrigatório
   */
  static required(field: string): ValidationError {
    return new ValidationError(
      `O campo ${field} é obrigatório`,
      [{ field, message: 'Campo obrigatório' }]
    );
  }

  /**
   * Cria erro de campo inválido
   */
  static invalid(field: string, message: string, value?: any): ValidationError {
    return new ValidationError(
      message,
      [{ field, message, value }]
    );
  }

  /**
   * Cria erro de tamanho mínimo
   */
  static minLength(field: string, min: number, actual: number): ValidationError {
    return new ValidationError(
      `${field} deve ter pelo menos ${min} caracteres`,
      [{ field, message: `Mínimo ${min} caracteres`, value: actual }]
    );
  }

  /**
   * Cria erro de tamanho máximo
   */
  static maxLength(field: string, max: number, actual: number): ValidationError {
    return new ValidationError(
      `${field} deve ter no máximo ${max} caracteres`,
      [{ field, message: `Máximo ${max} caracteres`, value: actual }]
    );
  }

  /**
   * Cria erro de formato inválido
   */
  static invalidFormat(field: string, expectedFormat: string): ValidationError {
    return new ValidationError(
      `${field} está em formato inválido`,
      [{ field, message: `Formato esperado: ${expectedFormat}` }]
    );
  }

  /**
   * Cria erro com múltiplas issues
   */
  static multiple(issues: ValidationIssue[]): ValidationError {
    const message = issues.length === 1
      ? issues[0].message
      : `${issues.length} erros de validação encontrados`;
    return new ValidationError(message, issues);
  }

  /**
   * Verifica se tem erro em um campo específico
   */
  hasError(field: string): boolean {
    return this.issues.some(i => i.field === field);
  }

  /**
   * Obtém erro de um campo específico
   */
  getFieldError(field: string): string | undefined {
    return this.issues.find(i => i.field === field)?.message;
  }

  /**
   * Obtém todos os campos com erro
   */
  getErrorFields(): string[] {
    return this.issues.map(i => i.field);
  }

  override getUserMessage(): string {
    if (this.issues.length === 1) {
      return this.issues[0].message;
    }
    return 'Por favor, corrija os erros no formulário';
  }
}
