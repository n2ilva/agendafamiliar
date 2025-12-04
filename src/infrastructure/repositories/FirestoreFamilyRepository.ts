/**
 * Implementação Firestore do Repositório de Família
 * 
 * Princípio SOLID: Dependency Inversion (D)
 * - Implementa a interface IFamilyRepository
 */

import { IFamilyRepository } from '../../core/interfaces/repositories/IFamilyRepository';
import { Family, FamilyProps, FamilyMember } from '../../core/domain/entities/Family';
import { RolePermissions } from '../../core/domain/value-objects/UserRole';

export class FirestoreFamilyRepository implements IFamilyRepository {
  private readonly collectionName = 'families';
  
  // Cache para getUserFamily com TTL de 30 segundos
  private userFamilyCache: Map<string, { family: Family | null; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 30000; // 30 segundos

  constructor(
    private readonly firestore: any // Firebase Firestore instance
  ) {}

  async findById(id: string): Promise<Family | null> {
    try {
      const doc = await this.firestore.collection(this.collectionName).doc(id).get();
      if (!doc.exists) return null;
      
      const data = doc.data();
      return Family.fromPersistence(this.mapToFamilyProps(id, data));
    } catch (error) {
      console.error('Error finding family by id:', error);
      return null;
    }
  }

  async findByUserId(userId: string): Promise<Family | null> {
    try {
      // Verificar cache
      const cached = this.userFamilyCache.get(userId);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
        console.log(`[Cache HIT] getUserFamily para userId: ${userId}`);
        return cached.family;
      }

      console.log(`[Cache MISS] getUserFamily para userId: ${userId}`);
      
      const snapshot = await this.firestore.collection(this.collectionName)
        .where('members', 'array-contains', userId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        // Cachear resultado null
        this.userFamilyCache.set(userId, { family: null, timestamp: Date.now() });
        return null;
      }

      const doc = snapshot.docs[0];
      const family = Family.fromPersistence(this.mapToFamilyProps(doc.id, doc.data()));
      
      // Cachear resultado
      this.userFamilyCache.set(userId, { family, timestamp: Date.now() });
      
      return family;
    } catch (error) {
      console.error('Error finding family by user id:', error);
      return null;
    }
  }

  async findByInviteCode(code: string): Promise<Family | null> {
    return this.findByCode(code);
  }

  async findByCode(code: string): Promise<Family | null> {
    try {
      const snapshot = await this.firestore.collection(this.collectionName)
        .where('code', '==', code.toUpperCase())
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return Family.fromPersistence(this.mapToFamilyProps(doc.id, doc.data()));
    } catch (error) {
      console.error('Error finding family by code:', error);
      return null;
    }
  }

  async create(family: Family): Promise<Family> {
    try {
      const familyData = this.mapFromFamily(family);
      await this.firestore.collection(this.collectionName).doc(family.id).set(familyData);
      return family;
    } catch (error) {
      console.error('Error creating family:', error);
      throw new Error('Failed to create family');
    }
  }

  async save(family: Family): Promise<Family> {
    return this.create(family);
  }

  async update(id: string, data: Partial<Family> | FamilyProps): Promise<Family> {
    try {
      let updateData: any;
      
      // Se for FamilyProps, mapear diretamente
      if ('members' in data && Array.isArray(data.members)) {
        updateData = {
          name: data.name,
          code: data.code,
          ownerId: data.ownerId,
          members: data.members,
          invites: data.invites,
          settings: data.settings,
          updatedAt: new Date(),
        };
      } else {
        // Caso contrário, mapear Partial<Family>
        updateData = this.mapPartialFamily(data as Partial<Family>);
        updateData.updatedAt = new Date();
      }
      
      await this.firestore.collection(this.collectionName).doc(id).update(updateData);
      
      const updated = await this.findById(id);
      if (!updated) throw new Error('Family not found after update');
      
      return updated;
    } catch (error) {
      console.error('Error updating family:', error);
      throw new Error('Failed to update family');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.firestore.collection(this.collectionName).doc(id).delete();
    } catch (error) {
      console.error('Error deleting family:', error);
      throw new Error('Failed to delete family');
    }
  }

  async addMember(familyId: string, member: FamilyMember): Promise<void> {
    try {
      const family = await this.findById(familyId);
      if (!family) throw new Error('Family not found');

      // addMember aceita apenas 'adulto' | 'filho', mas FamilyMember pode ter 'admin'
      // Neste caso, apenas atualizamos diretamente via toObject()
      const props = family.toObject();
      props.members.push(member);
      props.updatedAt = new Date();
      
      await this.update(familyId, props);
    } catch (error) {
      console.error('Error adding member:', error);
      throw new Error('Failed to add member');
    }
  }

  async removeMember(familyId: string, userId: string): Promise<void> {
    try {
      const family = await this.findById(familyId);
      if (!family) throw new Error('Family not found');

      const updatedFamily = family.removeMember(userId);
      await this.update(familyId, updatedFamily.toObject());
    } catch (error) {
      console.error('Error removing member:', error);
      throw new Error('Failed to remove member');
    }
  }

