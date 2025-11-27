import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Evitar dependência direta do tipo Task do projeto para não causar
// conflitos com definições de Task locais (TaskScreen tem sua própria
// definição). Aceitamos 'any' nas assinaturas públicas para compatibilidade.
import { safeToDate } from '../../utils/date/date.utils';

// Declarar window para ambiente web
declare const window: any;

const STORAGE_KEY = 'notification_task_map';
const STORAGE_KEY_WEB = 'notification_task_map_web';

// Tipos de notificações programadas
type NotificationType = '1hour_before' | '30min_before' | 'at_due' | 'overdue_recurring';

// Mapa para armazenar múltiplas notificações por tarefa
// Formato: { taskId: { '1hour_before': notifId, '30min_before': notifId, ... } }
interface TaskNotifications {
  [key: string]: {
    [type in NotificationType]?: string;
  };
}

// runtime map para timeouts no web (não serializável)
const webTimeouts: Record<string, Record<NotificationType, number>> = {};

// Flag para evitar múltiplas inicializações
let notificationHandlersRegistered = false;

// Listeners para notificações recebidas
type NotificationListener = (notification: Notifications.Notification) => void;
const notificationListeners: Set<NotificationListener> = new Set();

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  // Canal para lembretes agendados
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

  // Canal específico para tarefas vencidas - mais agressivo
  await Notifications.setNotificationChannelAsync('tasks-overdue', {
    name: 'Tarefas Vencidas',
    importance: Notifications.AndroidImportance.MAX,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
    vibrationPattern: [0, 500, 200, 500, 200, 500], // Vibração mais intensa
    enableVibrate: true,
    bypassDnd: true, // Ignorar modo "Não Perturbe"
    lightColor: '#e74c3c', // Luz vermelha
    description: 'Alertas urgentes para tarefas que já venceram',
  });
}

async function registerNotificationHandlers() {
  if (notificationHandlersRegistered) return;

  try {
    // Handler para quando a notificação chega com o app aberto ou em foreground
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notifications] Notificação recebida em foreground:', {
        title: notification.request.content.title,
        body: notification.request.content.body,
      });
      
      // Chamar listeners registrados
      notificationListeners.forEach(listener => {
        try {
          listener(notification);
        } catch (e) {
          console.warn('[Notifications] Erro em listener:', e);
        }
      });
    });

    // Handler para quando o usuário toca na notificação
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Notifications] Usuário clicou em notificação:', {
        taskId: response.notification.request.content.data?.taskId,
        type: response.notification.request.content.data?.type,
      });
    });

    notificationHandlersRegistered = true;
    console.log('✅ Handlers de notificações registrados');

    // Retornar função para desregistrar (cleanup)
    return () => {
      subscription.remove();
      responseSubscription.remove();
      notificationHandlersRegistered = false;
    };
  } catch (e) {
    console.warn('[Notifications] Erro ao registrar handlers:', e);
    return null;
  }
}

