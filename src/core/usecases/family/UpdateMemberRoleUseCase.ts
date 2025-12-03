/**
 * Use Case: Atualizar Role do Membro
 * Responsável por alterar o papel de um membro na família
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { Family } from '../../domain/entities/Family';
import { IFamilyRepository } from '../../interfaces/repositories/IFamilyRepository';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { IHistoryRepository, HistoryItem } from '../../interfaces/repositories/IHistoryRepository';
import { FamilyError } from '../../domain/errors/FamilyError';

export type MemberRole = 'admin' | 'adulto' | 'filho';

export interface UpdateMemberRoleRequest {
  familyId: string;
  memberId: string;
  newRole: MemberRole;
  updatedBy: string;
  updatedByName?: string;
}

export interface UpdateMemberRoleResponse {
  family: Family;
  previousRole: MemberRole;
  newRole: MemberRole;
}

export class UpdateMemberRoleUseCase extends BaseUseCase<UpdateMemberRoleRequest, UpdateMemberRoleResponse> {
  constructor(
    private readonly familyRepository: IFamilyRepository,
    private readonly userRepository: IUserRepository,
    private readonly historyRepository: IHistoryRepository
  ) {
    super();
  }

  protected override validate(request: UpdateMemberRoleRequest): Result<void> {
    if (!request.familyId) {
      return Result.fail('ID da família é obrigatório', 'VALIDATION_ERROR');
    }

    if (!request.memberId) {
      return Result.fail('ID do membro é obrigatório', 'VALIDATION_ERROR');
    }

    if (!request.newRole) {
      return Result.fail('Nova role é obrigatória', 'VALIDATION_ERROR');
    }

    const validRoles: MemberRole[] = ['admin', 'adulto', 'filho'];
    if (!validRoles.includes(request.newRole)) {
      return Result.fail('Role inválida', 'VALIDATION_ERROR');
    }

    if (!request.updatedBy) {
      return Result.fail('ID do atualizador é obrigatório', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(request: UpdateMemberRoleRequest): AsyncResult<UpdateMemberRoleResponse> {
    const validation = this.validate(request);
    if (validation.isFailure) {
      return Result.fail(validation.error!, validation.errorCode);
    }

    try {
      // Buscar família
      const family = await this.familyRepository.findById(request.familyId);
      if (!family) {
        const error = FamilyError.notFound(request.familyId);
        return Result.fail(error.message, error.code);
      }

      // Verificar se quem atualiza é admin
      const updater = family.getMember(request.updatedBy);
      if (!updater || updater.role !== 'admin') {
        return Result.fail('Apenas admins podem alterar roles', 'NOT_ADMIN');
      }

      // Verificar se membro existe
      const member = family.getMember(request.memberId);
      if (!member) {
        return Result.fail('Membro não encontrado', 'MEMBER_NOT_FOUND');
      }

      // Não pode alterar própria role
      if (request.memberId === request.updatedBy) {
        return Result.fail('Não é possível alterar a própria role', 'CANNOT_CHANGE_OWN_ROLE');
      }

      // Não pode rebaixar o dono
      if (request.memberId === family.ownerId && request.newRole !== 'admin') {
        return Result.fail('Não é possível rebaixar o proprietário da família', 'CANNOT_DEMOTE_OWNER');
      }

      const previousRole = member.role as MemberRole;

      // Atualizar role na família
      const updatedFamily = family.updateMemberRole(request.memberId, request.newRole);

      // Persistir
      await this.familyRepository.update(request.familyId, updatedFamily.toObject());

      // Atualizar role no usuário
      await this.userRepository.update(request.memberId, {
        role: request.newRole,
      });

      // Registrar no histórico
      try {
        const historyItem: HistoryItem = {
          id: `history_${Date.now()}`,
          action: 'member_role_changed',
          timestamp: new Date(),
          userId: request.updatedBy,
          userName: request.updatedByName,
          familyId: request.familyId,
          details: {
            memberId: request.memberId,
            memberName: member.name,
            previousRole,
            newRole: request.newRole,
          },
        };
        await this.historyRepository.add(historyItem);
      } catch {
        console.warn('Falha ao registrar histórico de alteração de role');
      }

      return Result.ok({
        family: updatedFamily,
        previousRole,
        newRole: request.newRole,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar role do membro';
      return Result.fail(message, 'UPDATE_MEMBER_ROLE_ERROR');
    }
  }
}
