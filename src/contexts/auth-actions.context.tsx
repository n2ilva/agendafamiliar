/**
 * AuthActionsContext - Contexto separado para ações de autenticação
 * 
 * Contém apenas as funções/ações, evitando re-renders em componentes
 * que apenas lêem dados do usuário quando ações são chamadas.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { UserRole } from '../types/family.types';

interface UserUpdatePayload {
  field: 'name' | 'picture' | 'profileIcon';
  value: string;
  historyDetails: string;
}

interface AuthActionsContextData {
  updateUserProfile: (payload: UserUpdatePayload) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleFamilySetup: (familyId: string) => Promise<void>;
  handleUserRoleChange: (newRole: UserRole, opts?: { silent?: boolean }) => Promise<void>;
}

const AuthActionsContext = createContext<AuthActionsContextData | undefined>(undefined);

export const useAuthActions = () => {
  const context = useContext(AuthActionsContext);
  if (context === undefined) {
    throw new Error('useAuthActions must be used within AuthActionsProvider');
  }
  return context;
};

// Hooks específicos para ações individuais (otimização extra)
export const useLogout = () => {
  const { handleLogout } = useAuthActions();
  return handleLogout;
};

export const useUpdateProfile = () => {
  const { updateUserProfile } = useAuthActions();
  return updateUserProfile;
};

export const useFamilySetup = () => {
  const { handleFamilySetup } = useAuthActions();
  return handleFamilySetup;
};

interface AuthActionsProviderProps {
  children: React.ReactNode;
  updateUserProfile: (payload: UserUpdatePayload) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleFamilySetup: (familyId: string) => Promise<void>;
  handleUserRoleChange: (newRole: UserRole, opts?: { silent?: boolean }) => Promise<void>;
}

export const AuthActionsProvider: React.FC<AuthActionsProviderProps> = ({
  children,
  updateUserProfile,
  handleLogout,
  handleFamilySetup,
  handleUserRoleChange
}) => {
  // Memoizar para evitar re-renders (callbacks devem ser estáveis via useCallback)
  const value = useMemo(() => ({
    updateUserProfile,
    handleLogout,
    handleFamilySetup,
    handleUserRoleChange
  }), [updateUserProfile, handleLogout, handleFamilySetup, handleUserRoleChange]);

  return (
    <AuthActionsContext.Provider value={value}>
      {children}
    </AuthActionsContext.Provider>
  );
};

export default AuthActionsContext;

export type { UserUpdatePayload };
