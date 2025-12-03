/**
 * Implementação do Serviço de Notificações
 * 
 * Princípios SOLID aplicados:
 * - Single Responsibility: Responsável apenas por notificações
 * - Dependency Inversion: Implementa a interface INotificationService
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  INotificationService,
  NotificationPermissions,
  NotificationPayload,
  NotificationRequest,
  ScheduledNotification,
} from '../../interfaces/services/INotificationService';
import { Task } from '../../domain/entities/Task';

// Configuração do comportamento de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService implements INotificationService {
  private notificationListeners: Array<(payload: NotificationPayload) => void> = [];
  private actionListeners: Array<(actionId: string, taskId?: string) => void> = [];
  private notificationSubscription?: Notifications.Subscription;
  private responseSubscription?: Notifications.Subscription;

  async initialize(): Promise<NotificationPermissions> {
    // Configurar listeners
    this.notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
      const payload: NotificationPayload = {
        title: notification.request.content.title || '',
        body: notification.request.content.body || '',
        data: notification.request.content.data,
        sound: notification.request.content.sound !== null,
      };
      
      this.notificationListeners.forEach(cb => cb(payload));
    });

    this.responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const actionId = response.actionIdentifier;
      const taskId = response.notification.request.content.data?.taskId as string | undefined;
      
      this.actionListeners.forEach(cb => cb(actionId, taskId));
    });

    return this.requestPermissions();
  }

  async requestPermissions(): Promise<NotificationPermissions> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return {
        granted: finalStatus === 'granted',
        canAskAgain: existingStatus === 'undetermined',
      };
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
      };
    }
  }

  async getPermissions(): Promise<NotificationPermissions> {
    try {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain: canAskAgain ?? false,
      };
    } catch (error) {
      console.error('Error getting notification permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
      };
    }
  }

  async send(notification: NotificationRequest): Promise<string | null> {
    // Envio via servidor (push notification)
    // Implementação simplificada - requer backend
    console.log('Sending push notification to user:', notification.userId);
    return null;
  }

  async scheduleTaskReminder(task: Task): Promise<string | null> {
    const taskObj = task.toObject();
    
    if (!taskObj.date) return null;

    const permissions = await this.getPermissions();
    if (!permissions.granted) return null;

    try {
      const trigger = this.createTrigger(taskObj.date, taskObj.time);
      if (!trigger) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Lembrete de Tarefa',
          body: taskObj.title,
          data: {
            taskId: taskObj.id,
            type: 'task_reminder',
          },
          sound: true,
          badge: 1,
        },
        trigger,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling task reminder:', error);
      return null;
    }
  }

  async scheduleSubtaskReminders(
    taskId: string,
    taskTitle: string,
    subtasks: Array<{ id: string; title: string; dueDate?: Date; dueTime?: Date }>
  ): Promise<string[]> {
    const permissions = await this.getPermissions();
    if (!permissions.granted) return [];

    const notificationIds: string[] = [];

    for (const subtask of subtasks) {
      if (!subtask.dueDate) continue;

      try {
        const trigger = this.createTrigger(subtask.dueDate, subtask.dueTime);
        if (!trigger) continue;

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏰ ${taskTitle}`,
            body: subtask.title,
            data: {
              taskId,
              subtaskId: subtask.id,
              type: 'subtask_reminder',
            },
            sound: true,
          },
          trigger,
        });

        notificationIds.push(notificationId);
      } catch (error) {
        console.error('Error scheduling subtask reminder:', error);
      }
    }

    return notificationIds;
  }

  async cancelTaskReminder(taskId: string): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      const taskNotifications = scheduled.filter(
        notif => notif.content.data?.taskId === taskId
      );

      for (const notification of taskNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    } catch (error) {
      console.error('Error canceling task reminder:', error);
    }
  }

  async cancelSubtaskReminders(taskId: string): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      const subtaskNotifications = scheduled.filter(
        notif => notif.content.data?.taskId === taskId && notif.content.data?.type === 'subtask_reminder'
      );

      for (const notification of subtaskNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    } catch (error) {
      console.error('Error canceling subtask reminders:', error);
    }
  }

  async rescheduleTaskReminder(task: Task): Promise<string | null> {
    const taskObj = task.toObject();
    await this.cancelTaskReminder(taskObj.id);
    return this.scheduleTaskReminder(task);
  }

  async sendOverdueNotification(task: Task): Promise<string | null> {
    return this.sendImmediate({
      title: '⚠️ Tarefa Atrasada',
      body: task.toObject().title,
      data: {
        taskId: task.toObject().id,
        type: 'task_overdue',
      },
      sound: true,
      badge: 1,
    });
  }

  async sendImmediate(payload: NotificationPayload): Promise<string | null> {
    const permissions = await this.getPermissions();
    if (!permissions.granted) return null;

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: payload.sound ?? true,
          badge: payload.badge,
        },
        trigger: null, // Imediato
      });

      return notificationId;
    } catch (error) {
      console.error('Error sending immediate notification:', error);
      return null;
    }
  }

  async getScheduled(): Promise<ScheduledNotification[]> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      return scheduled.map(notif => ({
        id: notif.identifier,
        taskId: notif.content.data?.taskId as string | undefined,
        scheduledAt: this.extractScheduledDate(notif.trigger),
        payload: {
          title: notif.content.title || '',
          body: notif.content.body || '',
          data: notif.content.data,
        },
      }));
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  async cancelAll(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  async cleanupOrphaned(activeTaskIds: string[]): Promise<number> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      let cleaned = 0;

      for (const notification of scheduled) {
        const taskId = notification.content.data?.taskId as string | undefined;
        
        if (taskId && !activeTaskIds.includes(taskId)) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          cleaned++;
        }
      }

      return cleaned;
    } catch (error) {
      console.error('Error cleaning orphaned notifications:', error);
      return 0;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  async getPushToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { data } = await Notifications.getExpoPushTokenAsync();
      return data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  onNotificationReceived(callback: (payload: NotificationPayload) => void): () => void {
    this.notificationListeners.push(callback);
    return () => {
      this.notificationListeners = this.notificationListeners.filter(cb => cb !== callback);
    };
  }

  onNotificationAction(callback: (actionId: string, taskId?: string) => void): () => void {
    this.actionListeners.push(callback);
    return () => {
      this.actionListeners = this.actionListeners.filter(cb => cb !== callback);
    };
  }

  private createTrigger(dueDate: Date, dueTime?: Date): Notifications.NotificationTriggerInput | null {
    const now = new Date();
    const scheduledDate = new Date(dueDate);

    if (dueTime) {
      scheduledDate.setHours(dueTime.getHours());
      scheduledDate.setMinutes(dueTime.getMinutes());
    } else {
      scheduledDate.setHours(9);
      scheduledDate.setMinutes(0);
    }

    // Notificar 1 hora antes
    const triggerDate = new Date(scheduledDate.getTime() - 60 * 60 * 1000);

    if (triggerDate <= now) return null;

    return {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    };
  }

  private extractScheduledDate(trigger: any): Date {
    if (trigger?.date) {
      return new Date(trigger.date);
    }
    return new Date();
  }

  // Cleanup
  destroy(): void {
    this.notificationSubscription?.remove();
    this.responseSubscription?.remove();
    this.notificationListeners = [];
    this.actionListeners = [];
  }
}
