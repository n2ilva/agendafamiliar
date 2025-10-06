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
    const unsubscribe = FirebaseAuthService.onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
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

  const handleGuestLogin = (role: UserRole) => {
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

  const handleGoogleLogin = async (role: UserRole) => {
    try {
      if (!authData) {
        const result = await promptAsync();
        if (result?.type === 'success' && result.authentication) {
          // Usar Firebase para login com Google
          const firebaseResult = await FirebaseAuthService.loginWithGoogle(
            result.authentication.accessToken, 
            role
          );
          
          if (firebaseResult.success) {
            // O usuário será definido automaticamente pelo onAuthStateChange
            Alert.alert('Sucesso!', 'Login com Google realizado com sucesso!');
          } else {
            Alert.alert('Erro', firebaseResult.error);
          }
        }
        return;
      }

      // Se já temos authData, usar para login com Firebase
      const result = await FirebaseAuthService.loginWithGoogle(authData.accessToken, role);
      if (result.success) {
        Alert.alert('Sucesso!', 'Login com Google realizado com sucesso!');
      } else {
        Alert.alert('Erro', result.error);
      }
    } catch (error: any) {
      Alert.alert('Erro', 'Erro no login com Google: ' + error.message);
    }
  };

  // Verificar se há um role pendente após autenticação
  useEffect(() => {
    if (authData && (window as any).pendingRole) {
      handleGoogleLogin((window as any).pendingRole);
      delete (window as any).pendingRole;
    }
  }, [authData]);

  const handleUserNameChange = (newName: string) => {
    setUser((prev) => prev ? { ...prev, name: newName } : null);
  };

  const handleLogout = async () => {
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