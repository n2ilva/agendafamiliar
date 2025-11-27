import { useMemo, useState, useCallback } from 'react';
import { getBrazilHolidays } from '../utils/date/holidays';
import { APP_COLORS, CATEGORY_COLORS } from '../constants/colors';
import { RepeatType } from '../types/family.types';
import { getRepeat } from '../utils/validators/task.utils';

const THEME = {
    primary: APP_COLORS.primary.main,
    danger: APP_COLORS.status.error,
    success: APP_COLORS.status.success,
    warning: APP_COLORS.status.warning,
    textPrimary: APP_COLORS.text.primary,
    textSecondary: APP_COLORS.text.secondary,
};

export type CalendarFilter = 'all' | 'pending' | 'completed' | 'overdue';

// Helper para converter dueDate para Date
const parseDueDate = (dueDate: any): Date | undefined => {
  if (!dueDate) return undefined;
  
  let dateObj: Date | undefined;
  if (dueDate instanceof Date) {
    dateObj = dueDate;
  } else if (dueDate.toDate && typeof dueDate.toDate === 'function') {
    dateObj = dueDate.toDate();
  } else if (typeof dueDate === 'string' || typeof dueDate === 'number') {
    dateObj = new Date(dueDate);
  }
  
  if (dateObj && !isNaN(dateObj.getTime())) {
    return dateObj;
  }
  return undefined;
};

// Helper para formatar data como YYYY-MM-DD
const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
};

// Helper para formatar horário HH:mm
const formatTime = (date: Date): string => {
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
};

