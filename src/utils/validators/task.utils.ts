import { RepeatConfig, RepeatType, Task } from '../../types/family.types';
import { AVAILABLE_EMOJIS } from '../../constants/task.constants';

// Helper para converter RepeatConfig para repeatOption/repeatDays
export const repeatConfigToOption = (repeat?: RepeatConfig): {
  repeatOption: 'nenhum' | 'diario' | 'semanal' | 'mensal' | 'anual' | 'quinzenal' | 'intervalo';
  repeatDays?: number[];
  repeatIntervalDays?: number;
  repeatDurationMonths?: number;
  repeatEndDate?: Date | string;
} => {
  if (!repeat || repeat.type === RepeatType.NONE) {
    return { repeatOption: 'nenhum' };
  }
  if (repeat.type === RepeatType.DAILY) {
    return { repeatOption: 'diario' };
  }
  if (repeat.type === RepeatType.CUSTOM) {
    return { repeatOption: 'semanal', repeatDays: repeat.days || [] };
  }
  if (repeat.type === RepeatType.MONTHLY) {
    return { repeatOption: 'mensal' };
  }
  if (repeat.type === RepeatType.YEARLY) {
    return { repeatOption: 'anual' };
  }
  if (repeat.type === RepeatType.BIWEEKLY) {
    return { repeatOption: 'quinzenal' };
  }
  if (repeat.type === RepeatType.INTERVAL) {
    return {
      repeatOption: 'intervalo',
      repeatIntervalDays: repeat.intervalDays,
      repeatDurationMonths: repeat.durationMonths,
      repeatEndDate: repeat.endDate
    };
  }
  return { repeatOption: 'nenhum' };
};

// Helper para criar RepeatConfig a partir de repeatOption/repeatDays
export const optionToRepeatConfig = (
  repeatOption?: string,
  repeatDays?: number[],
  opts?: { repeatIntervalDays?: number; repeatDurationMonths?: number; repeatEndDate?: Date | string }
): RepeatConfig => {
  if (!repeatOption || repeatOption === 'nenhum') {
    return { type: RepeatType.NONE };
  }
  if (repeatOption === 'diario') {
    return { type: RepeatType.DAILY };
  }
  if (repeatOption === 'semanal') {
    return { type: RepeatType.CUSTOM, days: repeatDays || [] };
  }
  if (repeatOption === 'mensal') {
    return { type: RepeatType.MONTHLY };
  }
  if (repeatOption === 'anual') {
    return { type: RepeatType.YEARLY };
  }
  if (repeatOption === 'quinzenal') {
    return { type: RepeatType.BIWEEKLY };
  }
  if (repeatOption === 'intervalo') {
    return {
      type: RepeatType.INTERVAL,
      intervalDays: opts?.repeatIntervalDays || 1,
      durationMonths: opts?.repeatDurationMonths || 0,
      endDate: opts?.repeatEndDate
    };
  }
  return { type: RepeatType.NONE };
};

// Helper para acessar repeat de forma compatível
export const getRepeat = (task: Task): RepeatConfig => {
  // Se o objeto já possui a configuração estruturada, usa direto
  const anyTask: any = task as any;
  if (anyTask.repeat && typeof anyTask.repeat === 'object' && 'type' in anyTask.repeat) {
    return anyTask.repeat as RepeatConfig;
  }
  // Fallback: converte a partir de repeatOption/repeatDays
  return optionToRepeatConfig(task.repeatOption, task.repeatDays, { repeatIntervalDays: (task as any).repeatIntervalDays, repeatDurationMonths: (task as any).repeatDurationMonths });
};

// Filtra tarefas concluídas há mais de 7 dias (mesma lógica do Firestore)
export const filterOldCompletedTasks = <T extends { completed?: boolean; completedAt?: Date | string | any }>(tasks: T[]): T[] => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return tasks.filter(task => {
    // Se não está concluída, mantém
    if (!task.completed) return true;

    // Se está concluída mas não tem data, mantém (para evitar perder dados)
    if (!task.completedAt) return true;

    // Converter completedAt para Date
    let completedDate: Date;
    if (task.completedAt instanceof Date) {
      completedDate = task.completedAt;
    } else if (task.completedAt?.toDate) {
      completedDate = task.completedAt.toDate();
    } else if (typeof task.completedAt === 'string') {
      completedDate = new Date(task.completedAt);
    } else {
      return true; // Formato desconhecido, mantém
    }

    // Mantém apenas se foi concluída nos últimos 7 dias
    return completedDate >= sevenDaysAgo;
  });
};

export const getEmojiForIcon = (iconName?: string): string => {
  if (!iconName) return '😊';
  const icon = AVAILABLE_EMOJIS.find(i => i.name === iconName);
  return icon ? icon.emoji : '😊';
};

// Função para calcular horário da task principal baseado na subtarefa mais próxima
export const calculateMainTaskTimeFromSubtasks = (subtasks: any[]): { date?: Date; time?: Date } => {
  const subtasksWithDateTime = subtasks.filter(st => st.dueDate || st.dueTime);

  if (subtasksWithDateTime.length === 0) {
    return {};
  }

  // Converter subtarefas para timestamps para comparação
  const subtaskTimes = subtasksWithDateTime.map(st => {
    const baseDate = st.dueDate ? new Date(st.dueDate) : new Date();
    if (st.dueTime) {
      const timeDate = new Date(st.dueTime);
      baseDate.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);
    }
    return {
      subtask: st,
      timestamp: baseDate.getTime(),
      date: st.dueDate ? new Date(st.dueDate) : undefined,
      time: st.dueTime ? new Date(st.dueTime) : undefined
    };
  });

  // Ordenar por timestamp e pegar o mais próximo (mais cedo)
  subtaskTimes.sort((a, b) => a.timestamp - b.timestamp);
  const earliest = subtaskTimes[0];

  return {
    date: earliest.date,
    time: earliest.time
  };
};

// Função para calcular horário da task principal baseado apenas nas subtarefas NÃO CONCLUÍDAS
export const calculateMainTaskTimeFromPendingSubtasks = (subtasks: any[]): { date?: Date; time?: Date } => {
  // Filtrar apenas subtarefas não concluídas que têm data/hora
  const pendingSubtasksWithDateTime = subtasks.filter(st => !st.done && (st.dueDate || st.dueTime));

  if (pendingSubtasksWithDateTime.length === 0) {
    return {};
  }

  // Converter subtarefas para timestamps para comparação
  const subtaskTimes = pendingSubtasksWithDateTime.map(st => {
    const baseDate = st.dueDate ? new Date(st.dueDate) : new Date();
    if (st.dueTime) {
      const timeDate = new Date(st.dueTime);
      baseDate.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);
    }
    return {
      subtask: st,
      timestamp: baseDate.getTime(),
      date: st.dueDate ? new Date(st.dueDate) : undefined,
      time: st.dueTime ? new Date(st.dueTime) : undefined
    };
  });

  // Ordenar por timestamp e pegar o mais próximo (mais cedo)
  subtaskTimes.sort((a, b) => a.timestamp - b.timestamp);
  const earliest = subtaskTimes[0];

  return {
    date: earliest.date,
    time: earliest.time
  };
};
