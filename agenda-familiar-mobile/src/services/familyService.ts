import { firestore } from '../services/firebase';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface Family {
  id?: string;
  name: string;
  code: string;
  adminId: string;
  members: string[];
  createdAt: Date;
}

export class FamilyService {
  private familiesCollection = firestore().collection('families');

  async createFamily(familyData: Omit<Family, 'id' | 'createdAt'>): Promise<Family> {
    try {
      const docRef = this.familiesCollection.doc();
      const family: Family = {
        ...familyData,
        id: docRef.id,
        createdAt: new Date(),
      };

      await docRef.set(family);
      return family;
    } catch (error) {
      console.error('Error creating family:', error);
      throw error;
    }
  }

  async getFamily(familyId: string): Promise<Family | null> {
    try {
      const doc = await this.familiesCollection.doc(familyId).get();
      if (doc.exists()) {
        return doc.data() as Family;
      }
      return null;
    } catch (error) {
      console.error('Error getting family:', error);
      throw error;
    }
  }

  async getFamilyByCode(code: string): Promise<Family | null> {
    try {
      const snapshot = await this.familiesCollection
        .where('code', '==', code)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return doc.data() as Family;
      }
      return null;
    } catch (error) {
      console.error('Error getting family by code:', error);
      throw error;
    }
  }

  async joinFamily(familyId: string, userId: string): Promise<void> {
    try {
      const family = await this.getFamily(familyId);
      if (!family) {
        throw new Error('Family not found');
      }

      if (family.members.includes(userId)) {
        throw new Error('User is already a member of this family');
      }

      await this.familiesCollection.doc(familyId).update({
        members: [...family.members, userId],
      });
    } catch (error) {
      console.error('Error joining family:', error);
      throw error;
    }
  }

  async leaveFamily(familyId: string, userId: string): Promise<void> {
    try {
      const family = await this.getFamily(familyId);
      if (!family) {
        throw new Error('Family not found');
      }

      if (!family.members.includes(userId)) {
        throw new Error('User is not a member of this family');
      }

      if (family.adminId === userId) {
        throw new Error('Admin cannot leave the family');
      }

      await this.familiesCollection.doc(familyId).update({
        members: family.members.filter(id => id !== userId),
      });
    } catch (error) {
      console.error('Error leaving family:', error);
      throw error;
    }
  }

  async updateFamily(familyId: string, updates: Partial<Family>): Promise<void> {
    try {
      await this.familiesCollection.doc(familyId).update(updates);
    } catch (error) {
      console.error('Error updating family:', error);
      throw error;
    }
  }

  async deleteFamily(familyId: string): Promise<void> {
    try {
      await this.familiesCollection.doc(familyId).delete();
    } catch (error) {
      console.error('Error deleting family:', error);
      throw error;
    }
  }
}

export const familyService = new FamilyService();