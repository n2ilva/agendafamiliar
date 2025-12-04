/**
 * AuthContext - Contexto principal de autenticação (COMPATIBILIDADE)
 * 
 * Este contexto mantém compatibilidade com código existente.
 * Para novos componentes, prefira usar os contextos específicos:
 * 
 * - useUser() / useCurrentUser() - Para dados do usuário
 * - useAuthActions() - Para ações (logout, updateProfile, etc)
 * - useAppState() - Para estados da aplicação (ready states)
 * 
 * Isso evita re-renders desnecessários em componentes que não
 * precisam de todas as informações do contexto.
 */

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FamilyUser, UserRole } from '../types/family.types';
import LocalAuthService from '../services/auth/local-auth.service';
import familyService from '../services/family/local-family.service';
import BackgroundSyncService from '../services/sync/background-sync.service';
import ConnectivityService from '../services/sync/connectivity.service';
import SyncService from '../services/sync/sync.service';
import LocalStorageService from '../services/storage/local-storage.service';
import Alert from '../utils/helpers/alert';

// Import dos contextos separados
import { UserProvider, useUser, useCurrentUser, useIsLoggedIn, useUserFamily, useUserRole } from './user.context';
import { AuthActionsProvider, useAuthActions, useLogout, useUpdateProfile, useFamilySetup, type UserUpdatePayload } from './auth-actions.context';
import { AppStateProvider, useAppState, useAppReady, useAuthReady, useDataReady, useIsFullyReady } from './app-state.context';

const USER_STORAGE_KEY = 'familyApp_currentUser';

