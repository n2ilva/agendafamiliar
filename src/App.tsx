
import React, { useEffect } from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider, useAuth } from './contexts/auth.context';
import { ThemeProvider, useTheme } from './contexts/theme.context';
import { DIProvider } from './contexts/di.context';
import { TaskProvider } from './contexts/task.context';
import { TaskScreen } from './screens/tasks/TaskScreen';
import { LoginScreen } from './screens/login/LoginScreen';
import FamilySetupScreen from './screens/family-setup/FamilySetupScreen';
import { LoadingScreen } from './components/common/LoadingScreen';
import { SyncSystemBarsAndroid } from './components/common/SyncSystemBars';
import { BackgroundSyncService } from './core/infrastructure/services';

function AppContent() {
  const {
    user,
    loading,
    familyConfigured,
    appIsReady,
    isDataReady,
    setAppIsReady,
    handleLogout,
    updateUserProfile,
    handleFamilySetup,
    handleUserRoleChange
  } = useAuth();

  const { colors, activeTheme } = useTheme();

  // App só está pronto quando loading = false E dados estão prontos
  const isFullyReady = !loading && isDataReady;

  useEffect(() => {
    if (isFullyReady && !appIsReady) {
      setAppIsReady(true);
    }
  }, [isFullyReady, appIsReady, setAppIsReady]);

  useEffect(() => {
    if (appIsReady) {
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch(() => { });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [appIsReady]);

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
        {!isFullyReady ? (
          <LoadingScreen colors={colors} />
        ) : user ? (
          familyConfigured ? (
            <TaskScreen
              user={user}
              onLogout={handleLogout}
              onUserNameChange={(name) => updateUserProfile({
                field: 'name',
                value: name,
                historyDetails: `Nome alterado para "${name}"`
              })}
              onUserImageChange={(url) => updateUserProfile({
                field: 'picture',
                value: url,
                historyDetails: 'Foto de perfil atualizada'
              })}
              onUserProfileIconChange={(icon) => updateUserProfile({
                field: 'profileIcon',
                value: icon,
                historyDetails: 'Ícone de perfil atualizado'
              })}
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

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        await SplashScreen.preventAutoHideAsync();

        // Define a task de background
        await BackgroundSyncService.defineBackgroundSyncTask();
      } catch (e) {
        console.warn('Erro na inicialização:', e);
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DIProvider>
        <AuthProvider>
          <ThemeProvider>
            <TaskProvider initialFamilyId={undefined}>
              <AppContent />
            </TaskProvider>
          </ThemeProvider>
        </AuthProvider>
      </DIProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);