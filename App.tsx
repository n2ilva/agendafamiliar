import React, { useState, useEffect } from 'react';
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



const USER_STORAGE_KEY = 'familyApp_currentUser';

export default function App() {
  const [user, setUser] = useState<FamilyUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [familyConfigured, setFamilyConfigured] = useState<boolean>(false);


  // Verificar se há usuário logado ao inicializar o app
  useEffect(() => {
    (async () => {
      // Inicializar conectividade o quanto antes para que telas de login
      // possam decidir entre auth remoto ou local
      try {
        await ConnectivityService.initialize();
      } catch (e) {
        console.warn('Falha ao inicializar ConnectivityService no startup:', e);
      }
      await checkPersistedUser();
    })();
  }, []);

  // Verificar usuário persistido no AsyncStorage
  const checkPersistedUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        console.log('👤 Usuário encontrado no storage local:', userData.name);
        
        // Verificar se o usuário tem família no Firebase
        try {
          const userFamily = await familyService.getUserFamily(userData.id);
          
          if (userFamily) {
            console.log('🏠 Família encontrada no Firebase:', userFamily.name);
            // Atualizar o familyId do usuário se necessário
            if (!userData.familyId || userData.familyId !== userFamily.id) {
              userData.familyId = userFamily.id;
              await saveUserToStorage(userData);
              console.log('✅ FamilyId atualizado no storage:', userFamily.id);
            }
            setFamilyConfigured(true);
          } else {
            console.log('👤 Usuário não possui família');
            setFamilyConfigured(false);
          }
        } catch (error) {
          console.error('❌ Erro ao verificar família do usuário:', error);
          // Se houver erro, usar o familyId do storage
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

  // Salvar usuário no AsyncStorage
  const saveUserToStorage = async (userData: FamilyUser) => {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      console.log('💾 Usuário salvo no storage local');
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    }
  };

  // Remover usuário do AsyncStorage
  const removeUserFromStorage = async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      console.log('🗑️ Usuário removido do storage local');
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
    }
  };

  // Observar mudanças de autenticação
  useEffect(() => {
  const unsubscribe = LocalAuthService.onAuthStateChange(async (authUser) => {
      if (authUser) {
        setUser(authUser);
        await saveUserToStorage(authUser);
        await LocalAuthService.initializeOfflineSupport();
        await BackgroundSyncService.registerBackgroundSyncAsync(); // Registrar tarefa de background
        
        // Verificar se o usuário tem família no Firebase
        try {
          const userFamily = await familyService.getUserFamily(authUser.id);
          
          if (userFamily) {
            console.log('🏠 Família encontrada no Firebase:', userFamily.name);
            // Atualizar o familyId do usuário se necessário
            if (!authUser.familyId || authUser.familyId !== userFamily.id) {
              authUser.familyId = userFamily.id;
              setUser(authUser);
              await saveUserToStorage(authUser);
              console.log('✅ FamilyId atualizado:', userFamily.id);
            }
            setFamilyConfigured(true);
          } else {
            console.log('👤 Usuário não possui família');
            setFamilyConfigured(!!authUser.familyId);
          }
        } catch (error) {
          console.error('❌ Erro ao verificar família:', error);
          // Se houver erro, usar o familyId do authUser
          setFamilyConfigured(!!authUser.familyId);
        }
      } else {
        // Sempre limpar o estado quando o sistema de autenticação indica logout
        console.log('🚪 Auth indica logout - limpando estado da aplicação');
        setUser(null);
        setFamilyConfigured(false);
        await removeUserFromStorage(); // Garantir que o storage local também seja limpo
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleUserNameChange = async (newName: string) => {
    if (user) {
      // Atualizar estado local primeiro (para responsividade)
      const updatedUser = { ...user, name: newName };
      setUser(updatedUser);
      
      // Salvar no AsyncStorage
      await saveUserToStorage(updatedUser);
      
      console.log('✅ Nome do usuário atualizado no App.tsx');
    }
  };

  const handleUserImageChange = async (newImageUrl: string) => {
    if (user) {
      // Atualizar estado local primeiro (para responsividade)
      const updatedUser = { ...user, picture: newImageUrl };
      setUser(updatedUser);
      
      // Salvar no AsyncStorage
      await saveUserToStorage(updatedUser);
      
      console.log('✅ Foto do usuário atualizada no App.tsx');
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
              // Logout (local)
              await LocalAuthService.logout();
              
              // Remover dados do usuário do storage local
              await removeUserFromStorage();

              // Cancelar registro da tarefa de background
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
      // Atualizar usuário com familyId
      const updatedUser = { ...user, familyId };
      setUser(updatedUser);
      await saveUserToStorage(updatedUser);
    }
    setFamilyConfigured(true);
    console.log('✅ Família configurada com sucesso');
  };

  const handleUserRoleChange = async (newRole: UserRole) => {
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
        
        Alert.alert(
          'Perfil Atualizado',
          `Seu perfil foi alterado para ${newRole === 'admin' ? 'Administrador' : 'Dependente'}.`
        );
      } catch (error: any) {
        Alert.alert('Erro', 'Não foi possível alterar o perfil: ' + error.message);
      }
    }
  };

  return (
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
            userEmail={user.email || ''}
            userName={user.name}
            userId={user.id}
          />
        )
      ) : (
        <LoginScreen />
      )}
    </SafeAreaProvider>
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