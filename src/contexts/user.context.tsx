/**
 * UserContext - Contexto separado para dados do usuário
 * 
 * Separação do AuthContext para otimizar re-renders:
 * - UserContext: dados do usuário (user, loading, familyConfigured)
 * - AuthActionsContext: ações de autenticação (login, logout, update)
 * - AppStateContext: estados da aplicação (appIsReady, isAuthReady, isDataReady)
 * 
 * Componentes que só precisam ler dados do usuário não serão
 * re-renderizados quando ações ou estados mudarem.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { FamilyUser } from '../types/family.types';

// ============= USER DATA CONTEXT =============
interface UserContextData {
  user: FamilyUser | null;
  loading: boolean;
  familyConfigured: boolean;
}

const UserContext = createContext<UserContextData | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

// Selector hooks para granularidade ainda maior
export const useCurrentUser = () => {
  const { user } = useUser();
  return user;
};

export const useIsLoggedIn = () => {
  const { user, loading } = useUser();
  return { isLoggedIn: !!user, loading };
};

export const useUserFamily = () => {
  const { user, familyConfigured } = useUser();
  return { 
    familyId: user?.familyId, 
    familyConfigured,
    hasFamily: !!user?.familyId 
  };
};

export const useUserRole = () => {
  const { user } = useUser();
  return user?.role ?? null;
};

interface UserProviderProps {
  children: React.ReactNode;
  user: FamilyUser | null;
  loading: boolean;
  familyConfigured: boolean;
}

export const UserProvider: React.FC<UserProviderProps> = ({
  children,
  user,
  loading,
  familyConfigured
}) => {
  // Memoizar valor para evitar re-creates desnecessários
  const value = useMemo(() => ({
    user,
    loading,
    familyConfigured
  }), [user, loading, familyConfigured]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
