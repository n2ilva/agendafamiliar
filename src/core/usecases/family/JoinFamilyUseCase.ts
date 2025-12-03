/**
 * Use Case: Entrar em Família
 * Responsável por adicionar um usuário a uma família existente
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { Family } from '../../domain/entities/Family';
import { IFamilyRepository } from '../../interfaces/repositories/IFamilyRepository';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { IHistoryRepository, HistoryItem } from '../../interfaces/repositories/IHistoryRepository';
import { FamilyError } from '../../domain/errors/FamilyError';

export interface JoinFamilyRequest {
  code: string;
  userId: string;
  userName: string;
  userPicture?: string;
  joinAsRole?: 'adulto' | 'filho';
}

export interface JoinFamilyResponse {
  family: Family;
  memberCount: number;
}

export class JoinFamilyUseCase extends BaseUseCase<JoinFamilyRequest, JoinFamilyResponse> {
  constructor(
    private readonly familyRepository: IFamilyRepository,
    private readonly userRepository: IUserRepository,
    private readonly historyRepository: IHistoryRepository
  ) {
    super();
  }

  protected override validate(request: JoinFamilyRequest): Result<void> {
    if (!request.code || request.code.trim().length === 0) {
      return Result.fail('Código da família é obrigatório', 'VALIDATION_ERROR');
    }

    if (!request.userId) {
      return Result.fail('ID do usuário é obrigatório', 'VALIDATION_ERROR');
    }

    if (!request.userName || request.userName.trim().length === 0) {
      return Result.fail('Nome do usuário é obrigatório', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(request: JoinFamilyRequest): AsyncResult<JoinFamilyResponse> {
    const validation = this.validate(request);
    if (validation.isFailure) {
      return Result.fail(validation.error!, validation.errorCode);
    }

    try {
      // Verificar se usuário existe
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        return Result.fail('Usuário não encontrado', 'USER_NOT_FOUND');
      }

      // Verificar se usuário já está em uma família
      if (user.familyId) {
        const error = FamilyError.alreadyMember(user.familyId, request.userId);
        return Result.fail(error.message, error.code);
      }

      // Buscar família pelo código
      const family = await this.familyRepository.findByCode(request.code.trim().toUpperCase());
      if (!family) {
        const error = FamilyError.invalidInviteCode(request.code);
        return Result.fail(error.message, error.code);
      }

      // Verificar se já é membro
      if (family.hasMember(request.userId)) {
        return Result.fail('Usuário já é membro desta família', 'ALREADY_MEMBER');
      }

      // Adicionar membro à família
      const role = request.joinAsRole || 'adulto';
      const updatedFamily = family.addMember({
        id: request.userId,
        name: request.userName.trim(),
        picture: request.userPicture,
        role,
      });

      // Persistir família atualizada
      await this.familyRepository.update(family.id, updatedFamily.toObject());

      // Atualizar usuário com familyId e role
      await this.userRepository.update(request.userId, {
        familyId: family.id,
        role,
      });

      // Registrar no histórico
      try {
        const historyItem: HistoryItem = {
          id: `history_${Date.now()}`,
          action: 'member_joined',
          timestamp: new Date(),
          userId: request.userId,
          userName: request.userName,
          userRole: role,
          familyId: family.id,
          details: {
            familyName: family.name,
          },
        };
        await this.historyRepository.add(historyItem);
      } catch {
        console.warn('Falha ao registrar histórico de entrada na família');
      }

      return Result.ok({
        family: updatedFamily,
        memberCount: updatedFamily.memberCount,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao entrar na família';
      return Result.fail(message, 'JOIN_FAMILY_ERROR');
    }
  }
}
