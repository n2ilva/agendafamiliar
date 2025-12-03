/**
 * Implementação Firestore do Repositório de Aprovações
 * 
 * Princípios SOLID aplicados:
 * - Single Responsibility: Responsável apenas pela persistência de aprovações
 * - Dependency Inversion: Implementa a interface IApprovalRepository
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { firebaseFirestore } from '../../../config/firebase.config';

const firestore = firebaseFirestore as any;
import {
  IApprovalRepository,
  ApprovalRequest,
  ApprovalStatus,
} from '../../interfaces/repositories/IApprovalRepository';

export class FirestoreApprovalRepository implements IApprovalRepository {
  private readonly collectionName = 'approvals';

  private mapFirestoreToApproval(id: string, data: any): ApprovalRequest {
    return {
      id,
      taskId: data.taskId,
      taskTitle: data.taskTitle,
      taskDescription: data.taskDescription,
      requesterId: data.requesterId,
      requesterName: data.requesterName,
      familyId: data.familyId,
      status: data.status as ApprovalStatus,
      reviewerId: data.reviewerId,
      reviewerName: data.reviewerName,
      reviewedAt: data.reviewedAt?.toDate(),
      comment: data.comment,
      expiresAt: data.expiresAt?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  }

  private mapApprovalToFirestore(approval: ApprovalRequest): any {
    return {
      taskId: approval.taskId,
      taskTitle: approval.taskTitle,
      taskDescription: approval.taskDescription,
      requesterId: approval.requesterId,
      requesterName: approval.requesterName,
      familyId: approval.familyId,
      status: approval.status,
      reviewerId: approval.reviewerId,
      reviewerName: approval.reviewerName,
      reviewedAt: approval.reviewedAt ? Timestamp.fromDate(approval.reviewedAt) : null,
      comment: approval.comment,
      expiresAt: approval.expiresAt ? Timestamp.fromDate(approval.expiresAt) : null,
      createdAt: approval.createdAt ? Timestamp.fromDate(approval.createdAt) : Timestamp.now(),
    };
  }

  async findById(id: string): Promise<ApprovalRequest | null> {
    try {
      const docRef = doc(firestore, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      return this.mapFirestoreToApproval(docSnap.id, docSnap.data());
    } catch (error) {
      console.error('Error finding approval by ID:', error);
      throw new Error('Failed to find approval');
    }
  }

  async findByTask(taskId: string): Promise<ApprovalRequest | null> {
    try {
      const q = query(
        collection(firestore, this.collectionName),
        where('taskId', '==', taskId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const firstDoc = snapshot.docs[0];
      return this.mapFirestoreToApproval(firstDoc.id, firstDoc.data());
    } catch (error) {
      console.error('Error finding approval by task:', error);
      throw new Error('Failed to find approval by task');
    }
  }

  async findPendingByTaskId(taskId: string): Promise<ApprovalRequest | null> {
    try {
      const q = query(
        collection(firestore, this.collectionName),
        where('taskId', '==', taskId),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const firstDoc = snapshot.docs[0];
      return this.mapFirestoreToApproval(firstDoc.id, firstDoc.data());
    } catch (error) {
      console.error('Error finding pending approval by task:', error);
      throw new Error('Failed to find pending approval');
    }
  }

  async findPendingByFamily(familyId: string): Promise<ApprovalRequest[]> {
    try {
      const q = query(
        collection(firestore, this.collectionName),
        where('familyId', '==', familyId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc =>
        this.mapFirestoreToApproval(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error finding pending approvals by family:', error);
      throw new Error('Failed to find pending approvals');
    }
  }

  async findPendingByFamilyId(familyId: string): Promise<ApprovalRequest[]> {
    return this.findPendingByFamily(familyId);
  }

  async findPendingForAdmin(adminId: string): Promise<ApprovalRequest[]> {
    try {
      // Primeiro buscar famílias onde o usuário é admin
      // Por simplicidade, vamos buscar todas as aprovações pendentes
      // Em produção, seria melhor ter um índice de admins por família
      const q = query(
        collection(firestore, this.collectionName),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc =>
        this.mapFirestoreToApproval(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error finding pending approvals for admin:', error);
      throw new Error('Failed to find pending approvals for admin');
    }
  }

  async findByRequester(requesterId: string): Promise<ApprovalRequest[]> {
    try {
      const q = query(
        collection(firestore, this.collectionName),
        where('requesterId', '==', requesterId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc =>
        this.mapFirestoreToApproval(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error finding approvals by requester:', error);
      throw new Error('Failed to find approvals by requester');
    }
  }

  async findByRequesterId(requesterId: string): Promise<ApprovalRequest[]> {
    return this.findByRequester(requesterId);
  }

  async findByStatus(
    status: ApprovalStatus,
    familyId?: string
  ): Promise<ApprovalRequest[]> {
    try {
      let q = query(
        collection(firestore, this.collectionName),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );

      if (familyId) {
        q = query(
          collection(firestore, this.collectionName),
          where('status', '==', status),
          where('familyId', '==', familyId),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc =>
        this.mapFirestoreToApproval(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error finding approvals by status:', error);
      throw new Error('Failed to find approvals by status');
    }
  }

  async create(approval: ApprovalRequest): Promise<ApprovalRequest> {
    try {
      const docRef = doc(firestore, this.collectionName, approval.id);
      const data = this.mapApprovalToFirestore(approval);

      await setDoc(docRef, data);

      return approval;
    } catch (error) {
      console.error('Error creating approval:', error);
      throw new Error('Failed to create approval');
    }
  }

  async save(approval: ApprovalRequest): Promise<ApprovalRequest> {
    return this.create(approval);
  }

  async update(
    id: string,
    data: Partial<ApprovalRequest>
  ): Promise<ApprovalRequest> {
    try {
      const docRef = doc(firestore, this.collectionName, id);
      
      const updateData: any = {};
      if (data.status) updateData.status = data.status;
      if (data.reviewerId) updateData.reviewerId = data.reviewerId;
      if (data.reviewerName) updateData.reviewerName = data.reviewerName;
      if (data.reviewedAt) updateData.reviewedAt = Timestamp.fromDate(data.reviewedAt);
      if (data.comment !== undefined) updateData.comment = data.comment;

      await updateDoc(docRef, updateData);

      const updated = await this.findById(id);
      if (!updated) throw new Error('Approval not found after update');

      return updated;
    } catch (error) {
      console.error('Error updating approval:', error);
      throw new Error('Failed to update approval');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(firestore, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting approval:', error);
      throw new Error('Failed to delete approval');
    }
  }

  async approve(
    id: string,
    adminId: string,
    comment?: string
  ): Promise<ApprovalRequest> {
    return this.update(id, {
      status: 'approved',
      reviewerId: adminId,
      reviewedAt: new Date(),
      comment,
    });
  }

  async reject(
    id: string,
    adminId: string,
    comment?: string
  ): Promise<ApprovalRequest> {
    return this.update(id, {
      status: 'rejected',
      reviewerId: adminId,
      reviewedAt: new Date(),
      comment,
    });
  }

  async cancel(id: string): Promise<void> {
    await this.update(id, {
      status: 'cancelled',
    });
  }

  async countPending(familyId: string): Promise<number> {
    try {
      const q = query(
        collection(firestore, this.collectionName),
        where('familyId', '==', familyId),
        where('status', '==', 'pending')
      );

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error('Error counting pending approvals:', error);
      throw new Error('Failed to count pending approvals');
    }
  }

  subscribeToChanges(
    familyId: string,
    callback: (approvals: ApprovalRequest[]) => void
  ): () => void {
    const q = query(
      collection(firestore, this.collectionName),
      where('familyId', '==', familyId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const approvals = snapshot.docs.map(doc =>
          this.mapFirestoreToApproval(doc.id, doc.data())
        );
        callback(approvals);
      },
      (error) => {
        console.error('Error in approval subscription:', error);
      }
    );

    return unsubscribe;
  }
}
