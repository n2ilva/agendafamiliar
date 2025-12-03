/**
 * Entidade de Domínio: Family
 * Representa uma família com regras de negócio encapsuladas
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Gerencia apenas dados e comportamentos da família
 */

import { User } from './User';

export interface FamilyMember {
  id: string;
  name: string;
  role: 'admin' | 'adulto' | 'filho';
  picture?: string;
  joinedAt: Date;
}

export interface FamilyInvite {
  id: string;
  code: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  maxUses: number;
  uses: number;
  isActive: boolean;
}

export interface FamilyProps {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  members: FamilyMember[];
  invites: FamilyInvite[];
  createdAt: Date;
  updatedAt: Date;
  settings?: FamilySettings;
}

export interface FamilySettings {
  childrenNeedApproval?: boolean;
  sharedCategories?: boolean;
  allowMemberInvites?: boolean;
  timezone?: string;
}

export class Family {
  private readonly props: FamilyProps;

  private constructor(props: FamilyProps) {
    this.props = { ...props };
  }

  /**
   * Factory method para criar uma nova família
   */
  static create(props: { name: string; ownerId: string; ownerName: string; ownerPicture?: string }): Family {
    const now = new Date();
    const code = Family.generateCode();
    
    const owner: FamilyMember = {
      id: props.ownerId,
      name: props.ownerName,
      role: 'admin',
      picture: props.ownerPicture,
      joinedAt: now,
    };

    return new Family({
      id: `family_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: props.name,
      code,
      ownerId: props.ownerId,
      members: [owner],
      invites: [],
      createdAt: now,
      updatedAt: now,
      settings: {
        childrenNeedApproval: true,
        sharedCategories: true,
        allowMemberInvites: false,
      },
    });
  }

  /**
   * Factory method para reconstruir família do armazenamento
   */
  static fromPersistence(props: FamilyProps): Family {
    return new Family(props);
  }

  /**
   * Gera código de convite único
   */
  private static generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ============ Getters ============

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get code(): string {
    return this.props.code;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get members(): FamilyMember[] {
    return [...this.props.members];
  }

  get invites(): FamilyInvite[] {
    return [...this.props.invites];
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get settings(): FamilySettings | undefined {
    return this.props.settings;
  }

  // ============ Métodos de Negócio ============

  /**
   * Obtém o número de membros
   */
  get memberCount(): number {
    return this.props.members.length;
  }

  /**
   * Obtém membros com role admin
   */
  get admins(): FamilyMember[] {
    return this.props.members.filter(m => m.role === 'admin');
  }

  /**
   * Obtém convites ativos
   */
  get activeInvites(): FamilyInvite[] {
    const now = new Date();
    return this.props.invites.filter(i => i.isActive && new Date(i.expiresAt) > now);
  }

  /**
   * Verifica se um usuário é membro
   */
  hasMember(userId: string): boolean {
    return this.props.members.some(m => m.id === userId);
  }

  /**
   * Verifica se um usuário é membro (alias)
   */
  isMember(userId: string): boolean {
    return this.hasMember(userId);
  }

  /**
   * Verifica se um usuário é o dono
   */
  isOwner(userId: string): boolean {
    return this.props.ownerId === userId;
  }

  /**
   * Verifica se um usuário é admin
   */
  isAdmin(userId: string): boolean {
    const member = this.props.members.find(m => m.id === userId);
    return member?.role === 'admin';
  }

  /**
   * Obtém um membro pelo ID
   */
  getMember(userId: string): FamilyMember | undefined {
    return this.props.members.find(m => m.id === userId);
  }

  /**
   * Obtém membros por role
   */
  getMembersByRole(role: 'admin' | 'adulto' | 'filho'): FamilyMember[] {
    return this.props.members.filter(m => m.role === role);
  }

  /**
   * Obtém membros que podem aprovar
   */
  getApprovers(): FamilyMember[] {
    return this.props.members.filter(m => m.role === 'admin' || m.role === 'adulto');
  }

  /**
   * Verifica se filhos precisam de aprovação
   */
  childrenNeedApproval(): boolean {
    return this.props.settings?.childrenNeedApproval ?? true;
  }

  /**
   * Adiciona um membro à família
   */
  addMember(member: { id: string; name: string; picture?: string; role?: 'adulto' | 'filho' }): Family {
    if (this.hasMember(member.id)) {
      throw new Error('Usuário já é membro da família');
    }

    const newMember: FamilyMember = {
      id: member.id,
      name: member.name,
      role: member.role || 'adulto',
      picture: member.picture,
      joinedAt: new Date(),
    };

    return new Family({
      ...this.props,
      members: [...this.props.members, newMember],
      updatedAt: new Date(),
    });
  }

  /**
   * Remove um membro da família
   */
  removeMember(userId: string): Family {
    if (!this.hasMember(userId)) {
      throw new Error('Usuário não é membro da família');
    }
    
    if (this.isOwner(userId)) {
      throw new Error('Não é possível remover o dono da família');
    }

    return new Family({
      ...this.props,
      members: this.props.members.filter(m => m.id !== userId),
      updatedAt: new Date(),
    });
  }

  /**
   * Atualiza o role de um membro
   */
  updateMemberRole(userId: string, role: 'admin' | 'adulto' | 'filho'): Family {
    if (!this.hasMember(userId)) {
      throw new Error('Usuário não é membro da família');
    }

    // Não pode remover o role de admin do dono
    if (this.isOwner(userId) && role !== 'admin') {
      throw new Error('Não é possível alterar o role do dono da família');
    }

    return new Family({
      ...this.props,
      members: this.props.members.map(m =>
        m.id === userId ? { ...m, role } : m
      ),
      updatedAt: new Date(),
    });
  }

  /**
   * Cria convite para a família
   */
  createInvite(options: { createdBy: string; maxUses?: number; expiresInDays?: number; expiresAt?: Date }): Family {
    const now = new Date();
    let expiresAt: Date;
    
    if (options.expiresAt) {
      expiresAt = options.expiresAt;
    } else {
      expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + (options.expiresInDays ?? 7));
    }

    const invite: FamilyInvite = {
      id: `invite_${Date.now()}`,
      code: Family.generateCode(),
      createdBy: options.createdBy,
      createdAt: now,
      expiresAt,
      maxUses: options.maxUses ?? 10,
      uses: 0,
      isActive: true,
    };

    return new Family({
      ...this.props,
      invites: [...this.props.invites, invite],
      updatedAt: new Date(),
    });
  }

  /**
   * Usa um convite (incrementa contador)
   */
  useInvite(inviteCode: string): Family {
    const invite = this.props.invites.find(i => i.code === inviteCode);
    
    if (!invite) {
      throw new Error('Convite não encontrado');
    }
    
    if (!invite.isActive) {
      throw new Error('Convite não está ativo');
    }
    
    if (invite.uses >= invite.maxUses) {
      throw new Error('Convite atingiu o limite de usos');
    }
    
    if (new Date() > invite.expiresAt) {
      throw new Error('Convite expirado');
    }

    return new Family({
      ...this.props,
      invites: this.props.invites.map(i =>
        i.code === inviteCode
          ? { ...i, uses: i.uses + 1, isActive: i.uses + 1 < i.maxUses }
          : i
      ),
      updatedAt: new Date(),
    });
  }

  /**
   * Desativa um convite
   */
  deactivateInvite(inviteId: string): Family {
    return new Family({
      ...this.props,
      invites: this.props.invites.map(i =>
        i.id === inviteId ? { ...i, isActive: false } : i
      ),
      updatedAt: new Date(),
    });
  }

  /**
   * Atualiza o nome da família
   */
  updateName(name: string): Family {
    if (!name || name.trim().length === 0) {
      throw new Error('Nome não pode ser vazio');
    }
    if (name.trim().length > 50) {
      throw new Error('Nome não pode ter mais de 50 caracteres');
    }

    return new Family({
      ...this.props,
      name: name.trim(),
      updatedAt: new Date(),
    });
  }

  /**
   * Atualiza configurações da família
   */
  updateSettings(settings: Partial<FamilySettings>): Family {
    return new Family({
      ...this.props,
      settings: {
        ...this.props.settings,
        ...settings,
      },
      updatedAt: new Date(),
    });
  }

  /**
   * Transfere propriedade para outro admin
   */
  transferOwnership(newOwnerId: string): Family {
    const newOwner = this.props.members.find(m => m.id === newOwnerId);
    
    if (!newOwner) {
      throw new Error('Novo dono deve ser membro da família');
    }
    
    if (newOwner.role !== 'admin') {
      throw new Error('Novo dono deve ser admin');
    }

    return new Family({
      ...this.props,
      ownerId: newOwnerId,
      updatedAt: new Date(),
    });
  }

  /**
   * Regenera o código da família
   */
  regenerateCode(): Family {
    return new Family({
      ...this.props,
      code: Family.generateCode(),
      updatedAt: new Date(),
    });
  }

  /**
   * Converte para objeto plano (persistência)
   */
  toObject(): FamilyProps {
    return { ...this.props };
  }

  /**
   * Verifica igualdade com outra família
   */
  equals(other: Family): boolean {
    return this.props.id === other.id;
  }
}
