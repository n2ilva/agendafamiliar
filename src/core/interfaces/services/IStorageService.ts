/**
 * Interface do Serviço de Armazenamento
 * Define o contrato para operações de armazenamento local
 * 
 * Princípio SOLID: Dependency Inversion (D)
 */

export interface StorageOptions {
  encrypted?: boolean;
  expiresIn?: number; // ms
}

export interface CacheInfo {
  key: string;
  size: number;
  createdAt: number;
  expiresAt?: number;
}

export interface IStorageService {
  /**
   * Salva um valor no armazenamento
   */
  set<T>(key: string, value: T, options?: StorageOptions): Promise<void>;

  /**
   * Obtém um valor do armazenamento
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Remove um valor do armazenamento
   */
  remove(key: string): Promise<void>;

  /**
   * Verifica se uma chave existe
   */
  has(key: string): Promise<boolean>;

  /**
   * Lista todas as chaves
   */
  keys(): Promise<string[]>;

  /**
   * Lista chaves com um prefixo
   */
  keysWithPrefix(prefix: string): Promise<string[]>;

  /**
   * Limpa todo o armazenamento
   */
  clear(): Promise<void>;

  /**
   * Limpa chaves com um prefixo
   */
  clearWithPrefix(prefix: string): Promise<void>;

  /**
   * Obtém múltiplos valores de uma vez
   */
  getMultiple<T>(keys: string[]): Promise<Record<string, T | null>>;

  /**
   * Salva múltiplos valores de uma vez
   */
  setMultiple<T>(items: Record<string, T>, options?: StorageOptions): Promise<void>;

  /**
   * Remove múltiplos valores de uma vez
   */
  removeMultiple(keys: string[]): Promise<void>;

  /**
   * Salva um valor de forma segura (criptografado)
   */
  setSecure(key: string, value: string): Promise<void>;

  /**
   * Obtém um valor seguro (criptografado)
   */
  getSecure(key: string): Promise<string | null>;

  /**
   * Remove um valor seguro
   */
  removeSecure(key: string): Promise<void>;

  /**
   * Obtém informações sobre o cache
   */
  getCacheInfo(): Promise<CacheInfo[]>;

  /**
   * Obtém o tamanho total do armazenamento
   */
  getTotalSize(): Promise<number>;

  /**
   * Limpa itens expirados
   */
  clearExpired(): Promise<number>;

  /**
   * Migra dados de versão anterior (se necessário)
   */
  migrate(fromVersion: number, toVersion: number): Promise<void>;

  /**
   * Exporta todos os dados (backup)
   */
  exportAll(): Promise<Record<string, any>>;

  /**
   * Importa dados (restore)
   */
  importAll(data: Record<string, any>): Promise<void>;
}
