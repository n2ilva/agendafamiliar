import AsyncStorage from '@react-native-async-storage/async-storage';
import { Family, FamilyUser, Task } from '../types/FamilyTypes';

const FAMILIES_KEY = 'familyApp_families';
const TASKS_KEY = 'familyApp_tasks';
const HISTORY_KEY = 'familyApp_history';
const APPROVALS_KEY = 'familyApp_approvals';

class LocalFamilyService {
  // Basic in-memory helpers
  private async loadFamilies(): Promise<Record<string, Family>> {
    const raw = await AsyncStorage.getItem(FAMILIES_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  private async saveFamilies(families: Record<string, Family>) {
    await AsyncStorage.setItem(FAMILIES_KEY, JSON.stringify(families));
  }

  private async loadTasks(): Promise<Record<string, Task>> {
    const raw = await AsyncStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  private async saveTasks(tasks: Record<string, Task>) {
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }

  async createFamily(name: string, adminUser: FamilyUser): Promise<Family> {
    const families = await this.loadFamilies();
    const id = `local_family_${Date.now()}`;
    const family: Family = {
      id,
      name,
      adminId: adminUser.id,
      members: [{ ...adminUser, role: 'admin', familyId: id, joinedAt: new Date() }],
      createdAt: new Date()
    } as any;
    families[id] = family;
    await this.saveFamilies(families);
    return family;
  }

  async getFamilyById(familyId: string): Promise<Family | null> {
    const families = await this.loadFamilies();
    return families[familyId] || null;
  }

  async getUserFamily(userId: string): Promise<Family | null> {
    const families = await this.loadFamilies();
    for (const f of Object.values(families)) {
      if (f.members.some(m => m.id === userId)) return f;
    }
    return null;
  }

  async joinFamily(inviteCode: string, user: FamilyUser): Promise<Family> {
    // Simplified: join first family
    const families = await this.loadFamilies();
    const first = Object.values(families)[0];
    if (!first) throw new Error('Nenhuma família disponível');
    first.members.push({ ...user, role: 'dependente', familyId: first.id, joinedAt: new Date() } as any);
    families[first.id] = first;
    await this.saveFamilies(families);
    return first;
  }

  async saveFamilyTask(task: Task, familyId: string): Promise<Task> {
    const tasks = await this.loadTasks();
    if (!task.id || task.id.startsWith('temp')) task.id = `local_task_${Date.now()}`;
    tasks[task.id] = { ...task, familyId, createdAt: task.createdAt || new Date(), updatedAt: new Date() } as any;
    await this.saveTasks(tasks);
    return tasks[task.id];
  }

  async getFamilyTasks(familyId: string, userId?: string): Promise<Task[]> {
    const tasks = await this.loadTasks();
    const list = Object.values(tasks).filter(t => (t as any).familyId === familyId && ( !(t as any).private || (userId && (t as any).createdBy === userId)));
    list.sort((a:any,b:any)=> ( (b.editedAt || b.createdAt) ? new Date(b.editedAt || b.createdAt).getTime() : 0) - ( (a.editedAt || a.createdAt) ? new Date(a.editedAt || a.createdAt).getTime() : 0));
    return list as Task[];
  }

  subscribeToFamilyTasks(familyId: string, callback: (tasks: Task[]) => void, userId?: string) {
    // No realtime in local mode; immediately call callback and return noop
    (async () => {
      const t = await this.getFamilyTasks(familyId, userId);
      callback(t);
    })();
    return () => {};
  }

  // History & approvals helpers
  private async loadHistory(): Promise<Record<string, any>> {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  private async saveHistory(h: Record<string, any>) {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  }

  private async loadApprovals(): Promise<Record<string, any>> {
    const raw = await AsyncStorage.getItem(APPROVALS_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  private async saveApprovals(a: Record<string, any>) {
    await AsyncStorage.setItem(APPROVALS_KEY, JSON.stringify(a));
  }

  async getFamilyHistory(familyId: string, limit?: number): Promise<any[]> {
    const hist = await this.loadHistory();
    const items = Object.values(hist).filter((h:any)=> h.familyId === familyId);
    // ordenar por createdAt desc
    items.sort((a:any,b:any)=> {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    if (typeof limit === 'number') return items.slice(0, limit);
    return items;
  }

  subscribeToFamilyHistory(familyId: string, callback: (history: any[]) => void, limit?: number) {
    (async ()=>{
      const h = await this.getFamilyHistory(familyId, limit);
      callback(h);
    })();
    return () => {};
  }

  async addFamilyHistoryItem(familyId: string, item: any): Promise<any> {
    const hist = await this.loadHistory();
    const id = `history_${Date.now()}`;
    const normalized = { id, familyId, ...item, createdAt: item.createdAt ? new Date(item.createdAt) : new Date() };
    hist[id] = normalized;
    await this.saveHistory(hist);
    return normalized;
  }

  async updateMemberRole(familyId: string, memberId: string, newRole: string): Promise<void> {
    const families = await this.loadFamilies();
    const family = families[familyId];
    if (!family) throw new Error('Family not found');
    family.members = family.members.map((m:any) => m.id === memberId ? { ...m, role: newRole } : m);
    families[familyId] = family;
    await this.saveFamilies(families);
  }

  async updateFamilyName(familyId: string, newName: string): Promise<void> {
    const families = await this.loadFamilies();
    const family = families[familyId];
    if (!family) throw new Error('Family not found');
    family.name = newName;
    families[familyId] = family;
    await this.saveFamilies(families);
  }

  async deleteFamilyTask(taskId: string): Promise<void> {
    const tasks = await this.loadTasks();
    delete tasks[taskId];
    await this.saveTasks(tasks);
  }

  // Approvals
  async saveApproval(approval: any): Promise<any> {
    const approvals = await this.loadApprovals();
    if (!approval.id) approval.id = `approval_${Date.now()}`;
    approvals[approval.id] = approval;
    await this.saveApprovals(approvals);
    return approvals[approval.id];
  }

  async getApprovalsForFamily(familyId: string): Promise<any[]> {
    const approvals = await this.loadApprovals();
    return Object.values(approvals).filter((a:any)=> a.familyId === familyId);
  }
}

export const familyService = new LocalFamilyService();
export default familyService;
