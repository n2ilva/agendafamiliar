/**
 * Use Case: Obter Usuário Atual
 * Responsável por recuperar o usuário autenticado atual
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { User } from '../../domain/entities/User';
import { IAuthService } from '../../interfaces/services/IAuthService';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { IStorageService } from '../../interfaces/services/IStorageService';

export interface GetCurrentUserRequest {
  forceRefresh?: boolean;
}

export interface GetCurrentUserResponse {
  user: User | null;
  isAuthenticated: boolean;
}

export class GetCurrentUserUseCase extends BaseUseCase<GetCurrentUserRequest, GetCurrentUserResponse> {
  constructor(
    private readonly authService: IAuthService,
    private readonly userRepository: IUserRepository,
    private readonly storageService: IStorageService
  ) {
    super();
  }

  async execute(request: GetCurrentUserRequest): AsyncResult<GetCurrentUserResponse> {
    try {
      // Obter usuário atual do serviço de autenticação
      const authUser = await this.authService.getCurrentUser();

      if (!authUser) {
        // Tentar recuperar do storage local (modo offline)
        const cachedUserId = await this.storageService.get<string>('current_user_id');
        
        if (cachedUserId) {
          const cachedUser = await this.userRepository.findById(cachedUserId);
          if (cachedUser) {
            return Result.ok({
              user: cachedUser,
              isAuthenticated: false, // Offline mode
            });
          }
        }

        return Result.ok({
          user: null,
          isAuthenticated: false,
        });
      }

      // Buscar dados completos do usuário
      let user = await this.userRepository.findById(authUser.uid);

      if (!user) {
        // Criar registro se não existir (primeiro acesso)
        const newUser = User.create({
          id: authUser.uid,
          name: authUser.name || 'Usuário',
          email: authUser.email,
          picture: authUser.picture,
          role: 'adulto', // Role padrão
        });
        user = await this.userRepository.save(newUser);
      } else if (request.forceRefresh) {
        // Atualizar dados do perfil se necessário
        const needsUpdate = 
          (authUser.name && authUser.name !== user.name) ||
          (authUser.picture && authUser.picture !== user.picture) ||
          (authUser.email && authUser.email !== user.email);

        if (needsUpdate) {
          user = await this.userRepository.update(user.id, {
            name: authUser.name || user.name,
            picture: authUser.picture || user.picture,
            email: authUser.email || user.email,
          });
        }
      }

      // Atualizar cache local
      await this.storageService.set('current_user_id', user.id);

      return Result.ok({
        user,
        isAuthenticated: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao obter usuário';
      return Result.fail(message, 'GET_CURRENT_USER_ERROR');
    }
  }
}
