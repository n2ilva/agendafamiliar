/**
 * Barrel export para interfaces de repositórios
 * 
 * Princípio SOLID: Interface Segregation (I)
 * - Cada repositório tem sua própria interface específica
 * - Clientes dependem apenas das interfaces que utilizam
 */

export * from './ITaskRepository';
export * from './IFamilyRepository';
export * from './IUserRepository';
export * from './ICategoryRepository';
export * from './IHistoryRepository';
export * from './IApprovalRepository';