async function getMap(): Promise<TaskNotifications> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function setMap(map: TaskNotifications) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function initialize() {
  console.log('[Notifications] Inicializando sistema de notificações...');
  
  // No web, expo-notifications não é suportado: fazer no-op seguro
  if (Platform.OS === 'web') {
    try {
      // Pedir permissão para Web Notifications
      const permission = await (window as any).Notification?.requestPermission?.();
      const granted = permission === 'granted';
      console.log('[Notifications] Web Notifications permissão:', granted ? '✅ Concedida' : '❌ Negada');

      // Reagendar notificações previamente armazenadas
      if (granted) {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY_WEB);
          const map = raw ? JSON.parse(raw) : {};
          const now = Date.now();
          let reagendadas = 0;
          
          for (const taskId of Object.keys(map)) {
            const taskData = map[taskId];
            if (!taskData || !taskData.dueTime) continue;
            
            const scheduledAt = new Date(taskData.dueTime).getTime();
            const delay = scheduledAt - now;
            if (delay > 0) {
              // Reagendar apenas notificação principal (at_due) na reinicialização
              if (!webTimeouts[taskId]) webTimeouts[taskId] = {} as any;
              
              webTimeouts[taskId]['at_due'] = window.setTimeout(() => {
                try {
                  new (window as any).Notification('Lembrete', { 
                    body: `${taskData.title || 'Tarefa'} vence agora!`, 
                    data: { taskId } 
                  });
                } catch (e) {
                  console.warn('[Notifications][Web] Erro ao disparar notificação agendada:', e);
                }
              }, delay) as unknown as number;
              reagendadas++;
            } else {
              delete map[taskId];
            }
          }
          
          console.log(`[Notifications] ${reagendadas} notificações reagendadas no Web`);
          await AsyncStorage.setItem(STORAGE_KEY_WEB, JSON.stringify(map));
        } catch (e) {
          console.warn('[Notifications][Web] Falha ao reagendar notificações:', e);
        }
      }

      return { granted };
    } catch (e) {
      console.warn('[Notifications] Erro na inicialização web:', e);
      return { granted: false };
    }
  }

  try {
    // Handler para quando a notificação chega com o app fechado/em background
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      }),
    } as any);

    // Verificar permissões existentes primeiro
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    let finalStatus = existingStatus;
    
    // Se não tiver permissão, solicitar
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }
    
    const granted = finalStatus === 'granted';
    
    console.log('[Notifications] Permissões mobile:', granted ? '✅ Concedidas' : '⚠️ Negadas');
    
    if (!granted) {
      console.warn('[Notifications] ⚠️ Sem permissões. Usuário pode habilitar em: Configurações > App > Notificações');
      return { granted: false };
    }

    await ensureAndroidChannel();
    await registerNotificationHandlers();
    
    // Verificar se há notificações agendadas e logar para debug
    if (__DEV__) {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`[Notifications] 📅 ${scheduledNotifications.length} notificações agendadas atualmente`);
    }
    
    console.log('✅ [Notifications] Inicialização concluída com sucesso');
    return { granted: true };
  } catch (e) {
    console.error('[Notifications] ❌ Falha ao inicializar:', e);
    return { granted: false };
  }
}

// Função para registrar um listener de notificações
export function addNotificationListener(listener: NotificationListener): () => void {
  notificationListeners.add(listener);
  console.log('[Notifications] Listener registrado. Total:', notificationListeners.size);
  
  // Retornar função de unsubscribe
  return () => {
    notificationListeners.delete(listener);
    console.log('[Notifications] Listener removido. Total:', notificationListeners.size);
  };
}

