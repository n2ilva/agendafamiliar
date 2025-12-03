/**
 * Interface do Repositório de Usuário
 * Define o contrato para operações de persistência de usuários
 * 
 * Princípio SOLID: Dependency Inversion (D)
 */

import { User } from '../../domain/entities/User';
import { UserRole } from '../../domain/value-objects/UserRole';

export interface IUserRepository {
  /**
   * Busca um usuário pelo ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Busca um usuário pelo email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Cria um novo usuário
   */
  create(user: User): Promise<User>;

  /**
   * Salva um novo usuário (alias para create)
   */
  save(user: User): Promise<User>;

  /**
   * Atualiza dados do usuário
   */
  update(id: string, data: Partial<User> | Record<string, unknown>): Promise<User>;

  /**
   * Remove um usuário
   */
  delete(id: string): Promise<void>;

  /**
   * Busca usuários por família e roles
   */
  findByFamilyAndRole(familyId: string, roles: string[]): Promise<User[]>;

  /**
   * Verifica se usuário existe
   */
  exists(id: string): Promise<boolean>;

  /**
   * Verifica se email já está em uso
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Atualiza o papel do usuário
   */
  updateRole(id: string, role: UserRole): Promise<void>;

  /**
   * Atualiza a foto de perfil
   */
  updateProfilePicture(id: string, pictureUrl: string | null): Promise<void>;

  /**
   * Atualiza o ícone de perfil
   */
  updateProfileIcon(id: string, icon: string | null): Promise<void>;

  /**
   * Atualiza o nome do usuário
   */
  updateName(id: string, name: string): Promise<void>;

  /**
   * Associa usuário a uma família
   */
  setFamilyId(id: string, familyId: string | null): Promise<void>;

  /**
   * Busca usuários por família
   */
  findByFamilyId(familyId: string): Promise<User[]>;

  /**
   * Salva usuário no armazenamento local
   */
  saveToLocal(user: User): Promise<void>;

  /**
   * Carrega usuário do armazenamento local
   */
  loadFromLocal(): Promise<User | null>;

  /**
   * Remove usuário do armazenamento local
   */
  removeFromLocal(): Promise<void>;
}
