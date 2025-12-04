/**
 * Configuração e Inicialização do DI Container
 * 
 * Este arquivo configura todas as dependências da aplicação usando o padrão de Injeção de Dependências.
 * Registra repositórios, serviços e use cases para serem injetados onde necessário.
 */

import { container } from '../infrastructure/di/container';
import { TOKENS } from '../infrastructure/di/tokens';
import { firebaseFirestore } from './firebase.config';

// Interfaces
import { ITaskRepository } from '../core/interfaces/repositories/ITaskRepository';
import { IFamilyRepository } from '../core/interfaces/repositories/IFamilyRepository';
import { IUserRepository } from '../core/interfaces/repositories/IUserRepository';
import { IApprovalRepository } from '../core/interfaces/repositories/IApprovalRepository';
import { ICategoryRepository } from '../core/interfaces/repositories/ICategoryRepository';
import { IHistoryRepository } from '../core/interfaces/repositories/IHistoryRepository';
import { IAuthService } from '../core/interfaces/services/IAuthService';
import { IStorageService } from '../core/interfaces/services/IStorageService';
import { ISyncService } from '../core/interfaces/services/ISyncService';
import { INotificationService } from '../core/interfaces/services/INotificationService';

// Repositórios
import {
  FirestoreTaskRepository,
  FirestoreFamilyRepository,
  FirestoreUserRepository,
  FirestoreApprovalRepository,
  FirestoreCategoryRepository,
  FirestoreHistoryRepository,
} from '../infrastructure/repositories';

// Serviços
import {
  FirebaseAuthService,
  AsyncStorageService,
  SyncService,
  NotificationService,
} from '../infrastructure/services';

// Use Cases - Tasks
import { CreateTaskUseCase } from '../core/usecases/tasks/CreateTaskUseCase';
import { UpdateTaskUseCase } from '../core/usecases/tasks/UpdateTaskUseCase';
import { DeleteTaskUseCase } from '../core/usecases/tasks/DeleteTaskUseCase';
import { CompleteTaskUseCase } from '../core/usecases/tasks/CompleteTaskUseCase';
import { UncompleteTaskUseCase } from '../core/usecases/tasks/UncompleteTaskUseCase';
import { PostponeTaskUseCase } from '../core/usecases/tasks/PostponeTaskUseCase';
import { GetTasksUseCase } from '../core/usecases/tasks/GetTasksUseCase';

// Use Cases - Family
import { CreateFamilyUseCase } from '../core/usecases/family/CreateFamilyUseCase';
import { JoinFamilyUseCase } from '../core/usecases/family/JoinFamilyUseCase';
import { LeaveFamilyUseCase } from '../core/usecases/family/LeaveFamilyUseCase';
import { InviteMemberUseCase } from '../core/usecases/family/InviteMemberUseCase';
import { UpdateMemberRoleUseCase } from '../core/usecases/family/UpdateMemberRoleUseCase';

// Use Cases - Auth
import { LoginUseCase } from '../core/usecases/auth/LoginUseCase';
import { LogoutUseCase } from '../core/usecases/auth/LogoutUseCase';
import { RegisterUseCase } from '../core/usecases/auth/RegisterUseCase';
import { ResetPasswordUseCase } from '../core/usecases/auth/ResetPasswordUseCase';
import { GetCurrentUserUseCase } from '../core/usecases/auth/GetCurrentUserUseCase';

// Use Cases - Approvals
import { RequestApprovalUseCase } from '../core/usecases/approvals/RequestApprovalUseCase';
import { ApproveTaskUseCase } from '../core/usecases/approvals/ApproveTaskUseCase';
import { RejectApprovalUseCase } from '../core/usecases/approvals/RejectApprovalUseCase';
import { GetPendingApprovalsUseCase } from '../core/usecases/approvals/GetPendingApprovalsUseCase';

/**
 * Cria e configura o container de injeção de dependências
 */
