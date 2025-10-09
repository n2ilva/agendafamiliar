import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Evitar dependência direta do tipo Task do projeto para não causar
// conflitos com definições de Task locais (TaskScreen tem sua própria
// definição). Aceitamos 'any' nas assinaturas públicas para compatibilidade.
import { safeToDate } from '../utils/DateUtils';

const STORAGE_KEY = 'notification_task_map';

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
    console.log('[Notifications] Web detectado - inicialização ignorada');
    return { granted: false };
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
  // No web, não agendar e não falhar
  if (Platform.OS === 'web') {
    return null;
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
      title: '⏰ Lembrete de tarefa',
      body: `"${task.title}" vence hoje`,
      data: { taskId: task.id },
      sound: 'default',
    };

    if (Platform.OS === 'android') {
      content.android = {
        channelId: 'tasks-default',
        // priority aqui torna o comportamento mais previsível em Android
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
  // No web, não há agenda
  if (Platform.OS === 'web') return;

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
  // No web, não enviar notificação imediata
  if (Platform.OS === 'web') {
    console.log('[Notifications] Web detectado - notificação de tarefa vencida ignorada');
    return null;
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

    // Lógica inteligente baseada no tempo de atraso
    let titulo = '';
    let mensagem = '';
    let prioridade: Notifications.AndroidNotificationPriority = Notifications.AndroidNotificationPriority.DEFAULT;
    let vibrationPattern: number[] = [0, 500, 200, 500];
    let color = '#e74c3c';
    let interruptionLevel: any = 'timeSensitive';

    if (diffMinutes <= 5) {
      // Acabou de vencer - máxima urgência
      titulo = '🚨 Tarefa Vencida!';
      mensagem = `"${task.title}" venceu agora mesmo! Execute imediatamente.`;
      prioridade = Notifications.AndroidNotificationPriority.MAX;
      vibrationPattern = [0, 1000, 500, 1000, 500, 1000];
      color = '#FF0000';
      interruptionLevel = 'critical';
    } else if (diffMinutes <= 30) {
      // Venceu há pouco tempo
      titulo = '⚠️ Tarefa Atrasada';
      mensagem = `"${task.title}" venceu há ${diffMinutes} minutos. Não deixe acumular!`;
      prioridade = Notifications.AndroidNotificationPriority.HIGH;
      vibrationPattern = [0, 800, 300, 800];
      color = '#FF6B35';
      interruptionLevel = 'timeSensitive';
    } else if (diffHours < 1) {
      // Venceu há menos de 1 hora
      titulo = '⏰ Tarefa Atrasada';
      mensagem = `"${task.title}" venceu há ${diffMinutes} minutos. Priorize esta tarefa!`;
      prioridade = Notifications.AndroidNotificationPriority.HIGH;
      vibrationPattern = [0, 600, 200, 600];
      color = '#FF8C42';
      interruptionLevel = 'timeSensitive';
    } else if (diffHours < 6) {
      // Venceu há algumas horas
      titulo = '📅 Tarefa Muito Atrasada';
      mensagem = `"${task.title}" venceu há ${diffHours}h ${diffMinutes % 60}min. Execute o quanto antes!`;
      prioridade = Notifications.AndroidNotificationPriority.HIGH;
      vibrationPattern = [0, 800, 300, 800, 300, 800];
      color = '#FF5722';
      interruptionLevel = 'timeSensitive';
    } else if (diffHours < 24) {
      // Venceu hoje
      titulo = '🔴 Tarefa Crítica';
      mensagem = `"${task.title}" venceu há ${diffHours} horas. Esta tarefa precisa de atenção imediata!`;
      prioridade = Notifications.AndroidNotificationPriority.MAX;
      vibrationPattern = [0, 1000, 500, 1000, 500, 1000, 500, 1000];
      color = '#D32F2F';
      interruptionLevel = 'critical';
    } else if (diffDays < 2) {
      // Venceu ontem
      titulo = '🚨 Tarefa Emergencial';
      mensagem = `"${task.title}" venceu há ${diffDays} dia. CORRA para executar!`;
      prioridade = Notifications.AndroidNotificationPriority.MAX;
      vibrationPattern = [0, 1200, 400, 1200, 400, 1200, 400, 1200];
      color = '#B71C1C';
      interruptionLevel = 'critical';
    } else if (diffDays < 7) {
      // Venceu esta semana
      titulo = '💥 Tarefa Urgente';
      mensagem = `"${task.title}" venceu há ${diffDays} dias. Não ignore mais!`;
      prioridade = Notifications.AndroidNotificationPriority.MAX;
      vibrationPattern = [0, 1500, 300, 1500, 300, 1500];
      color = '#8B0000';
      interruptionLevel = 'critical';
    } else {
      // Venceu há muito tempo
      titulo = '🆘 Tarefa Abandonada';
      mensagem = `"${task.title}" venceu há ${diffDays} dias. Execute imediatamente ou cancele!`;
      prioridade = Notifications.AndroidNotificationPriority.MAX;
      vibrationPattern = [0, 2000, 200, 2000, 200, 2000];
      color = '#4A148C';
      interruptionLevel = 'critical';
    }

    // Construir o conteúdo de forma explícita por plataforma para garantir
    // compatibilidade com as propriedades nativas do Android/iOS.
    const content: any = {
      title: titulo,
      body: mensagem,
      data: {
        taskId: task.id,
        type: 'overdue_task',
        dueDate: fireAt.toISOString(),
        overdueMinutes: diffMinutes,
        overdueHours: diffHours,
        overdueDays: diffDays,
      },
      sound: 'default',
      sticky: false,
      autoDismiss: true,
    };

    if (Platform.OS === 'android') {
      content.android = {
        channelId: 'tasks-overdue',
        vibrationPattern: vibrationPattern,
        color: color,
        // prioridade adicional para Android (compatível com canais)
        priority: prioridade,
      };
    }

    if (Platform.OS === 'ios') {
      // interruptionLevel e relevanceScore são iOS-specific (iOS 15+)
      content.interruptionLevel = interruptionLevel;
      content.relevanceScore = 1.0;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: null, // Enviar imediatamente
    });

    console.log('[Notifications] Notificação inteligente de tarefa vencida enviada:', {
      id,
      taskId: task.id,
      title: task.title,
      overdueMinutes: diffMinutes,
      overdueHours: diffHours,
      overdueDays: diffDays,
      priority: prioridade,
      urgencyLevel: titulo.split(' ')[0]
    });

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
