import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Evitar dependência direta do tipo Task do projeto para não causar
// conflitos com definições de Task locais (TaskScreen tem sua própria
// definição). Aceitamos 'any' nas assinaturas públicas para compatibilidade.
import { safeToDate } from '../utils/DateUtils';

const STORAGE_KEY = 'notification_task_map';
const STORAGE_KEY_WEB = 'notification_task_map_web';

// runtime map para timeouts no web (não serializável)
const webTimeouts: Record<string, number> = {};

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
            const ts = map[taskId];
            const scheduledAt = new Date(ts).getTime();
            const delay = scheduledAt - now;
            if (delay > 0) {
              // Agendar timeout para disparar a notificação quando a página estiver aberta
                webTimeouts[taskId] = window.setTimeout(() => {
                  try {
                    const entry = map[taskId];
                    // conteúdo básico: o título foi persistido apenas como referência externa
                    new (window as any).Notification('Lembrete', { body: `Tarefa agendada`, data: { taskId } });
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
      // Calcular data de disparo (mesma lógica do mobile)
      const dueDate = safeToDate(task.dueDate);
      const dueTime = safeToDate((task as any).dueTime);
      if (!dueDate) return null;

      const fireAt = new Date(dueDate);
      if (dueTime) {
        fireAt.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
      } else {
        fireAt.setHours(9, 0, 0, 0);
      }

      if (fireAt.getTime() <= Date.now()) return null;

      // Garantir permissão
      if ((window as any).Notification && (window as any).Notification.permission !== 'granted') {
        await (window as any).Notification.requestPermission?.();
      }

      if ((window as any).Notification && (window as any).Notification.permission === 'granted') {
        const delay = fireAt.getTime() - Date.now();
        const timeoutId = window.setTimeout(() => {
          try {
            new (window as any).Notification('Lembrete', { body: `${task.title} — vence ${fireAt.toLocaleDateString('pt-BR')}${fireAt.getHours() ? ' às ' + fireAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}`, data: { taskId: task.id, type: 'task_reminder' } });
          } catch (e) {
            console.warn('[Notifications][Web] Erro ao disparar notificação agendada:', e);
          }
        }, delay) as unknown as number;

        webTimeouts[task.id] = timeoutId;

        // Persistir horário para re-agendamento ao recarregar
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY_WEB);
          const map = raw ? JSON.parse(raw) : {};
          map[task.id] = fireAt.toISOString();
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

  try {
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

    // Colocar channelId / priority dentro de content.android garante que o canal
    // e as propriedades específicas do Android sejam aplicadas corretamente
    // pelo expo-notifications ao agendar a notificação.
    const content: any = {
      title: 'Lembrete',
      body: `${task.title} — vence ${fireAt.toLocaleDateString('pt-BR')}${fireAt.getHours() ? ' às ' + fireAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}`,
      data: { taskId: task.id, type: 'task_reminder' },
      sound: 'default',
    };

    if (Platform.OS === 'android') {
      content.android = {
        channelId: 'tasks-default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
    }

    const trigger: Notifications.NotificationTriggerInput = {
      date: fireAt,
      type: (Notifications as any).SchedulableTriggerInputTypes?.DATE || 'date',
    } as any;

    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    const map = await getMap();
    map[task.id] = id;
    await setMap(map);
    return id;
  } catch (e) {
    console.warn('[Notifications] Falha ao agendar notificação, ignorando:', e);
    return null;
  }
}

export async function cancelTaskReminder(taskId: string) {
  // Suporte web: cancelar timeout se presente e remover persistência
  if (Platform.OS === 'web') {
    try {
      const to = webTimeouts[taskId];
      if (to) {
        clearTimeout(to);
        delete webTimeouts[taskId];
      }
      const raw = await AsyncStorage.getItem(STORAGE_KEY_WEB);
      const map = raw ? JSON.parse(raw) : {};
      if (map[taskId]) {
        delete map[taskId];
        await AsyncStorage.setItem(STORAGE_KEY_WEB, JSON.stringify(map));
      }
    } catch (e) {
      console.warn('[Notifications][Web] Falha ao cancelar notificação agendada:', e);
    }
    return;
  }

  const map = await getMap();
  const notifId = map[taskId];
  if (notifId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notifId);
    } catch (e) {
      console.warn('[Notifications] Falha ao cancelar notificação:', e);
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