export async function scheduleTaskReminder(task: any) {
  // Suporte web: agendamento simples via setTimeout enquanto a aba estiver aberta
  if (Platform.OS === 'web') {
    try {
      const dueDate = safeToDate(task.dueDate);
      const dueTime = safeToDate((task as any).dueTime);
      if (!dueDate) return null;

      const fireAt = new Date(dueDate);
      if (dueTime) {
        fireAt.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
      } else {
        fireAt.setHours(9, 0, 0, 0);
      }

      const now = Date.now();
      const dueTime_ms = fireAt.getTime();

      if (dueTime_ms <= now) return null;

      // Formatar data e hora para exibição
      const formatDateTime = (date: Date) => {
        const options: Intl.DateTimeFormatOptions = {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        };
        return date.toLocaleDateString('pt-BR', options).replace(',', ' às');
      };
      const dueDateFormatted = formatDateTime(fireAt);

      // Garantir permissão
      if ((window as any).Notification && (window as any).Notification.permission !== 'granted') {
        await (window as any).Notification.requestPermission?.();
      }

      if ((window as any).Notification && (window as any).Notification.permission === 'granted') {
        webTimeouts[task.id] = {} as any;

        // 1. Notificação 1 hora antes
        const oneHourBefore_ms = dueTime_ms - (60 * 60 * 1000);
        if (oneHourBefore_ms > now) {
          const delay = oneHourBefore_ms - now;
          const timeoutId = window.setTimeout(() => {
            try {
              new (window as any).Notification('⏰ Lembrete - 1 hora', { 
                body: `"${task.title}" vence em 1 hora (${dueDateFormatted})`, 
                data: { taskId: task.id, type: '1hour_before' } 
              });
            } catch (e) {
              console.warn('[Notifications][Web] Erro ao disparar notificação 1h antes:', e);
            }
          }, delay) as unknown as number;
          webTimeouts[task.id]['1hour_before'] = timeoutId;
        }

        // 2. Notificação 30 minutos antes
        const thirtyMinBefore_ms = dueTime_ms - (30 * 60 * 1000);
        if (thirtyMinBefore_ms > now) {
          const delay = thirtyMinBefore_ms - now;
          const timeoutId = window.setTimeout(() => {
            try {
              new (window as any).Notification('⏰ Lembrete - 30 minutos', { 
                body: `"${task.title}" vence em 30 minutos (${dueDateFormatted})`, 
                data: { taskId: task.id, type: '30min_before' } 
              });
            } catch (e) {
              console.warn('[Notifications][Web] Erro ao disparar notificação 30min antes:', e);
            }
          }, delay) as unknown as number;
          webTimeouts[task.id]['30min_before'] = timeoutId;
        }

        // 3. Notificação no momento do vencimento
        const atDue_delay = dueTime_ms - now;
        if (atDue_delay > 0) {
          const timeoutId = window.setTimeout(() => {
            try {
              new (window as any).Notification('🔔 Tarefa Vencendo Agora!', { 
                body: `"${task.title}" está vencendo AGORA! (${dueDateFormatted})`, 
                data: { taskId: task.id, type: 'at_due' } 
              });
            } catch (e) {
              console.warn('[Notifications][Web] Erro ao disparar notificação no vencimento:', e);
            }
          }, atDue_delay) as unknown as number;
          webTimeouts[task.id]['at_due'] = timeoutId;
        }

        // 4. Notificações recorrentes após vencimento (a cada 1h)
        // Primeira notificação após vencer: 1h depois do vencimento
        const firstOverdue_ms = dueTime_ms + (60 * 60 * 1000);
        if (firstOverdue_ms > now) {
          const delay = firstOverdue_ms - now;
          const timeoutId = window.setTimeout(() => {
            scheduleRecurringOverdueWeb(task);
          }, delay) as unknown as number;
          webTimeouts[task.id]['overdue_recurring'] = timeoutId;
        }

        // Persistir horários
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY_WEB);
          const map = raw ? JSON.parse(raw) : {};
          map[task.id] = {
            dueTime: fireAt.toISOString(),
            title: task.title
          };
          await AsyncStorage.setItem(STORAGE_KEY_WEB, JSON.stringify(map));
        } catch (e) {
          console.warn('[Notifications][Web] Falha ao persistir agendamento:', e);
        }

        return task.id;
      }

      return null;
    } catch (e) {
      console.warn('[Notifications][Web] Falha ao agendar notificação:', e);
      return null;
    }
  }

  // Mobile: agendar múltiplas notificações
  try {
    const dueDate = safeToDate(task.dueDate);
    const dueTime = safeToDate((task as any).dueTime);
    if (!dueDate) return null;

    const fireAt = new Date(dueDate);
    if (dueTime) {
      fireAt.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
    } else {
      fireAt.setHours(9, 0, 0, 0);
    }

    const now = Date.now();
    const dueTime_ms = fireAt.getTime();
    
    if (dueTime_ms <= now) return null;

    const notifications: { [type in NotificationType]?: string } = {};

    // Formatar data e hora para exibição nas notificações
    const formatDateTime = (date: Date) => {
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      };
      return date.toLocaleDateString('pt-BR', options).replace(',', ' às');
    };
    const dueDateFormatted = formatDateTime(fireAt);

    // 1. Notificação 1 hora antes
    const oneHourBefore = new Date(dueTime_ms - (60 * 60 * 1000));
    if (oneHourBefore.getTime() > now) {
      const notifId = await scheduleNotification(
        '⏰ Lembrete - 1 hora',
        `"${task.title}" vence em 1 hora (${dueDateFormatted})`,
        oneHourBefore,
        task.id,
        '1hour_before',
        'tasks-default'
      );
      if (notifId) notifications['1hour_before'] = notifId;
    }

    // 2. Notificação 30 minutos antes
    const thirtyMinBefore = new Date(dueTime_ms - (30 * 60 * 1000));
    if (thirtyMinBefore.getTime() > now) {
      const notifId = await scheduleNotification(
        '⏰ Lembrete - 30 minutos',
        `"${task.title}" vence em 30 minutos (${dueDateFormatted})`,
        thirtyMinBefore,
        task.id,
        '30min_before',
        'tasks-default'
      );
      if (notifId) notifications['30min_before'] = notifId;
    }

    // 3. Notificação no momento do vencimento
    const notifId = await scheduleNotification(
      '🔔 Tarefa Vencendo Agora!',
      `"${task.title}" está vencendo AGORA! (${dueDateFormatted})`,
      fireAt,
      task.id,
      'at_due',
      'tasks-default'
    );
    if (notifId) notifications['at_due'] = notifId;

    // 4. Notificação recorrente após vencimento (primeira em 1h após vencer)
    // As notificações subsequentes serão agendadas dinamicamente
    const firstOverdue = new Date(dueTime_ms + (60 * 60 * 1000));
    if (firstOverdue.getTime() > now) {
      const notifId = await scheduleNotification(
        '⚠️ Tarefa Vencida!',
        `"${task.title}" venceu há 1 hora! Era para ${dueDateFormatted}`,
        firstOverdue,
        task.id,
        'overdue_recurring',
        'tasks-overdue'
      );
      if (notifId) notifications['overdue_recurring'] = notifId;
    }

    // Salvar mapa de notificações
    const map = await getMap();
    map[task.id] = notifications;
    await setMap(map);

    console.log(`📅 [Notifications] ${Object.keys(notifications).length} notificações agendadas para tarefa: ${task.title}`);
    return task.id;
  } catch (e) {
    console.warn('[Notifications] Falha ao agendar notificações:', e);
    return null;
  }
}