interface AuthContextData {
  user: FamilyUser | null;
  loading: boolean;
  familyConfigured: boolean;
  appIsReady: boolean;
  isAuthReady: boolean; // Indica se Firebase Auth está totalmente inicializado
  isDataReady: boolean; // Indica se todos os dados foram carregados/sincronizados
  updateUserProfile: (payload: UserUpdatePayload) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleFamilySetup: (familyId: string) => Promise<void>;
  handleUserRoleChange: (newRole: UserRole, opts?: { silent?: boolean }) => Promise<void>;
  setAppIsReady: (isReady: boolean) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Re-exportar hooks dos contextos separados para facilitar imports
export {
  // User context
  useUser,
  useCurrentUser,
  useIsLoggedIn,
  useUserFamily,
  useUserRole,
  // Auth actions context
  useAuthActions,
  useLogout,
  useUpdateProfile,
  useFamilySetup,
  // App state context
  useAppState,
  useAppReady,
  useAuthReady,
  useDataReady,
  useIsFullyReady
};

export type { UserUpdatePayload };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FamilyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [familyConfigured, setFamilyConfigured] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false); // Firebase Auth inicializado
  const [isDataReady, setIsDataReady] = useState(false); // Dados sincronizados

  // Flags para evitar execuções duplicadas
  const preloadInProgressRef = React.useRef(false);
  const syncInProgressRef = React.useRef(false);
  const lastPreloadUserIdRef = React.useRef<string | null>(null);

  // ============= STORAGE OPERATIONS =============
  const saveUserToStorage = useCallback(async (userData: FamilyUser) => {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      console.log('💾 Usuário salvo no storage local');
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    }
  }, []);

  const removeUserFromStorage = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      console.log('🗑️ Usuário removido do storage local');
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
    }
  }, []);

  // ============= PRE-LOAD DATA =============
  // Carrega e sincroniza todos os dados antes de mostrar a tela principal
  const preloadData = async (userData: FamilyUser) => {
    // Evitar execuções duplicadas
    if (preloadInProgressRef.current || lastPreloadUserIdRef.current === userData.id) {
      console.log('⏭️ Preload já executado ou em andamento, pulando...');
      setIsDataReady(true);
      return;
    }

    preloadInProgressRef.current = true;
    lastPreloadUserIdRef.current = userData.id;
    console.log('🔄 Pré-carregando dados...');

    try {
      // 1. Limpar cache de tarefas antigas (apenas uma vez)
      console.log('🧹 Limpando tarefas antigas do cache...');
      await LocalStorageService.clearOldCompletedTasks(7);

      // 2. Se tiver família e estiver online, sincronizar tarefas
      if (userData.familyId) {
        const isOnline = ConnectivityService.isConnected();

        if (isOnline) {
          console.log('📡 Sincronizando dados com Firebase...');
          try {
            // Forçar sync completo das tarefas
            await SyncService.forceFullSync();
            console.log('✅ Sincronização completa');
          } catch (syncError) {
            console.warn('⚠️ Erro na sincronização, usando cache local:', syncError);
          }
        } else {
          console.log('📴 Offline - usando dados do cache');
        }
      }

      console.log('✅ Pré-carregamento concluído');
    } catch (error) {
      console.warn('⚠️ Erro no pré-carregamento (continuando com cache):', error);
    } finally {
      preloadInProgressRef.current = false;
      setIsDataReady(true);
    }
  };

  // ============= FAMILY SYNC =============
  const syncUserFamily = async (userData: FamilyUser): Promise<boolean> => {
    if (syncInProgressRef.current) {
      console.log('⏭️ Sync de família já em andamento, pulando...');
      return !!userData.familyId;
    }

    syncInProgressRef.current = true;

    try {
      if (userData.familyId) {
        console.log('🏠 Usuário já possui familyId:', userData.familyId);

        try {
          const userFamily = await familyService.getUserFamily(userData.id);
          if (userFamily) {
            const member = userFamily.members.find(m => m.id === userData.id);
            if (member) {
              if (member.role && member.role !== userData.role) {
                userData.role = member.role;
                try {
                  await LocalAuthService.updateUserRole(userData.id, member.role);
                } catch { }
              }
              if (member.profileIcon && member.profileIcon !== userData.profileIcon) {
                userData.profileIcon = member.profileIcon;
                console.log('🎨 ProfileIcon sincronizado da família:', member.profileIcon);
              }
            }
            console.log('✅ Família confirmada:', userFamily.name);
            return true;
          } else {
            console.warn('⚠️ Família não encontrada no Firebase, mas familyId existe localmente');
            return true;
          }
        } catch (error) {
          console.warn('⚠️ Sync em background falhou, mantendo familyId local:', error);
          return true;
        }
      }

      console.log('🔍 Buscando família no Firebase para usuário:', userData.id);
      const userFamily = await familyService.getUserFamily(userData.id);

      if (!userFamily) {
        console.log('👤 Usuário não possui família');
        return false;
      }

      console.log('🏠 Família encontrada:', userFamily.name);
      userData.familyId = userFamily.id;

      const member = userFamily.members.find(m => m.id === userData.id);
      if (member) {
        if (member.role && member.role !== userData.role) {
          userData.role = member.role;
          try {
            await LocalAuthService.updateUserRole(userData.id, member.role);
          } catch { }
        }
        if (member.profileIcon && member.profileIcon !== userData.profileIcon) {
          userData.profileIcon = member.profileIcon;
          console.log('🎨 ProfileIcon sincronizado da família:', member.profileIcon);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao sincronizar família:', error);
      if (userData.familyId) {
        console.log('ℹ️ Mantendo familyId local apesar do erro:', userData.familyId);
        return true;
      }
      return false;
    } finally {
      syncInProgressRef.current = false;
    }
  };

  // ============= INITIALIZATION =============
  const checkPersistedUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        console.log('👤 Usuário encontrado:', userData.name);

        const isFamilyConfigured = await syncUserFamily(userData);
        await saveUserToStorage(userData);

        // Pré-carregar dados antes de mostrar a tela
        await preloadData(userData);

        setUser(userData);
        setFamilyConfigured(isFamilyConfigured);
        setLoading(false);
      } else {
        setIsDataReady(true); // Sem usuário, dados estão "prontos"
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      setIsDataReady(true);
      setLoading(false);
    }
  };

  const setupAuthListener = () => {
    console.log('🔔 Configurando listener de autenticação');

    const safetyTimeout = setTimeout(() => {
      console.warn('⏱️ Timeout de segurança atingido');
      setLoading(false);
    }, 10000);

    const unsubscribe = LocalAuthService.onAuthStateChange(async (authUser) => {
      clearTimeout(safetyTimeout);

      // Marcar que o Firebase Auth está pronto (emitiu primeiro evento)
      setIsAuthReady(true);

      if (!authUser) {
        console.log('🚪 Auth indica logout');
        setUser(null);
        setFamilyConfigured(false);
        setIsDataReady(true);
        setLoading(false);
        await removeUserFromStorage();
        return;
      }

      console.log('👤 Usuário autenticado:', authUser.email);

      try {
        await LocalAuthService.initializeOfflineSupport();
        await BackgroundSyncService.registerBackgroundSyncAsync();

        const isFamilyConfigured = await syncUserFamily(authUser);
        await saveUserToStorage(authUser);

        // Pré-carregar dados antes de mostrar a tela
        await preloadData(authUser);

        setUser(authUser);
        setFamilyConfigured(isFamilyConfigured);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao processar autenticação:', error);
        setUser(authUser);
        setFamilyConfigured(!!authUser.familyId);
        setIsDataReady(true);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  };

  const initializeApp = async () => {
    try {
      await ConnectivityService.initialize();
      await checkPersistedUser();
      setupAuthListener();
    } catch (error) {
      console.warn('Erro ao inicializar app:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  // ============= USER ACTIONS =============
  const updateUserProfile = useCallback(async (payload: UserUpdatePayload) => {
    if (!user) return;

    const updatedUser: FamilyUser = {
      ...user,
      [payload.field === 'picture' ? 'picture' :
        payload.field === 'profileIcon' ? 'profileIcon' : 'name']: payload.value
    };

    setUser(updatedUser);
    await saveUserToStorage(updatedUser);

    // Sincronizar com Firebase
    try {
      if (payload.field === 'name') {
        await LocalAuthService.updateUserName(payload.value);
      } else if (payload.field === 'picture') {
        if (/^https?:\/\//i.test(payload.value)) {
          await LocalAuthService.uploadProfileImage(payload.value);
        }
      } else if (payload.field === 'profileIcon') {
        await LocalAuthService.setProfileIcon(payload.value);
      }
    } catch (error) {
      console.warn(`Falha ao sincronizar ${payload.field}:`, error);
    }

    // Registrar no histórico
    if (updatedUser.familyId) {
      try {
        await familyService.addFamilyHistoryItem(updatedUser.familyId, {
          action: 'edited',
          taskTitle: 'Perfil do usuário',
          taskId: '',
          userId: updatedUser.id,
          userName: updatedUser.name,
          userRole: updatedUser.role,
          details: payload.historyDetails
        });
      } catch (error) {
        console.warn('Falha ao registrar histórico:', error);
      }
    }
  }, [user, saveUserToStorage]);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Sair do App',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await LocalAuthService.logout();
              await removeUserFromStorage();
              await BackgroundSyncService.unregisterBackgroundSyncAsync();
            } catch (error) {
              console.error('Erro no logout:', error);
            } finally {
              setUser(null);
            }
          }
        }
      ]
    );
  }, [removeUserFromStorage]);

  const handleFamilySetup = useCallback(async (familyId: string) => {
    if (user) {
      const updatedUser = { ...user, familyId };
      setUser(updatedUser);
      setFamilyConfigured(true);
      await saveUserToStorage(updatedUser);
      console.log('✅ Família configurada com sucesso');
    }
  }, [user, saveUserToStorage]);

  const handleUserRoleChange = useCallback(async (newRole: UserRole, opts?: { silent?: boolean }) => {
    if (!user) return;

    try {
      await LocalAuthService.updateUserRole(user.id, newRole);

      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      await saveUserToStorage(updatedUser);

      if (!opts?.silent) {
        Alert.alert(
          'Perfil Atualizado',
          `Seu perfil foi alterado para ${newRole === 'admin' ? 'Administrador' : 'Dependente'}.`
        );
      }
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível alterar o perfil: ' + error.message);
    }
  }, [user, saveUserToStorage]);

  return (
    <UserProvider user={user} loading={loading} familyConfigured={familyConfigured}>
      <AuthActionsProvider
        updateUserProfile={updateUserProfile}
        handleLogout={handleLogout}
        handleFamilySetup={handleFamilySetup}
        handleUserRoleChange={handleUserRoleChange}
      >
        <AppStateProvider
          appIsReady={appIsReady}
          isAuthReady={isAuthReady}
          isDataReady={isDataReady}
          setAppIsReady={setAppIsReady}
        >
          {/* Manter AuthContext para compatibilidade com código existente */}
          <AuthContext.Provider value={{
            user,
            loading,
            familyConfigured,
            appIsReady,
            isAuthReady,
            isDataReady,
            updateUserProfile,
            handleLogout,
            handleFamilySetup,
            handleUserRoleChange,
            setAppIsReady
          }}>
            {children}
          </AuthContext.Provider>
        </AppStateProvider>
      </AuthActionsProvider>
    </UserProvider>
  );
};

/**
 * @deprecated Use os hooks específicos para melhor performance:
 * - useUser() - dados do usuário
 * - useAuthActions() - ações de autenticação  
 * - useAppState() - estados da aplicação
 */
export const useAuth = () => useContext(AuthContext);
