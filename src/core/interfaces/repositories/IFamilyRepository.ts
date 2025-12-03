/**
 * Interface do Repositório de Família
 * Define o contrato para operações de persistência de famílias
 * 
 * Princípio SOLID: Dependency Inversion (D)
 */

import { Family, FamilyMember, FamilyProps } from '../../domain/entities/Family';
import { RolePermissions } from '../../domain/value-objects/UserRole';

export interface IFamilyRepository {
  /**
   * Busca uma família pelo ID
   */
  findById(id: string): Promise<Family | null>;

  /**
   * Busca a família de um usuário
   */
  findByUserId(userId: string): Promise<Family | null>;

  /**
   * Busca família pelo código de convite
   */
  findByInviteCode(code: string): Promise<Family | null>;

  /**
   * Busca família pelo código
   */
  findByCode(code: string): Promise<Family | null>;

  /**
   * Cria uma nova família
   */
  create(family: Family): Promise<Family>;

  /**
   * Salva uma nova família (alias para create)
   */
  save(family: Family): Promise<Family>;

  /**
   * Atualiza dados da família
   */
  update(id: string, data: Partial<Family> | FamilyProps): Promise<Family>;

  /**
   * Remove uma família
   */
  delete(id: string): Promise<void>;

  /**
   * Adiciona um membro à família
   */
  addMember(familyId: string, member: FamilyMember): Promise<void>;

  /**
   * Remove um membro da família
   */
  removeMember(familyId: string, userId: string): Promise<void>;

  /**
   * Atualiza dados de um membro
   */
  updateMember(familyId: string, userId: string, data: Partial<FamilyMember>): Promise<void>;

  /**
   * Atualiza permissões de um membro
   */
  updateMemberPermissions(
    familyId: string,
    userId: string,
    permissions: Partial<RolePermissions>
  ): Promise<void>;

  /**
   * Busca todos os membros de uma família
   */
  getMembers(familyId: string): Promise<FamilyMember[]>;

  /**
   * Busca um membro específico
   */
  getMember(familyId: string, userId: string): Promise<FamilyMember | null>;

  /**
   * Gera novo código de convite
   */
  generateInviteCode(familyId: string): Promise<string>;

  /**
   * Invalida código de convite atual
   */
  invalidateInviteCode(familyId: string): Promise<void>;

  /**
   * Verifica se usuário é admin da família
   */
  isAdmin(familyId: string, userId: string): Promise<boolean>;

  /**
   * Promove usuário a admin
   */
  promoteToAdmin(familyId: string, userId: string): Promise<void>;

  /**
   * Rebaixa admin para membro comum
   */
  demoteFromAdmin(familyId: string, userId: string): Promise<void>;

  /**
   * Inscreve-se para atualizações de membros em tempo real
   */
  subscribeToMembers(
    familyId: string,
    callback: (members: FamilyMember[]) => void
  ): () => void;

  /**
   * Inscreve-se para atualizações da família em tempo real
   */
  subscribeToFamily(
    familyId: string,
    callback: (family: Family | null) => void
  ): () => void;
}