// Helper para agendar uma notificação individual
async function scheduleNotification(
  title: string,
  body: string,
  fireAt: Date,
  taskId: string,
  type: NotificationType,
  channelId: string
): Promise<string | null> {
  try {
    // Validar que a data é no futuro
    const now = new Date();
    if (fireAt <= now) {
      console.warn(`[Notifications] ⚠️ Tentativa de agendar no passado: ${type}`);
      return null;
    }

    const content: Notifications.NotificationContentInput = {
      title,
      body,
      data: { taskId, type, notificationType: type },
      sound: 'default',
    };

    if (Platform.OS === 'android') {
      content.priority = channelId === 'tasks-overdue' 
        ? Notifications.AndroidNotificationPriority.MAX
        : Notifications.AndroidNotificationPriority.HIGH;
      (content as any).channelId = channelId;
      // Sticky notification para tarefas vencidas
      if (channelId === 'tasks-overdue') {
        (content as any).sticky = true;
        (content as any).autoDismiss = false;
      }
    }

    if (Platform.OS === 'ios' && channelId === 'tasks-overdue') {
      (content as any).relevanceScore = 1.0;
      (content as any).interruptionLevel = 'timeSensitive';
    }

    // Usar trigger baseado em segundos para maior precisão
    const secondsFromNow = Math.floor((fireAt.getTime() - now.getTime()) / 1000);
    
    const trigger: Notifications.NotificationTriggerInput = {
      seconds: secondsFromNow,
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    };

    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    console.log(`✅ [Notifications] Agendada: ${type} para ${fireAt.toLocaleString('pt-BR')} (em ${secondsFromNow}s) - ID: ${id}`);
    return id;
  } catch (e) {
    console.warn(`[Notifications] Falha ao agendar ${type}:`, e);
    return null;
  }
}

// Helper para agendar notificações recorrentes após vencimento (web)
function scheduleRecurringOverdueWeb(task: any) {
  try {
    new (window as any).Notification('Tarefa Vencida', { 
      body: `${task.title} ainda está vencida`, 
      data: { taskId: task.id, type: 'overdue_recurring' } 
    });

    // Reagendar para daqui a 1 hora
    const timeoutId = window.setTimeout(() => {
      scheduleRecurringOverdueWeb(task);
    }, 60 * 60 * 1000) as unknown as number;
    
    if (!webTimeouts[task.id]) webTimeouts[task.id] = {} as any;
    webTimeouts[task.id]['overdue_recurring'] = timeoutId;
  } catch (e) {
    console.warn('[Notifications][Web] Erro em notificação recorrente:', e);
  }
}

