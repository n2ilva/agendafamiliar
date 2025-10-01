import { Text, View } from '@/components/Themed';
import { useCategories } from '@/context/CategoryContext';
import { useTasks } from '@/context/TaskContext';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Button, Platform, Pressable, StyleSheet, TextInput } from 'react-native';

export default function ModalScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [categoryId, setCategoryId] = useState<string>('');

  const { addTask } = useTasks();
  const { categories } = useCategories();
  const router = useRouter();

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    const currentDate = selectedDate || date;
    setDate(currentDate);
    if (Platform.OS !== 'ios') {
      if (pickerMode === 'date') {
        // Abrir picker de hora após escolher data
        setPickerMode('time');
        setShowPicker(true);
      } else {
        setShowPicker(false);
        setPickerMode('date');
      }
    }
  };

  const handleAddTask = async () => {
    if (!title) {
      Alert.alert('Erro', 'O título da tarefa é obrigatório.');
      return;
    }
    try {
      await addTask({
        title,
        description,
        date: date.toISOString(),
        completed: false,
        categoryId: categoryId || undefined,
      });
      router.back();
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
      Alert.alert('Erro', 'Não foi possível adicionar a tarefa.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adicionar Nova Tarefa</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Título da Tarefa"
        value={title}
        onChangeText={setTitle}
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Descrição (opcional)"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <View style={styles.categoryContainer}>
        <Text style={styles.categoryLabel}>Categoria:</Text>
        <View style={styles.categoryButtons}>
          <Pressable
            key={'none'}
            style={[styles.categoryButton, !categoryId && styles.categoryButtonSelected]}
            onPress={() => setCategoryId('')}
          >
            <Text style={[styles.categoryButtonText, !categoryId && styles.categoryButtonTextSelected]}>Sem</Text>
          </Pressable>
          {categories.map(cat => (
            <Pressable
              key={cat.id}
              style={[styles.categoryButton, categoryId === cat.id && styles.categoryButtonSelected, { borderColor: cat.color, minWidth: 90 }]}
              onPress={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
            >
              <View style={styles.catChipInner}>
                {cat.icon && <MaterialIcons name={cat.icon as any} size={16} color={categoryId === cat.id ? '#fff' : cat.color} style={{marginRight:4}} />}
                <Text style={[styles.categoryButtonText, categoryId === cat.id && styles.categoryButtonTextSelected]} numberOfLines={1}>{cat.name}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.dateContainer}>
        <Text style={styles.dateLabel}>Vencimento (data e hora):</Text>
        {Platform.OS !== 'web' && (
          <Button onPress={() => { setShowPicker(true); setPickerMode('date'); }} title="Selecionar" />
        )}
      </View>

      {showPicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode={pickerMode}
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
      <Text style={styles.dateDisplay}>
        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>

      <Button onPress={handleAddTask} title="Adicionar Tarefa" />

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateLabel: {
    fontSize: 16,
  },
  dateDisplay: {
    fontSize: 16,
    marginBottom: 20,
  },
  categoryContainer: {
    width: '100%',
    marginBottom: 15,
  },
  categoryLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  categoryButtonSelected: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  catChipInner: { flexDirection:'row', alignItems:'center', justifyContent:'center' },
  categoryButtonText: {
    color: '#333',
  },
  categoryButtonTextSelected: {
    color: '#fff',
  },
});
