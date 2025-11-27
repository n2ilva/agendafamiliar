import React, { useState, useEffect } from 'react';
import { Modal, View, Text, ScrollView, Pressable } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useTheme } from '../../contexts/theme.context';
import { getHeaderStyles } from '../header/header.styles';
import { useCalendarLogic } from '../../hooks/use-calendar';
import { APP_COLORS } from '../../constants/colors';

const THEME = {
    primary: APP_COLORS.primary.main,
    danger: APP_COLORS.status.error,
    success: APP_COLORS.status.success,
    warning: APP_COLORS.status.warning,
    textPrimary: APP_COLORS.text.primary,
    textSecondary: APP_COLORS.text.secondary,
};

// Configuração do Locale PT-BR
LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  tasks: any[];
  onDaySelect?: (date: Date) => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  onClose,
  tasks,
  onDaySelect,
}) => {
  const { colors, themeMode } = useTheme();
  const styles = getHeaderStyles(colors);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  const { markedDates, monthHolidays, monthTasks } = useCalendarLogic(calendarMonth, tasks, colors);

  // Reset month when opening modal
  useEffect(() => {
    if (visible) {
      setCalendarMonth(new Date());
    }
  }, [visible]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.calendarCenterOverlay}>
        {/* Overlay para fechar ao clicar fora */}
        <Pressable style={styles.fullscreenOverlay} onPress={onClose} />

        <View style={styles.calendarModalCard}>
          <Calendar
            current={calendarMonth.toISOString().slice(0,10)}
            onMonthChange={(m:any) => {
              const d = new Date(m.year, m.month - 1, 1);
              setCalendarMonth(d);
            }}
            onDayPress={(day:any) => {
              onClose();
              if (onDaySelect) {
                const parts = day.dateString.split('-');
                const selected = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                onDaySelect(selected);
              }
            }}
            markedDates={markedDates}
            markingType={'custom'}
            enableSwipeMonths={true}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.textSecondary,
              selectedDayBackgroundColor: APP_COLORS.primary.main,
              selectedDayTextColor: '#ffffff',
              todayTextColor: APP_COLORS.primary.main,
              dayTextColor: colors.textPrimary,
              textDisabledColor: themeMode === 'dark' ? '#555' : '#C0C0C0',
              monthTextColor: colors.textPrimary,
              indicatorColor: APP_COLORS.primary.main,
              arrowColor: APP_COLORS.primary.main,
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12,
            }}
          />
          <ScrollView 
            style={styles.eventsScrollContainer}
            contentContainerStyle={{ padding: 12 }}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.holidayListContainer}>
              {/* Legenda de cores */}
              <View style={styles.legendContainer}>
                <Text style={styles.legendTitle}>Legenda:</Text>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.legendText}>Tarefa futura ou completada no prazo</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                  <Text style={styles.legendText}>Tarefa completada com atraso</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: APP_COLORS.status.error }]} />
                  <Text style={styles.legendText}>Tarefa vencida não completada</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
                  <Text style={styles.legendText}>Feriado</Text>
                </View>
              </View>
              
              {monthHolidays.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.sectionTitle}>🎉 Feriados</Text>
                  {monthHolidays.map(h => {
                    const [y, m, d] = h.date.split('-');
                    const ddmm = `${d}/${m}`;
                    return (
                      <View key={h.date} style={styles.eventCard}>
                        <View style={[styles.eventIndicator, { backgroundColor: '#2196F3' }]} />
                        <View style={styles.eventContent}>
                          <Text style={styles.eventDate}>{ddmm}</Text>
                          <Text style={styles.eventTitle}>{h.name}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
              {monthTasks.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>📋 Tarefas</Text>
                  {monthTasks.map((task: any) => {
                    let dateObj: Date | undefined;
                    if (task.dueDate instanceof Date) {
                      dateObj = task.dueDate;
                    } else if (task.dueDate.toDate && typeof task.dueDate.toDate === 'function') {
                      dateObj = task.dueDate.toDate();
                    } else if (typeof task.dueDate === 'string' || typeof task.dueDate === 'number') {
                      dateObj = new Date(task.dueDate);
                    }
                    if (dateObj && !isNaN(dateObj.getTime())) {
                      const ddmm = `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}`;
                      const taskColor = '#4CAF50'; // Verde para tarefas futuras
                      return (
                        <View key={task.id} style={styles.eventCard}>
                          <View style={[styles.eventIndicator, { backgroundColor: taskColor }]} />
                          <View style={styles.eventContent}>
                            <Text style={styles.eventDate}>{ddmm}</Text>
                            <Text style={styles.eventTitle}>{task.title}</Text>
                          </View>
                        </View>
                      );
                    }
                    return null;
                  })}
                </View>
              )}
              {monthHolidays.length === 0 && monthTasks.length === 0 && (
                <Text style={styles.holidayListEmpty}>Nenhum feriado ou tarefa neste mês.</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

