/**
 * Use Case: Sair da Família
 * Responsável por remover um usuário de uma família
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { IFamilyRepository } from '../../interfaces/repositories/IFamilyRepository';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { ITaskRepository } from '../../interfaces/repositories/ITaskRepository';
import { IHistoryRepository, HistoryItem } from '../../interfaces/repositories/IHistoryRepository';
import { FamilyError } from '../../domain/errors/FamilyError';

export interface LeaveFamilyRequest {
  userId: string;
  userName?: string;
  familyId: string;
  deleteUserTasks?: boolean;
  transferTasksTo?: string;
}

export interface LeaveFamilyResponse {
  success: boolean;
  wasOwner: boolean;
  tasksDeleted: number;
  tasksTransferred: number;
  familyDeleted: boolean;
}

export class LeaveFamilyUseCase extends BaseUseCase<LeaveFamilyRequest, LeaveFamilyResponse> {
  constructor(
    private readonly familyRepository: IFamilyRepository,
    private readonly userRepository: IUserRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly historyRepository: IHistoryRepository
  ) {
    super();
  }

  protected override validate(request: LeaveFamilyRequest): Result<void> {
    if (!request.userId) {
      return Result.fail('ID do usuário é obrigatório', 'VALIDATION_ERROR');
    }

    if (!request.familyId) {
      return Result.fail('ID da família é obrigatório', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(request: LeaveFamilyRequest): AsyncResult<LeaveFamilyResponse> {
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

      // Verificar se é membro
      if (!family.hasMember(request.userId)) {
        return Result.fail('Usuário não é membro desta família', 'NOT_MEMBER');
      }

      const wasOwner = family.ownerId === request.userId;
      let familyDeleted = false;
      let tasksDeleted = 0;
      let tasksTransferred = 0;

      // Se é o dono e é o único membro, deletar a família
      if (wasOwner && family.memberCount === 1) {
        // Deletar todas as tarefas da família
        const tasks = await this.taskRepository.findAll({ familyId: request.familyId });
        for (const task of tasks) {
          await this.taskRepository.delete(task.id);
          tasksDeleted++;
        }

        // Deletar família
        await this.familyRepository.delete(request.familyId);
        familyDeleted = true;
      } else if (wasOwner) {
        // Se é o dono mas tem outros membros, precisa transferir propriedade
        const admins = family.admins.filter((a: { id: string }) => a.id !== request.userId);
        if (admins.length === 0) {
          return Result.fail(
            'Você deve promover outro membro a admin antes de sair',
            'CANNOT_LEAVE_AS_OWNER'
          );
        }

        // Transferir propriedade para primeiro admin
        const newOwner = admins[0];
        const updatedFamily = family
          .transferOwnership(newOwner.id)
          .removeMember(request.userId);

        await this.familyRepository.update(request.familyId, updatedFamily.toObject());
      } else {
        // Remover membro normalmente
        const updatedFamily = family.removeMember(request.userId);
        await this.familyRepository.update(request.familyId, updatedFamily.toObject());
      }

      // Gerenciar tarefas do usuário
      if (!familyDeleted) {
        const userTasks = await this.taskRepository.findByAssigned(request.userId, request.familyId);

        if (request.deleteUserTasks) {
          for (const task of userTasks) {
            await this.taskRepository.delete(task.id);
            tasksDeleted++;
          }
        } else if (request.transferTasksTo) {
          for (const task of userTasks) {
            await this.taskRepository.update(task.id, {
              assignedTo: request.transferTasksTo,
            });
            tasksTransferred++;
          }
        }
      }

      // Atualizar usuário
      await this.userRepository.update(request.userId, {
        familyId: undefined,
        role: undefined,
      });

      // Registrar no histórico
      if (!familyDeleted) {
        try {
          const historyItem: HistoryItem = {
            id: `history_${Date.now()}`,
            action: 'member_left',
            timestamp: new Date(),
            userId: request.userId,
            userName: request.userName,
            familyId: request.familyId,
            details: {
              wasOwner,
              tasksDeleted,
              tasksTransferred,
            },
          };
          await this.historyRepository.add(historyItem);
        } catch {
          console.warn('Falha ao registrar histórico de saída da família');
        }
      }

      return Result.ok({
        success: true,
        wasOwner,
        tasksDeleted,
        tasksTransferred,
        familyDeleted,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao sair da família';
      return Result.fail(message, 'LEAVE_FAMILY_ERROR');
    }
  }
}
