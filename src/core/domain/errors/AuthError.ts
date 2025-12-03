/**
 * Erros de Autenticação
 * Erros relacionados a autenticação e autorização
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { DomainError } from './DomainError';

export class AuthError extends DomainError {
  constructor(
    code: string,
    message: string,
    context?: Record<string, any>
  ) {
    super({
      code: `AUTH_${code}`,
      message,
      severity: 'high',
      context,
    });
  }

  /**
   * Não autenticado
   */
  static notAuthenticated(): AuthError {
    return new AuthError(
      'NOT_AUTHENTICATED',
      'Você precisa estar logado para realizar esta ação'
    );
  }

  /**
   * Sessão expirada
   */
  static sessionExpired(): AuthError {
    return new AuthError(
      'SESSION_EXPIRED',
      'Sua sessão expirou. Por favor, faça login novamente'
    );
  }

  /**
   * Token inválido
   */
  static invalidToken(): AuthError {
    return new AuthError(
      'INVALID_TOKEN',
      'Token de autenticação inválido'
    );
  }

  /**
   * Credenciais inválidas
   */
  static invalidCredentials(): AuthError {
    return new AuthError(
      'INVALID_CREDENTIALS',
      'Email ou senha incorretos'
    );
  }

  /**
   * Conta não encontrada
   */
  static accountNotFound(): AuthError {
    return new AuthError(
      'ACCOUNT_NOT_FOUND',
      'Conta não encontrada'
    );
  }

  /**
   * Conta desativada
   */
  static accountDisabled(): AuthError {
    return new AuthError(
      'ACCOUNT_DISABLED',
      'Esta conta foi desativada'
    );
  }

  /**
   * Email não verificado
   */
  static emailNotVerified(): AuthError {
    return new AuthError(
      'EMAIL_NOT_VERIFIED',
      'Por favor, verifique seu email antes de continuar'
    );
  }

  /**
   * Provedor não disponível
   */
  static providerUnavailable(provider: string): AuthError {
    return new AuthError(
      'PROVIDER_UNAVAILABLE',
      `Login com ${provider} não está disponível no momento`,
      { provider }
    );
  }

  /**
   * Erro ao fazer login
   */
  static loginFailed(reason: string): AuthError {
    return new AuthError(
      'LOGIN_FAILED',
      `Falha ao fazer login: ${reason}`,
      { reason }
    );
  }

  /**
   * Erro ao fazer logout
   */
  static logoutFailed(reason: string): AuthError {
    return new AuthError(
      'LOGOUT_FAILED',
      `Falha ao fazer logout: ${reason}`,
      { reason }
    );
  }

  /**
   * Sem permissão
   */
  static forbidden(action?: string): AuthError {
    const message = action
      ? `Você não tem permissão para ${action}`
      : 'Você não tem permissão para realizar esta ação';
    return new AuthError('FORBIDDEN', message, { action });
  }

  /**
   * Rate limit excedido
   */
  static rateLimitExceeded(): AuthError {
    return new AuthError(
      'RATE_LIMIT_EXCEEDED',
      'Muitas tentativas. Por favor, aguarde alguns minutos'
    );
  }

  /**
   * Login cancelado pelo usuário
   */
  static loginCancelled(): AuthError {
    return new AuthError(
      'LOGIN_CANCELLED',
      'Login cancelado'
    );
  }

  /**
   * Email já está em uso
   */
  static emailAlreadyInUse(email: string): AuthError {
    return new AuthError(
      'EMAIL_ALREADY_IN_USE',
      'Este email já está em uso',
      { email }
    );
  }

  /**
   * Erro de rede durante autenticação
   */
  static networkError(): AuthError {
    return new AuthError(
      'NETWORK_ERROR',
      'Erro de conexão. Verifique sua internet e tente novamente'
    );
  }
}
