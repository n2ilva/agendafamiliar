/**
 * Use Case: Rejeitar Aprovação
 * Responsável por rejeitar uma solicitação pendente
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { IApprovalRepository, ApprovalRequest } from '../../interfaces/repositories/IApprovalRepository';
import { ITaskRepository } from '../../interfaces/repositories/ITaskRepository';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { INotificationService } from '../../interfaces/services/INotificationService';
import { IHistoryRepository, HistoryItem } from '../../interfaces/repositories/IHistoryRepository';

export interface RejectApprovalInput {
  approvalId: string;
  rejecterId: string;
  rejecterName: string;
  reason: string;
}

export interface RejectApprovalOutput {
  approval: ApprovalRequest;
  taskDeleted: boolean;
}

export class RejectApprovalUseCase extends BaseUseCase<RejectApprovalInput, RejectApprovalOutput> {
  constructor(
    private readonly approvalRepository: IApprovalRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly userRepository: IUserRepository,
    private readonly notificationService: INotificationService,
    private readonly historyRepository: IHistoryRepository
  ) {
    super();
  }

  protected override validate(input: RejectApprovalInput): Result<void> {
    if (!input.approvalId) {
      return Result.fail('ID da aprovação é obrigatório', 'VALIDATION_ERROR');
    }

    if (!input.rejecterId) {
      return Result.fail('ID do rejeitador é obrigatório', 'VALIDATION_ERROR');
    }

    if (!input.rejecterName) {
      return Result.fail('Nome do rejeitador é obrigatório', 'VALIDATION_ERROR');
    }

    if (!input.reason || input.reason.trim().length === 0) {
      return Result.fail('Motivo da rejeição é obrigatório', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(input: RejectApprovalInput): AsyncResult<RejectApprovalOutput> {
    const validation = this.validate(input);
    if (validation.isFailure) {
      return Result.fail(validation.error!, validation.errorCode);
    }

    try {
      // Buscar solicitação
      const approval = await this.approvalRepository.findById(input.approvalId);
      if (!approval) {
        return Result.fail('Solicitação de aprovação não encontrada', 'APPROVAL_NOT_FOUND');
      }

      // Verificar se ainda está pendente
      if (approval.status !== 'pending') {
        return Result.fail('Esta solicitação já foi processada', 'APPROVAL_ALREADY_PROCESSED');
      }

      // Verificar se rejeitador é admin ou adulto
      const rejecter = await this.userRepository.findById(input.rejecterId);
      if (!rejecter) {
        return Result.fail('Rejeitador não encontrado', 'REJECTER_NOT_FOUND');
      }

      if (rejecter.role !== 'admin' && rejecter.role !== 'adulto') {
        return Result.fail('Apenas admins e adultos podem rejeitar tarefas', 'NOT_AUTHORIZED');
      }

      // Verificar se pertence à mesma família
      if (rejecter.familyId !== approval.familyId) {
        return Result.fail('Rejeitador não pertence à família', 'NOT_FAMILY_MEMBER');
      }

      // Atualizar aprovação
      const updatedApproval: ApprovalRequest = {
        ...approval,
        status: 'rejected',
        reviewerId: input.rejecterId,
        reviewerName: input.rejecterName,
        reviewedAt: new Date(),
        comment: input.reason,
      };

      await this.approvalRepository.update(input.approvalId, updatedApproval);

      // Deletar tarefa pendente
      let taskDeleted = false;
      try {
        await this.taskRepository.delete(approval.taskId);
        taskDeleted = true;
      } catch {
        console.warn('Tarefa já foi deletada ou não existe');
      }

      // Notificar solicitante
      try {
        await this.notificationService.send({
          userId: approval.requesterId,
          title: 'Tarefa Não Aprovada',
          body: `${input.rejecterName} não aprovou: ${approval.taskTitle}`,
          data: {
            type: 'approval_rejected',
            approvalId: input.approvalId,
            reason: input.reason,
          },
        });
      } catch {
        console.warn('Falha ao enviar notificação de rejeição');
      }

      // Registrar no histórico
      try {
        const historyItem: HistoryItem = {
          id: `history_${Date.now()}`,
          action: 'task_rejected',
          timestamp: new Date(),
          userId: input.rejecterId,
          userName: input.rejecterName,
          taskId: approval.taskId,
          taskTitle: approval.taskTitle,
          familyId: approval.familyId,
          details: {
            requesterId: approval.requesterId,
            requesterName: approval.requesterName,
            reason: input.reason,
          },
        };
        await this.historyRepository.add(historyItem);
      } catch {
        console.warn('Falha ao registrar histórico de rejeição');
      }

      return Result.ok({
        approval: updatedApproval,
        taskDeleted,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao rejeitar aprovação';
      return Result.fail(message, 'REJECT_APPROVAL_ERROR');
    }
  }
}
