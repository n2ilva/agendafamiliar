import { familyService as localFamilyService } from './LocalFamilyService';
import { Family, FamilyUser, Task } from '../types/FamilyTypes';

class FirebaseFamilyService {
  // Adapter: redireciona métodos para localFamilyService

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

  async getFamilyHistory(familyId: string, limit?: number): Promise<any[]> {
    return await localFamilyService.getFamilyHistory(familyId, limit);
  }

  subscribeToFamilyHistory(familyId: string, callback: (history: any[]) => void, limit?: number) {
    return localFamilyService.subscribeToFamilyHistory(familyId, callback, limit);
  }

  subscribeToFamilyMembers(familyId: string, callback: (members: FamilyUser[]) => void) {
    // @ts-ignore - implemented in LocalFamilyService
    return (localFamilyService as any).subscribeToFamilyMembers(familyId, callback);
  }

  async addFamilyHistoryItem(familyId: string, item: any, ...args: any[]): Promise<any> {
    // Suporte para assinatura legada com múltiplos parâmetros
    if (typeof item === 'string' || (args.length > 0)) {
      if (args.length >= 1) {
        const action = item;
        const taskTitle = args[0];
        const taskId = args[1] || '';
        const userId = args[2] || undefined;
        const userName = args[3] || undefined;
        const userRole = args[4] || undefined;
        const details = args[5] || undefined;
        return await localFamilyService.addFamilyHistoryItem(familyId, {
          action, taskTitle, taskId, userId, userName, userRole, details
        });
      }
    }
    return await localFamilyService.addFamilyHistoryItem(familyId, item);
  }

  async updateMemberRole(familyId: string, memberId: string, newRole: string) {
    return await localFamilyService.updateMemberRole(familyId, memberId, newRole);
  }

  async updateMemberPermissions(
    familyId: string,
    memberId: string,
    permissions: { create?: boolean; edit?: boolean; delete?: boolean }
  ): Promise<void> {
    return await localFamilyService.updateMemberPermissions(familyId, memberId, permissions);
  }

  async updateFamilyName(familyId: string, newName: string): Promise<void> {
    return await localFamilyService.updateFamilyName(familyId, newName);
  }

  async removeMember(familyId: string, memberId: string): Promise<void> {
    // @ts-ignore - implemented in LocalFamilyService
    return await (localFamilyService as any).removeMember(familyId, memberId);
  }

  async regenerateInviteCode(familyId: string) {
    // @ts-ignore - método existe no local service
    return await (localFamilyService as any).regenerateInviteCode(familyId);
  }

  async saveApproval(approval: any): Promise<any> {
    return await localFamilyService.saveApproval(approval);
  }

  async getApprovalsForFamily(familyId: string): Promise<any[]> {
    return await localFamilyService.getApprovalsForFamily(familyId);
  }

  async requestAdminRole(familyId: string, requester: FamilyUser): Promise<string> {
    // @ts-ignore
    return await (localFamilyService as any).requestAdminRole(familyId, requester);
  }

  async resolveAdminRoleRequest(familyId: string, approvalId: string, approve: boolean, adminId: string, adminComment?: string): Promise<void> {
    // @ts-ignore
    return await (localFamilyService as any).resolveAdminRoleRequest(familyId, approvalId, approve, adminId, adminComment);
  }

  // Métodos para gerenciar categorias da família
  async saveFamilyCategories(familyId: string, categories: any[]): Promise<void> {
    // @ts-ignore
    if (typeof localFamilyService.saveFamilyCategories === 'function') {
      // @ts-ignore
      return await localFamilyService.saveFamilyCategories(familyId, categories);
    }
    throw new Error('saveFamilyCategories is not supported in local-only mode');
  }

  async getFamilyCategories(familyId: string): Promise<any[]> {
    // @ts-ignore
    if (typeof localFamilyService.getFamilyCategories === 'function') {
      // @ts-ignore
      return await localFamilyService.getFamilyCategories(familyId);
    }
    return [];
  }

  subscribeToFamilyCategories(familyId: string, callback: (categories: any[]) => void) {
    // @ts-ignore
    if (typeof localFamilyService.subscribeToFamilyCategories === 'function') {
      // @ts-ignore
      return localFamilyService.subscribeToFamilyCategories(familyId, callback);
    }
    return () => {}; // noop unsubscribe
  }

  // Methods not implemented in local-only mode will throw or return defaults
  async deleteFamilyTask(taskId: string, familyId: string): Promise<void> {
    // best-effort: remove from local tasks store if present
    // @ts-ignore
    if (typeof localFamilyService.deleteFamilyTask === 'function') {
      // @ts-ignore
      return await localFamilyService.deleteFamilyTask(taskId, familyId);
    }
    throw new Error('deleteFamilyTask is not supported in local-only mode');
  }
}

export const familyService = new FirebaseFamilyService();
export default familyService;