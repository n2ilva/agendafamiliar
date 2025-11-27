import React, { useState, useEffect } from 'react';
import { Modal, View, Text, ScrollView, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme.context';
import { getHeaderStyles } from '../header/header.styles';
import { useCalendarLogic, CalendarFilter } from '../../hooks/use-calendar';
import { APP_COLORS, CATEGORY_COLORS } from '../../constants/colors';
import { RepeatType } from '../../types/family.types';

// Configuração do Locale PT-BR
LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

// Tipo para nomes de ícones do MaterialCommunityIcons
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Labels e cores dos filtros
const FILTER_OPTIONS: { key: CalendarFilter; label: string; icon: IconName; color: string }[] = [
  { key: 'all', label: 'Todas', icon: 'format-list-bulleted', color: APP_COLORS.primary.main },
  { key: 'pending', label: 'Pendentes', icon: 'clock-outline', color: '#4CAF50' },
  { key: 'completed', label: 'Concluídas', icon: 'check-circle', color: '#2196F3' },
  { key: 'overdue', label: 'Vencidas', icon: 'alert-circle', color: APP_COLORS.status.error },
];

// Helper para label de recorrência
const getRepeatLabel = (type: RepeatType): string => {
  switch (type) {
    case RepeatType.DAILY: return 'Diário';
    case RepeatType.WEEKENDS: return 'Fins de semana';
    case RepeatType.MONTHLY: return 'Mensal';
    case RepeatType.YEARLY: return 'Anual';
    case RepeatType.BIWEEKLY: return 'Quinzenal';
    case RepeatType.INTERVAL: return 'Intervalo';
    case RepeatType.CUSTOM: return 'Personalizado';
    default: return '';
  }
};

// Helper para ícone de prioridade
const getPriorityIcon = (priority?: string): { icon: IconName; color: string } | null => {
  switch (priority) {
    case 'high': return { icon: 'arrow-up-bold', color: APP_COLORS.status.error };
    case 'medium': return { icon: 'minus', color: '#FF9800' };
    case 'low': return { icon: 'arrow-down-bold', color: '#4CAF50' };
    default: return null;
  }
};

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
  const localStyles = getLocalStyles(colors);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [filter, setFilter] = useState<CalendarFilter>('all');
  
  // Estados de expansão das seções (minimizado por padrão)
  const [expandedSections, setExpandedSections] = useState<{
    pending: boolean;
    overdue: boolean;
    completed: boolean;
  }>({
    pending: false,
    overdue: false,
    completed: false,
  });
  
  const { 
    markedDates, 
    monthHolidays, 
    monthTasks,
    selectedDate,
    selectedDayTasks,
    handleDayPress,
    taskCountByDay,
    hasRecurringByDay,
  } = useCalendarLogic(calendarMonth, tasks, colors, filter);

  // Reset month and filter when opening modal
  useEffect(() => {
    if (visible) {
      setCalendarMonth(new Date());
      setFilter('all');
      setExpandedSections({ pending: false, overdue: false, completed: false });
    }
  }, [visible]);

  // Toggle expansão de uma seção
  const toggleSection = (section: 'pending' | 'overdue' | 'completed') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Renderizar filtros
  const renderFilters = () => (
    <View style={localStyles.filterContainer}>
      {FILTER_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[
            localStyles.filterButton,
            filter === opt.key && { backgroundColor: opt.color + '20', borderColor: opt.color },
          ]}
          onPress={() => setFilter(opt.key)}
        >
          <MaterialCommunityIcons 
            name={opt.icon} 
            size={14} 
            color={filter === opt.key ? opt.color : colors.textSecondary} 
          />
          <Text 
            style={[
              localStyles.filterText, 
              filter === opt.key && { color: opt.color, fontWeight: '600' }
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Renderizar tarefa do dia selecionado
  const renderSelectedDayTask = (task: any) => {
    const priorityInfo = getPriorityIcon(task.priority);
    const repeatLabel = task.isRecurring ? getRepeatLabel(task.repeatType) : null;
    
    return (
      <View key={task.id} style={localStyles.taskDetailCard}>
        <View style={[localStyles.taskColorBar, { backgroundColor: task.categoryColor }]} />
        <View style={localStyles.taskDetailContent}>
          <View style={localStyles.taskDetailHeader}>
            <View style={localStyles.taskTitleRow}>
              {task.formattedTime && task.formattedTime !== '00:00' && (
                <View style={localStyles.timeContainer}>
                  <MaterialCommunityIcons name="clock-outline" size={12} color={colors.textSecondary} />
                  <Text style={localStyles.timeText}>{task.formattedTime}</Text>
                </View>
              )}
              {priorityInfo && (
                <MaterialCommunityIcons name={priorityInfo.icon} size={14} color={priorityInfo.color} style={{ marginLeft: 6 }} />
              )}
              {task.isRecurring && (
                <MaterialCommunityIcons name="repeat" size={14} color={APP_COLORS.primary.main} style={{ marginLeft: 6 }} />
              )}
            </View>
            {task.completed && (
              <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
            )}
          </View>
          <Text style={[
            localStyles.taskDetailTitle,
            task.completed && localStyles.taskCompleted
          ]}>
            {task.title}
          </Text>
          <View style={localStyles.taskMetaRow}>
            <View style={localStyles.categoryBadge}>
              <MaterialCommunityIcons name={task.categoryIcon} size={12} color={task.categoryColor} />
              <Text style={[localStyles.categoryText, { color: task.categoryColor }]}>
                {CATEGORY_COLORS[task.category as keyof typeof CATEGORY_COLORS]?.label || task.category}
              </Text>
            </View>
            {repeatLabel && (
              <View style={localStyles.repeatBadge}>
                <MaterialCommunityIcons name="repeat" size={10} color={APP_COLORS.primary.main} />
                <Text style={localStyles.repeatBadgeText}>{repeatLabel}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Formatar data selecionada
  const formatSelectedDate = () => {
    if (!selectedDate) return '';
    const [year, month, day] = selectedDate.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const weekDay = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][date.getDay()];
    return `${weekDay}, ${day}/${month}`;
  };

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
          {/* Filtros de status */}
          {renderFilters()}
          
          <Calendar
            current={calendarMonth.toISOString().slice(0,10)}
            onMonthChange={(m:any) => {
              const d = new Date(m.year, m.month - 1, 1);
              setCalendarMonth(d);
            }}
            onDayPress={(day:any) => {
              handleDayPress(day);
              // Se já está selecionado, permite navegar
              if (selectedDate === day.dateString && onDaySelect) {
                onClose();
                const parts = day.dateString.split('-');
                const selected = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                onDaySelect(selected);
              }
            }}
            dayComponent={({ date, state, marking }: any) => {
              const isSelected = selectedDate === date?.dateString;
              const count = taskCountByDay[date?.dateString] || 0;
              const hasRecurring = hasRecurringByDay[date?.dateString] || false;
              const customStyles = marking?.customStyles || {};
              
              return (
                <TouchableOpacity
                  onPress={() => handleDayPress(date)}
                  style={[
                    localStyles.dayContainer,
                    customStyles.container,
                    isSelected && localStyles.selectedDay,
                  ]}
                >
                  <Text style={[
                    localStyles.dayText,
                    customStyles.text,
                    state === 'disabled' && localStyles.disabledText,
                    isSelected && localStyles.selectedDayText,
                  ]}>
                    {date?.day}
                  </Text>
                  {/* Indicadores abaixo do número */}
                  <View style={localStyles.dayIndicators}>
                    {count > 0 && (
                      <View style={localStyles.countBadge}>
                        <Text style={localStyles.countText}>{count > 9 ? '9+' : count}</Text>
                      </View>
                    )}
                    {hasRecurring && (
                      <MaterialCommunityIcons name="repeat" size={8} color={APP_COLORS.primary.main} />
                    )}
                  </View>
                </TouchableOpacity>
              );
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
              {/* Dia selecionado com detalhes */}
              {selectedDate && (
                <View style={localStyles.selectedDaySection}>
                  <Text style={localStyles.selectedDayTitle}>
                    📅 {formatSelectedDate()}
                  </Text>
                  {selectedDayTasks.length > 0 ? (
                    selectedDayTasks.map(renderSelectedDayTask)
                  ) : (
                    <Text style={localStyles.noTasksText}>Nenhuma tarefa neste dia</Text>
                  )}
                  <TouchableOpacity 
                    style={localStyles.viewAllButton}
                    onPress={() => {
                      if (onDaySelect) {
                        onClose();
                        const parts = selectedDate.split('-');
                        const selected = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                        onDaySelect(selected);
                      }
                    }}
                  >
                    <Text style={localStyles.viewAllButtonText}>Ver todas as tarefas</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={APP_COLORS.primary.main} />
                  </TouchableOpacity>
                </View>
              )}
              
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
              {monthTasks.length > 0 && !selectedDate && (
                <View>
                  <Text style={styles.sectionTitle}>📋 Tarefas do Mês</Text>
                  
                  {/* Separar tarefas por status */}
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Obter mês/ano do calendário para filtrar concluídas
                    const calendarYear = calendarMonth.getFullYear();
                    const calendarMonthNum = calendarMonth.getMonth();
                    
                    // Função helper para parsear data
                    const parseDate = (dueDate: any): Date | undefined => {
                      if (dueDate instanceof Date) return dueDate;
                      if (dueDate?.toDate) return dueDate.toDate();
                      if (typeof dueDate === 'string' || typeof dueDate === 'number') return new Date(dueDate);
                      return undefined;
                    };
                    
                    // Pendentes: não concluídas E com data >= hoje
                    const pendingTasks = monthTasks.filter((t: any) => {
                      if (t.completed) return false;
                      const d = parseDate(t.dueDate);
                      if (!d) return false;
                      const taskDate = new Date(d);
                      taskDate.setHours(0, 0, 0, 0);
                      return taskDate >= today;
                    });
                    
                    // Vencidas: não concluídas E com data < hoje
                    const overdueTasks = monthTasks.filter((t: any) => {
                      // Só tarefas NÃO concluídas podem estar vencidas
                      if (t.completed) return false;
                      const d = parseDate(t.dueDate);
                      if (!d) return false;
                      const taskDate = new Date(d);
                      taskDate.setHours(0, 0, 0, 0);
                      return taskDate < today;
                    });
                    
                    // Concluídas: somente tarefas concluídas NO mês selecionado do calendário
                    // (baseado na data de conclusão, não na data de vencimento)
                    const completedTasks = monthTasks.filter((t: any) => {
                      if (!t.completed) return false;
                      
                      // Verificar se foi concluída no mês do calendário
                      const completedAt = parseDate(t.completedAt);
                      if (completedAt) {
                        // Se tem completedAt, verificar se está no mês do calendário
                        return completedAt.getFullYear() === calendarYear && 
                               completedAt.getMonth() === calendarMonthNum;
                      }
                      
                      // Se não tem completedAt, usar dueDate como fallback
                      // (tarefas antigas que foram concluídas mas sem registro de quando)
                      const dueDate = parseDate(t.dueDate);
                      if (dueDate) {
                        return dueDate.getFullYear() === calendarYear && 
                               dueDate.getMonth() === calendarMonthNum;
                      }
                      
                      return false;
                    });
                    
                    // Função para renderizar uma tarefa
                    const renderTask = (task: any) => {
                      const dateObj = parseDate(task.dueDate);
                      if (!dateObj || isNaN(dateObj.getTime())) return null;
                      
                      const ddmm = `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}`;
                      const time = `${String(dateObj.getHours()).padStart(2,'0')}:${String(dateObj.getMinutes()).padStart(2,'0')}`;
                      const categoryConfig = CATEGORY_COLORS[task.category as keyof typeof CATEGORY_COLORS];
                      const taskColor = categoryConfig?.color || '#4CAF50';
                      const priorityInfo = getPriorityIcon(task.priority);
                      
                      return (
                        <View key={task.id} style={styles.eventCard}>
                          <View style={[styles.eventIndicator, { backgroundColor: taskColor }]} />
                          <View style={styles.eventContent}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={styles.eventDate}>{ddmm}</Text>
                              {time !== '00:00' && (
                                <Text style={[styles.eventDate, { marginLeft: 4 }]}>{time}</Text>
                              )}
                              {priorityInfo && (
                                <MaterialCommunityIcons name={priorityInfo.icon} size={12} color={priorityInfo.color} style={{ marginLeft: 4 }} />
                              )}
                            </View>
                            <Text style={[
                              styles.eventTitle,
                              task.completed && { textDecorationLine: 'line-through', opacity: 0.6 }
                            ]}>
                              {task.title}
                            </Text>
                          </View>
                        </View>
                      );
                    };
                    
                    return (
                      <>
                        {/* Pendentes (em primeiro) */}
                        {pendingTasks.length > 0 && (
                          <View style={localStyles.taskSection}>
                            <TouchableOpacity 
                              style={localStyles.taskSectionHeader}
                              onPress={() => toggleSection('pending')}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons name="clock-outline" size={16} color="#4CAF50" />
                              <Text style={[localStyles.taskSectionTitle, { color: '#4CAF50', flex: 1 }]}>
                                Pendentes ({pendingTasks.length})
                              </Text>
                              <MaterialCommunityIcons 
                                name={expandedSections.pending ? 'chevron-up' : 'chevron-down'} 
                                size={20} 
                                color="#4CAF50" 
                              />
                            </TouchableOpacity>
                            {expandedSections.pending && (
                              <>
                                {pendingTasks.slice(0, 10).map(renderTask)}
                                {pendingTasks.length > 10 && (
                                  <Text style={localStyles.moreTasksText}>+ {pendingTasks.length - 10} outras</Text>
                                )}
                              </>
                            )}
                          </View>
                        )}
                        
                        {/* Vencidas */}
                        {overdueTasks.length > 0 && (
                          <View style={localStyles.taskSection}>
                            <TouchableOpacity 
                              style={localStyles.taskSectionHeader}
                              onPress={() => toggleSection('overdue')}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons name="alert-circle" size={16} color={APP_COLORS.status.error} />
                              <Text style={[localStyles.taskSectionTitle, { color: APP_COLORS.status.error, flex: 1 }]}>
                                Vencidas ({overdueTasks.length})
                              </Text>
                              <MaterialCommunityIcons 
                                name={expandedSections.overdue ? 'chevron-up' : 'chevron-down'} 
                                size={20} 
                                color={APP_COLORS.status.error} 
                              />
                            </TouchableOpacity>
                            {expandedSections.overdue && (
                              <>
                                {overdueTasks.slice(0, 10).map(renderTask)}
                                {overdueTasks.length > 10 && (
                                  <Text style={localStyles.moreTasksText}>+ {overdueTasks.length - 10} outras</Text>
                                )}
                              </>
                            )}
                          </View>
                        )}
                        
                        {/* Concluídas */}
                        {completedTasks.length > 0 && (
                          <View style={localStyles.taskSection}>
                            <TouchableOpacity 
                              style={localStyles.taskSectionHeader}
                              onPress={() => toggleSection('completed')}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons name="check-circle" size={16} color="#2196F3" />
                              <Text style={[localStyles.taskSectionTitle, { color: '#2196F3', flex: 1 }]}>
                                Concluídas ({completedTasks.length})
                              </Text>
                              <MaterialCommunityIcons 
                                name={expandedSections.completed ? 'chevron-up' : 'chevron-down'} 
                                size={20} 
                                color="#2196F3" 
                              />
                            </TouchableOpacity>
                            {expandedSections.completed && (
                              <>
                                {completedTasks.slice(0, 10).map(renderTask)}
                                {completedTasks.length > 10 && (
                                  <Text style={localStyles.moreTasksText}>+ {completedTasks.length - 10} outras</Text>
                                )}
                              </>
                            )}
                          </View>
                        )}
                      </>
                    );
                  })()}
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

// Estilos locais do CalendarModal
const getLocalStyles = (colors: any) => StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterText: {
    fontSize: 11,
    marginLeft: 4,
    color: colors.textSecondary,
  },
  dayContainer: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  dayText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  disabledText: {
    color: colors.textSecondary,
    opacity: 0.4,
  },
  selectedDay: {
    backgroundColor: APP_COLORS.primary.main + '30',
    borderRadius: 8,
  },
  selectedDayText: {
    color: APP_COLORS.primary.main,
    fontWeight: 'bold',
  },
  dayIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  countBadge: {
    backgroundColor: APP_COLORS.primary.main,
    borderRadius: 6,
    minWidth: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  countText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  selectedDaySection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.primary.main + '40',
  },
  selectedDayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  taskDetailCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  taskColorBar: {
    width: 4,
  },
  taskDetailContent: {
    flex: 1,
    padding: 10,
  },
  taskDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 3,
  },
  taskDetailTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary.main + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  repeatBadgeText: {
    fontSize: 10,
    color: APP_COLORS.primary.main,
    fontWeight: '500',
  },
  noTasksText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewAllButtonText: {
    color: APP_COLORS.primary.main,
    fontSize: 13,
    fontWeight: '600',
  },
  moreTasksText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  taskSection: {
    marginBottom: 16,
  },
  taskSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 6,
  },
  taskSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
});

