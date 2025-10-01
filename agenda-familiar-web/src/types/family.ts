// Tipos de usuário na família
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user', 
  KIDS = 'kids'
}

// Interface para usuário da família
export interface FamilyUser {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  joinedAt: Date;
  lastActive?: Date;
}

// Interface para família
export interface Family {
  id: string;
  name: string;
  code: string; // Código único para entrada na família
  createdBy: string; // ID do usuário que criou
  createdAt: Date;
  updatedAt: Date;
  members: FamilyUser[];
  settings: FamilySettings;
}

// Configurações da família
export interface FamilySettings {
  allowKidsCreateTasks: boolean; // Se kids podem criar tarefas
  requireApprovalForKidsCompletion: boolean; // Se kids precisam de aprovação para completar
  allowUserManageMembers: boolean; // Se users podem gerenciar outros users (não admins)
}

// Interface para solicitação de aprovação
export interface TaskApproval {
  id: string;
  taskId: string;
  familyId: string;
  requestedBy: string; // ID do kid que solicitou
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string; // ID do admin/user que aprovou
  approvedAt?: Date;
  rejectionReason?: string;
}

// Permissões por tipo de usuário
export const USER_PERMISSIONS = {
  [UserRole.ADMIN]: {
    canEditFamilyName: true,
    canManageMembers: true,
    canDeleteMembers: true,
    canChangeUserRoles: true,
    canApproveTaskCompletion: true,
    canCreateTasks: true,
    canEditAnyTask: true,
    canDeleteAnyTask: true,
    canViewAllTasks: true,
    canManageFamilySettings: true
  },
  [UserRole.USER]: {
    canEditFamilyName: false,
    canManageMembers: false,
    canDeleteMembers: false,
    canChangeUserRoles: false,
    canApproveTaskCompletion: true,
    canCreateTasks: true,
    canEditAnyTask: false, // Só suas próprias tarefas
    canDeleteAnyTask: false, // Só suas próprias tarefas
    canViewAllTasks: true,
    canManageFamilySettings: false
  },
  [UserRole.KIDS]: {
    canEditFamilyName: false,
    canManageMembers: false,
    canDeleteMembers: false,
    canChangeUserRoles: false,
    canApproveTaskCompletion: false,
    canCreateTasks: true, // Dependendo das configurações da família
    canEditAnyTask: false, // Só suas próprias tarefas
    canDeleteAnyTask: false, // Só suas próprias tarefas
    canViewAllTasks: true,
    canManageFamilySettings: false
  }
};

// Função utilitária para verificar permissões
export const hasPermission = (userRole: UserRole, permission: keyof typeof USER_PERMISSIONS[UserRole.ADMIN]): boolean => {
  return USER_PERMISSIONS[userRole][permission] || false;
};

// Labels para exibição
export const USER_ROLE_LABELS = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.USER]: 'Usuário',
  [UserRole.KIDS]: 'Criança'
};

// Cores para badges dos tipos de usuário
export const USER_ROLE_COLORS = {
  [UserRole.ADMIN]: 'bg-red-100 text-red-800',
  [UserRole.USER]: 'bg-blue-100 text-blue-800',
  [UserRole.KIDS]: 'bg-green-100 text-green-800'
};