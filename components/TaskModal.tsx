import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Modal, KeyboardAvoidingView, ScrollView, 
  TextInput, Pressable, Platform, Alert, Keyboard, ActivityIndicator,
  LayoutAnimation
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { v4 as uuidv4 } from 'uuid';

import { 
  FamilyUser, CategoryConfig, Task, Subtask, SubtaskCategory, 
  RepeatType, RepeatConfig 
} from '../types/FamilyTypes';
import { THEME } from '../utils/colors';
import { useTheme } from '../contexts/ThemeContext';
import { 
  formatDate, formatTime, getNextRecurrenceDate 
} from '../utils/DateUtils';
import { 
  repeatConfigToOption, optionToRepeatConfig, getRepeat 
} from '../utils/TaskUtils';
import { CategorySelector } from './CategorySelector';
import { logger } from '../utils/Logger';

// Importar constantes se necessário (AVAILABLE_ICONS etc para CategoryModal se for movido)
// Por enquanto CategoryModal fica aqui ou é importado?
// O plano era extrair TaskModal. Se CategoryModal é usado dentro, deve estar aqui ou importado.
// Vou assumir que CategoryModal será movido para cá ou mantido interno por enquanto.

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  initialTask?: Task | null;
  initialDate?: Date;
  onSave: (taskData: any) => Promise<void>;
  user: FamilyUser;
  categories: CategoryConfig[];
  onAddCategory: () => void; // Callback para abrir modal de categoria (gerenciado pelo pai ou aqui?)
  // Se gerenciado aqui, precisa de lógica de categoria.
  // O código original chama openManagedModal('category').
  // Vou manter a criação de categoria como callback por enquanto para simplificar.
  isAddingTask: boolean; // Loading state do salvamento
}

