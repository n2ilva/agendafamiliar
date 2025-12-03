/**
 * Use Case: Listar Aprovações Pendentes
 * Responsável por buscar todas as aprovações pendentes de uma família
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { IApprovalRepository, ApprovalRequest } from '../../interfaces/repositories/IApprovalRepository';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';

export interface GetPendingApprovalsInput {
  familyId: string;
  userId: string;
  includeExpired?: boolean;
}

export interface GetPendingApprovalsOutput {
  approvals: ApprovalRequest[];
  total: number;
}

export class GetPendingApprovalsUseCase extends BaseUseCase<GetPendingApprovalsInput, GetPendingApprovalsOutput> {
  constructor(
    private readonly approvalRepository: IApprovalRepository,
    private readonly userRepository: IUserRepository
  ) {
    super();
  }

  protected override validate(input: GetPendingApprovalsInput): Result<void> {
    if (!input.familyId) {
      return Result.fail('ID da família é obrigatório', 'VALIDATION_ERROR');
    }

    if (!input.userId) {
      return Result.fail('ID do usuário é obrigatório', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(input: GetPendingApprovalsInput): AsyncResult<GetPendingApprovalsOutput> {
    const validation = this.validate(input);
    if (validation.isFailure) {
      return Result.fail(validation.error!, validation.errorCode);
    }

    try {
      // Verificar se usuário pertence à família
      const user = await this.userRepository.findById(input.userId);
      if (!user) {
        return Result.fail('Usuário não encontrado', 'USER_NOT_FOUND');
      }

      if (user.familyId !== input.familyId) {
        return Result.fail('Usuário não pertence à família', 'NOT_FAMILY_MEMBER');
      }

      // Buscar aprovações
      let approvals: ApprovalRequest[];
      
      // Se for admin/adulto, pode ver todas
      if (user.role === 'admin' || user.role === 'adulto') {
        approvals = await this.approvalRepository.findPendingByFamilyId(input.familyId);
      } else {
        // Filhos só veem suas próprias solicitações
        approvals = await this.approvalRepository.findByRequesterId(input.userId);
        approvals = approvals.filter(a => a.status === 'pending');
      }

      // Filtrar expiradas se necessário
      if (!input.includeExpired) {
        const now = new Date();
        approvals = approvals.filter(a => {
          if (!a.expiresAt) return true;
          return new Date(a.expiresAt) > now;
        });
      }

      // Ordenar por data de criação (mais recentes primeiro)
      approvals.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return Result.ok({
        approvals,
        total: approvals.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao buscar aprovações';
      return Result.fail(message, 'GET_PENDING_APPROVALS_ERROR');
    }
  }
}
