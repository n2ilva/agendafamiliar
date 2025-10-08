import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types/FamilyTypes';
import { safeToDate } from '../utils/DateUtils';

const STORAGE_KEY = 'notification_task_map';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('tasks-default', {
    name: 'Lembretes de Tarefas',
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    bypassDnd: false,
    description: 'Notificações de lembrete para tarefas com vencimento',
  });
}

async function getMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function setMap(map: Record<string, string>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function initialize() {
  // Handler para quando a notificação chega com o app fechado/em background
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  } as any);

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    // sem permissões; apenas seguir sem agendar
    return { granted: false };
  }

  await ensureAndroidChannel();
  return { granted: true };
}

export async function scheduleTaskReminder(task: Task) {
  const dueDate = safeToDate(task.dueDate);
  const dueTime = safeToDate((task as any).dueTime);
  if (!dueDate) return null;

  // combinar data e hora
  const fireAt = new Date(dueDate);
  if (dueTime) {
    fireAt.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
  } else {
    // fallback: notificar às 09:00 se sem hora
    fireAt.setHours(9, 0, 0, 0);
  }

  // se já passou, não agendar
  if (fireAt.getTime() <= Date.now()) return null;

  const trigger: Notifications.NotificationTriggerInput = {
    channelId: Platform.OS === 'android' ? 'tasks-default' : undefined,
    date: fireAt,
    type: (Notifications as any).SchedulableTriggerInputTypes?.DATE || 'date',
  } as any;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Lembrete de tarefa',
      body: `"${task.title}" vence hoje`,
      data: { taskId: task.id },
    },
    trigger,
  });

  const map = await getMap();
  map[task.id] = id;
  await setMap(map);
  return id;
}

export async function cancelTaskReminder(taskId: string) {
  const map = await getMap();
  const notifId = map[taskId];
  if (notifId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notifId);
    } catch {}
    delete map[taskId];
    await setMap(map);
  }
}

export async function rescheduleTaskReminder(task: Task) {
  await cancelTaskReminder(task.id);
  return scheduleTaskReminder(task);
}

export default {
  initialize,
  scheduleTaskReminder,
  cancelTaskReminder,
  rescheduleTaskReminder,
};
