import { Task, RepeatConfig, FamilyUser, UserRole } from '../../types/FamilyTypes';

// Constantes
export const HISTORY_DAYS_TO_KEEP = 7;

// LocalTask type definition
export type LocalTask = Task & {
  repeat?: RepeatConfig; // compatibilidade com código antigo
};

// Interface de item do histórico
export interface HistoryItem {
  id: string;
  action: 'created' | 'completed' | 'uncompleted' | 'edited' | 'deleted' | 'approval_requested' | 'approved' | 'rejected';
  taskTitle: string;
  taskId: string;
  timestamp: Date;
  details?: string;
  // Informações de autoria
  userId: string;
  userName: string;
  userRole?: string;
}

// Props do TaskScreen
export interface TaskScreenProps {
  user: FamilyUser;
  onLogout: () => Promise<void>;
  onUserNameChange: (newName: string) => void;
  onUserImageChange?: (newImageUrl: string) => void;
  onUserProfileIconChange?: (newProfileIcon: string) => void;
  onUserRoleChange?: (newRole: UserRole, opts?: { silent?: boolean }) => void;
}
