/**
 * Use Case: Login
 * Responsável por autenticar um usuário
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { User } from '../../domain/entities/User';
import { IAuthService, LoginResult } from '../../interfaces/services/IAuthService';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { IStorageService } from '../../interfaces/services/IStorageService';
import { AuthError } from '../../domain/errors/AuthError';

export interface LoginRequest {
  email?: string;
  password?: string;
  provider?: 'email' | 'google' | 'apple' | 'anonymous';
  token?: string; // Para login com providers externos
}

export interface LoginResponse {
  user: User;
  token: string;
  isNewUser: boolean;
}

export class LoginUseCase extends BaseUseCase<LoginRequest, LoginResponse> {
  constructor(
    private readonly authService: IAuthService,
    private readonly userRepository: IUserRepository,
    private readonly storageService: IStorageService
  ) {
    super();
  }

  protected override validate(request: LoginRequest): Result<void> {
    const provider = request.provider || 'email';

    if (provider === 'email') {
      if (!request.email) {
        return Result.fail('Email é obrigatório', 'VALIDATION_ERROR');
      }

      if (!this.isValidEmail(request.email)) {
        return Result.fail('Email inválido', 'VALIDATION_ERROR');
      }

      if (!request.password) {
        return Result.fail('Senha é obrigatória', 'VALIDATION_ERROR');
      }

      if (request.password.length < 6) {
        return Result.fail('Senha deve ter no mínimo 6 caracteres', 'VALIDATION_ERROR');
      }
    } else if (provider !== 'anonymous' && !request.token) {
      return Result.fail('Token é obrigatório para login social', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async execute(request: LoginRequest): AsyncResult<LoginResponse> {
    const validation = this.validate(request);
    if (validation.isFailure) {
      return Result.fail(validation.error!, validation.errorCode);
    }

    try {
      let loginResult: LoginResult;
      const provider = request.provider || 'email';

      // Realizar autenticação baseada no provider
      switch (provider) {
        case 'email':
          loginResult = await this.authService.signInWithEmail(
            request.email!,
            request.password!
          );
          break;
        case 'google':
          loginResult = await this.authService.signInWithGoogle(request.token!);
          break;
        case 'apple':
          loginResult = await this.authService.signInWithApple(request.token!);
          break;
        case 'anonymous':
          loginResult = await this.authService.signInAnonymously();
          break;
        default:
          const error = AuthError.invalidCredentials();
          return Result.fail(error.message, error.code);
      }

      if (!loginResult.success || !loginResult.user) {
        const error = AuthError.invalidCredentials();
        return Result.fail(error.message, error.code);
      }

      // Verificar se é um novo usuário
      let user = await this.userRepository.findById(loginResult.user.uid);
      let isNewUser = false;

      if (!user) {
        // Criar registro do usuário
        isNewUser = true;
        const newUser = User.create({
          id: loginResult.user.uid,
          name: loginResult.user.name || 'Usuário',
          email: loginResult.user.email,
          picture: loginResult.user.picture,
          role: 'adulto', // Role padrão para novos usuários
        });
        user = await this.userRepository.save(newUser);
      }

      // Salvar token de sessão
      await this.storageService.setSecure('auth_token', loginResult.token!);
      await this.storageService.set('current_user_id', user.id);

      return Result.ok({
        user,
        token: loginResult.token!,
        isNewUser,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer login';
      return Result.fail(message, 'LOGIN_ERROR');
    }
  }
}
