/**
 * Tokens de Injeção de Dependência
 * Identificadores únicos para cada dependência do sistema
 * 
 * Princípio SOLID: Dependency Inversion (D)
 * - Módulos dependem de abstrações (tokens), não de implementações concretas
 */

// Símbolos únicos para identificar dependências
export const TOKENS = {
  // Repositórios
  TaskRepository: Symbol.for('TaskRepository'),
  FamilyRepository: Symbol.for('FamilyRepository'),
  UserRepository: Symbol.for('UserRepository'),
  CategoryRepository: Symbol.for('CategoryRepository'),
  HistoryRepository: Symbol.for('HistoryRepository'),
  ApprovalRepository: Symbol.for('ApprovalRepository'),

  // Serviços
  AuthService: Symbol.for('AuthService'),
  NotificationService: Symbol.for('NotificationService'),
  SyncService: Symbol.for('SyncService'),
  StorageService: Symbol.for('StorageService'),
  ConnectivityService: Symbol.for('ConnectivityService'),
  LoggerService: Symbol.for('LoggerService'),

  // Use Cases - Tasks
  CreateTaskUseCase: Symbol.for('CreateTaskUseCase'),
  UpdateTaskUseCase: Symbol.for('UpdateTaskUseCase'),
  DeleteTaskUseCase: Symbol.for('DeleteTaskUseCase'),
  CompleteTaskUseCase: Symbol.for('CompleteTaskUseCase'),
  UncompleteTaskUseCase: Symbol.for('UncompleteTaskUseCase'),
  PostponeTaskUseCase: Symbol.for('PostponeTaskUseCase'),
  GetTasksUseCase: Symbol.for('GetTasksUseCase'),
  
  // Use Cases - Family
  CreateFamilyUseCase: Symbol.for('CreateFamilyUseCase'),
  JoinFamilyUseCase: Symbol.for('JoinFamilyUseCase'),
  LeaveFamilyUseCase: Symbol.for('LeaveFamilyUseCase'),
  InviteMemberUseCase: Symbol.for('InviteMemberUseCase'),
  UpdateMemberRoleUseCase: Symbol.for('UpdateMemberRoleUseCase'),
  
  // Use Cases - Auth
  LoginUseCase: Symbol.for('LoginUseCase'),
  LogoutUseCase: Symbol.for('LogoutUseCase'),
  RegisterUseCase: Symbol.for('RegisterUseCase'),
  ResetPasswordUseCase: Symbol.for('ResetPasswordUseCase'),
  GetCurrentUserUseCase: Symbol.for('GetCurrentUserUseCase'),
  
  // Use Cases - Approvals
  RequestApprovalUseCase: Symbol.for('RequestApprovalUseCase'),
  ApproveTaskUseCase: Symbol.for('ApproveTaskUseCase'),
  RejectApprovalUseCase: Symbol.for('RejectApprovalUseCase'),
  GetPendingApprovalsUseCase: Symbol.for('GetPendingApprovalsUseCase'),
} as const;

export type TokenKey = keyof typeof TOKENS;
