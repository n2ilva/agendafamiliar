/**
 * Result Pattern
 * Padrão para retorno consistente de operações que podem falhar
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Encapsula resultado de operação (sucesso ou falha)
 */

export class Result<T> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  public readonly error?: string;
  public readonly errorCode?: string;
  private readonly _value?: T;

  private constructor(
    isSuccess: boolean,
    error?: string,
    value?: T,
    errorCode?: string
  ) {
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error;
    this.errorCode = errorCode;
    this._value = value;

    Object.freeze(this);
  }

  /**
   * Obtém o valor do resultado
   * @throws Error se tentar acessar valor de um resultado de falha
   */
  get value(): T {
    if (this.isFailure) {
      throw new Error('Não é possível acessar o valor de um resultado de falha');
    }
    return this._value as T;
  }

  /**
   * Obtém o valor ou um valor padrão
   */
  getOrDefault(defaultValue: T): T {
    if (this.isFailure) {
      return defaultValue;
    }
    return this._value as T;
  }

  /**
   * Obtém o valor ou null
   */
  getOrNull(): T | null {
    if (this.isFailure) {
      return null;
    }
    return this._value as T;
  }

  /**
   * Cria um resultado de sucesso
   */
  static ok<U>(value: U): Result<U> {
    return new Result<U>(true, undefined, value);
  }

  /**
   * Cria um resultado de sucesso sem valor (void)
   */
  static void(): Result<void> {
    return new Result<void>(true);
  }

  /**
   * Cria um resultado de falha
   */
  static fail<U>(error: string, errorCode?: string): Result<U> {
    return new Result<U>(false, error, undefined, errorCode);
  }

  /**
   * Combina múltiplos resultados
   * Retorna falha se qualquer um falhar
   */
  static combine(results: Result<any>[]): Result<void> {
    for (const result of results) {
      if (result.isFailure) {
        return Result.fail(result.error!, result.errorCode);
      }
    }
    return Result.void();
  }

  /**
   * Mapeia o valor do resultado para outro tipo
   */
  map<U>(fn: (value: T) => U): Result<U> {
    if (this.isFailure) {
      return Result.fail<U>(this.error!, this.errorCode);
    }
    return Result.ok(fn(this._value as T));
  }

  /**
   * Encadeia operações que retornam Result
   */
  flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isFailure) {
      return Result.fail<U>(this.error!, this.errorCode);
    }
    return fn(this._value as T);
  }

  /**
   * Executa callback se for sucesso
   */
  onSuccess(fn: (value: T) => void): Result<T> {
    if (this.isSuccess) {
      fn(this._value as T);
    }
    return this;
  }

  /**
   * Executa callback se for falha
   */
  onFailure(fn: (error: string, errorCode?: string) => void): Result<T> {
    if (this.isFailure) {
      fn(this.error!, this.errorCode);
    }
    return this;
  }
}

/**
 * Type alias para Result de operações assíncronas
 */
export type AsyncResult<T> = Promise<Result<T>>;
