/**
 * Container de Injeção de Dependências
 * Gerencia registro e resolução de dependências
 * 
 * Princípio SOLID: Dependency Inversion (D)
 * - Classes de alto nível não dependem de classes de baixo nível
 * - Ambas dependem de abstrações
 * 
 * Princípio SOLID: Open/Closed (O)
 * - Aberto para extensão (novos registros)
 * - Fechado para modificação (interface estável)
 */

export type Factory<T> = () => T;
export type Lifecycle = 'singleton' | 'transient';

interface Registration<T> {
  factory: Factory<T>;
  lifecycle: Lifecycle;
  instance?: T;
}

class DIContainer {
  private static _instance: DIContainer;
  private registrations = new Map<symbol, Registration<any>>();

  private constructor() {}

  /**
   * Obtém a instância única do container (Singleton)
   */
  static getInstance(): DIContainer {
    if (!DIContainer._instance) {
      DIContainer._instance = new DIContainer();
    }
    return DIContainer._instance;
  }

  /**
   * Registra uma dependência como singleton
   * A mesma instância é retornada em todas as resoluções
   */
  registerSingleton<T>(token: symbol, factory: Factory<T>): void {
    this.registrations.set(token, {
      factory,
      lifecycle: 'singleton',
    });
  }

  /**
   * Registra uma dependência como transient
   * Uma nova instância é criada em cada resolução
   */
  registerTransient<T>(token: symbol, factory: Factory<T>): void {
    this.registrations.set(token, {
      factory,
      lifecycle: 'transient',
    });
  }

  /**
   * Registra uma instância já criada
   */
  registerInstance<T>(token: symbol, instance: T): void {
    this.registrations.set(token, {
      factory: () => instance,
      lifecycle: 'singleton',
      instance,
    });
  }

  /**
   * Resolve uma dependência pelo token
   * @throws Error se a dependência não estiver registrada
   */
  resolve<T>(token: symbol): T {
    const registration = this.registrations.get(token);

    if (!registration) {
      throw new Error(
        `Dependência não registrada: ${token.toString()}. ` +
        `Certifique-se de chamar registerDependencies() antes de resolver.`
      );
    }

    if (registration.lifecycle === 'singleton') {
      if (!registration.instance) {
        registration.instance = registration.factory();
      }
      return registration.instance;
    }

    return registration.factory();
  }

  /**
   * Tenta resolver uma dependência, retorna undefined se não encontrada
   */
  tryResolve<T>(token: symbol): T | undefined {
    try {
      return this.resolve<T>(token);
    } catch {
      return undefined;
    }
  }

  /**
   * Verifica se uma dependência está registrada
   */
  isRegistered(token: symbol): boolean {
    return this.registrations.has(token);
  }

  /**
   * Remove uma dependência registrada
   */
  unregister(token: symbol): void {
    this.registrations.delete(token);
  }

  /**
   * Limpa todas as dependências registradas
   * Útil para testes
   */
  clear(): void {
    this.registrations.clear();
  }

  /**
   * Reseta instâncias de singletons
   * Útil para testes
   */
  resetSingletons(): void {
    for (const [, registration] of this.registrations) {
      if (registration.lifecycle === 'singleton') {
        registration.instance = undefined;
      }
    }
  }

  /**
   * Lista todas as dependências registradas
   */
  getRegisteredTokens(): symbol[] {
    return Array.from(this.registrations.keys());
  }

  /**
   * Cria um escopo filho (para testes ou módulos isolados)
   */
  createScope(): DIContainer {
    const scope = new DIContainer();
    // Copia registros do pai
    for (const [token, registration] of this.registrations) {
      scope.registrations.set(token, { ...registration });
    }
    return scope;
  }
}

// Exporta instância singleton
export const container = DIContainer.getInstance();

// Helper functions para uso mais limpo
export function inject<T>(token: symbol): T {
  return container.resolve<T>(token);
}

export function register<T>(token: symbol, factory: Factory<T>, lifecycle: Lifecycle = 'singleton'): void {
  if (lifecycle === 'singleton') {
    container.registerSingleton(token, factory);
  } else {
    container.registerTransient(token, factory);
  }
}
