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
 * Calculate the next recurrence date based on the repeat type
 */
export const getNextRecurrenceDate = (
  currentDate: Date,
  repeatType: string,
  customDays?: number[],
  intervalDays?: number,
  durationMonths?: number
): Date => {
  const nextDate = new Date(currentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (repeatType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;

    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;

    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;

    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 15);
      break;

    case 'weekends':
      // Próximo fim de semana (sábado ou domingo)
      const currentDay = nextDate.getDay(); // 0 = domingo, 6 = sábado
      if (currentDay === 0) { // Domingo -> Sábado
        nextDate.setDate(nextDate.getDate() + 6);
      } else if (currentDay === 6) { // Sábado -> Domingo
        nextDate.setDate(nextDate.getDate() + 1);
      } else {
        // Dia de semana -> Próximo Sábado
        const daysUntilSaturday = 6 - currentDay;
        nextDate.setDate(nextDate.getDate() + daysUntilSaturday);
      }
      break;

    case 'custom':
      if (customDays && customDays.length > 0) {
        const currentDay = nextDate.getDay();
        // Encontrar o próximo dia na lista que seja maior que o dia atual
        // customDays deve ser 0-6 (Dom-Sáb)
        const sortedDays = [...customDays].sort((a, b) => a - b);
        const nextDay = sortedDays.find(day => day > currentDay);

        if (nextDay !== undefined) {
          // Próximo dia na mesma semana
          nextDate.setDate(nextDate.getDate() + (nextDay - currentDay));
        } else {
          // Não há dia posterior nesta semana, pegar o primeiro dia da próxima semana
          const firstDay = sortedDays[0];
          const daysToAdd = (7 - currentDay) + firstDay;
          nextDate.setDate(nextDate.getDate() + daysToAdd);
        }
      } else {
        // Fallback: próximo dia
        nextDate.setDate(nextDate.getDate() + 1);
      }
      break;

    case 'interval':
      if (intervalDays && intervalDays > 0) {
        nextDate.setDate(nextDate.getDate() + intervalDays);
      } else {
        nextDate.setDate(nextDate.getDate() + 1); // Fallback
      }
      break;

    default:
      console.warn('⚠️ Tipo de recorrência não reconhecido:', repeatType);
      // Default to next day to avoid loops
      nextDate.setDate(nextDate.getDate() + 1);
      break;
  }

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