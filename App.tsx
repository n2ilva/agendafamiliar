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
import { getCurrentSeason } from './utils/colors';

// Importar ferramentas de diagnóstico (apenas em desenvolvimento)
if (__DEV__) {
  import('./utils/DiagnosticTools');
}



const USER_STORAGE_KEY = 'familyApp_currentUser';

export default function App() {
  const [user, setUser] = useState<FamilyUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [familyConfigured, setFamilyConfigured] = useState<boolean>(false);
  const [appIsReady, setAppIsReady] = useState<boolean>(false);

  // Evita que o Splash desapareça automaticamente; será escondido manualmente após boot essencial
  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await ConnectivityService.initialize();
      } catch (e) {
        console.warn('Falha ao inicializar ConnectivityService no startup:', e);
      }
      await checkPersistedUser();
    })();
  }, []);

  // Quando o carregamento essencial terminar, marcamos appIsReady para esconder Splash no onLayout
  useEffect(() => {
    if (!loading) {
      setAppIsReady(true);
    }
  }, [loading]);

  // Assim que o app estiver pronto, hide o Splash (sem depender de onLayout)
  useEffect(() => {
    if (appIsReady) {
      // Pequeno atraso garante que a primeira pintura do layout já ocorreu
      const t = setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 0);
      return () => clearTimeout(t);
    }
  }, [appIsReady]);

  const checkPersistedUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        console.log('👤 Usuário encontrado no storage local:', userData.name);
        
        try {
          const userFamily = await familyService.getUserFamily(userData.id);
          
          if (userFamily) {
            console.log('🏠 Família encontrada no Firebase:', userFamily.name);
            if (!userData.familyId || userData.familyId !== userFamily.id) {
              userData.familyId = userFamily.id;
              console.log('✅ FamilyId atualizado no storage:', userFamily.id);
            }
            // Sincronizar role silenciosamente a partir do membro da família
            try {
              const me = userFamily.members.find(m => m.id === userData.id);
              if (me && me.role && me.role !== userData.role) {
                userData.role = me.role;
                // Atualizar nos serviços locais (sem Alert)
                try { await LocalAuthService.updateUserRole(userData.id, me.role); } catch {}
                console.log('🔄 Role sincronizada do servidor (silencioso):', me.role);
              }
            } catch {}

            await saveUserToStorage(userData);
            setFamilyConfigured(true);
          } else {
            console.log('👤 Usuário não possui família');
            setFamilyConfigured(false);
          }
        } catch (error) {
          console.error('❌ Erro ao verificar família do usuário:', error);
          setFamilyConfigured(!!userData.familyId);
        }
        
        setUser(userData);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário salvo:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveUserToStorage = async (userData: FamilyUser) => {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      console.log('💾 Usuário salvo no storage local');
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    }
  };

  const removeUserFromStorage = async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      console.log('🗑️ Usuário removido do storage local');
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
    }
  };

  useEffect(() => {
  console.log('🔔 Configurando listener de autenticação');
  
  // Timeout de segurança - se após 10s o loading não mudou, forçar false
  const safetyTimeout = setTimeout(() => {
    console.warn('⏱️ Timeout de segurança atingido - forçando loading=false');
    setLoading(false);
  }, 10000);
  
  const unsubscribe = LocalAuthService.onAuthStateChange(async (authUser) => {
      clearTimeout(safetyTimeout); // Cancela o timeout quando auth responde
      
      if (authUser) {
        console.log('👤 Usuário autenticado detectado:', authUser.email);
        setUser(authUser);
        await saveUserToStorage(authUser);
        await LocalAuthService.initializeOfflineSupport();
        await BackgroundSyncService.registerBackgroundSyncAsync();
        
        try {
          console.log('🔍 Buscando família do usuário:', authUser.id);
          const userFamily = await familyService.getUserFamily(authUser.id);
          
          if (userFamily) {
            console.log('🏠 Família encontrada no Firebase:', userFamily.name);
            if (!authUser.familyId || authUser.familyId !== userFamily.id) {
              authUser.familyId = userFamily.id;
              console.log('✅ FamilyId atualizado:', userFamily.id);
            }
            // Sincronizar role silenciosamente com base no membro
            try {
              const me = userFamily.members.find(m => m.id === authUser.id);
              if (me && me.role && me.role !== authUser.role) {
                authUser.role = me.role;
                try { await LocalAuthService.updateUserRole(authUser.id, me.role); } catch {}
                console.log('🔄 Role sincronizada do servidor (silencioso):', me.role);
              }
            } catch {}

            setUser(authUser);
            await saveUserToStorage(authUser);
            setFamilyConfigured(true);
          } else {
            console.log('👤 Usuário não possui família');
            setFamilyConfigured(!!authUser.familyId);
          }
        } catch (error) {
          console.error('❌ Erro ao verificar família:', error);
          setFamilyConfigured(!!authUser.familyId);
        }
      } else {
        console.log('🚪 Auth indica logout - limpando estado da aplicação');
        setUser(null);
        setFamilyConfigured(false);
        await removeUserFromStorage();
      }
      console.log('✅ onAuthStateChange concluído - definindo loading=false');
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  const handleUserNameChange = async (newName: string) => {
    if (user) {
      const updatedUser = { ...user, name: newName };
      setUser(updatedUser);
      await saveUserToStorage(updatedUser);
      console.log('✅ Nome do usuário atualizado no App.tsx');
      // Sincronizar com Firebase
      try {
        await LocalAuthService.updateUserName(newName);
      } catch (e) {
        console.warn('Falha ao sincronizar nome com Firebase:', e);
      }
      // Registrar no histórico da família (best-effort)
      try {
        if (updatedUser.familyId) {
          await familyService.addFamilyHistoryItem(updatedUser.familyId, {
            action: 'edited',
            taskTitle: 'Perfil do usuário',
            taskId: '',
            userId: updatedUser.id,
            userName: updatedUser.name,
            userRole: updatedUser.role,
            details: `Nome alterado para "${newName}"`
          });
        }
      } catch (e) {
        console.warn('Falha ao registrar histórico de alteração de nome:', e);
      }
    }
  };

  const handleUserImageChange = async (newImageUrl: string) => {
    if (user) {
      const updatedUser = { ...user, picture: newImageUrl };
      setUser(updatedUser);
      await saveUserToStorage(updatedUser);
      console.log('✅ Foto do usuário atualizada no App.tsx');
      // Sincronizar com Firebase (se não foi feito pelo serviço de upload)
      try {
        if (/^https?:\/\//i.test(newImageUrl)) {
          // Se já é uma URL remota, atualizar docs de perfil
          await LocalAuthService.uploadProfileImage(newImageUrl);
        }
      } catch (e) {
        console.warn('Falha ao sincronizar foto com Firebase:', e);
      }
      // Registrar no histórico da família (best-effort)
      try {
        if (updatedUser.familyId) {
          await familyService.addFamilyHistoryItem(updatedUser.familyId, {
            action: 'edited',
            taskTitle: 'Perfil do usuário',
            taskId: '',
            userId: updatedUser.id,
            userName: updatedUser.name,
            userRole: updatedUser.role,
            details: 'Foto de perfil atualizada'
          });
        }
      } catch (e) {
        console.warn('Falha ao registrar histórico de alteração de foto:', e);
      }
    }
  };

  const handleUserProfileIconChange = async (newProfileIcon: string) => {
    if (user) {
      const updatedUser = { ...user, profileIcon: newProfileIcon };
      setUser(updatedUser);
      await saveUserToStorage(updatedUser);
      console.log('✅ Ícone de perfil do usuário atualizado no App.tsx');
      // Registrar no histórico da família (best-effort)
      try {
        if (updatedUser.familyId) {
          await familyService.addFamilyHistoryItem(updatedUser.familyId, {
            action: 'edited',
            taskTitle: 'Perfil do usuário',
            taskId: '',
            userId: updatedUser.id,
            userName: updatedUser.name,
            userRole: updatedUser.role,
            details: 'Ícone de perfil atualizado'
          });
        }
      } catch (e) {
        console.warn('Falha ao registrar histórico de alteração de ícone:', e);
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair do App',
      'Tem certeza que deseja sair da sua conta?',
      [
        { 
          text: 'Cancelar', 
          style: 'cancel' 
        },
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
  };

  const handleFamilySetup = async (familyId: string) => {
    if (user) {
      const updatedUser = { ...user, familyId };
      setUser(updatedUser);
      await saveUserToStorage(updatedUser);
    }
    setFamilyConfigured(true);
    console.log('✅ Família configurada com sucesso');
  };

  const handleUserRoleChange = async (newRole: UserRole, opts?: { silent?: boolean }) => {
    if (user) {
      try {
        // Atualizar role no armazenamento local se não for convidado
        if (!user.isGuest) {
          await LocalAuthService.updateUserRole(user.id, newRole);
        }
        
        // Atualizar estado local
        const updatedUser: FamilyUser = {
          ...user,
          role: newRole
        };
        setUser(updatedUser);
        await saveUserToStorage(updatedUser); // Salvar mudança de role
        
        if (!opts?.silent) {
          Alert.alert(
            'Perfil Atualizado',
            `Seu perfil foi alterado para ${newRole === 'admin' ? 'Administrador' : 'Dependente'}.`
          );
        }
      } catch (error: any) {
        Alert.alert('Erro', 'Não foi possível alterar o perfil: ' + error.message);
      }
    }
  };

  return (
    <ThemeProvider>
      <AppContent
        user={user}
        loading={loading}
        familyConfigured={familyConfigured}
        handleLogout={handleLogout}
        handleUserNameChange={handleUserNameChange}
        handleUserImageChange={handleUserImageChange}
        handleUserProfileIconChange={handleUserProfileIconChange}
        handleUserRoleChange={handleUserRoleChange}
        handleFamilySetup={handleFamilySetup}
      />
    </ThemeProvider>
  );
}

// Componente interno que tem acesso ao tema
const AppContent: React.FC<{
  user: FamilyUser | null;
  loading: boolean;
  familyConfigured: boolean;
  handleLogout: () => Promise<void>;
  handleUserNameChange: (newName: string) => void;
  handleUserImageChange: (newImageUrl: string) => void;
  handleUserProfileIconChange: (newProfileIcon: string) => void;
  handleUserRoleChange: (newRole: UserRole, opts?: { silent?: boolean }) => void;
  handleFamilySetup: (familyId: string) => void;
}> = ({
  user,
  loading,
  familyConfigured,
  handleLogout,
  handleUserNameChange,
  handleUserImageChange,
  handleUserProfileIconChange,
  handleUserRoleChange,
  handleFamilySetup,
}) => {
  const { colors, activeTheme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar 
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.background} 
        translucent={false}
      />
      {/* Sincronizar StatusBar e (opcionalmente) NavigationBar no Android quando o tema mudar */}
      {Platform.OS === 'android' && (
        <SyncSystemBarsAndroid backgroundColor={colors.background} theme={activeTheme} />
      )}
    <SafeAreaProvider>
      {loading ? (
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
      ) : user ? (
        familyConfigured ? (
          <>
            {console.log('🎯 Renderizando TaskScreen', { user: user.name, familyId: user.familyId })}
            <TaskScreen 
              user={user}
              onLogout={handleLogout}
              onUserNameChange={handleUserNameChange}
              onUserImageChange={handleUserImageChange}
              onUserProfileIconChange={handleUserProfileIconChange}
              onUserRoleChange={handleUserRoleChange}
            />
          </>
        ) : (
          <>
            {console.log('🏗️ Renderizando FamilySetupScreen', { user: user.name })}
            <FamilySetupScreen
              onFamilySetup={handleFamilySetup}
              onLogout={() => { handleLogout(); }}
              userEmail={user.email || ''}
              userName={user.name}
              userId={user.id}
            />
          </>
        )
      ) : (
        <>
          {console.log('🔐 Renderizando LoginScreen')}
          <LoginScreen />
        </>
      )}
    </SafeAreaProvider>
    </View>
  );
};

// Componente auxiliar para sincronizar System Bars no Android
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