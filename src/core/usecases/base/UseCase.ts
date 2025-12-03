/**
 * Interface Base para Use Cases
 * Define o contrato padrão para todos os casos de uso
 * 
 * Princípio SOLID: Interface Segregation (I)
 * - Interface simples e específica
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Cada use case tem uma única responsabilidade
 */

import { Result, AsyncResult } from './Result';

/**
 * Interface base para Use Cases síncronos
 */
export interface IUseCase<TRequest, TResponse> {
  execute(request: TRequest): Result<TResponse>;
}

/**
 * Interface base para Use Cases assíncronos
 */
export interface IAsyncUseCase<TRequest, TResponse> {
  execute(request: TRequest): AsyncResult<TResponse>;
}

/**
 * Interface para Use Cases sem parâmetros
 */
export interface IUseCaseNoParams<TResponse> {
  execute(): AsyncResult<TResponse>;
}

/**
 * Classe base abstrata para Use Cases
 * Fornece funcionalidades comuns
 */
export abstract class BaseUseCase<TRequest, TResponse> implements IAsyncUseCase<TRequest, TResponse> {
  /**
   * Método principal de execução
   */
  abstract execute(request: TRequest): AsyncResult<TResponse>;

  /**
   * Valida os dados de entrada
   * Override para adicionar validação customizada
   */
  protected validate(request: TRequest): Result<void> {
    return Result.void();
  }

  /**
   * Executa com validação automática
   */
  protected async executeWithValidation(
    request: TRequest,
    handler: (request: TRequest) => AsyncResult<TResponse>
  ): AsyncResult<TResponse> {
    const validation = this.validate(request);
    if (validation.isFailure) {
      return Result.fail(validation.error!, validation.errorCode);
    }
    return handler(request);
  }
}
