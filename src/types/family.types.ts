/**
 * @deprecated Tipos legados - Migrar gradualmente para /core/domain/entities
 * 
 * Mapeamento de migração:
 * - Task → /core/domain/entities/Task
 * - Family → /core/domain/entities/Family  
 * - FamilyUser → /core/domain/entities/User
 * - CategoryConfig → /core/domain/entities/Category
 * - TaskStatus → /core/domain/value-objects/TaskStatus
 * - UserRole → /core/domain/value-objects/UserRole
 * - RepeatType, RepeatConfig → /core/domain/value-objects/RepeatConfig
 * 
 * Ver: src/services/MIGRATION_GUIDE.md
 */

export type UserRole = 'admin' | 'dependente';

export type TaskStatus = 'pendente' | 'concluida' | 'pendente_aprovacao' | 'aprovada' | 'rejeitada' | 'excluida' | 'cancelada';

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

export enum RepeatType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKENDS = 'weekends',
  CUSTOM = 'custom',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  BIWEEKLY = 'biweekly',
  INTERVAL = 'interval'
}

export interface RepeatConfig {
  type: RepeatType;
  days?: number[];
  intervalDays?: number;
  durationMonths?: number;
  endDate?: Date | string; // Data de término específica (alternativa a durationMonths)
}

export interface FamilyUser {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  // Ícone alternativo (quando usuário não deseja foto). Ex: 'cat', 'dog', 'rocket'
  profileIcon?: string;
  role: UserRole;
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

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  dueDate?: Date; // data de vencimento da subtarefa
  dueTime?: Date; // horário de vencimento da subtarefa
  completedById?: string;
  completedByName?: string;
  completedAt?: Date | string;
}

export interface SubtaskCategory {
  id: string;
  name: string;
  subtasks: Subtask[];
  isExpanded: boolean; // Estado de expansão/minimização
  createdAt: Date | string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  status: TaskStatus;
  category: string;
  priority: 'baixa' | 'media' | 'alta';
  familyId?: string | null; // Adicionado familyId opcional/nullable
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string;
  dueDate?: Date;
  dueTime?: Date; // horário específico da tarefa
  repeatOption?: 'nenhum' | 'diario' | 'semanal' | 'mensal' | 'anual' | 'quinzenal' | 'intervalo';
  repeatDays?: number[]; // dias da semana (0-6) quando repeatOption for 'semanal'
  repeatEndDate?: Date | string; // data de término específica
  // recorrência por intervalo
  repeatIntervalDays?: number; // a cada X dias
  repeatDurationMonths?: number; // duração em meses (0 = sem limite)
  repeatStartDate?: Date | string; // data de início para calcular duração
  userId: string;
  approvalId?: string;
  // Subtarefas (formato legado - ainda suportado)
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
  // Categorias de subtarefas (novo formato)
  subtaskCategories?: SubtaskCategory[];
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
  deleted?: boolean;
  deletedBy?: string;
  deletedByName?: string;
  deletedAt?: Date | string;
}

export interface FamilyData {
  families: Family[];
  users: FamilyUser[];
  tasks: Task[];
  approvals: TaskApproval[];
  notifications: ApprovalNotification[];
  invites: FamilyInvite[];
}

// ==================== TIPOS DE SINCRONIZAÇÃO ====================

/**
 * Metadados de sincronização para rastrear mudanças incrementais
 * Permite delta sync: sincronizar apenas dados que foram modificados
 */
export interface SyncMetadata {
  // Timestamp da última sincronização bem-sucedida deste item
  lastSyncTime: number;
  // Hash do último estado sincronizado (para detectar mudanças reais)
  dataHash: string;
  // Se o item foi modificado localmente e precisa sincronizar
  isDirty: boolean;
  // Versão do item (incrementa a cada mudança)
  version: number;
}

/**
 * Registro de mudanças por tipo de entidade
 * Permite rastrear quais tarefas, usuários, famílias foram modificadas desde a última sincronização
 */
export interface SyncChangeLog {
  // Mapa de ID -> timestamp da última mudança
  tasks: Record<string, number>;
  families: Record<string, number>;
  users: Record<string, number>;
  approvals: Record<string, number>;
  // Timestamp da última verificação de mudanças
  lastCheckTime: number;
}

/**
 * Item de histórico usado na UI e sincronização
 * Inclui campos extras de tarefa para exibição
 */
export interface HistoryItem {
  id: string;
  userId: string;
  userName?: string;
  userRole?: string;
  action: string;
  taskId?: string;
  taskTitle?: string;
  details?: string;
  timestamp: Date | string | number;
  relatedId?: string;
  relatedType?: 'task' | 'family' | 'user' | 'approval';
}