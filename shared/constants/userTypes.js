// Tipos de usuário do sistema
export const USER_TYPES = {
  ADMIN: 'ADMIN',
  DEPENDENTE: 'DEPENDENTE',
  CONVIDADO: 'CONVIDADO'
};

// Status de tarefas
export const TASK_STATUS = {
  PENDING: 'PENDING',           // Tarefa criada, aguardando execução
  IN_PROGRESS: 'IN_PROGRESS',   // Tarefa em andamento
  COMPLETED: 'COMPLETED',       // Tarefa concluída (por admin ou aprovada)
  AWAITING_APPROVAL: 'AWAITING_APPROVAL'  // Tarefa concluída por dependente, aguardando aprovação
};

// Permissões por tipo de usuário
export const PERMISSIONS = {
  [USER_TYPES.ADMIN]: {
    canCreateTasks: true,
    canEditAllTasks: true,
    canDeleteAllTasks: true,
    canApproveCompletions: true,
    canManageUsers: true,
    canCompleteTasksDirectly: true
  },
  [USER_TYPES.DEPENDENTE]: {
    canCreateTasks: true,
    canEditOwnTasks: true,
    canDeleteOwnTasks: true,
    canApproveCompletions: false,
    canManageUsers: false,
    canCompleteTasksDirectly: false // Precisa de aprovação
  },
  [USER_TYPES.CONVIDADO]: {
    canCreateTasks: true,
    canEditOwnTasks: true,
    canDeleteOwnTasks: true,
    canApproveCompletions: false,
    canManageUsers: false,
    canCompleteTasksDirectly: true // No modo convidado, pode completar diretamente
  }
};

// Função para verificar se o usuário tem uma permissão específica
export const hasPermission = (userType, permission) => {
  return PERMISSIONS[userType]?.[permission] || false;
};

// Função para verificar se o usuário pode editar uma tarefa específica
export const canEditTask = (userType, currentUserId, taskCreatorId) => {
  if (userType === USER_TYPES.ADMIN) {
    return true; // Admin pode editar qualquer tarefa
  }
  
  if (userType === USER_TYPES.DEPENDENTE || userType === USER_TYPES.CONVIDADO) {
    return currentUserId === taskCreatorId; // Só pode editar próprias tarefas
  }
  
  return false;
};