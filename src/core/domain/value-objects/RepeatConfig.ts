/**
 * Value Object: RepeatConfig
 * Representa a configuração de repetição de uma tarefa
 * 
 * Princípio SOLID: Single Responsibility (S)
 * - Encapsula lógica de cálculo de datas de repetição
 */

export type RepeatType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type WeekDay = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface RepeatConfig {
  enabled: boolean;
  type: RepeatType;
  interval: number; // a cada X dias/semanas/meses
  weekDays?: WeekDay[]; // para repetição semanal
  monthDay?: number; // para repetição mensal (dia do mês)
  endDate?: Date; // data de término
  occurrences?: number; // número de ocorrências
}

export const REPEAT_TYPE_LABELS: Record<RepeatType, string> = {
  daily: 'Diariamente',
  weekly: 'Semanalmente',
  monthly: 'Mensalmente',
  yearly: 'Anualmente',
  custom: 'Personalizado',
};

export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  sun: 'Dom',
  mon: 'Seg',
  tue: 'Ter',
  wed: 'Qua',
  thu: 'Qui',
  fri: 'Sex',
  sat: 'Sáb',
};

export const WEEK_DAY_FULL_LABELS: Record<WeekDay, string> = {
  sun: 'Domingo',
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
};

/**
 * Cria configuração de repetição padrão (desabilitada)
 */
export function createDefaultRepeatConfig(): RepeatConfig {
  return {
    enabled: false,
    type: 'daily',
    interval: 1,
  };
}

/**
 * Cria configuração de repetição diária
 */
export function createDailyRepeat(interval: number = 1, endDate?: Date): RepeatConfig {
  return {
    enabled: true,
    type: 'daily',
    interval,
    endDate,
  };
}

/**
 * Cria configuração de repetição semanal
 */
export function createWeeklyRepeat(weekDays: WeekDay[], interval: number = 1, endDate?: Date): RepeatConfig {
  return {
    enabled: true,
    type: 'weekly',
    interval,
    weekDays,
    endDate,
  };
}

/**
 * Cria configuração de repetição mensal
 */
export function createMonthlyRepeat(monthDay: number, interval: number = 1, endDate?: Date): RepeatConfig {
  return {
    enabled: true,
    type: 'monthly',
    interval,
    monthDay,
    endDate,
  };
}

/**
 * Calcula a próxima data de ocorrência
 */
export function getNextOccurrence(config: RepeatConfig, fromDate: Date): Date | null {
  if (!config.enabled) return null;
  
  const next = new Date(fromDate);
  
  switch (config.type) {
    case 'daily':
      next.setDate(next.getDate() + config.interval);
      break;
      
    case 'weekly':
      if (config.weekDays && config.weekDays.length > 0) {
        const dayMap: Record<WeekDay, number> = {
          sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
        };
        
        const targetDays = config.weekDays.map(d => dayMap[d]).sort((a, b) => a - b);
        const currentDay = next.getDay();
        
        // Encontra o próximo dia da semana na lista
        let nextDay = targetDays.find(d => d > currentDay);
        
        if (nextDay !== undefined) {
          next.setDate(next.getDate() + (nextDay - currentDay));
        } else {
          // Vai para a primeira ocorrência da próxima semana
          const daysUntilFirstDay = 7 - currentDay + targetDays[0];
          next.setDate(next.getDate() + daysUntilFirstDay + (config.interval - 1) * 7);
        }
      } else {
        next.setDate(next.getDate() + 7 * config.interval);
      }
      break;
      
    case 'monthly':
      next.setMonth(next.getMonth() + config.interval);
      if (config.monthDay) {
        const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(config.monthDay, lastDay));
      }
      break;
      
    case 'yearly':
      next.setFullYear(next.getFullYear() + config.interval);
      break;
      
    default:
      return null;
  }
  
  // Verifica se passou da data de término
  if (config.endDate && next > config.endDate) {
    return null;
  }
  
  return next;
}

/**
 * Gera todas as ocorrências dentro de um período
 */
export function getOccurrencesInRange(
  config: RepeatConfig,
  startDate: Date,
  rangeStart: Date,
  rangeEnd: Date,
  maxOccurrences: number = 365
): Date[] {
  if (!config.enabled) return [startDate];
  
  const occurrences: Date[] = [];
  let currentDate = new Date(startDate);
  let count = 0;
  
  while (currentDate <= rangeEnd && count < maxOccurrences) {
    if (currentDate >= rangeStart) {
      occurrences.push(new Date(currentDate));
    }
    
    const nextDate = getNextOccurrence(config, currentDate);
    if (!nextDate) break;
    
    currentDate = nextDate;
    count++;
  }
  
  return occurrences;
}

/**
 * Formata descrição da repetição
 */
export function formatRepeatDescription(config: RepeatConfig): string {
  if (!config.enabled) return 'Não repete';
  
  const interval = config.interval > 1 ? `a cada ${config.interval} ` : '';
  
  switch (config.type) {
    case 'daily':
      return config.interval === 1 ? 'Todo dia' : `A cada ${config.interval} dias`;
      
    case 'weekly':
      if (config.weekDays && config.weekDays.length > 0) {
        const days = config.weekDays.map(d => WEEK_DAY_LABELS[d]).join(', ');
        return config.interval === 1 
          ? `Toda semana em ${days}`
          : `A cada ${config.interval} semanas em ${days}`;
      }
      return config.interval === 1 ? 'Toda semana' : `A cada ${config.interval} semanas`;
      
    case 'monthly':
      const dayStr = config.monthDay ? `dia ${config.monthDay}` : 'mesmo dia';
      return config.interval === 1 
        ? `Todo mês no ${dayStr}`
        : `A cada ${config.interval} meses no ${dayStr}`;
      
    case 'yearly':
      return config.interval === 1 ? 'Todo ano' : `A cada ${config.interval} anos`;
      
    default:
      return 'Personalizado';
  }
}

/**
 * Verifica se configuração é válida
 */
export function isValidRepeatConfig(config: RepeatConfig): boolean {
  if (!config.enabled) return true;
  
  if (config.interval < 1) return false;
  
  if (config.type === 'weekly' && (!config.weekDays || config.weekDays.length === 0)) {
    return false;
  }
  
  if (config.type === 'monthly' && config.monthDay !== undefined) {
    if (config.monthDay < 1 || config.monthDay > 31) return false;
  }
  
  return true;
}
