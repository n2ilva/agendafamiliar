export type UserRole = 'admin' | 'dependente';

export type TaskStatus = 'pendente' | 'concluida' | 'pendente_aprovacao' | 'aprovada' | 'rejeitada';

export interface FamilyUser {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  role: UserRole;
  isGuest: boolean;
  familyId?: string;
  joinedAt: Date;
}

export interface Family {
  id: string;
  name: string;
  adminId: string;
  members: FamilyUser[];
  createdAt: Date;
  inviteCode?: string;
  inviteCodeExpiry?: Date;
}

export interface FamilyInvite {
  id: string;
  familyId: string;
  familyName: string;
  code: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  usedBy?: string;
  usedAt?: Date;
  isActive: boolean;
}

export interface TaskApproval {
  id: string;
  taskId: string;
  dependenteId: string;
  dependenteName: string;
  adminId?: string;
  status: 'pendente' | 'aprovada' | 'rejeitada';
  requestedAt: Date;
  resolvedAt?: Date;
  adminComment?: string;
}

export interface ApprovalNotification {
  id: string;
  type: 'task_approval_request';
  taskId: string;
  taskTitle: string;
  dependenteId: string;
  dependenteName: string;
  createdAt: Date;
  read: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  status: TaskStatus;
  category: string;
  priority: 'baixa' | 'media' | 'alta';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  dueDate?: Date;
  dueTime?: Date; // horário específico da tarefa
  repeatOption?: 'nenhum' | 'diario' | 'semanal' | 'mensal';
  repeatDays?: number[]; // dias da semana (0-6) quando repeatOption for 'semanal'
  userId: string;
  approvalId?: string;
  // Campos de autoria
  createdBy: string;
  createdByName: string;
  editedBy?: string;
  editedByName?: string;
  editedAt?: Date;
}

export interface FamilyData {
  families: Family[];
  users: FamilyUser[];
  tasks: Task[];
  approvals: TaskApproval[];
  notifications: ApprovalNotification[];
  invites: FamilyInvite[];
}