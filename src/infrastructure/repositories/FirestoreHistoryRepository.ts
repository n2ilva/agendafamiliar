/**
 * Implementação Firestore do Repositório de Histórico
 * 
 * Princípios SOLID aplicados:
 * - Single Responsibility: Responsável apenas pela persistência do histórico
 * - Dependency Inversion: Implementa a interface IHistoryRepository
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { firebaseFirestore } from '../../config/firebase.config';

const firestore = firebaseFirestore as any;
import {
  IHistoryRepository,
  HistoryItem,
  HistoryAction,
} from '../../core/interfaces/repositories/IHistoryRepository';

export class FirestoreHistoryRepository implements IHistoryRepository {
  private readonly collectionName = 'history';

  private mapFirestoreToHistoryItem(id: string, data: any): HistoryItem {
    return {
      id,
      action: data.action as HistoryAction,
      timestamp: data.timestamp?.toDate() || new Date(),
      userId: data.userId,
      userName: data.userName,
      userRole: data.userRole,
      familyId: data.familyId,
      taskId: data.taskId,
      taskTitle: data.taskTitle,
      details: data.details,
    };
  }

  private mapHistoryItemToFirestore(item: HistoryItem): any {
    return {
      action: item.action,
      timestamp: item.timestamp ? Timestamp.fromDate(item.timestamp) : Timestamp.now(),
      userId: item.userId,
      userName: item.userName,
      userRole: item.userRole,
      familyId: item.familyId,
      taskId: item.taskId,
      taskTitle: item.taskTitle,
      details: item.details || {},
    };
  }

  async findById(id: string): Promise<HistoryItem | null> {
    try {
      const docRef = doc(firestore, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      return this.mapFirestoreToHistoryItem(docSnap.id, docSnap.data());
    } catch (error) {
      console.error('Error finding history item by ID:', error);
      throw new Error('Failed to find history item');
    }
  }

  async findByFamily(familyId: string, limit?: number): Promise<HistoryItem[]> {
    try {
      let q = query(
        collection(firestore, this.collectionName),
        where('familyId', '==', familyId),
        orderBy('timestamp', 'desc')
      );

      if (limit) {
        q = query(q, firestoreLimit(limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc =>
        this.mapFirestoreToHistoryItem(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error finding history by family:', error);
      throw new Error('Failed to find family history');
    }
  }

  async findByUser(userId: string, limit?: number): Promise<HistoryItem[]> {
    try {
      let q = query(
        collection(firestore, this.collectionName),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      if (limit) {
        q = query(q, firestoreLimit(limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc =>
        this.mapFirestoreToHistoryItem(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error finding history by user:', error);
      throw new Error('Failed to find user history');
    }
  }

  async findByTask(taskId: string): Promise<HistoryItem[]> {
    try {
      const q = query(
        collection(firestore, this.collectionName),
        where('taskId', '==', taskId),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc =>
        this.mapFirestoreToHistoryItem(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error finding history by task:', error);
      throw new Error('Failed to find task history');
    }
  }

  async findByAction(
    action: HistoryAction,
    familyId?: string
  ): Promise<HistoryItem[]> {
    try {
      let q = query(
        collection(firestore, this.collectionName),
        where('action', '==', action),
        orderBy('timestamp', 'desc')
      );

      if (familyId) {
        q = query(
          collection(firestore, this.collectionName),
          where('action', '==', action),
          where('familyId', '==', familyId),
          orderBy('timestamp', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc =>
        this.mapFirestoreToHistoryItem(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error finding history by action:', error);
      throw new Error('Failed to find history by action');
    }
  }

  async add(item: HistoryItem): Promise<HistoryItem> {
    try {
      const docRef = doc(firestore, this.collectionName, item.id);
      const data = this.mapHistoryItemToFirestore(item);

      await setDoc(docRef, data);

      return item;
    } catch (error) {
      console.error('Error adding history item:', error);
      throw new Error('Failed to add history item');
    }
  }

  async deleteOld(daysToKeep: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const q = query(
        collection(firestore, this.collectionName),
        where('timestamp', '<', Timestamp.fromDate(cutoffDate))
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(firestore);

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      return snapshot.size;
    } catch (error) {
      console.error('Error deleting old history:', error);
      throw new Error('Failed to delete old history');
    }
  }

  async clearFamily(familyId: string): Promise<void> {
    try {
      const q = query(
        collection(firestore, this.collectionName),
        where('familyId', '==', familyId)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(firestore);

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error clearing family history:', error);
      throw new Error('Failed to clear family history');
    }
  }

  subscribeToChanges(
    familyId: string,
    callback: (items: HistoryItem[]) => void,
    limit?: number
  ): () => void {
    let q = query(
      collection(firestore, this.collectionName),
      where('familyId', '==', familyId),
      orderBy('timestamp', 'desc')
    );

    if (limit) {
      q = query(q, firestoreLimit(limit));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc =>
          this.mapFirestoreToHistoryItem(doc.id, doc.data())
        );
        callback(items);
      },
      (error) => {
        console.error('Error in history subscription:', error);
      }
    );

    return unsubscribe;
  }
}
