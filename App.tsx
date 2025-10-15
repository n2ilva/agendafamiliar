import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TaskScreen } from './screens/TaskScreen';
import { LoginScreen } from './screens/LoginScreen';
import FamilySetupScreen from './screens/FamilySetupScreen';

import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { FamilyUser, UserRole } from './types/FamilyTypes';
import LocalAuthService from './services/LocalAuthService';
import familyService from './services/LocalFamilyService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundSyncService from './services/BackgroundSyncService';
import Alert from './utils/Alert';
import ConnectivityService from './services/ConnectivityService';
import * as SplashScreen from 'expo-splash-screen';



const USER_STORAGE_KEY = 'familyApp_currentUser';

export default function App() {
  const [user, setUser] = useState<FamilyUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [familyConfigured, setFamilyConfigured] = useState<boolean>(false);
  const [appIsReady, setAppIsReady] = useState<boolean>(false);

  // Evita que o Splash desapareça automaticamente; será escondido manualmente após boot essencial
  try {
    SplashScreen.preventAutoHideAsync();
  } catch {}

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

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      try {
        await SplashScreen.hideAsync();
      } catch {}
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
  const unsubscribe = LocalAuthService.onAuthStateChange(async (authUser) => {
      if (authUser) {
        setUser(authUser);
        await saveUserToStorage(authUser);
        await LocalAuthService.initializeOfflineSupport();
        await BackgroundSyncService.registerBackgroundSyncAsync();
        
        try {
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
      setLoading(false);
    });

    return unsubscribe;
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
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
    <SafeAreaProvider>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : user ? (
        familyConfigured ? (
          <TaskScreen 
            user={user}
            onLogout={handleLogout}
            onUserNameChange={handleUserNameChange}
            onUserImageChange={handleUserImageChange}
            onUserRoleChange={handleUserRoleChange}
          />
        ) : (
          <FamilySetupScreen
            onFamilySetup={handleFamilySetup}
            onLogout={handleLogout}
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
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});