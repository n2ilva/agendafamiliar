import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const DateTimePickerModal = ({ visible, onClose, onSave, initialDate, initialTime }) => {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [selectedTime, setSelectedTime] = useState(initialTime || new Date());
  const [activeTab, setActiveTab] = useState('date'); // 'date' ou 'time'

  const generateCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Dias do mês anterior
    for (let i = firstDayWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        day: prevDate.getDate(),
        isCurrentMonth: false,
        date: prevDate,
      });
    }
    
    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        day: i,
        isCurrentMonth: true,
        date,
        isToday: new Date().toDateString() === date.toDateString(),
        isSelected: selectedDate.toDateString() === date.toDateString(),
      });
    }
    
    // Completar com dias do próximo mês
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        day: i,
        isCurrentMonth: false,
        date: nextDate,
      });
    }
    
    return days;
  };

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const selectDay = (day) => {
    if (day.isCurrentMonth) {
      setSelectedDate(day.date);
    }
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const date = new Date();
        date.setHours(hour, minute, 0, 0);
        times.push({ label: timeStr, value: date });
      }
    }
    return times;
  };

  const handleSave = () => {
    // Combinar data e hora
    const combined = new Date(selectedDate);
    combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    onSave(combined);
    onClose();
  };

  const renderCalendar = () => (
    <View style={styles.calendarContainer}>
      {/* Header do calendário */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => navigateMonth(-1)}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.monthYear}>
          {months[selectedDate.getMonth()]} {selectedDate.getFullYear()}
        </Text>
        <TouchableOpacity onPress={() => navigateMonth(1)}>
          <Ionicons name="chevron-forward" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Dias da semana */}
      <View style={styles.weekDaysRow}>
        {weekDays.map((day, index) => (
          <Text key={index} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>

      {/* Grid de dias */}
      <View style={styles.daysGrid}>
        {generateCalendar().map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayButton,
              !day.isCurrentMonth && styles.dayButtonInactive,
              day.isToday && styles.dayButtonToday,
              day.isSelected && styles.dayButtonSelected,
            ]}
            onPress={() => selectDay(day)}
          >
            <Text
              style={[
                styles.dayText,
                !day.isCurrentMonth && styles.dayTextInactive,
                day.isToday && styles.dayTextToday,
                day.isSelected && styles.dayTextSelected,
              ]}
            >
              {day.day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTimePicker = () => (
    <View style={styles.timeContainer}>
      <Text style={styles.timeLabel}>Selecione o horário:</Text>
      <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
        {generateTimeOptions().map((time, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.timeOption,
              selectedTime.getHours() === time.value.getHours() &&
              selectedTime.getMinutes() === time.value.getMinutes() &&
              styles.timeOptionSelected,
            ]}
            onPress={() => setSelectedTime(time.value)}
          >
            <Text
              style={[
                styles.timeOptionText,
                selectedTime.getHours() === time.value.getHours() &&
                selectedTime.getMinutes() === time.value.getMinutes() &&
                styles.timeOptionTextSelected,
              ]}
            >
              {time.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Selecionar Data e Hora</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>Salvar</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'date' && styles.activeTab]}
              onPress={() => setActiveTab('date')}
            >
              <Ionicons name="calendar" size={20} color={activeTab === 'date' ? '#007AFF' : '#666'} />
              <Text style={[styles.tabText, activeTab === 'date' && styles.activeTabText]}>
                Data
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'time' && styles.activeTab]}
              onPress={() => setActiveTab('time')}
            >
              <Ionicons name="time" size={20} color={activeTab === 'time' ? '#007AFF' : '#666'} />
              <Text style={[styles.tabText, activeTab === 'time' && styles.activeTabText]}>
                Hora
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conteúdo */}
          {activeTab === 'date' ? renderCalendar() : renderTimePicker()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 15,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    color: '#666',
    fontSize: 16,
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 16,
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  calendarContainer: {
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDay: {
    width: 40,
    textAlign: 'center',
    color: '#666',
    fontWeight: '500',
    fontSize: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    width: `${100/7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  dayButtonInactive: {
    opacity: 0.3,
  },
  dayButtonToday: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  dayButtonSelected: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  dayTextInactive: {
    color: '#999',
  },
  dayTextToday: {
    color: '#007AFF',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  timeContainer: {
    padding: 20,
    maxHeight: 300,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 15,
    color: '#333',
  },
  timeScrollView: {
    maxHeight: 200,
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 5,
  },
  timeOptionSelected: {
    backgroundColor: '#007AFF',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  timeOptionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
});

export default DateTimePickerModal;