import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { requestNotificationPermission } from './src/services/notifications';
import * as Notifications from 'expo-notifications';
import { ensureAndroidChannelExists } from './src/services/notifications';

export default function App() {
  useEffect(() => {
    // Configura permissões de notificação
    const setupNotifications = async () => {
      try {
        const permissionGranted = await requestNotificationPermission();
        if (permissionGranted) {
          console.log('Permissões de notificação concedidas');
        } else {
          console.log('Permissões de notificação negadas');
        }

        // Garante canal Android para notificações
        try { await ensureAndroidChannelExists(); } catch (e) { console.warn('Erro ao garantir canal Android:', e); }

        // Configura o handler para notificações recebidas
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
      } catch (error) {
        console.warn('Erro ao configurar notificações:', error);
      }
    };

    setupNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
