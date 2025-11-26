import { useMemo } from 'react';
import { getBrazilHolidays } from '../utils/Holidays';
import { THEME } from '../utils/colors';

export const useCalendarLogic = (calendarMonth: Date, tasks: any[], colors: any) => {
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
            backgroundColor: 'rgba(33, 150, 243, 0.2)', // Background azul apenas para feriados
          },
          text: {
            color: colors.textPrimary,
            fontWeight: '500',
          },
        },
      };
    });
    
    // Marcar dias com tarefas com borda circular (SEM background)
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    tasks.forEach((task: any) => {
      if (!task.dueDate) return;
      
      let dateObj: Date | undefined;
      if (task.dueDate instanceof Date) {
        dateObj = task.dueDate;
      } else if (task.dueDate.toDate && typeof task.dueDate.toDate === 'function') {
        dateObj = task.dueDate.toDate();
      } else if (typeof task.dueDate === 'string' || typeof task.dueDate === 'number') {
        dateObj = new Date(task.dueDate);
      }
      
      if (dateObj && !isNaN(dateObj.getTime())) {
        const taskDate = new Date(dateObj);
        taskDate.setHours(0, 0, 0, 0);
        
        // Determinar a cor baseado no status da tarefa
        let taskColor: string;
        
        if (task.completed) {
          // Verificar se foi completada no prazo ou vencida
          let completedDate: Date | undefined;
          if (task.completedAt) {
            if (task.completedAt instanceof Date) {
              completedDate = task.completedAt;
            } else if (task.completedAt.toDate && typeof task.completedAt.toDate === 'function') {
              completedDate = task.completedAt.toDate();
            } else if (typeof task.completedAt === 'string' || typeof task.completedAt === 'number') {
              completedDate = new Date(task.completedAt);
            }
          }
          
          if (completedDate) {
            const completedDateOnly = new Date(completedDate);
            completedDateOnly.setHours(0, 0, 0, 0);
            
            // Verde: completada no prazo (antes ou na data de vencimento)
            // Laranja: completada vencida (depois da data de vencimento)
            taskColor = completedDateOnly <= taskDate ? '#4CAF50' : '#FF9800';
          } else {
            // Se está marcada como completada mas não tem data, considerar verde
            taskColor = '#4CAF50';
          }
        } else {
          // Tarefa não completada
          const isOverdue = taskDate < todayDate;
          // Vermelho: não completada e vencida
          // Verde: não completada mas ainda não venceu
          taskColor = isOverdue ? THEME.danger : '#4CAF50';
        }
        
        const taskYmd = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
        if (map[taskYmd]) {
          // Dia já tem feriado, manter background azul do feriado e adicionar borda da tarefa
          map[taskYmd] = {
            customStyles: {
              container: {
                borderWidth: 2,
                borderColor: taskColor,
                borderRadius: 20,
                backgroundColor: 'rgba(33, 150, 243, 0.2)', // Manter background azul do feriado
              },
              text: {
                color: colors.textPrimary,
                fontWeight: 'bold',
              },
            },
          };
        } else {
          // Dia com tarefa mas sem feriado - apenas borda, SEM background
          map[taskYmd] = {
            customStyles: {
              container: {
                borderWidth: 2,
                borderColor: taskColor,
                borderRadius: 20,
                // SEM backgroundColor
              },
              text: {
                color: colors.textPrimary,
                fontWeight: '500',
              },
            },
          };
        }
      }
    });
    
    // Marcar dia de hoje com background na mesma cor da borda (se tiver evento) ou azul primary
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const existingStyle = map[ymd]?.customStyles || {};
    
    // Se já existe uma marcação no dia de hoje
    if (map[ymd] && existingStyle.container?.borderColor) {
      const borderColor = existingStyle.container.borderColor;
      map[ymd] = {
        customStyles: {
          container: {
            ...existingStyle.container,
            backgroundColor: borderColor, // Background na mesma cor da borda
            borderRadius: 20,
          },
          text: {
            color: '#fff', // Texto branco para contraste
            fontWeight: 'bold',
          },
        },
      };
    } else {
      // Se não tem evento no dia de hoje, marcar com background azul primary
      map[ymd] = {
        customStyles: {
          container: {
            backgroundColor: THEME.primary,
            borderRadius: 20,
          },
          text: {
            color: '#fff',
            fontWeight: 'bold',
          },
        },
      };
    }
    return map;
  }, [calendarMonth, tasks, colors]);

  // Lista de feriados do mês atual do calendário
  const monthHolidays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2,'0')}`;
    const holidays = getBrazilHolidays(year);
    return holidays.filter(h => h.date.startsWith(monthStr));
  }, [calendarMonth]);

  // Lista de tarefas do mês atual do calendário (apenas tarefas futuras/não vencidas)
  const monthTasks = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    return tasks.filter((task: any) => {
      // Não mostrar tarefas completadas
      if (task.completed) return false;
      
      if (!task.dueDate) return false;
      
      let dateObj: Date | undefined;
      if (task.dueDate instanceof Date) {
        dateObj = task.dueDate;
      } else if (task.dueDate.toDate && typeof task.dueDate.toDate === 'function') {
        dateObj = task.dueDate.toDate();
      } else if (typeof task.dueDate === 'string' || typeof task.dueDate === 'number') {
        dateObj = new Date(task.dueDate);
      }
      
      if (dateObj && !isNaN(dateObj.getTime())) {
        const taskDate = new Date(dateObj);
        taskDate.setHours(0, 0, 0, 0);
        
        // Apenas mostrar tarefas futuras (hoje ou depois)
        const isFutureOrToday = taskDate >= todayDate;
        
        // E do mês atual
        const isCurrentMonth = dateObj.getFullYear() === year && dateObj.getMonth() + 1 === month;
        
        return isFutureOrToday && isCurrentMonth;
      }
      return false;
    }).sort((a: any, b: any) => {
      const dateA = a.dueDate instanceof Date ? a.dueDate : a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
      const dateB = b.dueDate instanceof Date ? b.dueDate : b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate);
      return dateA.getTime() - dateB.getTime();
    });
  }, [calendarMonth, tasks]);

  return { markedDates, monthHolidays, monthTasks };
};