export const useCalendarLogic = (
  calendarMonth: Date, 
  tasks: any[], 
  colors: any,
  filter: CalendarFilter = 'all',
  selectedDay: string | null = null
) => {
  // Estado para o dia selecionado (para ver detalhes)
  const [selectedDate, setSelectedDate] = useState<string | null>(selectedDay);
  
  const todayDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  // Filtrar tarefas baseado no filtro selecionado
  const filteredTasks = useMemo(() => {
    return tasks.filter((task: any) => {
      const dateObj = parseDueDate(task.dueDate);
      if (!dateObj) return false;
      
      const taskDate = new Date(dateObj);
      taskDate.setHours(0, 0, 0, 0);
      const isOverdue = taskDate < todayDate && !task.completed;
      
      switch (filter) {
        case 'pending':
          return !task.completed && !isOverdue;
        case 'completed':
          return task.completed;
        case 'overdue':
          return isOverdue;
        case 'all':
        default:
          return true;
      }
    });
  }, [tasks, filter, todayDate]);

  // Contar tarefas por dia
  const taskCountByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    
    filteredTasks.forEach((task: any) => {
      const dateObj = parseDueDate(task.dueDate);
      if (dateObj) {
        const ymd = formatDateKey(dateObj);
        counts[ymd] = (counts[ymd] || 0) + 1;
      }
    });
    
    return counts;
  }, [filteredTasks]);

  // Verificar se há tarefas recorrentes por dia
  const hasRecurringByDay = useMemo(() => {
    const recurring: Record<string, boolean> = {};
    
    filteredTasks.forEach((task: any) => {
      const repeatConfig = getRepeat(task);
      if (repeatConfig.type === RepeatType.NONE) return;
      
      const dateObj = parseDueDate(task.dueDate);
      if (dateObj) {
        const ymd = formatDateKey(dateObj);
        recurring[ymd] = true;
      }
    });
    
    return recurring;
  }, [filteredTasks]);

  // Verificar prioridade mais alta por dia
  const highestPriorityByDay = useMemo(() => {
    const priorities: Record<string, string> = {};
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    filteredTasks.forEach((task: any) => {
      const dateObj = parseDueDate(task.dueDate);
      if (!dateObj) return;
      
      const ymd = formatDateKey(dateObj);
      const taskPriority = task.priority || 'low';
      const currentPriority = priorities[ymd] || 'low';
      
      if ((priorityOrder[taskPriority as keyof typeof priorityOrder] || 1) > 
          (priorityOrder[currentPriority as keyof typeof priorityOrder] || 1)) {
        priorities[ymd] = taskPriority;
      }
    });
    
    return priorities;
  }, [filteredTasks]);

  const markedDates = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const holidays = getBrazilHolidays(year);
    const map: any = {};
    
    // Marcar feriados com borda circular azul E background azul
    holidays.forEach((h: { date: string; name: string }) => {
      map[h.date] = {
        customStyles: {
          container: {
            borderWidth: 2,
            borderColor: '#2196F3',
            borderRadius: 20,
            backgroundColor: 'rgba(33, 150, 243, 0.2)',
          },
          text: {
            color: colors.textPrimary,
            fontWeight: '500',
          },
        },
        taskCount: taskCountByDay[h.date] || 0,
        hasRecurring: hasRecurringByDay[h.date] || false,
        priority: highestPriorityByDay[h.date],
        isHoliday: true,
      };
    });
    
    // Marcar dias com tarefas com borda circular
    filteredTasks.forEach((task: any) => {
      const dateObj = parseDueDate(task.dueDate);
      if (!dateObj) return;
      
      const taskDate = new Date(dateObj);
      taskDate.setHours(0, 0, 0, 0);
      
      // Obter cor da categoria da tarefa
      const categoryConfig = CATEGORY_COLORS[task.category as keyof typeof CATEGORY_COLORS];
      const categoryColor = categoryConfig?.color || '#4CAF50';
      
      // Determinar a cor baseado no status da tarefa
      let taskColor: string;
      
      if (task.completed) {
        // Verificar se foi completada no prazo ou vencida
        const completedDate = parseDueDate(task.completedAt);
        
        if (completedDate) {
          const completedDateOnly = new Date(completedDate);
          completedDateOnly.setHours(0, 0, 0, 0);
          
          // Verde: completada no prazo, Laranja: completada vencida
          taskColor = completedDateOnly <= taskDate ? '#4CAF50' : '#FF9800';
        } else {
          taskColor = '#4CAF50';
        }
      } else {
        // Tarefa não completada - usar cor da categoria ou vermelho se vencida
        const isOverdue = taskDate < todayDate;
        taskColor = isOverdue ? APP_COLORS.status.error : categoryColor;
      }
      
      const taskYmd = formatDateKey(dateObj);
      const existingMarker = map[taskYmd];
      
      if (existingMarker?.isHoliday) {
        // Dia já tem feriado, manter background azul do feriado e adicionar borda da tarefa
        map[taskYmd] = {
          customStyles: {
            container: {
              borderWidth: 2,
              borderColor: taskColor,
              borderRadius: 20,
              backgroundColor: 'rgba(33, 150, 243, 0.2)',
            },
            text: {
              color: colors.textPrimary,
              fontWeight: 'bold',
            },
          },
          taskCount: taskCountByDay[taskYmd] || 0,
          hasRecurring: hasRecurringByDay[taskYmd] || false,
          priority: highestPriorityByDay[taskYmd],
          isHoliday: true,
        };
      } else if (!existingMarker) {
        // Dia com tarefa mas sem marcação anterior
        map[taskYmd] = {
          customStyles: {
            container: {
              borderWidth: 2,
              borderColor: taskColor,
              borderRadius: 20,
            },
            text: {
              color: colors.textPrimary,
              fontWeight: '500',
            },
          },
          taskCount: taskCountByDay[taskYmd] || 0,
          hasRecurring: hasRecurringByDay[taskYmd] || false,
          priority: highestPriorityByDay[taskYmd],
          isHoliday: false,
        };
      }
    });
    
    // Marcar dia de hoje com background na mesma cor da borda (se tiver evento) ou azul primary
    const todayYmd = formatDateKey(new Date());
    const existingStyle = map[todayYmd]?.customStyles || {};
    
    // Se já existe uma marcação no dia de hoje
    if (map[todayYmd] && existingStyle.container?.borderColor) {
      const borderColor = existingStyle.container.borderColor;
      map[todayYmd] = {
        ...map[todayYmd],
        customStyles: {
          container: {
            ...existingStyle.container,
            backgroundColor: borderColor,
            borderRadius: 20,
          },
          text: {
            color: '#fff',
            fontWeight: 'bold',
          },
        },
      };
    } else {
      // Se não tem evento no dia de hoje, marcar com background azul primary
      map[todayYmd] = {
        customStyles: {
          container: {
            backgroundColor: APP_COLORS.primary.main,
            borderRadius: 20,
          },
          text: {
            color: '#fff',
            fontWeight: 'bold',
          },
        },
        taskCount: taskCountByDay[todayYmd] || 0,
        hasRecurring: hasRecurringByDay[todayYmd] || false,
        priority: highestPriorityByDay[todayYmd],
        isHoliday: false,
      };
    }
    
    return map;
  }, [calendarMonth, filteredTasks, colors, todayDate, taskCountByDay, hasRecurringByDay, highestPriorityByDay]);

  // Lista de feriados do mês atual do calendário
  const monthHolidays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2,'0')}`;
    const holidays = getBrazilHolidays(year);
    return holidays.filter(h => h.date.startsWith(monthStr));
  }, [calendarMonth]);

  // Lista de tarefas do mês atual (filtradas)
  const monthTasks = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    
    return filteredTasks.filter((task: any) => {
      const dateObj = parseDueDate(task.dueDate);
      if (!dateObj) return false;
      
      // Do mês atual
      const isCurrentMonth = dateObj.getFullYear() === year && dateObj.getMonth() + 1 === month;
      return isCurrentMonth;
    }).sort((a: any, b: any) => {
      const dateA = parseDueDate(a.dueDate);
      const dateB = parseDueDate(b.dueDate);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
  }, [calendarMonth, filteredTasks]);

  // Tarefas do dia selecionado com informações adicionais
  const selectedDayTasks = useMemo(() => {
    if (!selectedDate) return [];
    
    return filteredTasks.filter((task: any) => {
      const dateObj = parseDueDate(task.dueDate);
      if (!dateObj) return false;
      return formatDateKey(dateObj) === selectedDate;
    }).map((task: any) => {
      const dateObj = parseDueDate(task.dueDate);
      const time = dateObj ? formatTime(dateObj) : undefined;
      const repeatConfig = getRepeat(task);
      const isRecurring = repeatConfig.type !== RepeatType.NONE;
      const categoryConfig = CATEGORY_COLORS[task.category as keyof typeof CATEGORY_COLORS];
      
      return {
        ...task,
        formattedTime: time,
        isRecurring,
        repeatType: repeatConfig.type,
        categoryColor: categoryConfig?.color || '#4CAF50',
        categoryIcon: categoryConfig?.icon || 'checkbox-blank-circle',
      };
    }).sort((a: any, b: any) => {
      // Ordenar por horário
      const dateA = parseDueDate(a.dueDate);
      const dateB = parseDueDate(b.dueDate);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
  }, [selectedDate, filteredTasks]);

  // Callback para selecionar um dia
  const handleDayPress = useCallback((day: { dateString: string }) => {
    setSelectedDate(prev => prev === day.dateString ? null : day.dateString);
  }, []);

  return { 
    markedDates, 
    monthHolidays, 
    monthTasks,
    filteredTasks,
    taskCountByDay,
    hasRecurringByDay,
    highestPriorityByDay,
    selectedDate,
    setSelectedDate,
    selectedDayTasks,
    handleDayPress,
  };
};

