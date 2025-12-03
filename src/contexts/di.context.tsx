/**
 * Context Provider para Dependency Injection
 * 
 * Fornece acesso ao DI Container em toda a aplicação React
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { container } from '../infrastructure/di/container';
import { getContainer } from '../config/di-container.config';

interface DIContextValue {
  container: typeof container;
}

const DIContext = createContext<DIContextValue | null>(null);

interface DIProviderProps {
  children: ReactNode;
}

/**
 * Provider que injeta o DI Container na árvore de componentes
 */
export const DIProvider: React.FC<DIProviderProps> = ({ children }) => {
  const diContainer = getContainer();

  return (
    <DIContext.Provider value={{ container: diContainer }}>
      {children}
    </DIContext.Provider>
  );
};

/**
 * Hook para acessar o DI Container
 */
export function useDI(): typeof container {
  const context = useContext(DIContext);
  
  if (!context) {
    throw new Error('useDI must be used within a DIProvider');
  }

  return context.container;
}

/**
 * Hook para resolver uma dependência do container
 */
export function useService<T>(token: symbol): T {
  const diContainer = useDI();
  return diContainer.resolve<T>(token);
}
