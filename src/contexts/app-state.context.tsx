/**
 * AppStateContext - Contexto para estados da aplicação
 * 
 * Estados relacionados ao ciclo de vida da aplicação,
 * separados dos dados do usuário e ações de autenticação.
 */

import React, { createContext, useContext, useMemo } from 'react';

interface AppStateContextData {
  appIsReady: boolean;
  isAuthReady: boolean;
  isDataReady: boolean;
  setAppIsReady: (isReady: boolean) => void;
}

const AppStateContext = createContext<AppStateContextData | undefined>(undefined);

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};

// Hooks específicos para estados individuais
export const useAppReady = () => {
  const { appIsReady, setAppIsReady } = useAppState();
  return { appIsReady, setAppIsReady };
};

export const useAuthReady = () => {
  const { isAuthReady } = useAppState();
  return isAuthReady;
};

export const useDataReady = () => {
  const { isDataReady } = useAppState();
  return isDataReady;
};

// Hook combinado para verificar se tudo está pronto
export const useIsFullyReady = () => {
  const { appIsReady, isAuthReady, isDataReady } = useAppState();
  return appIsReady && isAuthReady && isDataReady;
};

interface AppStateProviderProps {
  children: React.ReactNode;
  appIsReady: boolean;
  isAuthReady: boolean;
  isDataReady: boolean;
  setAppIsReady: (isReady: boolean) => void;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
  appIsReady,
  isAuthReady,
  isDataReady,
  setAppIsReady
}) => {
  const value = useMemo(() => ({
    appIsReady,
    isAuthReady,
    isDataReady,
    setAppIsReady
  }), [appIsReady, isAuthReady, isDataReady, setAppIsReady]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export default AppStateContext;
