/**
 * Implementação Firestore do Repositório de Usuário
 * 
 * Princípio SOLID: Dependency Inversion (D)
 * - Implementa a interface IUserRepository
 */

import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { User, UserProps } from '../../domain/entities/User';
import { UserRole } from '../../domain/value-objects/UserRole';

export class FirestoreUserRepository implements IUserRepository {
  private readonly collectionName = 'users';

  constructor(
    private readonly firestore: any // Firebase Firestore instance
  ) {}

  async findById(id: string): Promise<User | null> {
    try {
      const doc = await this.firestore.collection(this.collectionName).doc(id).get();
      if (!doc.exists) return null;
      
      const data = doc.data();
      return User.fromPersistence(this.mapToUserProps(id, data));
    } catch (error) {
      console.error('Error finding user by id:', error);
      return null;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const snapshot = await this.firestore.collection(this.collectionName)
        .where('email', '==', email)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return User.fromPersistence(this.mapToUserProps(doc.id, doc.data()));
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  async create(user: User): Promise<User> {
    try {
      const userData = this.mapFromUser(user);
      await this.firestore.collection(this.collectionName).doc(user.id).set(userData);
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async save(user: User): Promise<User> {
    return this.create(user);
  }

  async update(id: string, data: Partial<User> | Record<string, unknown>): Promise<User> {
    try {
      const updateData = this.mapPartialUser(data);
      updateData.updatedAt = new Date();
      
      await this.firestore.collection(this.collectionName).doc(id).update(updateData);
      
      const updated = await this.findById(id);
      if (!updated) throw new Error('User not found after update');
      
      return updated;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.firestore.collection(this.collectionName).doc(id).delete();
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  async findByFamilyAndRole(familyId: string, roles: string[]): Promise<User[]> {
    try {
      const snapshot = await this.firestore.collection(this.collectionName)
        .where('familyId', '==', familyId)
        .where('role', 'in', roles)
        .get();

      const users: User[] = [];
      snapshot.forEach((doc: any) => {
        users.push(User.fromPersistence(this.mapToUserProps(doc.id, doc.data())));
      });

      return users;
    } catch (error) {
      console.error('Error finding users by family and role:', error);
      return [];
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const doc = await this.firestore.collection(this.collectionName).doc(id).get();
      return doc.exists;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  }

  async emailExists(email: string): Promise<boolean> {
    try {
      const user = await this.findByEmail(email);
      return user !== null;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }

  async updateRole(id: string, role: UserRole): Promise<void> {
    try {
      await this.firestore.collection(this.collectionName).doc(id).update({
        role,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating role:', error);
      throw new Error('Failed to update role');
    }
  }

  async updateProfilePicture(id: string, pictureUrl: string | null): Promise<void> {
    try {
      await this.firestore.collection(this.collectionName).doc(id).update({
        picture: pictureUrl,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating profile picture:', error);
      throw new Error('Failed to update profile picture');
    }
  }

  async updateProfileIcon(id: string, icon: string | null): Promise<void> {
    try {
      await this.firestore.collection(this.collectionName).doc(id).update({
        icon,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating profile icon:', error);
      throw new Error('Failed to update profile icon');
    }
  }

  async updateName(id: string, name: string): Promise<void> {
    try {
      await this.firestore.collection(this.collectionName).doc(id).update({
        name,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating name:', error);
      throw new Error('Failed to update name');
    }
  }

  async setFamilyId(id: string, familyId: string | null): Promise<void> {
    try {
      await this.firestore.collection(this.collectionName).doc(id).update({
        familyId,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error setting family id:', error);
      throw new Error('Failed to set family id');
    }
  }

  async findByFamilyId(familyId: string): Promise<User[]> {
    try {
      const snapshot = await this.firestore.collection(this.collectionName)
        .where('familyId', '==', familyId)
        .get();

      const users: User[] = [];
      snapshot.forEach((doc: any) => {
        users.push(User.fromPersistence(this.mapToUserProps(doc.id, doc.data())));
      });

      return users;
    } catch (error) {
      console.error('Error finding users by family id:', error);
      return [];
    }
  }

  async saveToLocal(user: User): Promise<void> {
    // Implementação de storage local será feita no LocalStorageService
    console.warn('saveToLocal should use LocalStorageService');
  }

  async loadFromLocal(): Promise<User | null> {
    // Implementação de storage local será feita no LocalStorageService
    console.warn('loadFromLocal should use LocalStorageService');
    return null;
  }

  async removeFromLocal(): Promise<void> {
    // Implementação de storage local será feita no LocalStorageService
    console.warn('removeFromLocal should use LocalStorageService');
  }

  // Helper methods
  private mapToUserProps(id: string, data: any): UserProps {
    return {
      id,
      name: data.name,
      email: data.email,
      picture: data.picture,
      role: data.role || 'adulto',
      familyId: data.familyId,
      avatarSource: data.avatarSource,
      isAnonymous: data.isAnonymous,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      lastLoginAt: data.lastLoginAt?.toDate?.() || (data.lastLoginAt ? new Date(data.lastLoginAt) : undefined),
      preferences: data.preferences,
    };
  }

  private mapFromUser(user: User): any {
    const props = user.toObject();
    return {
      name: props.name,
      email: props.email,
      picture: props.picture,
      role: props.role,
      familyId: props.familyId,
      avatarSource: props.avatarSource,
      isAnonymous: props.isAnonymous,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      lastLoginAt: props.lastLoginAt,
      preferences: props.preferences,
    };
  }

  private mapPartialUser(data: Partial<User> | Record<string, unknown>): any {
    const mapped: any = {};
    
    if ('name' in data) mapped.name = data.name;
    if ('email' in data) mapped.email = data.email;
    if ('picture' in data) mapped.picture = data.picture;
    if ('role' in data) mapped.role = data.role;
    if ('familyId' in data) mapped.familyId = data.familyId;
    if ('avatarSource' in data) mapped.avatarSource = data.avatarSource;
    if ('isAnonymous' in data) mapped.isAnonymous = data.isAnonymous;
    if ('lastLoginAt' in data) mapped.lastLoginAt = data.lastLoginAt;
    if ('preferences' in data) mapped.preferences = data.preferences;

    return mapped;
  }
}