  async updateMember(familyId: string, userId: string, data: Partial<FamilyMember>): Promise<void> {
    try {
      const family = await this.findById(familyId);
      if (!family) throw new Error('Family not found');

      const props = family.toObject();
      const memberIndex = props.members.findIndex(m => m.id === userId);
      
      if (memberIndex === -1) throw new Error('Member not found');

      props.members[memberIndex] = {
        ...props.members[memberIndex],
        ...data,
      };

      await this.update(familyId, props);
    } catch (error) {
      console.error('Error updating member:', error);
      throw new Error('Failed to update member');
    }
  }

  async updateMemberPermissions(
    familyId: string,
    userId: string,
    permissions: Partial<RolePermissions>
  ): Promise<void> {
    // Implementação futura se necessário
    console.warn('updateMemberPermissions not fully implemented');
  }

  async getMembers(familyId: string): Promise<FamilyMember[]> {
    try {
      const family = await this.findById(familyId);
      return family ? family.members : [];
    } catch (error) {
      console.error('Error getting members:', error);
      return [];
    }
  }

  async getMember(familyId: string, userId: string): Promise<FamilyMember | null> {
    try {
      const family = await this.findById(familyId);
      return family ? family.getMember(userId) || null : null;
    } catch (error) {
      console.error('Error getting member:', error);
      return null;
    }
  }

  async generateInviteCode(familyId: string): Promise<string> {
    try {
      const family = await this.findById(familyId);
      if (!family) throw new Error('Family not found');

      const updatedFamily = family.regenerateCode();
      await this.update(familyId, updatedFamily.toObject());
      
      return updatedFamily.code;
    } catch (error) {
      console.error('Error generating invite code:', error);
      throw new Error('Failed to generate invite code');
    }
  }

  async invalidateInviteCode(familyId: string): Promise<void> {
    try {
      await this.generateInviteCode(familyId);
    } catch (error) {
      console.error('Error invalidating invite code:', error);
      throw new Error('Failed to invalidate invite code');
    }
  }

  async isAdmin(familyId: string, userId: string): Promise<boolean> {
    try {
      const family = await this.findById(familyId);
      return family ? family.isAdmin(userId) : false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  async promoteToAdmin(familyId: string, userId: string): Promise<void> {
    try {
      const family = await this.findById(familyId);
      if (!family) throw new Error('Family not found');

      const updatedFamily = family.updateMemberRole(userId, 'admin');
      await this.update(familyId, updatedFamily.toObject());
    } catch (error) {
      console.error('Error promoting to admin:', error);
      throw new Error('Failed to promote to admin');
    }
  }

  async demoteFromAdmin(familyId: string, userId: string): Promise<void> {
    try {
      const family = await this.findById(familyId);
      if (!family) throw new Error('Family not found');

      const updatedFamily = family.updateMemberRole(userId, 'adulto');
      await this.update(familyId, updatedFamily.toObject());
    } catch (error) {
      console.error('Error demoting from admin:', error);
      throw new Error('Failed to demote from admin');
    }
  }

  /**
   * Limpa o cache de getUserFamily para um usuário específico ou todo o cache
   * Útil após operações que modificam a família
   */
  clearUserFamilyCache(userId?: string): void {
    if (userId) {
      this.userFamilyCache.delete(userId);
      console.log(`[Cache CLEAR] Cache limpo para userId: ${userId}`);
    } else {
      this.userFamilyCache.clear();
      console.log('[Cache CLEAR] Todo cache de getUserFamily limpo');
    }
  }

  subscribeToMembers(
    familyId: string,
    callback: (members: FamilyMember[]) => void
  ): () => void {
    const unsubscribe = this.firestore.collection(this.collectionName)
      .doc(familyId)
      .onSnapshot((doc: any) => {
        if (doc.exists) {
          const data = doc.data();
          callback(data.members || []);
        } else {
          callback([]);
        }
      });

    return unsubscribe;
  }

  subscribeToFamily(
    familyId: string,
    callback: (family: Family | null) => void
  ): () => void {
    const unsubscribe = this.firestore.collection(this.collectionName)
      .doc(familyId)
      .onSnapshot((doc: any) => {
        if (doc.exists) {
          const family = Family.fromPersistence(
            this.mapToFamilyProps(doc.id, doc.data())
          );
          callback(family);
        } else {
          callback(null);
        }
      });

    return unsubscribe;
  }

  // Helper methods
  private mapToFamilyProps(id: string, data: any): FamilyProps {
    return {
      id,
      name: data.name,
      code: data.code,
      ownerId: data.ownerId,
      members: data.members || [],
      invites: (data.invites || []).map((invite: any) => ({
        ...invite,
        createdAt: invite.createdAt?.toDate?.() || new Date(invite.createdAt),
        expiresAt: invite.expiresAt?.toDate?.() || new Date(invite.expiresAt),
      })),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      settings: data.settings,
    };
  }

  private mapFromFamily(family: Family): any {
    const props = family.toObject();
    return {
      name: props.name,
      code: props.code,
      ownerId: props.ownerId,
      members: props.members,
      invites: props.invites,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      settings: props.settings,
    };
  }

  private mapPartialFamily(data: Partial<Family>): any {
    const mapped: any = {};
    
    if ('name' in data) mapped.name = data.name;
    if ('code' in data) mapped.code = data.code;
    if ('ownerId' in data) mapped.ownerId = data.ownerId;
    if ('members' in data) mapped.members = data.members;
    if ('invites' in data) mapped.invites = data.invites;
    if ('settings' in data) mapped.settings = data.settings;

    return mapped;
  }
}
