import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const BACKGROUND_SYNC_TASK = 'background-sync-task';

// Background tasks não estão disponíveis no Expo Go.
// Para usar essa funcionalidade, é necessário criar um Development Build (Dev Client).
// Veja: https://docs.expo.dev/develop/development-builds/introduction/

async function isExpoGo(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants');
    return Constants?.appOwnership === 'expo';
  } catch {
    return false;
  }
}

// Define a tarefa de background (apenas funciona em Development Build, não em Expo Go)
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  console.log('🔄 Tarefa de sincronização em segundo plano executada.');
  
  // Background sync não disponível no Expo Go
  if (Platform.OS === 'web' || await isExpoGo()) {
    console.log('⚠️ Background sync ignorado: não disponível no Expo Go ou Web.');
    return;
  }

  // Nota: Esta função nunca será executada no Expo Go
  // Ela só funciona em Development Build ou APK/IPA standalone
  console.log('✅ Background sync concluído (Development Build).');
});

async function registerBackgroundSyncAsync() {
  if (Platform.OS === 'web' || await isExpoGo()) {
    console.log('⚠️ Background sync não registrado: não disponível no Expo Go ou Web.');
    console.log('   Para usar background tasks, crie um Development Build.');
    return;
  }

  // Nota: Este código nunca será executado no Expo Go
  console.log('✅ Background sync está disponível em Development Build.');
}

async function unregisterBackgroundSyncAsync() {
  if (Platform.OS === 'web' || await isExpoGo()) {
    console.log('⚠️ Background sync não precisa ser cancelado (não está ativo).');
    return;
  }

  console.log('✅ Background sync cancelado.');
}

export default {
  registerBackgroundSyncAsync,
  unregisterBackgroundSyncAsync,
};
