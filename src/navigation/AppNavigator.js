import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import UserTypeSelectionScreen from '../screens/UserTypeSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ApprovalsScreen from '../screens/ApprovalsScreen';
import ConfiguracoesScreen from '../screens/ConfiguracoesScreen';
import InformacoesScreen from '../screens/InformacoesScreen';

const Stack = createStackNavigator();

function AuthNavigator() {
  console.log('AuthNavigator renderizando...');
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="UserTypeSelection" component={UserTypeSelectionScreen} />
    </Stack.Navigator>
  );
}

function MainNavigator() {
  console.log('MainNavigator renderizando...');
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Approvals" component={ApprovalsScreen} />
      <Stack.Screen name="Configuracoes" component={ConfiguracoesScreen} />
      <Stack.Screen name="Informacoes" component={InformacoesScreen} />
    </Stack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  console.log('AppNavigator renderizando...', { user: !!user, isLoading });

  // Mostra loading enquanto verifica autenticação
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Se usuário estiver logado, mostra navegação principal
  if (user) {
    return <MainNavigator />;
  }

  // Se não estiver logado, mostra navegação de autenticação
  return <AuthNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});