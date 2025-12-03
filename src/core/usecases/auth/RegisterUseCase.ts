/**
 * Use Case: Registro
 * Responsável por criar uma nova conta de usuário
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { User } from '../../domain/entities/User';
import { IAuthService, RegisterResult } from '../../interfaces/services/IAuthService';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { IStorageService } from '../../interfaces/services/IStorageService';
import { AuthError } from '../../domain/errors/AuthError';

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  picture?: string;
}

export interface RegisterResponse {
  user: User;
  token: string;
}

export class RegisterUseCase extends BaseUseCase<RegisterRequest, RegisterResponse> {
  constructor(
    private readonly authService: IAuthService,
    private readonly userRepository: IUserRepository,
    private readonly storageService: IStorageService
  ) {
    super();
  }

  protected override validate(request: RegisterRequest): Result<void> {
    if (!request.name || request.name.trim().length === 0) {
      return Result.fail('Nome é obrigatório', 'VALIDATION_ERROR');
    }

    if (request.name.trim().length > 50) {
      return Result.fail('Nome deve ter no máximo 50 caracteres', 'VALIDATION_ERROR');
    }

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

    if (request.password.length > 100) {
      return Result.fail('Senha deve ter no máximo 100 caracteres', 'VALIDATION_ERROR');
    }

    if (request.password !== request.confirmPassword) {
      return Result.fail('As senhas não conferem', 'VALIDATION_ERROR');
    }

    if (!this.isStrongPassword(request.password)) {
      return Result.fail(
        'Senha deve conter letras e números',
        'VALIDATION_ERROR'
      );
    }

    return Result.void();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isStrongPassword(password: string): boolean {
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasLetter && hasNumber;
  }

  async execute(request: RegisterRequest): AsyncResult<RegisterResponse> {
    const validation = this.validate(request);
    if (validation.isFailure) {
      return Result.fail(validation.error!, validation.errorCode);
    }

    try {
      // Verificar se email já está em uso
      const existingUser = await this.userRepository.findByEmail(request.email);
      if (existingUser) {
        const error = AuthError.emailAlreadyInUse(request.email);
        return Result.fail(error.message, error.code);
      }

      // Criar conta no serviço de autenticação
      const registerResult: RegisterResult = await this.authService.register(
        request.email,
        request.password,
        request.name.trim()
      );

      if (!registerResult.success || !registerResult.user) {
        const message = registerResult.error || 'Erro ao criar conta';
        return Result.fail(message, 'REGISTER_ERROR');
      }

      // Criar registro do usuário no banco
      const newUser = User.create({
        id: registerResult.user.uid,
        name: request.name.trim(),
        email: request.email,
        picture: request.picture,
        role: 'adulto', // Role padrão para novos usuários
      });

      const savedUser = await this.userRepository.save(newUser);

      // Salvar token de sessão
      await this.storageService.setSecure('auth_token', registerResult.token!);
      await this.storageService.set('current_user_id', savedUser.id);

      return Result.ok({
        user: savedUser,
        token: registerResult.token!,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar conta';
      return Result.fail(message, 'REGISTER_ERROR');
    }
  }
}
