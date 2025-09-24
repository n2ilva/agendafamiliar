import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from './DateTimePickerModal';

const weekDays = [
  { key: 'dom', label: 'D' },
  { key: 'seg', label: 'S' },
  { key: 'ter', label: 'T' },
  { key: 'qua', label: 'Q' },
  { key: 'qui', label: 'Q' },
  { key: 'sex', label: 'S' },
  { key: 'sab', label: 'S' },
];

export default function TaskModal({ visible, onClose, onSave, task, categories = [] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [category, setCategory] = useState('');
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [repeat, setRepeat] = useState('never'); // never, daily, weekly
  const [selectedWeekDays, setSelectedWeekDays] = useState([]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setDate(task.dueDate ? new Date(task.dueDate) : new Date());
      setTime(task.dueDate ? new Date(task.dueDate) : new Date());
      setCategory(task.category);
      setRepeat(task.repeat || 'never');
      setSelectedWeekDays(task.repeatDays || []);
    } else {
      setTitle('');
      setDescription('');
      const now = new Date();
      setDate(now);
      setTime(now);
      setCategory(categories[0]?.id || '');
      setRepeat('never');
      setSelectedWeekDays([]);
    }
  }, [task, visible, categories]);

  const handleSave = () => {
    const combinedDateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes()
    );

    onSave({ 
      ...task, 
      title, 
      description, 
      dueDate: combinedDateTime.toISOString(), 
      category,
      repeat,
      repeatDays: repeat === 'weekly' ? selectedWeekDays : [],
    });
    onClose();
  };

  const handleDateTimeSave = (selectedDateTime) => {
    setDate(selectedDateTime);
    setTime(selectedDateTime);
  };

  const toggleWeekDay = (day) => {
    if (selectedWeekDays.includes(day)) {
      setSelectedWeekDays(selectedWeekDays.filter(d => d !== day));
    } else {
      setSelectedWeekDays([...selectedWeekDays, day]);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Salvar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.titleInput}
              placeholder="Nome da Tarefa"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.descriptionInput}
              placeholder="Descrição"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <Text style={styles.label}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={[
                  styles.categoryChip, 
                  { backgroundColor: category === cat.id ? cat.color : '#f0f0f0' }
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons 
                  name={cat.icon} 
                  size={16} 
                  color={category === cat.id ? cat.textColor : '#666'} 
                  style={styles.categoryChipIcon}
                />
                <Text style={[
                  styles.categoryChipText, 
                  { color: category === cat.id ? cat.textColor : '#666' }
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Data e Horário</Text>
          <TouchableOpacity 
            style={styles.dateTimeButton} 
            onPress={() => setShowDateTimeModal(true)}
          >
            <View style={styles.dateTimeContent}>
              <View style={styles.dateSection}>
                <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                <Text style={styles.dateText}>
                  {date.toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <View style={styles.timeSection}>
                <Ionicons name="time-outline" size={20} color="#007AFF" />
                <Text style={styles.timeText}>
                  {time.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <Text style={styles.label}>Repetir</Text>
          <View style={styles.repeatContainer}>
            <TouchableOpacity 
              style={[styles.repeatButton, repeat === 'never' && styles.activeRepeatButton]}
              onPress={() => setRepeat('never')}
            >
              <Text style={[styles.repeatButtonText, repeat === 'never' && styles.activeRepeatButtonText]}>Não Repetir</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.repeatButton, repeat === 'daily' && styles.activeRepeatButton]}
              onPress={() => setRepeat('daily')}
            >
              <Text style={[styles.repeatButtonText, repeat === 'daily' && styles.activeRepeatButtonText]}>Todos os dias</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.repeatButton, repeat === 'weekly' && styles.activeRepeatButton]}
              onPress={() => setRepeat('weekly')}
            >
              <Text style={[styles.repeatButtonText, repeat === 'weekly' && styles.activeRepeatButtonText]}>Semanalmente</Text>
            </TouchableOpacity>
          </View>

          {repeat === 'weekly' && (
            <View style={styles.weekDaySelector}>
              {weekDays.map(day => (
                <TouchableOpacity 
                  key={day.key}
                  style={[styles.weekDayButton, selectedWeekDays.includes(day.key) && styles.activeWeekDayButton]}
                  onPress={() => toggleWeekDay(day.key)}
                >
                  <Text style={[styles.weekDayText, selectedWeekDays.includes(day.key) && styles.activeWeekDayText]}>{day.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
      
      <DateTimePickerModal
        visible={showDateTimeModal}
        onClose={() => setShowDateTimeModal(false)}
        onSave={handleDateTimeSave}
        initialDate={date}
        initialTime={time}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  cancelButton: {
    fontSize: 16,
    color: '#FF3B30',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    paddingHorizontal: 20,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '500',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  descriptionInput: {
    fontSize: 16,
    paddingTop: 10,
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  categorySelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeCategoryChip: {
    backgroundColor: '#007AFF',
  },
  categoryIcon: {
    marginRight: 5,
  },
  categoryChipText: {
    color: '#333',
    fontWeight: '500',
  },
  activeCategoryChipText: {
    color: '#fff',
  },
  dateTimeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  dateTimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 20,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    fontWeight: '500',
  },
  repeatContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  repeatButton: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    width: '32%',
    alignItems: 'center',
  },
  activeRepeatButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  repeatButtonText: {
    fontWeight: '500',
  },
  activeRepeatButtonText: {
    color: '#fff',
  },
  weekDaySelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  weekDayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  activeWeekDayButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  weekDayText: {
    fontWeight: '500',
  },
  activeWeekDayText: {
    color: '#fff',
  },
});