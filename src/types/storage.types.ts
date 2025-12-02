import { Family, FamilyUser, Task, TaskApproval } from './family.types';

export interface PendingOperation {
    id: string;
    type: 'create' | 'update' | 'delete';
    collection: 'tasks' | 'families' | 'users' | 'approvals';
    data?: any;
    timestamp: number;
    retry: number;
}

export interface HistoryItem {
    id: string;
    userId: string;
    action: string;
    details?: string;
    timestamp: Date | string | number;
    relatedId?: string; // ID da tarefa ou item relacionado
    relatedType?: 'task' | 'family' | 'user' | 'approval';
}

export interface OfflineData {
    users: Record<string, FamilyUser>;
    families: Record<string, Family>;
    tasks: Record<string, Task>;
    approvals: Record<string, TaskApproval>;
    history: Record<string, HistoryItem>;
    pendingOperations: PendingOperation[];
    lastSync: number;
    notificationReads: Record<string, boolean>;
}
