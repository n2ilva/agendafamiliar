import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TaskScreen } from './screens/TaskScreen';
import { LoginScreen } from './screens/LoginScreen';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Alert } from 'react-native';
import { FamilyUser, UserRole } from './types/FamilyTypes';

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [user, setUser] = useState<FamilyUser | null>(null);
  const [authData, setAuthData] = useState<any>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '742861794909-qtrkl3r2fhhre3734c3heb0sm1l2fatj.apps.googleusercontent.com',
    iosClientId: '742861794909-2bmiu7tgo0tngbjfhtj31dudssjtkgpe.apps.googleusercontent.com',
    androidClientId: '742861794909-je4328bkkcvj6ahsq6ac98piquveb6nl.apps.googleusercontent.com',
    webClientId: '742861794909-qtrkl3r2fhhre3734c3heb0sm1l2fatj.apps.googleusercontent.com',
  });

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

  const handleGoogleLogin = (role: UserRole) => {
    if (authData) {
      fetchUserInfo(authData.accessToken, role);
    } else {
      // Armazenar o role temporariamente para usar após a autenticação
      (window as any).pendingRole = role;
      promptAsync();
    }
  };

  // Verificar se há um role pendente após autenticação
  useEffect(() => {
    if (authData && (window as any).pendingRole) {
      fetchUserInfo(authData.accessToken, (window as any).pendingRole);
      delete (window as any).pendingRole;
    }
  }, [authData]);

  const handleUserNameChange = (newName: string) => {
    setUser((prev) => prev ? { ...prev, name: newName } : null);
  };

  const handleLogout = async () => {
    try {
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
      console.log('Erro ao revogar token:', error);
    } finally {
      setUser(null);
      setAuthData(null);
    }
  };

  return (
    <SafeAreaProvider>
      {user ? (
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