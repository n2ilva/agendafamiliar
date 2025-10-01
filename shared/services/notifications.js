import { Platform } from 'react-native';

// Importações condicionais baseadas na plataforma
let Notifications = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.warn('Expo Notifications não disponível:', e);
  }
}

const ANDROID_CHANNEL_ID = 'default';

// Função para verificar se notificações são suportadas na plataforma
const areNotificationsSupported = () => {
  if (Platform.OS === 'web') {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }
  return Notifications !== null;
};

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') {
    if (!areNotificationsSupported()) {
      console.warn('Notificações não suportadas neste navegador');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.warn('Erro ao solicitar permissão de notificação:', error);
      return false;
    }
  } else {
    // Mobile com Expo
    if (!Notifications) return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  }
}

export async function scheduleTaskDueNotification(task, secondsFromNow = 0) {
  if (!task?.title || !task?.dueDate) return;

  const dueDate = new Date(task.dueDate);
  if (isNaN(dueDate.getTime())) return; // Verifica se a data é válida

  const triggerDate = new Date(dueDate.getTime() + secondsFromNow * 1000);
  const now = new Date();

  // Só agenda se o trigger for no futuro
  if (triggerDate <= now) return;

  if (Platform.OS === 'web') {
    // No web, usamos Notification API
    if (!areNotificationsSupported() || Notification.permission !== 'granted') {
      return;
    }

    // Para web, notificações são mostradas imediatamente ou agendadas via service worker
    // Por simplicidade, mostramos imediatamente se for o momento certo
    const delay = triggerDate.getTime() - now.getTime();
    if (delay <= 0) {
      new Notification('⏰ Tarefa Vencida', {
        body: `"${task.title}" venceu hoje! ${task.description ? task.description.substring(0, 50) + '...' : ''}`,
        icon: '/favicon.ico', // Você pode ajustar o ícone
        tag: `task-${task.id}`
      });
    } else {
      // Para agendamento futuro, seria necessário um service worker
      // Por enquanto, apenas log
      console.log(`Notificação agendada para ${triggerDate.toISOString()}`);
    }
  } else {
    // Mobile com Expo
    if (!Notifications) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Tarefa Vencida',
        body: `"${task.title}" venceu hoje! ${task.description ? task.description.substring(0, 50) + '...' : ''}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        // Define channelId para Android (garante comportamento consistente em Android 8+)
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
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

  if (Platform.OS === 'web') {
    // No web, usamos Notification API
    if (!areNotificationsSupported() || Notification.permission !== 'granted') {
      return;
    }

    const delay = triggerDate.getTime() - now.getTime();
    if (delay <= 0) {
      new Notification('⏰ Lembrete de Tarefa', {
        body: `"${task.title}" vence em ${timeMessage}! ${task.description ? task.description.substring(0, 50) + '...' : ''}`,
        icon: '/favicon.ico',
        tag: `reminder-${task.id}-${secondsBefore}`
      });
    } else {
      console.log(`Lembrete agendado para ${triggerDate.toISOString()}`);
    }
  } else {
    // Mobile com Expo
    if (!Notifications) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Lembrete de Tarefa',
        body: `"${task.title}" vence em ${timeMessage}! ${task.description ? task.description.substring(0, 50) + '...' : ''}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
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
}

export async function scheduleTaskOverdueNotification(task) {
  if (!task?.title) return;

  if (Platform.OS === 'web') {
    // No web, usamos Notification API
    if (!areNotificationsSupported() || Notification.permission !== 'granted') {
      return;
    }

    new Notification('🚨 Tarefa Vencida!', {
      body: `"${task.title}" está vencida! ${task.description ? task.description.substring(0, 50) + '...' : ''}`,
      icon: '/favicon.ico',
      tag: `overdue-${task.id}`
    });
  } else {
    // Mobile com Expo
    if (!Notifications) return;

    // Agenda notificação imediata para tarefa vencida
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 Tarefa Vencida!',
        body: `"${task.title}" está vencida! ${task.description ? task.description.substring(0, 50) + '...' : ''}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
        data: {
          taskId: task.id,
          type: 'task_overdue'
        }
      },
      trigger: null, // Notificação imediata
    });
  }
}

// Cancela todas notificações agendadas e notificações exibidas
export async function cancelAllNotifications() {
  try {
    if (Platform.OS === 'web') {
      // No web, não há como cancelar notificações já mostradas
      console.log('Cancelamento de notificações não suportado no web');
    } else {
      // Mobile com Expo
      if (!Notifications) return;

      // Cancela notificações agendadas
      await Notifications.cancelAllScheduledNotificationsAsync();
      // Remove notificações exibidas da bandeja
      if (typeof Notifications.dismissAllNotificationsAsync === 'function') {
        try { await Notifications.dismissAllNotificationsAsync(); } catch (e) { /* ignore */ }
      }
    }
  } catch (error) {
    console.warn('Erro ao cancelar notificações:', error);
  }
}

// Cria canal padrão no Android para garantir prioridade/som
export async function ensureAndroidChannelExists() {
  if (Platform.OS !== 'android' || !Notifications) return;

  try {
    // AndroidImportance está disponível em Notifications como enum/constantes
    const importance = Notifications.AndroidImportance ? Notifications.AndroidImportance.HIGH : 4;
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Padrão',
      importance,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default'
    });
  } catch (error) {
    console.warn('Erro ao criar canal de notificações Android:', error);
  }
}