export async function cancelTaskReminder(taskId: string) {
  // Suporte web: cancelar todos os timeouts e remover persistência
  if (Platform.OS === 'web') {
    try {
      const timeouts = webTimeouts[taskId];
      if (timeouts) {
        // Cancelar todos os timeouts desta tarefa
        Object.values(timeouts).forEach(timeoutId => {
          if (timeoutId) clearTimeout(timeoutId);
        });
        delete webTimeouts[taskId];
      }

      const raw = await AsyncStorage.getItem(STORAGE_KEY_WEB);
      const map = raw ? JSON.parse(raw) : {};
      if (map[taskId]) {
        delete map[taskId];
        await AsyncStorage.setItem(STORAGE_KEY_WEB, JSON.stringify(map));
      }
    } catch (e) {
      console.warn('[Notifications][Web] Falha ao cancelar notificações agendadas:', e);
    }
    return;
  }

  // Mobile: cancelar todas as notificações desta tarefa
  const map = await getMap();
  const notifications = map[taskId];
  if (notifications) {
    // Cancelar cada notificação agendada
    for (const [type, notifId] of Object.entries(notifications)) {
      if (notifId) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notifId);
          console.log(`🗑️ [Notifications] Cancelada: ${type} da tarefa ${taskId}`);
        } catch (e) {
          console.warn(`[Notifications] Falha ao cancelar ${type}:`, e);
        }
      }
    }
    delete map[taskId];
    await setMap(map);
  }
}

export async function rescheduleTaskReminder(task: any) {
  try {
    await cancelTaskReminder(task.id);
  } catch (e) {
    // continuar mesmo se falhar
  }
  return scheduleTaskReminder(task);
}

// Helper para verificar se deve notificar baseado em tempo de vencimento
export function shouldNotifyForOverdue(diffMinutes: number): boolean {
  // Lógica mais robusta sem tolerâncias mágicas
  // Notificar em intervalos: logo após, +1h, +6h, +24h, depois a cada dia
  
  const diffHours = diffMinutes / 60;
  const diffDays = diffHours / 24;
  
  // 1. Acabou de vencer (últimos 5 minutos)
  if (diffMinutes <= 5) {
    return true;
  }
  
  // 2. Venceu há ~1 hora (±15min de tolerância)
  if (diffHours >= 1 && diffHours <= 1.25) {
    return true;
  }
  
  // 3. Venceu há ~6 horas (±30min de tolerância)
  if (diffHours >= 6 && diffHours <= 6.5) {
    return true;
  }
  
  // 4. Venceu há ~24h ou múltiplos de 24h
  if (diffDays >= 1) {
    const hoursSinceDayStart = diffHours % 24;
    // Notificar se estiver na primeira hora do "novo dia"
    if (hoursSinceDayStart <= 1) {
      return true;
    }
  }
  
  return false;
}

// ============= FUNÇÕES PARA SUBTAREFAS =============

export async function scheduleSubtaskReminders(taskId: string, taskTitle: string, subtasks: any[]) {
  if (!Array.isArray(subtasks) || subtasks.length === 0) return;

  for (const subtask of subtasks) {
    if (!subtask.dueDate && !subtask.dueTime) continue;
    
    try {
      await scheduleSubtaskReminder(taskId, taskTitle, subtask);
    } catch (e) {
      console.warn(`[Notifications] Falha ao agendar subtarefa ${subtask.id}:`, e);
    }
  }
}