export function setupDIContainer(): typeof container {
  // Obter instância real do Firestore
  const firestoreProxy = firebaseFirestore();
  const firestore = typeof firestoreProxy === 'function' ? firestoreProxy() : firestoreProxy;

  // ============ Registrar Repositórios ============
  container.registerSingleton(TOKENS.TaskRepository, () => new FirestoreTaskRepository(firestore));
  container.registerSingleton(TOKENS.FamilyRepository, () => new FirestoreFamilyRepository(firestore));
  container.registerSingleton(TOKENS.UserRepository, () => new FirestoreUserRepository(firestore));
  container.registerSingleton(TOKENS.ApprovalRepository, () => new FirestoreApprovalRepository());
  container.registerSingleton(TOKENS.CategoryRepository, () => new FirestoreCategoryRepository());
  container.registerSingleton(TOKENS.HistoryRepository, () => new FirestoreHistoryRepository());

  // ============ Registrar Serviços ============
  container.registerSingleton(TOKENS.AuthService, () => new FirebaseAuthService());
  
  // Storage service é singleton
  const storageService = new AsyncStorageService();
  container.registerInstance(TOKENS.StorageService, storageService);
  
  // Sync service depende de storage
  const syncService = new SyncService(storageService);
  container.registerInstance(TOKENS.SyncService, syncService);
  
  container.registerSingleton(TOKENS.NotificationService, () => new NotificationService());

  // ============ Registrar Use Cases - Tasks ============
  container.registerTransient(TOKENS.CreateTaskUseCase, () => {
    const taskRepo = container.resolve<ITaskRepository>(TOKENS.TaskRepository);
    const notificationService = container.resolve<INotificationService>(TOKENS.NotificationService);
    return new CreateTaskUseCase(taskRepo, notificationService);
  });

  container.registerTransient(TOKENS.UpdateTaskUseCase, () => {
    const taskRepo = container.resolve<ITaskRepository>(TOKENS.TaskRepository);
    const notificationService = container.resolve<INotificationService>(TOKENS.NotificationService);
    return new UpdateTaskUseCase(taskRepo, notificationService);
  });

  container.registerTransient(TOKENS.DeleteTaskUseCase, () => {
    const taskRepo = container.resolve<ITaskRepository>(TOKENS.TaskRepository);
    const notificationService = container.resolve<INotificationService>(TOKENS.NotificationService);
    return new DeleteTaskUseCase(taskRepo, notificationService);
  });

  container.registerTransient(TOKENS.CompleteTaskUseCase, () => {
    const taskRepo = container.resolve<ITaskRepository>(TOKENS.TaskRepository);
    const notificationService = container.resolve<INotificationService>(TOKENS.NotificationService);
    const historyRepo = container.resolve<IHistoryRepository>(TOKENS.HistoryRepository);
    return new CompleteTaskUseCase(taskRepo, notificationService, historyRepo);
  });

  container.registerTransient(TOKENS.UncompleteTaskUseCase, () => {
    const taskRepo = container.resolve<ITaskRepository>(TOKENS.TaskRepository);
    const notificationService = container.resolve<INotificationService>(TOKENS.NotificationService);
    const historyRepo = container.resolve<IHistoryRepository>(TOKENS.HistoryRepository);
    return new UncompleteTaskUseCase(taskRepo, notificationService, historyRepo);
  });

  container.registerTransient(TOKENS.PostponeTaskUseCase, () => {
    const taskRepo = container.resolve<ITaskRepository>(TOKENS.TaskRepository);
    const notificationService = container.resolve<INotificationService>(TOKENS.NotificationService);
    const historyRepo = container.resolve<IHistoryRepository>(TOKENS.HistoryRepository);
    return new PostponeTaskUseCase(taskRepo, notificationService, historyRepo);
  });

  container.registerTransient(TOKENS.GetTasksUseCase, () => {
    const taskRepo = container.resolve<ITaskRepository>(TOKENS.TaskRepository);
    return new GetTasksUseCase(taskRepo);
  });

  // ============ Registrar Use Cases - Family ============
  container.registerTransient(TOKENS.CreateFamilyUseCase, () => {
    const familyRepo = container.resolve<IFamilyRepository>(TOKENS.FamilyRepository);
    const userRepo = container.resolve<IUserRepository>(TOKENS.UserRepository);
    return new CreateFamilyUseCase(familyRepo, userRepo);
  });

  container.registerTransient(TOKENS.JoinFamilyUseCase, () => {
    const familyRepo = container.resolve<IFamilyRepository>(TOKENS.FamilyRepository);
    const userRepo = container.resolve<IUserRepository>(TOKENS.UserRepository);
    const historyRepo = container.resolve<IHistoryRepository>(TOKENS.HistoryRepository);
    return new JoinFamilyUseCase(familyRepo, userRepo, historyRepo);
  });

  container.registerTransient(TOKENS.LeaveFamilyUseCase, () => {
    const familyRepo = container.resolve<IFamilyRepository>(TOKENS.FamilyRepository);
    const userRepo = container.resolve<IUserRepository>(TOKENS.UserRepository);
    const taskRepo = container.resolve<ITaskRepository>(TOKENS.TaskRepository);
    const historyRepo = container.resolve<IHistoryRepository>(TOKENS.HistoryRepository);
    return new LeaveFamilyUseCase(familyRepo, userRepo, taskRepo, historyRepo);
  });

  container.registerTransient(TOKENS.InviteMemberUseCase, () => {
    const familyRepo = container.resolve<IFamilyRepository>(TOKENS.FamilyRepository);
    return new InviteMemberUseCase(familyRepo);
  });

  container.registerTransient(TOKENS.UpdateMemberRoleUseCase, () => {
    const familyRepo = container.resolve<IFamilyRepository>(TOKENS.FamilyRepository);
    const userRepo = container.resolve<IUserRepository>(TOKENS.UserRepository);
    const historyRepo = container.resolve<IHistoryRepository>(TOKENS.HistoryRepository);
    return new UpdateMemberRoleUseCase(familyRepo, userRepo, historyRepo);
  });

  // ============ Registrar Use Cases - Auth ============
  container.registerTransient(TOKENS.LoginUseCase, () => {
    const authService = container.resolve<IAuthService>(TOKENS.AuthService);
    const userRepo = container.resolve<IUserRepository>(TOKENS.UserRepository);
    const storageService = container.resolve<IStorageService>(TOKENS.StorageService);
    return new LoginUseCase(authService, userRepo, storageService);
  });

  container.registerTransient(TOKENS.LogoutUseCase, () => {
    const authService = container.resolve<IAuthService>(TOKENS.AuthService);
    const storageService = container.resolve<IStorageService>(TOKENS.StorageService);
    const syncService = container.resolve<ISyncService>(TOKENS.SyncService);
    return new LogoutUseCase(authService, storageService, syncService);
  });

  container.registerTransient(TOKENS.RegisterUseCase, () => {
    const authService = container.resolve<IAuthService>(TOKENS.AuthService);
    const userRepo = container.resolve<IUserRepository>(TOKENS.UserRepository);
    const storageService = container.resolve<IStorageService>(TOKENS.StorageService);
    return new RegisterUseCase(authService, userRepo, storageService);
  });

  container.registerTransient(TOKENS.ResetPasswordUseCase, () => {
    const authService = container.resolve<IAuthService>(TOKENS.AuthService);
    return new ResetPasswordUseCase(authService);
  });

  container.registerTransient(TOKENS.GetCurrentUserUseCase, () => {
    const authService = container.resolve<IAuthService>(TOKENS.AuthService);
    const userRepo = container.resolve<IUserRepository>(TOKENS.UserRepository);
    const storageService = container.resolve<IStorageService>(TOKENS.StorageService);
    return new GetCurrentUserUseCase(authService, userRepo, storageService);
  });

  // ============ Registrar Use Cases - Approvals ============
  container.registerTransient(TOKENS.RequestApprovalUseCase, () => {
    const approvalRepo = container.resolve<IApprovalRepository>(TOKENS.ApprovalRepository);
    const taskRepo = container.resolve<ITaskRepository>(TOKENS.TaskRepository);
    const userRepo = container.resolve<IUserRepository>(TOKENS.UserRepository);
    const notificationService = container.resolve<INotificationService>(TOKENS.NotificationService);
    return new RequestApprovalUseCase(approvalRepo, taskRepo, userRepo, notificationService);
  });

  container.registerTransient(TOKENS.ApproveTaskUseCase, () => {
    const approvalRepo = container.resolve<IApprovalRepository>(TOKENS.ApprovalRepository);
    const taskRepo = container.resolve<ITaskRepository>(TOKENS.TaskRepository);
    const userRepo = container.resolve<IUserRepository>(TOKENS.UserRepository);
    const notificationService = container.resolve<INotificationService>(TOKENS.NotificationService);
    const historyRepo = container.resolve<IHistoryRepository>(TOKENS.HistoryRepository);
    return new ApproveTaskUseCase(approvalRepo, taskRepo, userRepo, notificationService, historyRepo);
  });

  container.registerTransient(TOKENS.RejectApprovalUseCase, () => {
    const approvalRepo = container.resolve<IApprovalRepository>(TOKENS.ApprovalRepository);
    const taskRepo = container.resolve<ITaskRepository>(TOKENS.TaskRepository);
    const userRepo = container.resolve<IUserRepository>(TOKENS.UserRepository);
    const notificationService = container.resolve<INotificationService>(TOKENS.NotificationService);
    const historyRepo = container.resolve<IHistoryRepository>(TOKENS.HistoryRepository);
    return new RejectApprovalUseCase(approvalRepo, taskRepo, userRepo, notificationService, historyRepo);
  });

  container.registerTransient(TOKENS.GetPendingApprovalsUseCase, () => {
    const approvalRepo = container.resolve<IApprovalRepository>(TOKENS.ApprovalRepository);
    const userRepo = container.resolve<IUserRepository>(TOKENS.UserRepository);
    return new GetPendingApprovalsUseCase(approvalRepo, userRepo);
  });

  return container;
}

// Flag para indicar se o container já foi inicializado
let isInitialized = false;

/**
 * Obtém o container configurado (inicializa se necessário)
 */
export function getContainer(): typeof container {
  if (!isInitialized) {
    setupDIContainer();
    isInitialized = true;
  }
  return container;
}

/**
 * Reseta o container (útil para testes)
 */
export function resetContainer(): void {
  container.clear();
  isInitialized = false;
}
