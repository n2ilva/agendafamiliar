import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Evitar dependência direta do tipo Task do projeto para não causar
// conflitos com definições de Task locais (TaskScreen tem sua própria
// definição). Aceitamos 'any' nas assinaturas públicas para compatibilidade.
import { safeToDate } from '../utils/DateUtils';

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
  // No web, expo-notifications não é suportado: fazer no-op seguro
  if (Platform.OS === 'web') {
    try {
      // Pedir permissão para Web Notifications
      const permission = await (window as any).Notification?.requestPermission?.();
      const granted = permission === 'granted';

      // Reagendar notificações previamente armazenadas
      if (granted) {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY_WEB);
          const map = raw ? JSON.parse(raw) : {};
          const now = Date.now();
          for (const taskId of Object.keys(map)) {
            const taskData = map[taskId];
            if (!taskData || !taskData.dueTime) continue;
            
            const scheduledAt = new Date(taskData.dueTime).getTime();
            const delay = scheduledAt - now;
            if (delay > 0) {
              // Reagendar apenas notificação principal (at_due) na reinicialização
              // As outras serão recalculadas quando scheduleTaskReminder for chamado
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
            } else {
              // horário já passou — remover do map
              delete map[taskId];
            }
          }
          await AsyncStorage.setItem(STORAGE_KEY_WEB, JSON.stringify(map));
        } catch (e) {
          console.warn('[Notifications][Web] Falha ao reagendar notificações:', e);
        }
      }

      console.log('[Notifications] Web detectado - inicialização concluída (permissão:', granted, ')');
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
  } catch (e) {
    console.warn('[Notifications] Falha ao inicializar, seguindo sem notificações:', e);
    return { granted: false };
  }
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
              new (window as any).Notification('Lembrete - 1h', { 
                body: `${task.title} vence em 1 hora`, 
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
              new (window as any).Notification('Lembrete - 30min', { 
                body: `${task.title} vence em 30 minutos`, 
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
              new (window as any).Notification('Tarefa Vencendo', { 
                body: `${task.title} vence AGORA!`, 
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

    // 1. Notificação 1 hora antes
    const oneHourBefore = new Date(dueTime_ms - (60 * 60 * 1000));
    if (oneHourBefore.getTime() > now) {
      const notifId = await scheduleNotification(
        '⏰ Lembrete - 1h',
        `${task.title} vence em 1 hora`,
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
        '⏰ Lembrete - 30min',
        `${task.title} vence em 30 minutos`,
        thirtyMinBefore,
        task.id,
        '30min_before',
        'tasks-default'
      );
      if (notifId) notifications['30min_before'] = notifId;
    }

    // 3. Notificação no momento do vencimento
    const notifId = await scheduleNotification(
      '🔔 Tarefa Vencendo',
      `${task.title} vence AGORA!`,
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
        '⚠️ Tarefa Vencida',
        `${task.title} venceu há 1 hora`,
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
    const content: any = {
      title,
      body,
      data: { taskId, type, notificationType: type },
      sound: 'default',
    };

    if (Platform.OS === 'android') {
      content.android = {
        channelId,
        priority: channelId === 'tasks-overdue' 
          ? Notifications.AndroidNotificationPriority.MAX
          : Notifications.AndroidNotificationPriority.HIGH,
      };
    }

    if (Platform.OS === 'ios' && channelId === 'tasks-overdue') {
      content.relevanceScore = 1.0;
    }

    const trigger: Notifications.NotificationTriggerInput = {
      date: fireAt,
      type: (Notifications as any).SchedulableTriggerInputTypes?.DATE || 'date',
    } as any;

    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    console.log(`✅ [Notifications] Agendada: ${type} para ${fireAt.toLocaleString('pt-BR')}`);
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

    const id = await Notifications.scheduleNotificationAsync({ content, trigger: null });
    console.log('[Notifications] Notificação de tarefa vencida enviada:', { id, taskId: task.id, title: task.title });
    return id;
  } catch (e) {
    console.warn('[Notifications] Falha ao enviar notificação inteligente de tarefa vencida:', e);
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

/*
Recomendações de otimização para notificações nativas (mobile):

- Android:
  - Criar canais com importance correta e descrição clara (feito em ensureAndroidChannel).
  - Usar channelId em content.android para ter certeza que o canal é aplicado.
  - Para alertas urgentes, usar CHANNEL com IMPORTANCE_MAX e bypassDnd=true (já criado tasks-overdue).
  - Verificar vibrationPattern e sound customizado (som custom exige configuração adicional no Android).

- iOS:
  - Usar interruptionLevel ('timeSensitive' / 'critical') somente quando justificável. Notas:
    * 'critical' requer permissões especiais / entitlements e pode não funcionar em todos os dispositivos.
    * 'timeSensitive' funciona com Focus/Não Perturbe no iOS 15+.
  - Ajustar relevanceScore para destacar notificações importantes em concentrações de entregas.

- Geral:
  - Fornecer opção para o usuário abrir as configurações de notificações (helper openNotificationSettings).
  - Testar em dispositivos reais: Android (OEMs têm variações: Samsung, Xiaomi, etc.), iOS (verificar comportamento com Focus/DND).
  - Documentar quais comportamentos são esperados em cada plataforma e fornecer fallback (web no-op já implementado).

*/

// Export padrão para compatibilidade com importações que assumem default export
const NotificationService = {
  initialize,
  scheduleTaskReminder,
  cancelTaskReminder,
  rescheduleTaskReminder,
  sendOverdueTaskNotification,
};

export default NotificationService;