export const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  onClose,
  initialTask,
  initialDate,
  onSave,
  user,
  categories,
  onAddCategory,
  isAddingTask
}) => {
  const { colors } = useTheme();
  
  // --- STATE ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Subtasks
  const [subtaskMode, setSubtaskMode] = useState<'none' | 'simple' | 'category'>('none');
  const [subtasksDraft, setSubtasksDraft] = useState<Subtask[]>([]);
  const [subtaskCategories, setSubtaskCategories] = useState<SubtaskCategory[]>([]);
  
  // Date & Time
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = useState<Date | undefined>(undefined);
  
  // Repeat
  const [repeatType, setRepeatType] = useState<RepeatType>(RepeatType.NONE);
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [intervalDays, setIntervalDays] = useState<number>(1);
  const [durationMonths, setDurationMonths] = useState<number>(0);
  
  // Repeat Modal State (Internal)
  const [repeatModalVisible, setRepeatModalVisible] = useState(false);
  const [tempCustomDays, setTempCustomDays] = useState<number[]>([]);
  const [tempIntervalDays, setTempIntervalDays] = useState<number>(1);
  const [tempDurationMonths, setTempDurationMonths] = useState<number>(0);
  const [tempWeekly, setTempWeekly] = useState(false);
  const [tempWeeksCount, setTempWeeksCount] = useState(1);

  // Subtask Creation State
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDate, setNewSubtaskDate] = useState<Date | undefined>(undefined);
  const [newSubtaskTime, setNewSubtaskTime] = useState<Date | undefined>(undefined);
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newSubtaskInCategory, setNewSubtaskInCategory] = useState<{categoryId: string, title: string} | null>(null);
  const [newCategorySubtaskDate, setNewCategorySubtaskDate] = useState<Date | undefined>(undefined);
  const [newCategorySubtaskTime, setNewCategorySubtaskTime] = useState<Date | undefined>(undefined);

  // Pickers State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSubtaskDatePicker, setShowSubtaskDatePicker] = useState(false);
  const [showSubtaskTimePicker, setShowSubtaskTimePicker] = useState(false);
  
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskCategoryId, setEditingSubtaskCategoryId] = useState<string | null>(null);

  // Refs
  const pickerDateValueRef = useRef<Date>(new Date());
  const pickerTimeValueRef = useRef<Date>(new Date());
  const pickerSubtaskDateValueRef = useRef<Date>(new Date());
  const pickerSubtaskTimeValueRef = useRef<Date>(new Date());
  
  const webDateInputRef = useRef<any>(null);
  const webTimeInputRef = useRef<any>(null);
  const webSubtaskDateInputRef = useRef<any>(null);
  const webSubtaskTimeInputRef = useRef<any>(null);
  
  const stableNowRef = useRef<Date>(new Date());

  // --- EFFECT: Initialize State ---
  useEffect(() => {
    if (visible) {
      stableNowRef.current = new Date();
      if (initialTask) {
        // EDIT MODE
        setTitle(initialTask.title);
        setDescription(initialTask.description || '');
        setIsPrivate(!!initialTask.private);
        setSelectedCategory(initialTask.category || 'all');
        setDueDate(initialTask.dueDate ? new Date(initialTask.dueDate) : undefined);
        setDueTime(initialTask.dueTime ? new Date(initialTask.dueTime) : undefined);
        
        // Repeat
        const repeat = getRepeat(initialTask);
        setRepeatType(repeat.type);
        setCustomDays(repeat.days || []);
        setIntervalDays(repeat.intervalDays || 1);
        setDurationMonths(repeat.durationMonths || 0);
        
        // Subtasks
        if (initialTask.subtaskCategories && initialTask.subtaskCategories.length > 0) {
          setSubtaskMode('category');
          setSubtaskCategories(initialTask.subtaskCategories);
          setSubtasksDraft([]);
        } else if (initialTask.subtasks && initialTask.subtasks.length > 0) {
          setSubtaskMode('simple');
          setSubtasksDraft(initialTask.subtasks);
          setSubtaskCategories([]);
        } else {
          setSubtaskMode('none');
          setSubtasksDraft([]);
          setSubtaskCategories([]);
        }
      } else {
        // NEW MODE
        setTitle('');
        setDescription('');
        setIsPrivate(false);
        setSelectedCategory('all');
        
        if (initialDate) {
          setDueDate(initialDate);
        } else {
          setDueDate(undefined);
        }
        setDueTime(undefined);
        
        setRepeatType(RepeatType.NONE);
        setCustomDays([]);
        setIntervalDays(1);
        setDurationMonths(0);
        
        setSubtaskMode('none');
        setSubtasksDraft([]);
        setSubtaskCategories([]);
      }
      
      // Reset auxiliary state
      setNewSubtaskTitle('');
      setNewSubtaskDate(undefined);
      setNewSubtaskTime(undefined);
      setIsAddingCategory(false);
      setNewCategoryTitle('');
      setNewSubtaskInCategory(null);
      setNewCategorySubtaskDate(undefined);
      setNewCategorySubtaskTime(undefined);
      setEditingSubtaskId(null);
      setEditingSubtaskCategoryId(null);
      setShowDatePicker(false);
      setShowTimePicker(false);
      setShowSubtaskDatePicker(false);
      setShowSubtaskTimePicker(false);
      setRepeatModalVisible(false);
    }
  }, [visible, initialTask, initialDate]);

  // --- HANDLERS ---
  
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, informe o título da tarefa');
      return;
    }

    const taskData: any = {
      title: title.trim(),
      description: description.trim(),
      category: selectedCategory,
      private: isPrivate,
      dueDate: dueDate,
      dueTime: dueTime,
      repeat: {
        type: repeatType,
        days: repeatType === RepeatType.CUSTOM ? customDays : undefined,
        intervalDays: repeatType === RepeatType.INTERVAL ? intervalDays : undefined,
        durationMonths: repeatType === RepeatType.INTERVAL ? durationMonths : undefined
      },
      subtasks: subtaskMode === 'simple' ? subtasksDraft : [],
      subtaskCategories: subtaskMode === 'category' ? subtaskCategories : []
    };

    await onSave(taskData);
  };

  const getRepeatLabel = () => {
    switch (repeatType) {
      case RepeatType.DAILY: return 'Diariamente';
      case RepeatType.MONTHLY: return 'Mensalmente';
      case RepeatType.CUSTOM: 
        if (customDays.length === 0) return 'Personalizado';
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return customDays.map(d => days[d]).join(', ');
      case RepeatType.INTERVAL:
        return `A cada ${intervalDays} dias${durationMonths ? ` por ${durationMonths} meses` : ''}`;
      default: return 'Não repetir';
    }
  };

  // ... (Resto da lógica de pickers e renderização)
  // Vou simplificar os pickers para usar apenas o DateTimePicker nativo ou web
  // e remover a complexidade de "managed modal" para os pickers internos,
  // já que agora eles são locais ao TaskModal.

  const closeAllPickers = () => {
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowSubtaskDatePicker(false);
    setShowSubtaskTimePicker(false);
  };

  // ... (Renderização)
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
        if (isAddingTask) return;
        onClose();
      }}
    >
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* HEADER */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{initialTask ? 'Editar Tarefa' : 'Nova Tarefa'}</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  style={[
                    styles.privateToggleButtonCompact, 
                    isPrivate && styles.privateToggleButtonActive,
                    user.role !== 'admin' && styles.opacityDisabled
                  ]}
                  onPress={() => {
                    if (user.role !== 'admin') {
                      Alert.alert('Sem permissão', 'Apenas administradores podem criar tarefas privadas.');
                      return;
                    }
                    setIsPrivate(prev => !prev);
                  }}
                  disabled={user.role !== 'admin'}
                >
                  <Ionicons 
                    name={isPrivate ? "lock-closed" : "lock-open-outline"} 
                    size={14} 
                    color={isPrivate ? "#fff" : "#666"} 
                  />
                  <Text style={[
                    styles.privateToggleTextCompact, 
                    isPrivate && styles.privateToggleTextActive
                  ]}>
                    Privado
                  </Text>
                </Pressable>
                
                <Pressable onPress={onClose} disabled={isAddingTask}>
                  <Ionicons name="close" size={24} color="#666" />
                </Pressable>
              </View>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* CATEGORY SELECTOR */}
              <Text style={styles.categoryLabel}>Categoria:</Text>
              <CategorySelector 
                categories={categories}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
                onAddCategory={onAddCategory}
              />

              {/* TITLE & DESCRIPTION */}
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Título da tarefa"
                placeholderTextColor={THEME.textSecondary}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />

              <TextInput
                style={[styles.input, styles.textArea, { color: colors.textPrimary }]}
                placeholder="Descrição (opcional)"
                placeholderTextColor={THEME.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={300}
              />

              {/* SUBTASKS */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 16 }}>
                <Text style={styles.categoryLabel}>Subtarefas:</Text>
                <View style={{ flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 8, padding: 2 }}>
                  <Pressable
                    style={[styles.subtaskModeButton, subtaskMode === 'none' && styles.subtaskModeButtonActive]}
                    onPress={() => {
                      if (subtaskMode !== 'none') {
                        Alert.alert(
                          'Remover subtarefas?',
                          'Isso removerá todas as subtarefas criadas. Deseja continuar?',
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            { 
                              text: 'Sim', 
                              style: 'destructive',
                              onPress: () => {
                                setSubtaskMode('none');
                                setSubtasksDraft([]);
                                setSubtaskCategories([]);
                              }
                            }
                          ]
                        );
                      } else {
                        setSubtaskMode('none');
                      }
                    }}
                  >
                    <Ionicons name="ban-outline" size={16} color={subtaskMode === 'none' ? '#fff' : '#666'} />
                  </Pressable>
                  <Pressable
                    style={[styles.subtaskModeButton, subtaskMode === 'simple' && styles.subtaskModeButtonActive]}
                    onPress={() => {
                      if (subtaskMode === 'category') {
                        Alert.alert(
                          'Mudar modo?',
                          'Isso converterá/removerá as categorias. Deseja continuar?',
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            { 
                              text: 'Sim', 
                              onPress: () => {
                                setSubtaskMode('simple');
                                setSubtaskCategories([]);
                                setSubtasksDraft([]);
                              }
                            }
                          ]
                        );
                      } else {
                        setSubtaskMode('simple');
                      }
                    }}
                  >
                    <Ionicons name="list-outline" size={16} color={subtaskMode === 'simple' ? '#fff' : '#666'} />
                  </Pressable>
                  <Pressable
                    style={[styles.subtaskModeButton, subtaskMode === 'category' && styles.subtaskModeButtonActive]}
                    onPress={() => {
                      if (subtaskMode === 'simple') {
                        Alert.alert(
                          'Mudar modo?',
                          'Isso removerá as subtarefas simples. Deseja continuar?',
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            { 
                              text: 'Sim', 
                              onPress: () => {
                                setSubtaskMode('category');
                                setSubtasksDraft([]);
                                setSubtaskCategories([]);
                              }
                            }
                          ]
                        );
                      } else {
                        setSubtaskMode('category');
                      }
                    }}
                  >
                    <Ionicons name="grid-outline" size={16} color={subtaskMode === 'category' ? '#fff' : '#666'} />
                  </Pressable>
                </View>
              </View>

              {subtaskMode === 'simple' && (
                <View style={styles.subtasksContainer}>
                  {subtasksDraft.map((subtask) => (
                    <View key={subtask.id} style={styles.subtaskItem}>
                      <Pressable
                        onPress={() => {
                          setSubtasksDraft(prev => prev.map(s => s.id === subtask.id ? { ...s, done: !s.done } : s));
                        }}
                      >
                        <Ionicons 
                          name={subtask.done ? "checkbox" : "square-outline"} 
                          size={20} 
                          color={subtask.done ? THEME.primary : "#999"} 
                        />
                      </Pressable>
                      <TextInput
                        style={[styles.subtaskInput, subtask.done && styles.subtaskInputDone]}
                        value={subtask.title}
                        onChangeText={(text) => {
                          setSubtasksDraft(prev => prev.map(s => s.id === subtask.id ? { ...s, title: text } : s));
                        }}
                      />
                      <Pressable onPress={() => setSubtasksDraft(prev => prev.filter(s => s.id !== subtask.id))}>
                        <Ionicons name="trash-outline" size={18} color="#ff4444" />
                      </Pressable>
                    </View>
                  ))}
                  
                  <View style={styles.addSubtaskContainer}>
                    <TextInput
                      style={styles.addSubtaskInput}
                      placeholder="Nova subtarefa"
                      value={newSubtaskTitle}
                      onChangeText={setNewSubtaskTitle}
                      onSubmitEditing={() => {
                        if (newSubtaskTitle.trim()) {
                          setSubtasksDraft(prev => [...prev, {
                            id: uuidv4(),
                            title: newSubtaskTitle.trim(),
                            done: false
                          }]);
                          setNewSubtaskTitle('');
                        }
                      }}
                    />
                    <Pressable 
                      onPress={() => {
                        if (newSubtaskTitle.trim()) {
                          setSubtasksDraft(prev => [...prev, {
                            id: uuidv4(),
                            title: newSubtaskTitle.trim(),
                            done: false
                          }]);
                          setNewSubtaskTitle('');
                        }
                      }}
                      style={styles.addSubtaskButton}
                    >
                      <Ionicons name="add" size={20} color={THEME.primary} />
                    </Pressable>
                  </View>
                </View>
              )}

              {subtaskMode === 'category' && (
                <View style={styles.subtasksContainer}>
                  {/* Lista de Categorias de Subtarefas */}
                  {subtaskCategories.map((category) => (
                    <View key={category.id} style={styles.subtaskCategoryCard}>
                      <View style={styles.subtaskCategoryHeader}>
                        <Text style={styles.subtaskCategoryTitle}>{category.name}</Text>
                        <Pressable onPress={() => setSubtaskCategories(prev => prev.filter(c => c.id !== category.id))}>
                          <Ionicons name="trash-outline" size={16} color="#ff4444" />
                        </Pressable>
                      </View>
                      
                      {/* Subtarefas da Categoria */}
                      {category.subtasks.map((subtask) => (
                        <View key={subtask.id} style={styles.subtaskItem}>
                          <Pressable
                            onPress={() => {
                              setSubtaskCategories(prev => prev.map(c => 
                                c.id === category.id 
                                  ? { ...c, subtasks: c.subtasks.map(s => s.id === subtask.id ? { ...s, done: !s.done } : s) }
                                  : c
                              ));
                            }}
                          >
                            <Ionicons 
                              name={subtask.done ? "checkbox" : "square-outline"} 
                              size={20} 
                              color={subtask.done ? THEME.primary : "#999"} 
                            />
                          </Pressable>
                          <Text style={[styles.subtaskText, subtask.done && styles.subtaskInputDone]}>
                            {subtask.title}
                          </Text>
                          <Pressable onPress={() => {
                            setSubtaskCategories(prev => prev.map(c => 
                              c.id === category.id 
                                ? { ...c, subtasks: c.subtasks.filter(s => s.id !== subtask.id) }
                                : c
                            ));
                          }}>
                            <Ionicons name="trash-outline" size={16} color="#999" />
                          </Pressable>
                        </View>
                      ))}

                      {/* Adicionar Subtarefa na Categoria */}
                      <View style={styles.addSubtaskContainer}>
                        <TextInput
                          style={styles.addSubtaskInput}
                          placeholder="Adicionar item"
                          value={newSubtaskInCategory?.categoryId === category.id ? newSubtaskInCategory.title : ''}
                          onChangeText={(text) => setNewSubtaskInCategory({ categoryId: category.id, title: text })}
                          onSubmitEditing={() => {
                            if (newSubtaskInCategory?.categoryId === category.id && newSubtaskInCategory.title.trim()) {
                              setSubtaskCategories(prev => prev.map(c => 
                                c.id === category.id 
                                  ? { ...c, subtasks: [...c.subtasks, { id: uuidv4(), title: newSubtaskInCategory.title.trim(), done: false }] }
                                  : c
                              ));
                              setNewSubtaskInCategory(null);
                            }
                          }}
                        />
                        <Pressable 
                          onPress={() => {
                            if (newSubtaskInCategory?.categoryId === category.id && newSubtaskInCategory.title.trim()) {
                              setSubtaskCategories(prev => prev.map(c => 
                                c.id === category.id 
                                  ? { ...c, subtasks: [...c.subtasks, { id: uuidv4(), title: newSubtaskInCategory.title.trim(), done: false }] }
                                  : c
                              ));
                              setNewSubtaskInCategory(null);
                            }
                          }}
                          style={styles.addSubtaskButton}
                        >
                          <Ionicons name="add" size={20} color={THEME.primary} />
                        </Pressable>
                      </View>
                    </View>
                  ))}

                  {/* Adicionar Nova Categoria */}
                  {isAddingCategory ? (
                    <View style={styles.addCategoryContainer}>
                      <TextInput
                        style={styles.addCategoryInput}
                        placeholder="Nome da lista"
                        value={newCategoryTitle}
                        onChangeText={setNewCategoryTitle}
                        autoFocus
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable 
                          onPress={() => {
                            setIsAddingCategory(false);
                            setNewCategoryTitle('');
                          }}
                          style={styles.cancelCategoryButton}
                        >
                          <Ionicons name="close" size={20} color="#666" />
                        </Pressable>
                        <Pressable 
                          onPress={() => {
                            if (newCategoryTitle.trim()) {
                              setSubtaskCategories(prev => [...prev, {
                                id: uuidv4(),
                                name: newCategoryTitle.trim(),
                                subtasks: [],
                                isExpanded: true,
                                createdAt: new Date()
                              }]);
                              setNewCategoryTitle('');
                              setIsAddingCategory(false);
                            }
                          }}
                          style={styles.saveCategoryButton}
                        >
                          <Ionicons name="checkmark" size={20} color="#fff" />
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable 
                      style={styles.addCategoryTrigger}
                      onPress={() => setIsAddingCategory(true)}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={THEME.primary} />
                      <Text style={styles.addCategoryTriggerText}>Nova Lista de Itens</Text>
                    </Pressable>
                  )}
                </View>
              )}
              
              {/* DATE & TIME */}
              <Text style={[styles.categoryLabel, { marginTop: 16 }]}>Agendamento:</Text>
              <View style={styles.dateTimeContainer}>
                <Pressable 
                  style={styles.dateTimeButton}
                  onPress={() => {
                    Keyboard.dismiss();
                    pickerDateValueRef.current = dueDate || new Date();
                    setShowDatePicker(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.dateTimeButtonText}>
                    {dueDate ? formatDate(dueDate) : 'Selecionar data'}
                  </Text>
                </Pressable>
                
                <Pressable 
                  style={styles.dateTimeButton}
                  onPress={() => {
                    Keyboard.dismiss();
                    pickerTimeValueRef.current = dueTime || new Date();
                    setShowTimePicker(true);
                  }}
                >
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.dateTimeButtonText}>
                    {dueTime ? formatTime(dueTime) : 'Selecionar hora'}
                  </Text>
                </Pressable>
              </View>

              {/* REPEAT */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.categoryLabel}>Repetir:</Text>
                <Text style={{ fontSize: 13, color: repeatType === RepeatType.NONE ? '#999' : THEME.primary }}>
                  {getRepeatLabel()}
                </Text>
              </View>
              {/* (Botões de repetição) */}
              
            </ScrollView>

            {/* FOOTER BUTTONS */}
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={isAddingTask}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.button, styles.addButton, isAddingTask && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isAddingTask}
              >
                {isAddingTask ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>{initialTask ? 'Salvar' : 'Adicionar'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      {/* PICKERS MODAL (iOS/Android) */}
      {(showDatePicker || showTimePicker) && (
        <Modal transparent animationType="fade" visible={true}>
           <Pressable style={styles.iosPickerOverlay} onPress={closeAllPickers}>
             <Pressable style={styles.iosPickerContainer} onPress={(e) => e.stopPropagation()}>
               <View style={styles.iosPickerHeader}>
                 <Pressable onPress={() => {
                   if (showDatePicker) setDueDate(pickerDateValueRef.current);
                   if (showTimePicker) setDueTime(pickerTimeValueRef.current);
                   closeAllPickers();
                 }}>
                   <Text style={styles.iosPickerDoneButtonText}>Concluído</Text>
                 </Pressable>
               </View>
               {showDatePicker && (
                 <DateTimePicker
                   value={pickerDateValueRef.current}
                   mode="date"
                   display="spinner"
                   onChange={(_, date) => { if(date) pickerDateValueRef.current = date; }}
                   style={styles.iosDateTimePicker}
                 />
               )}
               {showTimePicker && (
                 <DateTimePicker
                   value={pickerTimeValueRef.current}
                   mode="time"
                   display="spinner"
                   onChange={(_, date) => { if(date) pickerTimeValueRef.current = date; }}
                   style={styles.iosDateTimePicker}
                 />
               )}
             </Pressable>
           </Pressable>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Copiar estilos relevantes do TaskScreen.tsx
  keyboardAvoidingView: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalScrollView: { flex: 1 },
  modalScrollContent: { paddingBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  categoryLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#666' },
  modalButtons: { flexDirection: 'row', gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  button: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f0f0f0' },
  addButton: { backgroundColor: THEME.primary },
  cancelButtonText: { color: '#666', fontWeight: '600' },
  addButtonText: { color: '#fff', fontWeight: '600' },
  buttonDisabled: { opacity: 0.7 },
  privateToggleButtonCompact: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 12, backgroundColor: '#f0f0f0', gap: 4 },
  privateToggleButtonActive: { backgroundColor: '#666' },
  privateToggleTextCompact: { fontSize: 12, color: '#666' },
  privateToggleTextActive: { color: '#fff' },
  opacityDisabled: { opacity: 0.5 },
  dateTimeContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dateTimeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
  dateTimeButtonText: { color: '#333' },
  iosPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  iosPickerContainer: { backgroundColor: '#fff', paddingBottom: 20 },
  iosPickerHeader: { padding: 16, alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: '#eee' },
  iosPickerDoneButtonText: { color: THEME.primary, fontWeight: '600', fontSize: 16 },
  iosDateTimePicker: { height: 200 },
  
  // Subtask styles
  subtaskModeButton: { padding: 8, borderRadius: 6 },
  subtaskModeButtonActive: { backgroundColor: THEME.primary },
  subtasksContainer: { marginTop: 8, marginBottom: 16 },
  subtaskItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 8 },
  subtaskInput: { flex: 1, fontSize: 14, color: '#333' },
  subtaskInputDone: { textDecorationLine: 'line-through', color: '#999' },
  subtaskText: { flex: 1, fontSize: 14, color: '#333' },
  addSubtaskContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  addSubtaskInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14 },
  addSubtaskButton: { padding: 8 },
  
  // Subtask category styles
  subtaskCategoryCard: { marginBottom: 12, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  subtaskCategoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subtaskCategoryTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  addCategoryContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 12 },
  addCategoryInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#fff' },
  cancelCategoryButton: { padding: 8, backgroundColor: '#e0e0e0', borderRadius: 8 },
  saveCategoryButton: { padding: 8, backgroundColor: THEME.primary, borderRadius: 8 },
  addCategoryTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 12, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  addCategoryTriggerText: { fontSize: 14, color: THEME.primary, fontWeight: '500' },
});
