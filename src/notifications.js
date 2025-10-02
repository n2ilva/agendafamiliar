// Scaffold de notificações (placeholder)
// Para usar: npx expo install expo-notifications
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function requestNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  }
  return true;
}

export async function scheduleTaskReminder(task) {
  // Placeholder: apenas loga; implementar quando dueAt e preferências forem definidas
  if (!task.dueAt) return;
  console.log('Agendar notificação para', task.title, 'em', new Date(task.dueAt));
  // Exemplo futuro:
  // await Notifications.scheduleNotificationAsync({
  //   content: { title: 'Lembrete', body: task.title },
  //   trigger: new Date(task.dueAt)
  // });
}

// Config padrão para Android (canal) pode ser ajustado depois
if (Platform.OS === 'android') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false })
  });
}
