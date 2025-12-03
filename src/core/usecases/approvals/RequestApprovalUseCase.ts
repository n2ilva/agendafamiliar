/**
 * Use Case: Solicitar Aprovação
 * Responsável por criar uma solicitação de aprovação para tarefa
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { Task } from '../../domain/entities/Task';
import { IApprovalRepository, ApprovalRequest } from '../../interfaces/repositories/IApprovalRepository';
import { ITaskRepository } from '../../interfaces/repositories/ITaskRepository';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { INotificationService } from '../../interfaces/services/INotificationService';
import { TaskError } from '../../domain/errors/TaskError';

export interface RequestApprovalInput {
  taskId: string;
  requesterId: string;
  requesterName: string;
  familyId: string;
  taskTitle: string;
  taskDescription?: string;
}

export interface RequestApprovalOutput {
  approvalRequest: ApprovalRequest;
  notificationsSent: number;
}

export class RequestApprovalUseCase extends BaseUseCase<RequestApprovalInput, RequestApprovalOutput> {
  constructor(
    private readonly approvalRepository: IApprovalRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly userRepository: IUserRepository,
    private readonly notificationService: INotificationService
  ) {
    super();
  }

  protected override validate(input: RequestApprovalInput): Result<void> {
    if (!input.taskId) {
      return Result.fail('ID da tarefa é obrigatório', 'VALIDATION_ERROR');
    }

    if (!input.requesterId) {
      return Result.fail('ID do solicitante é obrigatório', 'VALIDATION_ERROR');
    }

    if (!input.requesterName) {
      return Result.fail('Nome do solicitante é obrigatório', 'VALIDATION_ERROR');
    }

    if (!input.familyId) {
      return Result.fail('ID da família é obrigatório', 'VALIDATION_ERROR');
    }

    if (!input.taskTitle) {
      return Result.fail('Título da tarefa é obrigatório', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(input: RequestApprovalInput): AsyncResult<RequestApprovalOutput> {
    const validation = this.validate(input);
    if (validation.isFailure) {
      return Result.fail(validation.error!, validation.errorCode);
    }

    try {
      // Verificar se tarefa existe
      const task = await this.taskRepository.findById(input.taskId);
      if (!task) {
        const error = TaskError.notFound(input.taskId);
        return Result.fail(error.message, error.code);
      }

      // Verificar se já existe solicitação pendente
      const existingRequest = await this.approvalRepository.findPendingByTaskId(input.taskId);
      if (existingRequest) {
        return Result.fail('Já existe uma solicitação de aprovação pendente para esta tarefa', 'APPROVAL_ALREADY_EXISTS');
      }

      // Criar solicitação
      const approvalRequest: ApprovalRequest = {
        id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        taskId: input.taskId,
        requesterId: input.requesterId,
        requesterName: input.requesterName,
        familyId: input.familyId,
        taskTitle: input.taskTitle,
        taskDescription: input.taskDescription,
        status: 'pending',
        createdAt: new Date(),
      };

      // Salvar solicitação
      await this.approvalRepository.save(approvalRequest);

      // Atualizar status da tarefa
      await this.taskRepository.update(input.taskId, {
        requiresApproval: true,
        approvalStatus: 'pending',
      } as Partial<Task>);

      // Notificar admins/adultos da família
      let notificationsSent = 0;
      const familyAdmins = await this.userRepository.findByFamilyAndRole(input.familyId, ['admin', 'adulto']);
      
      for (const admin of familyAdmins) {
        if (admin.id !== input.requesterId) {
          try {
            await this.notificationService.send({
              userId: admin.id,
              title: 'Nova Solicitação de Aprovação',
              body: `${input.requesterName} quer criar: ${input.taskTitle}`,
              data: {
                type: 'approval_request',
                approvalId: approvalRequest.id,
                taskId: input.taskId,
              },
            });
            notificationsSent++;
          } catch {
            console.warn(`Falha ao enviar notificação para ${admin.id}`);
          }
        }
      }

      return Result.ok({
        approvalRequest,
        notificationsSent,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao solicitar aprovação';
      return Result.fail(message, 'REQUEST_APPROVAL_ERROR');
    }
  }
}
