/**
 * Value Object: UserRole
 * Representa o papel de um usuário na família
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Encapsula lógica de permissões baseada em role
 */

export type UserRole = 'admin' | 'adulto' | 'filho';

export const USER_ROLE = {
  ADMIN: 'admin' as UserRole,
  ADULT: 'adulto' as UserRole,
  CHILD: 'filho' as UserRole,
} as const;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  adulto: 'Adulto',
  filho: 'Filho(a)',
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Pode gerenciar todos os aspectos da família',
  adulto: 'Pode criar e aprovar tarefas',
  filho: 'Tarefas precisam de aprovação de um adulto',
};

export interface RolePermissions {
  canManageFamily: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canEditMemberRoles: boolean;
  canCreateTasks: boolean;
  canEditAnyTask: boolean;
  canDeleteAnyTask: boolean;
  canApproveTasks: boolean;
  canCreateCategories: boolean;
  needsApproval: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canManageFamily: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canEditMemberRoles: true,
    canCreateTasks: true,
    canEditAnyTask: true,
    canDeleteAnyTask: true,
    canApproveTasks: true,
    canCreateCategories: true,
    needsApproval: false,
  },
  adulto: {
    canManageFamily: false,
    canInviteMembers: true,
    canRemoveMembers: false,
    canEditMemberRoles: false,
    canCreateTasks: true,
    canEditAnyTask: false,
    canDeleteAnyTask: false,
    canApproveTasks: true,
    canCreateCategories: true,
    needsApproval: false,
  },
  filho: {
    canManageFamily: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canEditMemberRoles: false,
    canCreateTasks: true,
    canEditAnyTask: false,
    canDeleteAnyTask: false,
    canApproveTasks: false,
    canCreateCategories: false,
    needsApproval: true,
  },
};

/**
 * Verifica se é um role válido
 */
export function isValidUserRole(role: string): role is UserRole {
  return ['admin', 'adulto', 'filho'].includes(role);
}

/**
 * Obtém label do role
 */
export function getRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role] || role;
}

/**
 * Obtém descrição do role
 */
export function getRoleDescription(role: UserRole): string {
  return USER_ROLE_DESCRIPTIONS[role] || '';
}

/**
 * Obtém permissões de um role
 */
export function getRolePermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role];
}

/**
 * Verifica se um role tem uma permissão específica
 */
export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

/**
 * Obtém roles que um role pode gerenciar
 */
export function getManageableRoles(role: UserRole): UserRole[] {
  switch (role) {
    case 'admin':
      return ['admin', 'adulto', 'filho'];
    case 'adulto':
      return [];
    case 'filho':
      return [];
    default:
      return [];
  }
}

/**
 * Verifica se um role pode ser promovido para outro
 */
export function canPromoteTo(currentRole: UserRole, targetRole: UserRole): boolean {
  const hierarchy = { admin: 2, adulto: 1, filho: 0 };
  return hierarchy[targetRole] > hierarchy[currentRole];
}

/**
 * Obtém todos os roles ordenados por hierarquia
 */
export function getAllRoles(): UserRole[] {
  return ['admin', 'adulto', 'filho'];
}
