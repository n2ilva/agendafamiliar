/**
 * Implementação Firestore do Repositório de Tarefas
 * 
 * Princípio SOLID: Dependency Inversion (D)
 * - Implementa a interface ITaskRepository
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
  writeBatch,
  onSnapshot,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { ITaskRepository, TaskFilters } from '../../interfaces/repositories/ITaskRepository';
import { Task, TaskProps } from '../../domain/entities/Task';
import { TaskStatus } from '../../domain/value-objects/TaskStatus';
import { DateRange } from '../../domain/value-objects/DateRange';

export class FirestoreTaskRepository implements ITaskRepository {
  private readonly collectionName = 'tasks';

  constructor(
    private readonly firestore: any // Firebase Firestore instance
  ) {}

  async findById(id: string): Promise<Task | null> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      
      const data = docSnap.data();
      return Task.fromPersistence(this.mapToTaskProps(id, data));
    } catch (error) {
      console.error('Error finding task by id:', error);
      return null;
    }
  }

  async findAll(filters?: TaskFilters): Promise<Task[]> {
    try {
      const collectionRef = collection(this.firestore, this.collectionName);
      let q: Query<DocumentData> = collectionRef as any;

      if (filters) {
        const constraints: any[] = [];
        
        if (filters.familyId) {
          constraints.push(where('familyId', '==', filters.familyId));
        }
        if (filters.userId) {
          constraints.push(where('userId', '==', filters.userId));
        }
        if (filters.status) {
          constraints.push(where('status', '==', filters.status));
        }
        if (filters.category) {
          constraints.push(where('category', '==', filters.category));
        }
        if (filters.assignedTo) {
          constraints.push(where('assignedTo', '==', filters.assignedTo));
        }
        if (filters.createdBy) {
          constraints.push(where('createdBy', '==', filters.createdBy));
        }

        if (constraints.length > 0) {
          q = query(collectionRef, ...constraints);
        }
      }

      const snapshot = await getDocs(q);
      const tasks: Task[] = [];

      snapshot.forEach((docSnap) => {
        tasks.push(Task.fromPersistence(this.mapToTaskProps(docSnap.id, docSnap.data())));
      });

      return tasks;
    } catch (error) {
      console.error('Error finding tasks:', error);
      return [];
    }
  }

  async findByFamily(familyId: string, userId?: string): Promise<Task[]> {
    const filters: TaskFilters = { familyId };
    if (userId) filters.userId = userId;
    return this.findAll(filters);
  }

  async findByUser(userId: string): Promise<Task[]> {
    return this.findAll({ userId });
  }

  async findByStatus(status: TaskStatus, familyId?: string): Promise<Task[]> {
    const filters: TaskFilters = { status };
    if (familyId) filters.familyId = familyId;
    return this.findAll(filters);
  }

  async findOverdue(familyId?: string): Promise<Task[]> {
    try {
      const now = new Date();
      const collectionRef = collection(this.firestore, this.collectionName);
      const constraints: any[] = [
        where('status', '==', 'pending'),
        where('date', '<', now),
      ];

      if (familyId) {
        constraints.push(where('familyId', '==', familyId));
      }

      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);
      const tasks: Task[] = [];

      snapshot.forEach((doc: any) => {
        tasks.push(Task.fromPersistence(this.mapToTaskProps(doc.id, doc.data())));
      });

      return tasks;
    } catch (error) {
      console.error('Error finding overdue tasks:', error);
      return [];
    }
  }

  async findToday(familyId?: string, userId?: string): Promise<Task[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const collectionRef = collection(this.firestore, this.collectionName);
      const constraints: any[] = [
        where('date', '>=', today),
        where('date', '<', tomorrow),
      ];

      if (familyId) {
        constraints.push(where('familyId', '==', familyId));
      }
      if (userId) {
        constraints.push(where('userId', '==', userId));
      }

      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);
      const tasks: Task[] = [];

      snapshot.forEach((docSnap) => {
        tasks.push(Task.fromPersistence(this.mapToTaskProps(docSnap.id, docSnap.data())));
      });

      return tasks;
    } catch (error) {
      console.error('Error finding today tasks:', error);
      return [];
    }
  }

  async findUpcoming(familyId?: string, userId?: string): Promise<Task[]> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const collectionRef = collection(this.firestore, this.collectionName);
      const constraints: any[] = [
        where('status', '==', 'pending'),
        where('date', '>=', tomorrow),
      ];

      if (familyId) {
        constraints.push(where('familyId', '==', familyId));
      }
      if (userId) {
        constraints.push(where('userId', '==', userId));
      }

      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);
      const tasks: Task[] = [];

      snapshot.forEach((docSnap) => {
        tasks.push(Task.fromPersistence(this.mapToTaskProps(docSnap.id, docSnap.data())));
      });

      return tasks;
    } catch (error) {
      console.error('Error finding upcoming tasks:', error);
      return [];
    }
  }

  async findByAssigned(userId: string, familyId?: string): Promise<Task[]> {
    const filters: TaskFilters = { assignedTo: userId };
    if (familyId) filters.familyId = familyId;
    return this.findAll(filters);
  }

  async save(task: Task): Promise<Task> {
    try {
      const taskData = this.mapFromTask(task);
      const docRef = doc(this.firestore, this.collectionName, task.id);
      await setDoc(docRef, taskData);
      return task;
    } catch (error) {
      console.error('Error saving task:', error);
      throw new Error('Failed to save task');
    }
  }

  async update(id: string, data: Partial<Task>): Promise<Task> {
    try {
      const updateData = this.mapPartialTask(data);
      updateData.updatedAt = new Date();
      
      const docRef = doc(this.firestore, this.collectionName, id);
      await updateDoc(docRef, updateData);
      
      const updated = await this.findById(id);
      if (!updated) throw new Error('Task not found after update');
      
      return updated;
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error('Failed to update task');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }

  async deleteOldCompleted(daysToKeep: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const collectionRef = collection(this.firestore, this.collectionName);
      const q = query(
        collectionRef,
        where('status', '==', 'completed'),
        where('completedAt', '<', cutoffDate)
      );
      const snapshot = await getDocs(q);

      let deletedCount = 0;
      const batch = writeBatch(this.firestore);

      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
        deletedCount++;
      });

      await batch.commit();
      return deletedCount;
    } catch (error) {
      console.error('Error deleting old completed tasks:', error);
      return 0;
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Error checking task existence:', error);
      return false;
    }
  }

  async count(filters?: TaskFilters): Promise<number> {
    try {
      const tasks = await this.findAll(filters);
      return tasks.length;
    } catch (error) {
      console.error('Error counting tasks:', error);
      return 0;
    }
  }

  subscribeToChanges(
    familyId: string,
    callback: (tasks: Task[]) => void,
    userId?: string
  ): () => void {
    const collectionRef = collection(this.firestore, this.collectionName);
    const constraints: any[] = [where('familyId', '==', familyId)];

    if (userId) {
      constraints.push(where('userId', '==', userId));
    }

    const q = query(collectionRef, ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks: Task[] = [];
      snapshot.forEach((docSnap) => {
        tasks.push(Task.fromPersistence(this.mapToTaskProps(docSnap.id, docSnap.data())));
      });
      callback(tasks);
    });

    return unsubscribe;
  }

  async saveBatch(tasks: Task[]): Promise<Task[]> {
    try {
      const batch = writeBatch(this.firestore);

      tasks.forEach(task => {
        const docRef = doc(this.firestore, this.collectionName, task.id);
        batch.set(docRef, this.mapFromTask(task));
      });

      await batch.commit();
      return tasks;
    } catch (error) {
      console.error('Error saving batch tasks:', error);
      throw new Error('Failed to save batch tasks');
    }
  }

  async updateBatch(updates: Array<{ id: string; data: Partial<Task> }>): Promise<Task[]> {
    try {
      const batch = writeBatch(this.firestore);

      updates.forEach(({ id, data }) => {
        const docRef = doc(this.firestore, this.collectionName, id);
        const updateData = this.mapPartialTask(data);
        updateData.updatedAt = new Date();
        batch.update(docRef, updateData);
      });

      await batch.commit();

      // Fetch updated tasks
      const updatedTasks: Task[] = [];
      for (const { id } of updates) {
        const task = await this.findById(id);
        if (task) updatedTasks.push(task);
      }

      return updatedTasks;
    } catch (error) {
      console.error('Error updating batch tasks:', error);
      throw new Error('Failed to update batch tasks');
    }
  }

  // Helper methods
  private mapToTaskProps(id: string, data: any): TaskProps {
    return {
      id,
      title: data.title,
      description: data.description,
      category: data.category,
      categoryColor: data.categoryColor,
      categoryIcon: data.categoryIcon,
      status: data.status,
      priority: data.priority,
      date: data.date?.toDate?.() || new Date(data.date),
      time: data.time?.toDate?.() || (data.time ? new Date(data.time) : undefined),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      completedAt: data.completedAt?.toDate?.() || (data.completedAt ? new Date(data.completedAt) : undefined),
      completedBy: data.completedBy,
      createdBy: data.createdBy,
      assignedTo: data.assignedTo,
      familyId: data.familyId,
      userId: data.userId,
      repeat: data.repeat,
      repeatGroupId: data.repeatGroupId,
      subtasks: data.subtasks || [],
      requiresApproval: data.requiresApproval,
      approvalStatus: data.approvalStatus,
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt?.toDate?.() || (data.approvedAt ? new Date(data.approvedAt) : undefined),
      postponeCount: data.postponeCount,
      originalDate: data.originalDate?.toDate?.() || (data.originalDate ? new Date(data.originalDate) : undefined),
      postponedBy: data.postponedBy,
      attachments: data.attachments,
      notes: data.notes,
      syncStatus: data.syncStatus,
      lastSyncAt: data.lastSyncAt?.toDate?.() || (data.lastSyncAt ? new Date(data.lastSyncAt) : undefined),
    };
  }

  private mapFromTask(task: Task): any {
    const props = task.toObject();
    return {
      title: props.title,
      description: props.description,
      category: props.category,
      categoryColor: props.categoryColor,
      categoryIcon: props.categoryIcon,
      status: props.status,
      priority: props.priority,
      date: props.date,
      time: props.time,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      completedAt: props.completedAt,
      completedBy: props.completedBy,
      createdBy: props.createdBy,
      assignedTo: props.assignedTo,
      familyId: props.familyId,
      userId: props.userId,
      repeat: props.repeat,
      repeatGroupId: props.repeatGroupId,
      subtasks: props.subtasks,
      requiresApproval: props.requiresApproval,
      approvalStatus: props.approvalStatus,
      approvedBy: props.approvedBy,
      approvedAt: props.approvedAt,
      postponeCount: props.postponeCount,
      originalDate: props.originalDate,
      postponedBy: props.postponedBy,
      attachments: props.attachments,
      notes: props.notes,
      syncStatus: props.syncStatus,
      lastSyncAt: props.lastSyncAt,
    };
  }

  private mapPartialTask(data: Partial<Task>): any {
    const mapped: any = {};
    
    // Map apenas as propriedades que existem
    if ('title' in data) mapped.title = data.title;
    if ('description' in data) mapped.description = data.description;
    if ('category' in data) mapped.category = data.category;
    if ('status' in data) mapped.status = data.status;
    if ('priority' in data) mapped.priority = data.priority;
    if ('date' in data) mapped.date = data.date;
    if ('time' in data) mapped.time = data.time;
    if ('completedAt' in data) mapped.completedAt = data.completedAt;
    if ('completedBy' in data) mapped.completedBy = data.completedBy;
    if ('assignedTo' in data) mapped.assignedTo = data.assignedTo;
    if ('requiresApproval' in data) mapped.requiresApproval = data.requiresApproval;
    if ('approvalStatus' in data) mapped.approvalStatus = data.approvalStatus;
    if ('approvedBy' in data) mapped.approvedBy = data.approvedBy;
    if ('approvedAt' in data) mapped.approvedAt = data.approvedAt;
    if ('subtasks' in data) mapped.subtasks = data.subtasks;
    if ('postponeCount' in data) mapped.postponeCount = data.postponeCount;
    if ('originalDate' in data) mapped.originalDate = data.originalDate;
    if ('notes' in data) mapped.notes = data.notes;

    return mapped;
  }
}
