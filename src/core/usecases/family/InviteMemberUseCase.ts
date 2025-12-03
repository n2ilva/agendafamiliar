/**
 * Use Case: Convidar Membro
 * Responsável por criar um convite para a família
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { Family } from '../../domain/entities/Family';
import { IFamilyRepository } from '../../interfaces/repositories/IFamilyRepository';
import { FamilyError } from '../../domain/errors/FamilyError';

export interface InviteMemberRequest {
  familyId: string;
  invitedBy: string;
  invitedByName?: string;
  expirationHours?: number; // Padrão: 24 horas
  maxUses?: number; // Padrão: 1
}

export interface InviteMemberResponse {
  inviteCode: string;
  expiresAt: Date;
  maxUses: number;
}

export class InviteMemberUseCase extends BaseUseCase<InviteMemberRequest, InviteMemberResponse> {
  constructor(
    private readonly familyRepository: IFamilyRepository
  ) {
    super();
  }

  protected override validate(request: InviteMemberRequest): Result<void> {
    if (!request.familyId) {
      return Result.fail('ID da família é obrigatório', 'VALIDATION_ERROR');
    }

    if (!request.invitedBy) {
      return Result.fail('ID do convidador é obrigatório', 'VALIDATION_ERROR');
    }

    if (request.expirationHours !== undefined && request.expirationHours <= 0) {
      return Result.fail('Horas de expiração deve ser maior que zero', 'VALIDATION_ERROR');
    }

    if (request.maxUses !== undefined && request.maxUses <= 0) {
      return Result.fail('Máximo de usos deve ser maior que zero', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(request: InviteMemberRequest): AsyncResult<InviteMemberResponse> {
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

      // Verificar se quem convida é membro
      if (!family.hasMember(request.invitedBy)) {
        return Result.fail('Apenas membros da família podem convidar', 'NOT_MEMBER');
      }

      // Verificar se é admin (se necessário pelas configurações)
      const member = family.getMember(request.invitedBy);
      if (family.settings?.allowMemberInvites === false && member?.role !== 'admin') {
        return Result.fail('Apenas admins podem criar convites', 'NOT_ADMIN');
      }

      // Calcular expiração
      const expirationHours = request.expirationHours || 24;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);

      const maxUses = request.maxUses || 1;

      // Criar convite
      const updatedFamily = family.createInvite({
        createdBy: request.invitedBy,
        expiresAt,
        maxUses,
      });

      // Persistir
      await this.familyRepository.update(request.familyId, updatedFamily.toObject());

      // Pegar o convite recém-criado
      const newInvite = updatedFamily.activeInvites[updatedFamily.activeInvites.length - 1];

      return Result.ok({
        inviteCode: newInvite.code,
        expiresAt: newInvite.expiresAt,
        maxUses: newInvite.maxUses,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar convite';
      return Result.fail(message, 'INVITE_MEMBER_ERROR');
    }
  }
}
