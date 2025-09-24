import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import UserTypeSelectionScreen from '../screens/UserTypeSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ApprovalsScreen from '../screens/ApprovalsScreen';
import ConfiguracoesScreen from '../screens/ConfiguracoesScreen';
import InformacoesScreen from '../screens/InformacoesScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  console.log('AppNavigator renderizando...');
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="UserTypeSelection" component={UserTypeSelectionScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Approvals" component={ApprovalsScreen} />
      <Stack.Screen name="Configuracoes" component={ConfiguracoesScreen} />
      <Stack.Screen name="Informacoes" component={InformacoesScreen} />
    </Stack.Navigator>
  );
}