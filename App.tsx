import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TaskScreen } from './screens/TaskScreen';
import { LoginScreen } from './screens/LoginScreen';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Alert, ActivityIndicator, View, StyleSheet } from 'react-native';
import { FamilyUser, UserRole } from './types/FamilyTypes';
import FirebaseAuthService from './services/FirebaseAuthService';

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [user, setUser] = useState<FamilyUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authData, setAuthData] = useState<any>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '742861794909-qtrkl3r2fhhre3734c3heb0sm1l2fatj.apps.googleusercontent.com',
    iosClientId: '742861794909-2bmiu7tgo0tngbjfhtj31dudssjtkgpe.apps.googleusercontent.com',
    androidClientId: '742861794909-je4328bkkcvj6ahsq6ac98piquveb6nl.apps.googleusercontent.com',
    webClientId: '742861794909-qtrkl3r2fhhre3734c3heb0sm1l2fatj.apps.googleusercontent.com',
  });

  // Observar mudanças de autenticação do Firebase
  useEffect(() => {
    const unsubscribe = FirebaseAuthService.onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      
      // Se usuário logado, inicializar sistema offline
      if (firebaseUser) {
        await FirebaseAuthService.initializeOfflineSupport();
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication) {
        setAuthData(authentication);
        // Note: Role será definido no login, então precisamos armazenar temporariamente
      }
    }
  }, [response]);

  const fetchUserInfo = async (token: string, role: UserRole) => {
    try {
      const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userInfo = await response.json();
      
      const familyUser: FamilyUser = {
        id: userInfo.id || Date.now().toString(),
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        role: role,
        isGuest: false,
        familyId: 'family_001', // Em um app real, isso seria dinâmico
        joinedAt: new Date()
      };
      
      setUser(familyUser);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível buscar as informações do usuário.');
    }
  };

  const handleGuestLogin = (role: UserRole = 'admin') => {
    const guestUser: FamilyUser = {
      id: Date.now().toString(),
      name: role === 'admin' ? 'Admin Convidado' : 'Dependente Convidado',
      role: role,
      isGuest: true,
      familyId: 'family_001',
      joinedAt: new Date()
    };
    setUser(guestUser);
  };

  const handleGoogleLogin = async (role: UserRole = 'admin') => {
    // Função mantida para compatibilidade, mas login agora é feito diretamente no LoginScreen
    console.log('Login com Google solicitado para role:', role);
  };



  const handleUserNameChange = (newName: string) => {
    setUser((prev) => prev ? { ...prev, name: newName } : null);
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
              // Logout do Firebase
              await FirebaseAuthService.logout();
              
              // Revogar token do Google se existir
              if (authData?.accessToken) {
                await fetch(
                  `https://oauth2.googleapis.com/revoke?token=${authData.accessToken}`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-type': 'application/x-www-form-urlencoded',
                    },
                  }
                );
              }
            } catch (error) {
              console.log('Erro no logout:', error);
            } finally {
              setUser(null);
              setAuthData(null);
            }
          }
        }
      ]
    );
  };

  const handleUserRoleChange = async (newRole: UserRole) => {
    if (user) {
      try {
        // Atualizar role no Firebase se não for convidado
        if (!user.isGuest) {
          await FirebaseAuthService.updateUserRole(user.id, newRole);
        }
        
        // Atualizar estado local
        const updatedUser: FamilyUser = {
          ...user,
          role: newRole
        };
        setUser(updatedUser);
        
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
        <TaskScreen 
          user={user}
          onLogout={handleLogout}
          onUserNameChange={handleUserNameChange}
          onUserRoleChange={handleUserRoleChange}
        />
      ) : (
        <LoginScreen onGuestLogin={handleGuestLogin} onGoogleLogin={handleGoogleLogin} />
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