/**
 * Erros de Armazenamento
 * Erros relacionados a operações de storage
 * 
 * Princípio SOLID: Single Responsibility (S)
 */

import { DomainError } from './DomainError';

export class StorageError extends DomainError {
  constructor(
    code: string,
    message: string,
    context?: Record<string, any>
  ) {
    super({
      code: `STORAGE_${code}`,
      message,
      severity: 'medium',
      context,
    });
  }

  /**
   * Erro ao ler dados
   */
  static readFailed(key: string, reason?: string): StorageError {
    return new StorageError(
      'READ_FAILED',
      `Falha ao ler dados: ${reason || 'erro desconhecido'}`,
      { key, reason }
    );
  }

  /**
   * Erro ao salvar dados
   */
  static writeFailed(key: string, reason?: string): StorageError {
    return new StorageError(
      'WRITE_FAILED',
      `Falha ao salvar dados: ${reason || 'erro desconhecido'}`,
      { key, reason }
    );
  }

  /**
   * Erro ao deletar dados
   */
  static deleteFailed(key: string, reason?: string): StorageError {
    return new StorageError(
      'DELETE_FAILED',
      `Falha ao excluir dados: ${reason || 'erro desconhecido'}`,
      { key, reason }
    );
  }

  /**
   * Dados não encontrados
   */
  static notFound(key: string): StorageError {
    return new StorageError(
      'NOT_FOUND',
      'Dados não encontrados',
      { key }
    );
  }

  /**
   * Dados corrompidos
   */
  static corruptedData(key: string): StorageError {
    return new StorageError(
      'CORRUPTED_DATA',
      'Os dados armazenados estão corrompidos',
      { key }
    );
  }

  /**
   * Armazenamento cheio
   */
  static storageFull(): StorageError {
    return new StorageError(
      'STORAGE_FULL',
      'O armazenamento está cheio. Libere espaço e tente novamente'
    );
  }

  /**
   * Erro de criptografia
   */
  static encryptionFailed(reason?: string): StorageError {
    return new StorageError(
      'ENCRYPTION_FAILED',
      `Falha na criptografia: ${reason || 'erro desconhecido'}`,
      { reason }
    );
  }

  /**
   * Erro de descriptografia
   */
  static decryptionFailed(reason?: string): StorageError {
    return new StorageError(
      'DECRYPTION_FAILED',
      `Falha na descriptografia: ${reason || 'erro desconhecido'}`,
      { reason }
    );
  }

  /**
   * Erro de migração
   */
  static migrationFailed(fromVersion: number, toVersion: number, reason?: string): StorageError {
    return new StorageError(
      'MIGRATION_FAILED',
      `Falha ao migrar dados da versão ${fromVersion} para ${toVersion}`,
      { fromVersion, toVersion, reason }
    );
  }

  /**
   * Chave inválida
   */
  static invalidKey(key: string): StorageError {
    return new StorageError(
      'INVALID_KEY',
      'Chave de armazenamento inválida',
      { key }
    );
  }
}
