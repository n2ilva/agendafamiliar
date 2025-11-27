
import React, { useEffect } from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider, useAuth } from './contexts/auth.context';
import { ThemeProvider, useTheme } from './contexts/theme.context';
import { TaskScreen } from './screens/tasks/TaskScreen';
import { LoginScreen } from './screens/login/LoginScreen';
import FamilySetupScreen from './screens/family-setup/FamilySetupScreen';
import { LoadingScreen } from './components/common/LoadingScreen';
import { SyncSystemBarsAndroid } from './components/common/SyncSystemBars';
import BackgroundSyncService from './services/sync/background-sync.service';

function AppContent() {
  const {
    user,
    loading,
    familyConfigured,
    appIsReady,
    setAppIsReady,
    handleLogout,
    updateUserProfile,
    handleFamilySetup,
    handleUserRoleChange
  } = useAuth();

  const { colors, activeTheme } = useTheme();

  useEffect(() => {
    if (!loading && !appIsReady) {
      setAppIsReady(true);
    }
  }, [loading, appIsReady, setAppIsReady]);

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
        {loading ? (
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
    SplashScreen.preventAutoHideAsync().catch(() => { });
  }, []);

  // Define a task de background após o mount do App
  useEffect(() => {
    (async () => {
      try {
        await BackgroundSyncService.defineBackgroundSyncTask();
      } catch (err) {
        console.warn('⚠️ Não foi possível definir background task:', err);
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);