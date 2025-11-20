import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TaskScreen } from './screens/TaskScreen';
import { LoginScreen } from './screens/LoginScreen';
import FamilySetupScreen from './screens/FamilySetupScreen';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

import { ActivityIndicator, View, StyleSheet, Text, Image, StatusBar, Platform } from 'react-native';
import { FamilyUser, UserRole } from './types/FamilyTypes';
import LocalAuthService from './services/LocalAuthService';
import familyService from './services/LocalFamilyService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundSyncService from './services/BackgroundSyncService';
import Alert from './utils/Alert';
import ConnectivityService from './services/ConnectivityService';
import * as SplashScreen from 'expo-splash-screen';

// Importar ferramentas de diagnóstico (apenas em desenvolvimento)
if (__DEV__) {
  import('./utils/DiagnosticTools');
}

const USER_STORAGE_KEY = 'familyApp_currentUser';

// ============= TIPOS PRIVADOS =============
interface UserUpdatePayload {
  field: 'name' | 'picture' | 'profileIcon';
  value: string;
  historyDetails: string;
}

interface AuthState {
  user: FamilyUser | null;
  loading: boolean;
  familyConfigured: boolean;
  appIsReady: boolean;
}

export default function App() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    familyConfigured: false,
    appIsReady: false,
  });

  // ============= INICIALIZAÇÃO =============
  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (!state.loading && !state.appIsReady) {
      setState(prev => ({ ...prev, appIsReady: true }));
    }
  }, [state.loading, state.appIsReady]);

  useEffect(() => {
    if (state.appIsReady) {
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [state.appIsReady]);

  const initializeApp = async () => {
    try {
      await ConnectivityService.initialize();
      await checkPersistedUser();
      setupAuthListener();
    } catch (error) {
      console.warn('Erro ao inicializar app:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

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

  // ============= FAMILY SYNC =============
  const syncUserFamily = async (userData: FamilyUser): Promise<boolean> => {
    try {
      const userFamily = await familyService.getUserFamily(userData.id);
      
      if (!userFamily) {
        console.log('👤 Usuário não possui família');
        return false;
      }

      console.log('🏠 Família encontrada:', userFamily.name);
      
      // Atualizar familyId se necessário
      if (!userData.familyId || userData.familyId !== userFamily.id) {
        userData.familyId = userFamily.id;
      }

      // Sincronizar role silenciosamente
      const member = userFamily.members.find(m => m.id === userData.id);
      if (member?.role && member.role !== userData.role) {
        userData.role = member.role;
        try {
          await LocalAuthService.updateUserRole(userData.id, member.role);
        } catch {}
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao sincronizar família:', error);
      return !!userData.familyId;
    }
  };

  // ============= USER CHECKS =============
  const checkPersistedUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        console.log('👤 Usuário encontrado:', userData.name);
        
        const familyConfigured = await syncUserFamily(userData);
        await saveUserToStorage(userData);
        
        setState(prev => ({
          ...prev,
          user: userData,
          familyConfigured,
          loading: false
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const setupAuthListener = () => {
    console.log('🔔 Configurando listener de autenticação');
    
    const safetyTimeout = setTimeout(() => {
      console.warn('⏱️ Timeout de segurança atingido');
      setState(prev => ({ ...prev, loading: false }));
    }, 10000);
    
    const unsubscribe = LocalAuthService.onAuthStateChange(async (authUser) => {
      clearTimeout(safetyTimeout);
      
      if (!authUser) {
        console.log('🚪 Auth indica logout');
        setState(prev => ({
          ...prev,
          user: null,
          familyConfigured: false,
          loading: false
        }));
        await removeUserFromStorage();
        return;
      }

      console.log('👤 Usuário autenticado:', authUser.email);
      
      try {
        await LocalAuthService.initializeOfflineSupport();
        await BackgroundSyncService.registerBackgroundSyncAsync();
        
        const familyConfigured = await syncUserFamily(authUser);
        await saveUserToStorage(authUser);
        
        setState(prev => ({
          ...prev,
          user: authUser,
          familyConfigured,
          loading: false
        }));
      } catch (error) {
        console.error('Erro ao processar autenticação:', error);
        setState(prev => ({
          ...prev,
          user: authUser,
          familyConfigured: !!authUser.familyId,
          loading: false
        }));
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  };

  // ============= USER UPDATE OPERATIONS =============
  const updateUserProfile = useCallback(async (payload: UserUpdatePayload) => {
    if (!state.user) return;

    const updatedUser: FamilyUser = {
      ...state.user,
      [payload.field === 'picture' ? 'picture' : 
       payload.field === 'profileIcon' ? 'profileIcon' : 'name']: payload.value
    };

    setState(prev => ({ ...prev, user: updatedUser }));
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
  }, [state.user, saveUserToStorage]);

  const handleUserNameChange = useCallback((newName: string) => {
    updateUserProfile({
      field: 'name',
      value: newName,
      historyDetails: `Nome alterado para "${newName}"`
    });
  }, [updateUserProfile]);

  const handleUserImageChange = useCallback((newImageUrl: string) => {
    updateUserProfile({
      field: 'picture',
      value: newImageUrl,
      historyDetails: 'Foto de perfil atualizada'
    });
  }, [updateUserProfile]);

  const handleUserProfileIconChange = useCallback((newProfileIcon: string) => {
    updateUserProfile({
      field: 'profileIcon',
      value: newProfileIcon,
      historyDetails: 'Ícone de perfil atualizado'
    });
  }, [updateUserProfile]);

  // ============= LOGOUT & FAMILY SETUP =============
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
              setState(prev => ({ ...prev, user: null }));
            }
          }
        }
      ]
    );
  }, [removeUserFromStorage]);

  const handleFamilySetup = useCallback(async (familyId: string) => {
    if (state.user) {
      const updatedUser = { ...state.user, familyId };
      setState(prev => ({ ...prev, user: updatedUser, familyConfigured: true }));
      await saveUserToStorage(updatedUser);
      console.log('✅ Família configurada com sucesso');
    }
  }, [state.user, saveUserToStorage]);

  const handleUserRoleChange = useCallback(async (newRole: UserRole, opts?: { silent?: boolean }) => {
    if (!state.user) return;

    try {
      if (!state.user.isGuest) {
        await LocalAuthService.updateUserRole(state.user.id, newRole);
      }
      
      const updatedUser = { ...state.user, role: newRole };
      setState(prev => ({ ...prev, user: updatedUser }));
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
  }, [state.user, saveUserToStorage]);

  return (
    <ThemeProvider>
      <AppContent
        user={state.user}
        loading={state.loading}
        familyConfigured={state.familyConfigured}
        onLogout={handleLogout}
        onUserNameChange={handleUserNameChange}
        onUserImageChange={handleUserImageChange}
        onUserProfileIconChange={handleUserProfileIconChange}
        onUserRoleChange={handleUserRoleChange}
        onFamilySetup={handleFamilySetup}
      />
    </ThemeProvider>
  );
}

// ============= COMPONENTE DE CONTEÚDO =============
interface AppContentProps {
  user: FamilyUser | null;
  loading: boolean;
  familyConfigured: boolean;
  onLogout: () => Promise<void>;
  onUserNameChange: (newName: string) => void;
  onUserImageChange: (newImageUrl: string) => void;
  onUserProfileIconChange: (newProfileIcon: string) => void;
  onUserRoleChange: (newRole: UserRole, opts?: { silent?: boolean }) => void;
  onFamilySetup: (familyId: string) => void;
}

const AppContent: React.FC<AppContentProps> = ({
  user,
  loading,
  familyConfigured,
  onLogout,
  onUserNameChange,
  onUserImageChange,
  onUserProfileIconChange,
  onUserRoleChange,
  onFamilySetup,
}) => {
  const { colors, activeTheme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar 
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.background} 
        translucent={false}
      />
      {Platform.OS === 'android' && (
        <SyncSystemBarsAndroid backgroundColor={colors.background} theme={activeTheme} />
      )}
      <SafeAreaProvider>
        {loading ? (
          <LoadingScreen colors={colors} />
        ) : user ? (
          familyConfigured ? (
            <TaskScreen 
              user={user}
              onLogout={onLogout}
              onUserNameChange={onUserNameChange}
              onUserImageChange={onUserImageChange}
              onUserProfileIconChange={onUserProfileIconChange}
              onUserRoleChange={onUserRoleChange}
            />
          ) : (
            <FamilySetupScreen
              onFamilySetup={onFamilySetup}
              onLogout={onLogout}
              userEmail={user.email || ''}
              userName={user.name}
              userId={user.id}
            />
          )
        ) : (
          <LoginScreen />
        )}
      </SafeAreaProvider>
    </View>
  );
};

// ============= COMPONENTE DE LOADING =============
const LoadingScreen: React.FC<{ colors: any }> = ({ colors }) => (
  <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
    <View style={styles.loadingIconContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Image 
        source={require('./assets/chapeu_natal.png')} 
        style={styles.loadingChristmasHat}
      />
    </View>
    <Text style={{ marginTop: 10, color: colors.textSecondary }}>Carregando...</Text>
  </View>
);

// ============= COMPONENTE SYSTEM BARS =============
const SyncSystemBarsAndroid: React.FC<{ backgroundColor: string; theme: 'light' | 'dark' }> = ({ backgroundColor, theme }) => {
  useEffect(() => {
    try {
      StatusBar.setBarStyle(theme === 'dark' ? 'light-content' : 'dark-content', true);
      StatusBar.setBackgroundColor(backgroundColor, true);
    } catch {}

    // Tentar ajustar a barra de navegação se o módulo estiver disponível
    (async () => {
      try {
        const req: any = (eval as any)('require');
        const NavigationBar: any = req ? req('expo-navigation-bar') : null;
        if (NavigationBar && NavigationBar.setBackgroundColorAsync && NavigationBar.setButtonStyleAsync) {
          await NavigationBar.setBackgroundColorAsync(backgroundColor);
          await NavigationBar.setButtonStyleAsync(theme === 'dark' ? 'light' : 'dark');
        }
      } catch {
        // Módulo não disponível; ignorar silenciosamente
      }
    })();
  }, [backgroundColor, theme]);

  return null;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingChristmasHat: {
    position: 'absolute',
    top: -18,
    left: -12,
    width: 55,
    height: 55,
    zIndex: 10,
    resizeMode: 'contain',
  },
});