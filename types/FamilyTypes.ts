export type UserRole = 'admin' | 'dependente';

export type TaskStatus = 'pendente' | 'concluida' | 'pendente_aprovacao' | 'aprovada' | 'rejeitada';

export interface CategoryConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  isDefault: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt?: Date | string;
}

export interface FamilyUser {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  // Ícone alternativo (quando usuário não deseja foto). Ex: 'cat', 'dog', 'rocket'
  profileIcon?: string;
  role: UserRole;
  isGuest: boolean;
  familyId?: string;
  joinedAt: Date | string;
  // Permissões específicas atribuídas pelo admin (ausente = sem permissão)
  permissions?: MemberPermissions;
}

export interface Family {
  id: string;
  name: string;
  adminId: string;
  members: FamilyUser[];
  createdAt: Date | string;
  inviteCode?: string;
  inviteCodeExpiry?: Date | string;
  categories?: CategoryConfig[];
}

export interface MemberPermissions {
  create?: boolean; // criar tarefas públicas (da família)
  edit?: boolean;   // editar tarefas públicas da família
  delete?: boolean; // deletar tarefas públicas da família
}

export interface FamilyInvite {
  id: string;
  familyId: string;
  familyName: string;
  code: string;
  createdBy: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  usedBy?: string;
  usedAt?: Date | string;
  isActive: boolean;
}

export interface TaskApproval {
  id: string;
  taskId: string;
  dependenteId: string;
  dependenteName: string;
  adminId?: string;
  status: 'pendente' | 'aprovada' | 'rejeitada';
  requestedAt: Date | string;
  resolvedAt?: Date | string;
  adminComment?: string;
  // ID da família para facilitar filtros e listeners em tempo real
  familyId?: string;
}

// Solicitação para se tornar administrador
export interface AdminRoleApproval {
  id: string;
  type: 'admin_role_request';
  familyId: string;
  requesterId: string;
  requesterName: string;
  status: 'pendente' | 'aprovada' | 'rejeitada';
  requestedAt: Date | string;
  resolvedAt?: Date | string;
  adminId?: string;
  adminComment?: string;
}

export interface ApprovalNotification {
  id: string;
  type: 'task_approval_request';
  taskId: string;
  taskTitle: string;
  dependenteId: string;
  dependenteName: string;
  createdAt: Date | string;
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
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string;
  dueDate?: Date;
  dueTime?: Date; // horário específico da tarefa
  repeatOption?: 'nenhum' | 'diario' | 'semanal' | 'mensal' | 'intervalo';
  repeatDays?: number[]; // dias da semana (0-6) quando repeatOption for 'semanal'
  // recorrência por intervalo
  repeatIntervalDays?: number; // a cada X dias
  repeatDurationMonths?: number; // duração em meses (0 = sem limite)
  repeatStartDate?: Date | string; // data de início para calcular duração
  userId: string;
  approvalId?: string;
  // Subtarefas
  subtasks?: Array<{
    id: string;
    title: string;
    done: boolean;
    dueDate?: Date; // data de vencimento da subtarefa
    dueTime?: Date; // horário de vencimento da subtarefa
    completedById?: string;
    completedByName?: string;
    completedAt?: Date | string;
  }>;
  // Campos de autoria
  createdBy: string;
  createdByName: string;
  editedBy?: string;
  editedByName?: string;
  editedAt?: Date | string;
  // Se true, a tarefa é privada ao usuário que a criou e não deve ser visível para outros membros da família
  private?: boolean;
  // Se true, a tarefa foi desbloqueada pelo admin para finalização antecipada (apenas para tarefas futuras)
  unlocked?: boolean;
  unlockedBy?: string; // ID do admin que desbloqueou
  unlockedAt?: Date | string; // Quando foi desbloqueada
}

export interface FamilyData {
  families: Family[];
  users: FamilyUser[];
  tasks: Task[];
  approvals: TaskApproval[];
  notifications: ApprovalNotification[];
  invites: FamilyInvite[];
}