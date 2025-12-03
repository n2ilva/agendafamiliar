/**
 * Use Case: Criar Família
 * Responsável por criar uma nova família
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { BaseUseCase, Result, AsyncResult } from '../base';
import { Family } from '../../domain/entities/Family';
import { IFamilyRepository } from '../../interfaces/repositories/IFamilyRepository';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { FamilyError } from '../../domain/errors/FamilyError';

export interface CreateFamilyRequest {
  name: string;
  ownerId: string;
  ownerName: string;
  ownerPicture?: string;
}

export interface CreateFamilyResponse {
  family: Family;
  inviteCode: string;
}

export class CreateFamilyUseCase extends BaseUseCase<CreateFamilyRequest, CreateFamilyResponse> {
  constructor(
    private readonly familyRepository: IFamilyRepository,
    private readonly userRepository: IUserRepository
  ) {
    super();
  }

  protected override validate(request: CreateFamilyRequest): Result<void> {
    if (!request.name || request.name.trim().length === 0) {
      return Result.fail('Nome da família é obrigatório', 'VALIDATION_ERROR');
    }

    if (request.name.trim().length > 50) {
      return Result.fail('Nome da família deve ter no máximo 50 caracteres', 'VALIDATION_ERROR');
    }

    if (!request.ownerId) {
      return Result.fail('ID do proprietário é obrigatório', 'VALIDATION_ERROR');
    }

    if (!request.ownerName || request.ownerName.trim().length === 0) {
      return Result.fail('Nome do proprietário é obrigatório', 'VALIDATION_ERROR');
    }

    return Result.void();
  }

  async execute(request: CreateFamilyRequest): AsyncResult<CreateFamilyResponse> {
    const validation = this.validate(request);
    if (validation.isFailure) {
      return Result.fail(validation.error!, validation.errorCode);
    }

    try {
      // Verificar se usuário existe
      const owner = await this.userRepository.findById(request.ownerId);
      if (!owner) {
        return Result.fail('Usuário não encontrado', 'USER_NOT_FOUND');
      }

      // Verificar se usuário já está em uma família
      if (owner.familyId) {
        const error = FamilyError.alreadyMember(owner.familyId, request.ownerId);
        return Result.fail(error.message, error.code);
      }

      // Criar a família
      const family = Family.create({
        name: request.name.trim(),
        ownerId: request.ownerId,
        ownerName: request.ownerName.trim(),
        ownerPicture: request.ownerPicture,
      });

      // Persistir família
      const savedFamily = await this.familyRepository.save(family);

      // Atualizar usuário com familyId
      await this.userRepository.update(request.ownerId, {
        familyId: savedFamily.id,
        role: 'admin',
      });

      return Result.ok({
        family: savedFamily,
        inviteCode: savedFamily.code,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar família';
      return Result.fail(message, 'CREATE_FAMILY_ERROR');
    }
  }
}