export async function scheduleSubtaskReminder(taskId: string, taskTitle: string, subtask: any) {
  const subtaskId = `${taskId}_subtask_${subtask.id}`;
  
  // Web: agendar via setTimeout
  if (Platform.OS === 'web') {
    try {
      const dueDate = safeToDate(subtask.dueDate);
      const dueTime = safeToDate(subtask.dueTime);
      if (!dueDate) return null;

      const fireAt = new Date(dueDate);
      if (dueTime) {
        fireAt.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
      } else {
        fireAt.setHours(9, 0, 0, 0);
      }

      const now = Date.now();
      const dueTime_ms = fireAt.getTime();

      if (dueTime_ms <= now) return null;

      // Garantir permissão
      if ((window as any).Notification && (window as any).Notification.permission !== 'granted') {
        await (window as any).Notification.requestPermission?.();
      }

      if ((window as any).Notification && (window as any).Notification.permission === 'granted') {
        if (!webTimeouts[subtaskId]) {
          webTimeouts[subtaskId] = {} as any;
        }

        // 1. Notificação 1 hora antes
        const oneHourBefore_ms = dueTime_ms - (60 * 60 * 1000);
        if (oneHourBefore_ms > now) {
          const delay = oneHourBefore_ms - now;
          const timeoutId = window.setTimeout(() => {
            try {
              new (window as any).Notification('Lembrete - Subtarefa - 1h', { 
                body: `"${subtask.title}" de "${taskTitle}" vence em 1 hora`, 
                data: { taskId, subtaskId: subtask.id, type: '1hour_before' } 
              });
            } catch (e) {
              console.warn('[Notifications][Web] Erro ao disparar notificação de subtarefa 1h antes:', e);
            }
          }, delay) as unknown as number;
          webTimeouts[subtaskId]['1hour_before'] = timeoutId;
        }

        // 2. Notificação 30 minutos antes
        const thirtyMinBefore_ms = dueTime_ms - (30 * 60 * 1000);
        if (thirtyMinBefore_ms > now) {
          const delay = thirtyMinBefore_ms - now;
          const timeoutId = window.setTimeout(() => {
            try {
              new (window as any).Notification('Lembrete - Subtarefa - 30min', { 
                body: `"${subtask.title}" de "${taskTitle}" vence em 30 minutos`, 
                data: { taskId, subtaskId: subtask.id, type: '30min_before' } 
              });
            } catch (e) {
              console.warn('[Notifications][Web] Erro ao disparar notificação de subtarefa 30min antes:', e);
            }
          }, delay) as unknown as number;
          webTimeouts[subtaskId]['30min_before'] = timeoutId;
        }

        // 3. Notificação no momento do vencimento
        const atDue_delay = dueTime_ms - now;
        if (atDue_delay > 0) {
          const timeoutId = window.setTimeout(() => {
            try {
              new (window as any).Notification('Subtarefa Vencendo', { 
                body: `"${subtask.title}" de "${taskTitle}" vence AGORA!`, 
                data: { taskId, subtaskId: subtask.id, type: 'at_due' } 
              });
            } catch (e) {
              console.warn('[Notifications][Web] Erro ao disparar notificação de subtarefa no vencimento:', e);
            }
          }, atDue_delay) as unknown as number;
          webTimeouts[subtaskId]['at_due'] = timeoutId;
        }

        return subtaskId;
      }

      return null;
    } catch (e) {
      console.warn('[Notifications][Web] Falha ao agendar notificação de subtarefa:', e);
      return null;
    }
  }

  // Mobile: agendar notificações
  try {
    const dueDate = safeToDate(subtask.dueDate);
    const dueTime = safeToDate(subtask.dueTime);
    if (!dueDate) return null;

    const fireAt = new Date(dueDate);
    if (dueTime) {
      fireAt.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
    } else {
      fireAt.setHours(9, 0, 0, 0);
    }

    const now = Date.now();
    const dueTime_ms = fireAt.getTime();
    
    if (dueTime_ms <= now) return null;

    const notifications: { [type in NotificationType]?: string } = {};

    // 1. Notificação 1 hora antes
    const oneHourBefore = new Date(dueTime_ms - (60 * 60 * 1000));
    if (oneHourBefore.getTime() > now) {
      const notifId = await scheduleNotification(
        '⏰ Lembrete - Subtarefa - 1h',
        `"${subtask.title}" de "${taskTitle}" vence em 1 hora`,
        oneHourBefore,
        subtaskId,
        '1hour_before',
        'tasks-default'
      );
      if (notifId) notifications['1hour_before'] = notifId;
    }

    // 2. Notificação 30 minutos antes
    const thirtyMinBefore = new Date(dueTime_ms - (30 * 60 * 1000));
    if (thirtyMinBefore.getTime() > now) {
      const notifId = await scheduleNotification(
        '⏰ Lembrete - Subtarefa - 30min',
        `"${subtask.title}" de "${taskTitle}" vence em 30 minutos`,
        thirtyMinBefore,
        subtaskId,
        '30min_before',
        'tasks-default'
      );
      if (notifId) notifications['30min_before'] = notifId;
    }

    // 3. Notificação no momento do vencimento
    const notifId = await scheduleNotification(
      '⏰ Subtarefa Vencendo',
      `"${subtask.title}" de "${taskTitle}" vence AGORA!`,
      fireAt,
      subtaskId,
      'at_due',
      'tasks-overdue'
    );
    if (notifId) notifications['at_due'] = notifId;

    // Salvar no mapa
    const map = await getMap();
    map[subtaskId] = notifications;
    await setMap(map);

    return subtaskId;
  } catch (e) {
    console.warn('[Notifications] Falha ao agendar lembrete de subtarefa:', e);
    return null;
  }
}

