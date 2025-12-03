/**
 * Barrel export para interfaces de serviços
 * 
 * Princípio SOLID: Interface Segregation (I)
 * - Cada serviço tem sua própria interface específica
 * - Clientes dependem apenas das interfaces que utilizam
 */

export * from './IAuthService';
export * from './INotificationService';
export * from './ISyncService';
export * from './IStorageService';
export * from './IConnectivityService';
export * from './ILoggerService';
