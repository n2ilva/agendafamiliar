/**
 * Use Case: Logout
 * Responsável por deslogar um usuário
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { IAuthService } from '../../interfaces/services/IAuthService';
import { IStorageService } from '../../interfaces/services/IStorageService';
import { ISyncService } from '../../interfaces/services/ISyncService';

export interface LogoutRequest {
  userId?: string;
  clearLocalData?: boolean;
}

export interface LogoutResponse {
  success: boolean;
  localDataCleared: boolean;
}

export class LogoutUseCase extends BaseUseCase<LogoutRequest, LogoutResponse> {
  constructor(
    private readonly authService: IAuthService,
    private readonly storageService: IStorageService,
    private readonly syncService: ISyncService
  ) {
    super();
  }

  async execute(request: LogoutRequest): AsyncResult<LogoutResponse> {
    try {
      // Parar sincronização em background
      await this.syncService.stopBackgroundSync();

      // Realizar logout no serviço de autenticação
      await this.authService.signOut();

      // Remover tokens de autenticação
      await this.storageService.removeSecure('auth_token');
      await this.storageService.remove('current_user_id');

      let localDataCleared = false;

      // Limpar dados locais se solicitado
      if (request.clearLocalData) {
        await this.storageService.clear();
        localDataCleared = true;
      }

      return Result.ok({
        success: true,
        localDataCleared,
      });
    } catch (error) {
      // Mesmo com erro, tentamos limpar dados locais
      try {
        await this.storageService.removeSecure('auth_token');
        await this.storageService.remove('current_user_id');
      } catch {
        // Ignorar erros de limpeza
      }

      const message = error instanceof Error ? error.message : 'Erro ao fazer logout';
      return Result.fail(message, 'LOGOUT_ERROR');
    }
  }
}
