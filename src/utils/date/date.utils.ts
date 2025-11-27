/**
 * Utility functions for safe date handling
 * Handles conversion from various timestamp-like objects, strings, and other formats to JavaScript Date objects
 */

export const safeToDate = (dateValue: any): Date | undefined => {
  if (!dateValue) return undefined;

  // Se já é uma Date
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? undefined : dateValue;
  }

  // Se é um Timestamp do Firestore
  if (dateValue.toDate && typeof dateValue.toDate === 'function') {
    try {
      return dateValue.toDate();
    } catch (error) {
      console.warn('Erro ao converter Timestamp:', error);
      return undefined;
    }
  }

  // Se é um objeto simples { seconds, nanoseconds }
  if (
    typeof dateValue === 'object' &&
    dateValue !== null &&
    'seconds' in dateValue &&
    typeof (dateValue as any).seconds === 'number'
  ) {
    try {
      const seconds = (dateValue as any).seconds as number;
      const nanos = typeof (dateValue as any).nanoseconds === 'number' ? (dateValue as any).nanoseconds : 0;
      return new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
    } catch (error) {
      console.warn('Erro ao converter objeto seconds/nanoseconds:', error);
      return undefined;
    }
  }

  // Se é string ou número, tenta converter
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    try {
      const converted = new Date(dateValue);
      return isNaN(converted.getTime()) ? undefined : converted;
    } catch (error) {
      console.warn('Erro ao converter data:', error);
      return undefined;
    }
  }

  return undefined;
};

/**
 * Check if a date is today
 */
export const isToday = (date?: Date | any): boolean => {
  const safeDate = safeToDate(date);
  if (!safeDate) return false;

  const today = new Date();
  return safeDate.toDateString() === today.toDateString();
};

/**
 * Check if a date is in the future (upcoming)
 */
export const isUpcoming = (date?: Date | any): boolean => {
  const safeDate = safeToDate(date);
  if (!safeDate) return false;

  const today = new Date();
  today.setHours(23, 59, 59, 999); // Final do dia de hoje
  return safeDate > today;
};

/**
 * Check if a task is overdue
 */
export const isTaskOverdue = (dueDate?: Date | any, dueTime?: Date | any, completed: boolean = false): boolean => {
  if (!dueDate || completed) return false;

  const agora = new Date();
  const dataVencimento = safeToDate(dueDate);
  if (!dataVencimento) return false; // Se não conseguir converter a data, não é vencida

  if (dueTime) {
    const horaVencimento = safeToDate(dueTime);
    if (horaVencimento) {
      dataVencimento.setHours(horaVencimento.getHours(), horaVencimento.getMinutes());
    }
  } else {
    // Se não tem hora específica, considerar fim do dia
    dataVencimento.setHours(23, 59, 59);
  }

  return agora > dataVencimento;
};

/**
 * Check if a recurring task should be available for completion
 * Recurring tasks should only be completable on or after their due date
 */
export const isRecurringTaskCompletable = (dueDate?: Date | any, isRecurring: boolean = false): boolean => {
  if (!isRecurring || !dueDate) return true; // Non-recurring tasks are always completable

  const safeDate = safeToDate(dueDate);
  if (!safeDate) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  safeDate.setHours(0, 0, 0, 0); // Reset time to start of day

  return safeDate <= today; // Only completable on or after the due date
};

/**
 * Calculate the next occurrence date for recurring tasks
 */
export const getNextRecurrenceDate = (currentDate: Date, repeatType: string, customDays?: number[]): Date => {
  const nextDate = new Date(currentDate);
  const today = new Date();

  console.log('🔄 Calculando próxima recorrência:', {
    currentDate: currentDate,
    repeatType: repeatType,
    customDays: customDays,
    today: today
  });

  switch (repeatType) {
    case 'daily':
      // Para tarefa diária, sempre adiciona 1 dia
      nextDate.setDate(nextDate.getDate() + 1);
      console.log('📅 Próxima data (diária):', nextDate);
      break;

    case 'monthly':
      // Para tarefa mensal, adiciona 1 mês
      nextDate.setMonth(nextDate.getMonth() + 1);
      console.log('📅 Próxima data (mensal):', nextDate);
      break;

    case 'weekends':
      // Próximo fim de semana (sábado ou domingo)
      const currentDay = nextDate.getDay(); // 0 = domingo, 6 = sábado
      if (currentDay === 0) { // Domingo
        nextDate.setDate(nextDate.getDate() + 6); // Próximo sábado
      } else if (currentDay === 6) { // Sábado
        nextDate.setDate(nextDate.getDate() + 1); // Próximo domingo
      } else {
        // Se é dia de semana, vai para o próximo sábado
        const daysUntilSaturday = 6 - currentDay;
        nextDate.setDate(nextDate.getDate() + daysUntilSaturday);
      }
      console.log('📅 Próxima data (fins de semana):', nextDate);
      break;

    case 'custom':
      if (customDays && customDays.length > 0) {
        const currentDay = nextDate.getDay();
        let nextDay = customDays.find(day => day > currentDay);

        if (!nextDay) {
          // Se não há próximo dia na semana atual, vai para o primeiro dia da próxima semana
          nextDay = customDays[0];
          const daysToAdd = (7 - currentDay) + nextDay;
          nextDate.setDate(nextDate.getDate() + daysToAdd);
        } else {
          // Próximo dia na mesma semana
          nextDate.setDate(nextDate.getDate() + (nextDay - currentDay));
        }
        console.log('📅 Próxima data (personalizada):', nextDate);
      } else {
        // Fallback: próximo dia
        nextDate.setDate(nextDate.getDate() + 1);
        console.log('📅 Próxima data (personalizada - fallback):', nextDate);
      }
      break;

    default:
      // Não recorrente, não faz nada
      console.warn('⚠️ Tipo de recorrência não reconhecido:', repeatType);
      break;
  }

  // Garantir que a próxima data seja sempre no futuro
  if (nextDate <= today) {
    console.warn('⚠️ Data calculada não está no futuro, ajustando...');
    nextDate.setDate(today.getDate() + 1);
  }

  console.log('✅ Data final calculada:', nextDate);
  return nextDate;
};

/**
 * Format a date to a user-friendly string
 */
export const formatDate = (date?: Date): string => {
  if (!date) return '';
  const safeDate = safeToDate(date);
  if (!safeDate) return '';

  const day = String(safeDate.getDate()).padStart(2, '0');
  const month = String(safeDate.getMonth() + 1).padStart(2, '0');
  const year = safeDate.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format a time to a user-friendly string
 */
export const formatTime = (time?: Date | any): string => {
  if (!time) return '';
  const safeTime = safeToDate(time);
  if (!safeTime) return '';

  const hours = String(safeTime.getHours()).padStart(2, '0');
  const minutes = String(safeTime.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Format a date and time to a user-friendly string
 */
export const formatDateTime = (date?: Date | any): string => {
  if (!date) return '';
  const safeDate = safeToDate(date);
  if (!safeDate) return '';

  return `${formatDate(safeDate)} ${formatTime(safeDate)}`;
};