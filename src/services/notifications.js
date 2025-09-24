import * as Notifications from 'expo-notifications';
import * as Permissions from 'expo-permissions';
import { Platform } from 'react-native';

export async function requestNotificationPermission() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function scheduleTaskDueNotification(task, secondsFromNow = 0) {
  if (!task?.title || !task?.dueDate) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tarefa vencida',
      body: `A tarefa "${task.title}" venceu!`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      date: new Date(new Date(task.dueDate).getTime() + secondsFromNow * 1000),
    },
  });
}

export async function scheduleTaskReminderNotification(task, secondsBefore = 3600) {
  if (!task?.title || !task?.dueDate) return;
  const triggerDate = new Date(new Date(task.dueDate).getTime() - secondsBefore * 1000);
  if (triggerDate < new Date()) return; // Não agenda lembrete no passado
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lembrete de tarefa',
      body: `A tarefa "${task.title}" vence em breve!`,
      sound: false,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
    },
    trigger: {
      date: triggerDate,
    },
  });
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