export async function cancelSubtaskReminder(taskId: string, subtaskId: string) {
  const fullSubtaskId = `${taskId}_subtask_${subtaskId}`;
  
  // Web: cancelar timeouts
  if (Platform.OS === 'web') {
    if (webTimeouts[fullSubtaskId]) {
      Object.values(webTimeouts[fullSubtaskId]).forEach(timeoutId => {
        if (timeoutId) window.clearTimeout(timeoutId);
      });
      delete webTimeouts[fullSubtaskId];
    }
    return;
  }

  // Mobile: cancelar notificações agendadas
  const map = await getMap();
  const notifIds = map[fullSubtaskId];
  if (notifIds) {
    for (const type of Object.keys(notifIds) as NotificationType[]) {
      const notifId = notifIds[type];
      if (notifId) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notifId);
        } catch (e) {
          console.warn(`[Notifications] Falha ao cancelar notificação de subtarefa ${notifId}:`, e);
        }
      }
    }
    delete map[fullSubtaskId];
    await setMap(map);
  }
}

export async function cancelAllSubtaskReminders(taskId: string) {
  // Web: cancelar todos os timeouts de subtarefas desta tarefa
  if (Platform.OS === 'web') {
    const subtaskKeys = Object.keys(webTimeouts).filter(key => key.startsWith(`${taskId}_subtask_`));
    for (const key of subtaskKeys) {
      Object.values(webTimeouts[key]).forEach(timeoutId => {
        if (timeoutId) window.clearTimeout(timeoutId);
      });
      delete webTimeouts[key];
    }
    return;
  }

  // Mobile: cancelar todas as notificações de subtarefas
  const map = await getMap();
  const subtaskKeys = Object.keys(map).filter(key => key.startsWith(`${taskId}_subtask_`));
  
  for (const subtaskKey of subtaskKeys) {
    const notifIds = map[subtaskKey];
    if (notifIds) {
      for (const type of Object.keys(notifIds) as NotificationType[]) {
        const notifId = notifIds[type];
        if (notifId) {
          try {
            await Notifications.cancelScheduledNotificationAsync(notifId);
          } catch (e) {
            console.warn(`[Notifications] Falha ao cancelar notificação de subtarefa ${notifId}:`, e);
          }
        }
      }
    }
    delete map[subtaskKey];
  }
  
  await setMap(map);
}

