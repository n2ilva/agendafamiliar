/**
 * Registro de Dependências
 * Configura todas as dependências do sistema
 * 
 * Este arquivo é o ponto de configuração central para
 * todas as implementações concretas de interfaces.
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Este módulo é responsável apenas pela configuração do DI
 */

import { container } from './container';
import { TOKENS } from './tokens';

// Import de interfaces (já existem)
// import { ITaskRepository } from '../../core/interfaces/repositories';
// import { IAuthService } from '../../core/interfaces/services';

// Import de implementações (serão criadas nas próximas fases)
// import { FirestoreTaskRepository } from '../repositories/FirestoreTaskRepository';
// import { FirebaseAuthService } from '../services/FirebaseAuthService';

/**
 * Registra todas as dependências do sistema
 * Deve ser chamado na inicialização do app
 */
export function registerDependencies(): void {
  // ============ REPOSITÓRIOS ============
  // As implementações concretas serão registradas aqui
  // Por enquanto, deixamos placeholders

  // container.registerSingleton(TOKENS.TaskRepository, () => {
  //   return new FirestoreTaskRepository(
  //     container.resolve(TOKENS.LoggerService)
  //   );
  // });

  // container.registerSingleton(TOKENS.FamilyRepository, () => {
  //   return new FirestoreFamilyRepository(
  //     container.resolve(TOKENS.LoggerService)
  //   );
  // });

  // container.registerSingleton(TOKENS.UserRepository, () => {
  //   return new FirestoreUserRepository(
  //     container.resolve(TOKENS.LoggerService)
  //   );
  // });

  // container.registerSingleton(TOKENS.CategoryRepository, () => {
  //   return new LocalCategoryRepository(
  //     container.resolve(TOKENS.StorageService)
  //   );
  // });

  // container.registerSingleton(TOKENS.HistoryRepository, () => {
  //   return new LocalHistoryRepository(
  //     container.resolve(TOKENS.StorageService)
  //   );
  // });

  // container.registerSingleton(TOKENS.ApprovalRepository, () => {
  //   return new FirestoreApprovalRepository(
  //     container.resolve(TOKENS.LoggerService)
  //   );
  // });

  // ============ SERVIÇOS ============

  // Logger deve ser registrado primeiro pois outros dependem dele
  // container.registerSingleton(TOKENS.LoggerService, () => {
  //   return new ConsoleLoggerService();
  // });

  // container.registerSingleton(TOKENS.StorageService, () => {
  //   return new AsyncStorageService(
  //     container.resolve(TOKENS.LoggerService)
  //   );
  // });

  // container.registerSingleton(TOKENS.ConnectivityService, () => {
  //   return new NetInfoConnectivityService(
  //     container.resolve(TOKENS.LoggerService)
  //   );
  // });

  // container.registerSingleton(TOKENS.AuthService, () => {
  //   return new FirebaseAuthService(
  //     container.resolve(TOKENS.LoggerService),
  //     container.resolve(TOKENS.StorageService)
  //   );
  // });

  // container.registerSingleton(TOKENS.SyncService, () => {
  //   return new FirestoreSyncService(
  //     container.resolve(TOKENS.ConnectivityService),
  //     container.resolve(TOKENS.StorageService),
  //     container.resolve(TOKENS.LoggerService)
  //   );
  // });

  // container.registerSingleton(TOKENS.NotificationService, () => {
  //   return new ExpoNotificationService(
  //     container.resolve(TOKENS.LoggerService)
  //   );
  // });

  console.log('[DI] Dependências registradas com sucesso');
}

/**
 * Verifica se todas as dependências críticas estão registradas
 */
export function validateDependencies(): boolean {
  const criticalTokens: symbol[] = [
    // Adicione tokens críticos aqui quando as implementações existirem
    // TOKENS.LoggerService,
    // TOKENS.StorageService,
    // TOKENS.AuthService,
  ];

  for (const token of criticalTokens) {
    if (!container.isRegistered(token)) {
      console.error(`[DI] Dependência crítica não registrada: ${token.toString()}`);
      return false;
    }
  }

  return true;
}

/**
 * Limpa todas as dependências (para testes)
 */
export function clearDependencies(): void {
  container.clear();
}
