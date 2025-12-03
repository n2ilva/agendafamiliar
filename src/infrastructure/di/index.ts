/**
 * Barrel export para Dependency Injection
 * 
 * Ponto único de importação para o sistema de DI
 */

export { container, inject, register } from './container';
export { TOKENS } from './tokens';
export { registerDependencies, validateDependencies, clearDependencies } from './register';