export async function sendOverdueTaskNotification(task: any) {
  // Suporte web: enviar notificação imediata via Web Notifications API
  if (Platform.OS === 'web') {
    try {
      if ((window as any).Notification && (window as any).Notification.permission !== 'granted') {
        await (window as any).Notification.requestPermission?.();
      }

      if ((window as any).Notification && (window as any).Notification.permission === 'granted') {
        // Calcular há quanto tempo a tarefa venceu (mesma lógica para message)
        const dueDate = safeToDate(task.dueDate);
        const dueTime = safeToDate((task as any).dueTime);
        if (!dueDate) return null;

        const fireAt = new Date(dueDate);
        if (dueTime) {
          fireAt.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
        }

        const now = new Date();
        const diffMs = now.getTime() - fireAt.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        const title = 'Tarefa vencida';
        const body = `${task.title} — vencida há ${diffHours >= 1 ? Math.floor(diffHours) + 'h' : Math.floor(diffMinutes) + 'm'}`;

        try {
          new (window as any).Notification(title, { body, data: { taskId: task.id, type: 'overdue_task' } });
          console.log('[Notifications][Web] Notificação de tarefa vencida enviada:', { taskId: task.id, title: task.title });
          return task.id;
        } catch (e) {
          console.warn('[Notifications][Web] Falha ao criar notificação:', e);
          return null;
        }
      }

      console.log('[Notifications][Web] Permissão de notificação não concedida');
      return null;
    } catch (e) {
      console.warn('[Notifications][Web] Erro ao enviar notificação vencida:', e);
      return null;
    }
  }

  try {
    // Calcular há quanto tempo a tarefa venceu
    const dueDate = safeToDate(task.dueDate);
    const dueTime = safeToDate((task as any).dueTime);
    if (!dueDate) return null;

    const fireAt = new Date(dueDate);
    if (dueTime) {
      fireAt.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
    }

    const now = new Date();
    const diffMs = now.getTime() - fireAt.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    // Mensagem simplificada: título curto e corpo com informação essencial
    const title = 'Tarefa vencida';
    const body = `${task.title} — vencida há ${diffHours >= 1 ? Math.floor(diffHours) + 'h' : Math.floor(diffMinutes) + 'm'}`;

    const content: any = {
      title,
      body,
      data: {
        taskId: task.id,
        type: 'overdue_task'
      },
      sound: 'default',
      sticky: false,
      autoDismiss: true,
    };

    if (Platform.OS === 'android') {
      content.android = {
        channelId: 'tasks-overdue',
        // usar prioridade alta para tarefas vencidas
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
    }

    if (Platform.OS === 'ios') {
      content.relevanceScore = 1.0;
    }

    // Agendar a notificação para aparecer em 2 segundos
    // Usar TIME_INTERVAL que é mais confiável com app fechado
    const id = await Notifications.scheduleNotificationAsync({ 
      content, 
      trigger: {
        seconds: 2,
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      },
    });
    
    console.log('[Notifications] Notificação de tarefa vencida agendada:', { 
      id, 
      taskId: task.id, 
      title: task.title,
    });
    return id;
  } catch (e) {
    console.warn('[Notifications] Falha ao agendar notificação de tarefa vencida:', e);
    return null;
  }
}

// Helper para abrir as configurações do app (onde o usuário pode habilitar notificações)
// Em Android: abrirá a tela de configurações do app
// Em iOS: abrirá as configurações do app no Settings
export async function openNotificationSettings() {
  try {
    // Linking.openSettings() abre as configurações do app em ambas as plataformas
    // e é suportado pelo React Native. expo-notifications não fornece um
    // helper cross-platform para abrir as settings diretamente.
    await Linking.openSettings();
  } catch (e) {
    console.warn('[Notifications] Falha ao abrir configurações do app:', e);
  }
}

// Cancelar todas as notificações agendadas (útil para reset)
export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    Object.keys(webTimeouts).forEach(taskId => {
      const timeouts = webTimeouts[taskId];
      if (timeouts) {
        Object.values(timeouts).forEach(timeoutId => {
          if (timeoutId) clearTimeout(timeoutId);
        });
      }
    });
    // Limpar o objeto
    Object.keys(webTimeouts).forEach(key => delete webTimeouts[key]);
    await AsyncStorage.removeItem(STORAGE_KEY_WEB);
    console.log('[Notifications][Web] Todas as notificações canceladas');
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await setMap({});
    console.log('[Notifications] ✅ Todas as notificações canceladas');
  } catch (e) {
    console.warn('[Notifications] Erro ao cancelar todas:', e);
  }
}

// Export padrão para compatibilidade com importações que assumem default export
const NotificationService = {
  initialize,
  addNotificationListener,
  registerNotificationHandlers,
  shouldNotifyForOverdue,
  scheduleTaskReminder,
  cancelTaskReminder,
  rescheduleTaskReminder,
  sendOverdueTaskNotification,
  scheduleSubtaskReminders,
  scheduleSubtaskReminder,
  cancelSubtaskReminder,
  cancelAllSubtaskReminders,
  openNotificationSettings,
  cancelAllNotifications,
};

export default NotificationService;
