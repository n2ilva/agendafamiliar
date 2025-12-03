/**
 * Barrel export para erros de domínio
 * 
 * Princípio SOLID: Liskov Substitution (L)
 * - Todos os erros podem ser tratados como DomainError
 */

export * from './DomainError';
export * from './ValidationError';
export * from './TaskError';
export * from './FamilyError';
export * from './AuthError';
export * from './StorageError';
export * from './NetworkError';
