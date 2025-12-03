/**
 * Interface do Repositório de Categorias
 * Define o contrato para operações de persistência de categorias
 * 
 * Princípio SOLID: Dependency Inversion (D)
 */

import { Category } from '../../domain/entities/Category';

export interface ICategoryRepository {
  /**
   * Busca uma categoria pelo ID
   */
  findById(id: string, familyId?: string): Promise<Category | null>;

  /**
   * Busca todas as categorias disponíveis para uma família
   * Inclui categorias padrão + customizadas da família
   */
  findAll(familyId?: string): Promise<Category[]>;

  /**
   * Busca apenas categorias padrão do sistema
   */
  findDefaults(): Promise<Category[]>;

  /**
   * Busca categorias customizadas de uma família
   */
  findByFamily(familyId: string): Promise<Category[]>;

  /**
   * Cria uma nova categoria customizada
   */
  create(category: Category, familyId: string): Promise<Category>;

  /**
   * Atualiza uma categoria existente
   */
  update(id: string, data: Partial<Category>, familyId: string): Promise<Category>;

  /**
   * Remove uma categoria customizada
   */
  delete(id: string, familyId: string): Promise<void>;

  /**
   * Verifica se uma categoria existe
   */
  exists(id: string, familyId?: string): Promise<boolean>;

  /**
   * Verifica se uma categoria é padrão (não pode ser editada/removida)
   */
  isDefault(id: string): Promise<boolean>;

  /**
   * Inscreve-se para atualizações de categorias em tempo real
   */
  subscribeToChanges(
    familyId: string,
    callback: (categories: Category[]) => void
  ): () => void;
}
