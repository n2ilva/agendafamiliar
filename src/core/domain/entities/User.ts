/**
 * Entidade de Domínio: User
 * Representa um usuário do sistema com regras de negócio encapsuladas
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Gerencia apenas dados e comportamentos do usuário
 */

import { UserRole } from '../value-objects/UserRole.js';

export interface UserProps {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  role: UserRole;
  familyId?: string;
  avatarSource?: 'remote' | 'local';
  isAnonymous?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notificationsEnabled?: boolean;
  defaultReminderTime?: number; // minutos antes
  language?: string;
}

export class User {
  private readonly props: UserProps;

  private constructor(props: UserProps) {
    this.props = { ...props };
  }

  /**
   * Factory method para criar um novo usuário
   */
  static create(props: Omit<UserProps, 'createdAt' | 'updatedAt'>): User {
    const now = new Date();
    return new User({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Factory method para reconstruir usuário do armazenamento
   */
  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  // ============ Getters ============

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string | undefined {
    return this.props.email;
  }

  get picture(): string | undefined {
    return this.props.picture;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get familyId(): string | undefined {
    return this.props.familyId;
  }

  get avatarSource(): 'remote' | 'local' | undefined {
    return this.props.avatarSource;
  }

  get isAnonymous(): boolean {
    return this.props.isAnonymous ?? false;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  get preferences(): UserPreferences | undefined {
    return this.props.preferences;
  }

  // ============ Métodos de Negócio ============

  /**
   * Verifica se o usuário é administrador da família
   */
  isAdmin(): boolean {
    return this.props.role === 'admin';
  }

  /**
   * Verifica se o usuário precisa de aprovação para tarefas
   */
  needsApproval(): boolean {
    return this.props.role === 'filho';
  }

  /**
   * Verifica se o usuário pode aprovar tarefas
   */
  canApprove(): boolean {
    return this.props.role === 'admin' || this.props.role === 'adulto';
  }

  /**
   * Verifica se o usuário pode gerenciar membros da família
   */
  canManageFamily(): boolean {
    return this.props.role === 'admin';
  }

  /**
   * Verifica se o usuário pertence a uma família
   */
  hasFamily(): boolean {
    return !!this.props.familyId;
  }

  /**
   * Verifica se o usuário pode criar categorias
   */
  canCreateCategories(): boolean {
    return this.props.role === 'admin' || this.props.role === 'adulto';
  }

  /**
   * Atualiza o nome do usuário
   */
  updateName(name: string): User {
    if (!name || name.trim().length === 0) {
      throw new Error('Nome não pode ser vazio');
    }
    if (name.trim().length > 50) {
      throw new Error('Nome não pode ter mais de 50 caracteres');
    }
    
    return new User({
      ...this.props,
      name: name.trim(),
      updatedAt: new Date(),
    });
  }

  /**
   * Atualiza o avatar do usuário
   */
  updateAvatar(picture: string, source: 'remote' | 'local'): User {
    return new User({
      ...this.props,
      picture,
      avatarSource: source,
      updatedAt: new Date(),
    });
  }

  /**
   * Atualiza o role do usuário
   */
  updateRole(role: UserRole): User {
    return new User({
      ...this.props,
      role,
      updatedAt: new Date(),
    });
  }

  /**
   * Associa o usuário a uma família
   */
  joinFamily(familyId: string, role: UserRole = 'adulto'): User {
    return new User({
      ...this.props,
      familyId,
      role,
      updatedAt: new Date(),
    });
  }

  /**
   * Remove o usuário da família
   */
  leaveFamily(): User {
    return new User({
      ...this.props,
      familyId: undefined,
      role: 'adulto',
      updatedAt: new Date(),
    });
  }

  /**
   * Atualiza preferências do usuário
   */
  updatePreferences(preferences: Partial<UserPreferences>): User {
    return new User({
      ...this.props,
      preferences: {
        ...this.props.preferences,
        ...preferences,
      },
      updatedAt: new Date(),
    });
  }

  /**
   * Registra último login
   */
  recordLogin(): User {
    return new User({
      ...this.props,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Converte para objeto plano (persistência)
   */
  toObject(): UserProps {
    return { ...this.props };
  }

  /**
   * Verifica igualdade com outro usuário
   */
  equals(other: User): boolean {
    return this.props.id === other.id;
  }
}
