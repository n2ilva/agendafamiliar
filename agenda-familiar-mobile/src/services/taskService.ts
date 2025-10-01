import { firestore } from '../services/firebase';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface Task {
  id?: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  category?: string;
  userId: string;
  createdAt: Date;
}

export class TaskService {
  private tasksCollection = firestore().collection('tasks');

  async createTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    try {
      const docRef = this.tasksCollection.doc();
      const task: Task = {
        ...taskData,
        id: docRef.id,
        createdAt: new Date(),
      };

      await docRef.set(task);
      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async getTasks(userId: string): Promise<Task[]> {
    try {
      const snapshot = await this.tasksCollection
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      const tasks: Task[] = [];
      snapshot.forEach(doc => {
        tasks.push(doc.data() as Task);
      });

      return tasks;
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw error;
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    try {
      await this.tasksCollection.doc(taskId).update(updates);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.tasksCollection.doc(taskId).delete();
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async toggleTask(taskId: string, currentCompleted: boolean): Promise<void> {
    try {
      await this.updateTask(taskId, { completed: !currentCompleted });
    } catch (error) {
      console.error('Error toggling task:', error);
      throw error;
    }
  }
}

export const taskService = new TaskService();