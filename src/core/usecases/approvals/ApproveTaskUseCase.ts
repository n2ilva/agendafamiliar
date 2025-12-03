/**
 * Use Case: Aprovar Tarefa
 * Responsável por aprovar uma solicitação pendente
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { Task } from '../../domain/entities/Task';
import { IApprovalRepository, ApprovalRequest } from '../../interfaces/repositories/IApprovalRepository';
import { ITaskRepository } from '../../interfaces/repositories/ITaskRepository';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { INotificationService } from '../../interfaces/services/INotificationService';
import { IHistoryRepository, HistoryItem } from '../../interfaces/repositories/IHistoryRepository';
import { TaskError } from '../../domain/errors/TaskError';

export interface ApproveTaskInput {
  approvalId: string;
  approverId: string;
  approverName: string;
  comment?: string;
}

export interface ApproveTaskOutput {
  approval: ApprovalRequest;
  task: Task;
}

export class ApproveTaskUseCase extends BaseUseCase<ApproveTaskInput, ApproveTaskOutput> {
  constructor(
    private readonly approvalRepository: IApprovalRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly userRepository: IUserRepository,
    private readonly notificationService: INotificationService,
    private readonly historyRepository: IHistoryRepository
  ) {
    super();
  }

  protected override validate(input: ApproveTaskInput): Result<void> {
    if (!input.approvalId) {
      return Result.fail('ID da aprovação é obrigatório', 'VALIDATION_ERROR');
    }

    if (!input.approverId) {
      return Result.fail('ID do aprovador é obrigatório', 'VALIDATION_ERROR');
    }

    if (!input.approverName) {
      return Result.fail('Nome do aprovador é obrigatório', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(input: ApproveTaskInput): AsyncResult<ApproveTaskOutput> {
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

      // Verificar se aprovador é admin ou adulto
      const approver = await this.userRepository.findById(input.approverId);
      if (!approver) {
        return Result.fail('Aprovador não encontrado', 'APPROVER_NOT_FOUND');
      }

      if (approver.role !== 'admin' && approver.role !== 'adulto') {
        return Result.fail('Apenas admins e adultos podem aprovar tarefas', 'NOT_AUTHORIZED');
      }

      // Verificar se pertence à mesma família
      if (approver.familyId !== approval.familyId) {
        return Result.fail('Aprovador não pertence à família', 'NOT_FAMILY_MEMBER');
      }

      // Atualizar aprovação
      const updatedApproval: ApprovalRequest = {
        ...approval,
        status: 'approved',
        reviewerId: input.approverId,
        reviewerName: input.approverName,
        reviewedAt: new Date(),
        comment: input.comment,
      };

      await this.approvalRepository.update(input.approvalId, updatedApproval);

      // Buscar e atualizar tarefa
      const task = await this.taskRepository.findById(approval.taskId);
      if (!task) {
        const error = TaskError.notFound(approval.taskId);
        return Result.fail(error.message, error.code);
      }

      await this.taskRepository.update(approval.taskId, {
        approvalStatus: 'approved',
        approvedBy: input.approverId,
        approvedAt: new Date(),
      } as Partial<Task>);

      const updatedTask = await this.taskRepository.findById(approval.taskId);

      // Notificar solicitante
      try {
        await this.notificationService.send({
          userId: approval.requesterId,
          title: 'Tarefa Aprovada!',
          body: `${input.approverName} aprovou: ${approval.taskTitle}`,
          data: {
            type: 'approval_approved',
            approvalId: input.approvalId,
            taskId: approval.taskId,
          },
        });
      } catch {
        console.warn('Falha ao enviar notificação de aprovação');
      }

      // Registrar no histórico
      try {
        const historyItem: HistoryItem = {
          id: `history_${Date.now()}`,
          action: 'task_approved',
          timestamp: new Date(),
          userId: input.approverId,
          userName: input.approverName,
          taskId: approval.taskId,
          taskTitle: approval.taskTitle,
          familyId: approval.familyId,
          details: {
            requesterId: approval.requesterId,
            requesterName: approval.requesterName,
            comment: input.comment,
          },
        };
        await this.historyRepository.add(historyItem);
      } catch {
        console.warn('Falha ao registrar histórico de aprovação');
      }

      return Result.ok({
        approval: updatedApproval,
        task: updatedTask!,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao aprovar tarefa';
      return Result.fail(message, 'APPROVE_TASK_ERROR');
    }
  }
}
