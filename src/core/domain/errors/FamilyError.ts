/**
 * Erros de Família
 * Erros relacionados a operações com família
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { DomainError } from './DomainError';

export class FamilyError extends DomainError {
  constructor(
    code: string,
    message: string,
    context?: Record<string, any>
  ) {
    super({
      code: `FAMILY_${code}`,
      message,
      severity: 'medium',
      context,
    });
  }

  /**
   * Família não encontrada
   */
  static notFound(familyId?: string): FamilyError {
    return new FamilyError(
      'NOT_FOUND',
      'Família não encontrada',
      { familyId }
    );
  }

  /**
   * Código de família inválido
   */
  static invalidCode(code: string): FamilyError {
    return new FamilyError(
      'INVALID_CODE',
      'Código de família inválido',
      { code }
    );
  }

  /**
   * Usuário já é membro
   */
  static alreadyMember(familyId: string, userId?: string): FamilyError {
    return new FamilyError(
      'ALREADY_MEMBER',
      'Você já é membro de uma família',
      { userId, familyId }
    );
  }

  /**
   * Código de convite inválido
   */
  static invalidInviteCode(code: string): FamilyError {
    return new FamilyError(
      'INVALID_INVITE_CODE',
      'Código de convite inválido ou expirado',
      { code }
    );
  }

  /**
   * Usuário não é membro
   */
  static notMember(userId: string, familyId: string): FamilyError {
    return new FamilyError(
      'NOT_MEMBER',
      'Você não é membro desta família',
      { userId, familyId }
    );
  }

  /**
   * Sem permissão
   */
  static notAuthorized(action: string): FamilyError {
    return new FamilyError(
      'NOT_AUTHORIZED',
      `Você não tem permissão para ${action}`,
      { action }
    );
  }

  /**
   * Não pode remover o dono
   */
  static cannotRemoveOwner(familyId: string): FamilyError {
    return new FamilyError(
      'CANNOT_REMOVE_OWNER',
      'Não é possível remover o dono da família',
      { familyId }
    );
  }

  /**
   * Não pode alterar role do dono
   */
  static cannotChangeOwnerRole(familyId: string): FamilyError {
    return new FamilyError(
      'CANNOT_CHANGE_OWNER_ROLE',
      'Não é possível alterar o papel do dono da família',
      { familyId }
    );
  }

  /**
   * Convite expirado
   */
  static inviteExpired(inviteCode: string): FamilyError {
    return new FamilyError(
      'INVITE_EXPIRED',
      'Este convite expirou',
      { inviteCode }
    );
  }

  /**
   * Limite de usos do convite atingido
   */
  static inviteLimitReached(inviteCode: string): FamilyError {
    return new FamilyError(
      'INVITE_LIMIT_REACHED',
      'Este convite atingiu o limite de usos',
      { inviteCode }
    );
  }

  /**
   * Convite desativado
   */
  static inviteDeactivated(inviteCode: string): FamilyError {
    return new FamilyError(
      'INVITE_DEACTIVATED',
      'Este convite foi desativado',
      { inviteCode }
    );
  }

  /**
   * Convite não encontrado
   */
  static inviteNotFound(inviteCode: string): FamilyError {
    return new FamilyError(
      'INVITE_NOT_FOUND',
      'Convite não encontrado',
      { inviteCode }
    );
  }

  /**
   * Erro ao criar família
   */
  static creationFailed(reason: string): FamilyError {
    return new FamilyError(
      'CREATION_FAILED',
      `Falha ao criar família: ${reason}`,
      { reason }
    );
  }

  /**
   * Membro não encontrado
   */
  static memberNotFound(userId: string, familyId: string): FamilyError {
    return new FamilyError(
      'MEMBER_NOT_FOUND',
      'Membro não encontrado na família',
      { userId, familyId }
    );
  }

  /**
   * Limite de membros atingido
   */
  static memberLimitReached(limit: number): FamilyError {
    return new FamilyError(
      'MEMBER_LIMIT_REACHED',
      `A família atingiu o limite de ${limit} membros`,
      { limit }
    );
  }

  /**
   * Erro de sincronização
   */
  static syncFailed(familyId: string, reason: string): FamilyError {
    return new FamilyError(
      'SYNC_FAILED',
      `Falha ao sincronizar família: ${reason}`,
      { familyId, reason }
    );
  }
}
