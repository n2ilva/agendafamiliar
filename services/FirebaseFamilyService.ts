import { familyService as localFamilyService } from './LocalFamilyService';
import { Family, FamilyUser, Task } from '../types/FamilyTypes';

class FirebaseFamilyService {
  // Forwarding adapter: methods used by the app will be proxied to localFamilyService.

  async createFamily(name: string, adminUser: FamilyUser): Promise<Family> {
    return await localFamilyService.createFamily(name, adminUser);
  }

  async getFamilyById(familyId: string): Promise<Family | null> {
    return await localFamilyService.getFamilyById(familyId);
  }

  async getUserFamily(userId: string): Promise<Family | null> {
    return await localFamilyService.getUserFamily(userId);
  }

  async joinFamily(inviteCode: string, user: FamilyUser): Promise<Family> {
    return await localFamilyService.joinFamily(inviteCode, user);
  }

  async saveFamilyTask(task: Task, familyId: string): Promise<Task> {
    return await localFamilyService.saveFamilyTask(task, familyId);
  }

  async getFamilyTasks(familyId: string, userId?: string): Promise<Task[]> {
    return await localFamilyService.getFamilyTasks(familyId, userId);
  }

  subscribeToFamilyTasks(familyId: string, callback: (tasks: Task[]) => void, userId?: string) {
    return localFamilyService.subscribeToFamilyTasks(familyId, callback, userId);
  }

  // History / approvals / admin operations forwarded to local service
  async getFamilyHistory(familyId: string, limit?: number): Promise<any[]> {
    return await localFamilyService.getFamilyHistory(familyId, limit);
  }

  subscribeToFamilyHistory(familyId: string, callback: (history: any[]) => void, limit?: number) {
    return localFamilyService.subscribeToFamilyHistory(familyId, callback, limit);
  }

  async addFamilyHistoryItem(familyId: string, item: any): Promise<any> {
    // Support legacy signature: addFamilyHistoryItem(familyId, action, taskTitle, taskId, userId, userName, userRole, details)
    if (typeof item === 'string' || Array.isArray(arguments) && arguments.length > 2) {
      const args: any = arguments;
      if (args.length >= 3) {
        const action = args[1];
        const taskTitle = args[2];
        const taskId = args[3] || '';
        const userId = args[4] || undefined;
        const userName = args[5] || undefined;
        const userRole = args[6] || undefined;
        const details = args[7] || undefined;
        return await localFamilyService.addFamilyHistoryItem(familyId, {
          action, taskTitle, taskId, userId, userName, userRole, details
        });
      }
    }
    return await localFamilyService.addFamilyHistoryItem(familyId, item);
  }

  async updateMemberRole(familyId: string, memberId: string, newRole: string): Promise<void> {
    return await localFamilyService.updateMemberRole(familyId, memberId, newRole);
  }

  async updateFamilyName(familyId: string, newName: string): Promise<void> {
    return await localFamilyService.updateFamilyName(familyId, newName);
  }

  async saveApproval(approval: any): Promise<any> {
    return await localFamilyService.saveApproval(approval);
  }

  async getApprovalsForFamily(familyId: string): Promise<any[]> {
    return await localFamilyService.getApprovalsForFamily(familyId);
  }

  // Methods not implemented in local-only mode will throw or return defaults
  async deleteFamilyTask(taskId: string, familyId: string): Promise<void> {
    // best-effort: remove from local tasks store if present
    try {
      // @ts-ignore
      const tasksModule = await import('./LocalFamilyService');
      const svc = tasksModule.familyService;
      // @ts-ignore
      if (typeof svc.deleteFamilyTask === 'function') return await svc.deleteFamilyTask(taskId, familyId);
    } catch (e) {
      // ignore
    }
    throw new Error('deleteFamilyTask is not supported in local-only mode');
  }
}

export const familyService = new FirebaseFamilyService();
export default familyService;