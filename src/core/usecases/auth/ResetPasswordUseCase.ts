/**
 * Use Case: Recuperar Senha
 * Responsável por enviar email de recuperação de senha
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { IAuthService } from '../../interfaces/services/IAuthService';

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export class ResetPasswordUseCase extends BaseUseCase<ResetPasswordRequest, ResetPasswordResponse> {
  constructor(
    private readonly authService: IAuthService
  ) {
    super();
  }

  protected override validate(request: ResetPasswordRequest): Result<void> {
    if (!request.email) {
      return Result.fail('Email é obrigatório', 'VALIDATION_ERROR');
    }

    if (!this.isValidEmail(request.email)) {
      return Result.fail('Email inválido', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async execute(request: ResetPasswordRequest): AsyncResult<ResetPasswordResponse> {
    const validation = this.validate(request);
    if (validation.isFailure) {
      return Result.fail(validation.error!, validation.errorCode);
    }

    try {
      // Enviar email de recuperação
      await this.authService.sendPasswordResetEmail(request.email);

      // Sempre retorna sucesso para não revelar se email existe ou não
      return Result.ok({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.',
      });
    } catch (error) {
      // Retornar sucesso mesmo em caso de erro para segurança
      // (não revelar se email existe)
      return Result.ok({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.',
      });
    }
  }
}
