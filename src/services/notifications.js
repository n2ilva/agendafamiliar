import * as Notifications from 'expo-notifications';
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

  const dueDate = new Date(task.dueDate);
  if (isNaN(dueDate.getTime())) return; // Verifica se a data é válida

  const triggerDate = new Date(dueDate.getTime() + secondsFromNow * 1000);
  const now = new Date();

  // Só agenda se o trigger for no futuro
  if (triggerDate <= now) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Tarefa Vencida',
      body: `"${task.title}" venceu hoje! ${task.description ? task.description.substring(0, 50) + '...' : ''}`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: {
        taskId: task.id,
        type: 'task_due'
      }
    },
    trigger: {
      date: triggerDate,
    },
  });
}

export async function scheduleTaskReminderNotification(task, secondsBefore = 3600) {
  if (!task?.title || !task?.dueDate) return;

  const dueDate = new Date(task.dueDate);
  if (isNaN(dueDate.getTime())) return; // Verifica se a data é válida

  const triggerDate = new Date(dueDate.getTime() - secondsBefore * 1000);
  const now = new Date();

  if (triggerDate <= now) return; // Não agenda lembrete no passado

  // Determina a mensagem baseada no tempo antes do vencimento
  let timeMessage = '';
  if (secondsBefore === 3600) {
    timeMessage = '1 hora';
  } else if (secondsBefore === 86400) {
    timeMessage = '24 horas';
  } else if (secondsBefore === 604800) {
    timeMessage = '1 semana';
  } else {
    const hours = secondsBefore / 3600;
    timeMessage = `${hours} hora${hours > 1 ? 's' : ''}`;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Lembrete de Tarefa',
      body: `"${task.title}" vence em ${timeMessage}! ${task.description ? task.description.substring(0, 50) + '...' : ''}`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
      data: {
        taskId: task.id,
        type: 'task_reminder',
        secondsBefore
      }
    },
    trigger: {
      date: triggerDate,
    },
  });
}

export async function scheduleTaskOverdueNotification(task) {
  if (!task?.title) return;

  // Agenda notificação imediata para tarefa vencida
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 Tarefa Vencida!',
      body: `"${task.title}" está vencida! ${task.description ? task.description.substring(0, 50) + '...' : ''}`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: {
        taskId: task.id,
        type: 'task_overdue'
      }
    },
    trigger: null, // Notificação imediata
  });
}
