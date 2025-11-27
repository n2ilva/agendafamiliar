import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, KeyboardAvoidingView, ScrollView,
  TextInput, Pressable, Platform, Alert, Keyboard, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { v4 as uuidv4 } from 'uuid';

import {
  FamilyUser, CategoryConfig, Task, Subtask, SubtaskCategory,
  RepeatType, RepeatConfig
} from '../../../types/family.types';
import { APP_COLORS } from '../../../constants/colors';
import { useTheme } from '../../../contexts/theme.context';
import {
  formatDate, formatTime, getNextRecurrenceDate
} from '../../../utils/date/date.utils';
import {
  repeatConfigToOption, optionToRepeatConfig, getRepeat
} from '../../../utils/validators/task.utils';
import { CategorySelector } from './CategorySelector';
import { logger } from '../../../utils/helpers/logger';

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  initialTask?: Task | null;
  initialDate?: Date;
  onSave: (taskData: any) => Promise<void>;
  user: FamilyUser;
  categories: CategoryConfig[];
  onAddCategory: () => void;
  isAddingTask: boolean;
}

export const TaskModal = ({
  visible,
  onClose,
  initialTask,
  initialDate,
  onSave,
  user,
  categories,
  onAddCategory,
  isAddingTask
}: TaskModalProps) => {
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

  // Subtask Creation State
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newSubtaskInCategory, setNewSubtaskInCategory] = useState<{ categoryId: string, title: string } | null>(null);

  // Pickers State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Refs
  const pickerDateValueRef = useRef<Date>(new Date());
  const pickerTimeValueRef = useRef<Date>(new Date());
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
      setIsAddingCategory(false);
      setNewCategoryTitle('');
      setNewSubtaskInCategory(null);
      setShowDatePicker(false);
      setShowTimePicker(false);
      setRepeatModalVisible(false);
    }
  }, [visible, initialTask, initialDate]);

  // --- HANDLERS ---

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, informe o título da tarefa');
      return;
    }

    // Converter configuração de repetição para o formato plano da Task
    const repeatConfig = {
      type: repeatType,
      days: repeatType === RepeatType.CUSTOM ? customDays : undefined,
      intervalDays: repeatType === RepeatType.INTERVAL ? intervalDays : undefined,
      durationMonths: repeatType === RepeatType.INTERVAL ? durationMonths : undefined
    };

    const repeatOptions = repeatConfigToOption(repeatConfig);

    const taskData: any = {
      title: title.trim(),
      description: description.trim(),
      category: selectedCategory,
      private: isPrivate,
      dueDate: dueDate,
      dueTime: dueTime,
      ...repeatOptions, // Espalha as propriedades: repeatOption, repeatDays, repeatIntervalDays, repeatDurationMonths
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
        return customDays.map((d: number) => days[d]).join(', ');
      case RepeatType.INTERVAL:
        return `A cada ${intervalDays} dias${durationMonths ? ` por ${durationMonths} meses` : ''}`;
      default: return 'Não repetir';
    }
  };

  const openRepeatConfig = (type: RepeatType) => {
    setRepeatType(type);
    if (type === RepeatType.CUSTOM) {
      setTempCustomDays(customDays);
      setRepeatModalVisible(true);
    } else if (type === RepeatType.INTERVAL) {
      setTempIntervalDays(intervalDays);
      setTempDurationMonths(durationMonths);
      setRepeatModalVisible(true);
    }
  };

  const toggleWeekday = (dayIndex: number) => {
    setTempCustomDays((prev: number[]) => {
      if (prev.includes(dayIndex)) {
        return prev.filter((d: number) => d !== dayIndex);
      } else {
        return [...prev, dayIndex].sort();
      }
    });
  };

  const saveRepeatConfig = () => {
    if (repeatType === RepeatType.CUSTOM) {
      setCustomDays(tempCustomDays);
    } else if (repeatType === RepeatType.INTERVAL) {
      setIntervalDays(tempIntervalDays);
      setDurationMonths(tempDurationMonths);
    }
    setRepeatModalVisible(false);
  };

  const closeAllPickers = () => {
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

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
                    color={isPrivate ? APP_COLORS.text.white : APP_COLORS.text.secondary}
                  />
                  <Text style={[
                    styles.privateToggleTextCompact,
                    isPrivate && styles.privateToggleTextActive
                  ]}>
                    Privado
                  </Text>
                </Pressable>

                <Pressable onPress={onClose} disabled={isAddingTask}>
                  <Ionicons name="close" size={24} color={APP_COLORS.text.secondary} />
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
                placeholderTextColor={APP_COLORS.text.secondary}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />

              <TextInput
                style={[styles.input, styles.textArea, { color: colors.textPrimary }]}
                placeholder="Descrição (opcional)"
                placeholderTextColor={APP_COLORS.text.secondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={300}
              />

              {/* SUBTASKS */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 16 }}>
                <Text style={styles.categoryLabel}>Subtarefas:</Text>
                <View style={{ flexDirection: 'row', backgroundColor: APP_COLORS.background.lightGray, borderRadius: 8, padding: 2 }}>
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
                    <Ionicons name="ban-outline" size={16} color={subtaskMode === 'none' ? APP_COLORS.text.white : APP_COLORS.text.secondary} />
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
                    <Ionicons name="list-outline" size={16} color={subtaskMode === 'simple' ? APP_COLORS.text.white : APP_COLORS.text.secondary} />
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
                    <Ionicons name="grid-outline" size={16} color={subtaskMode === 'category' ? APP_COLORS.text.white : APP_COLORS.text.secondary} />
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
                        color={subtask.done ? APP_COLORS.primary.main : APP_COLORS.text.light}
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
                        <Ionicons name="trash-outline" size={18} color={APP_COLORS.status.error} />
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
                      <Ionicons name="add" size={20} color={APP_COLORS.primary.main} />
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
                          <Ionicons name="trash-outline" size={16} color={APP_COLORS.status.error} />
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
                              color={subtask.done ? APP_COLORS.primary.main : APP_COLORS.text.light}
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
                            <Ionicons name="trash-outline" size={16} color={APP_COLORS.text.light} />
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
                          <Ionicons name="add" size={20} color={APP_COLORS.primary.main} />
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
                          <Ionicons name="close" size={20} color={APP_COLORS.text.secondary} />
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
                          <Ionicons name="checkmark" size={20} color={APP_COLORS.text.white} />
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.addCategoryTrigger}
                      onPress={() => setIsAddingCategory(true)}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={APP_COLORS.primary.main} />
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
                  <Ionicons name="calendar-outline" size={16} color={APP_COLORS.text.secondary} />
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
                  <Ionicons name="time-outline" size={16} color={APP_COLORS.text.secondary} />
                  <Text style={styles.dateTimeButtonText}>
                    {dueTime ? formatTime(dueTime) : 'Selecionar hora'}
                  </Text>
                </Pressable>
              </View>

              {/* REPEAT */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.categoryLabel}>Repetir:</Text>
                <Text style={{ fontSize: 13, color: repeatType === RepeatType.NONE ? APP_COLORS.text.light : APP_COLORS.primary.main }}>
                  {getRepeatLabel()}
                </Text>
              </View>

              <View style={styles.repeatButtonsContainer}>
                <Pressable
                  style={[styles.repeatButton, repeatType === RepeatType.NONE && styles.repeatButtonActive]}
                  onPress={() => setRepeatType(RepeatType.NONE)}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={14}
                    color={repeatType === RepeatType.NONE ? APP_COLORS.text.white : APP_COLORS.text.secondary}
                  />
                  <Text style={[styles.repeatButtonText, repeatType === RepeatType.NONE && styles.repeatButtonTextActive]}>
                    Não repetir
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.repeatButton, repeatType === RepeatType.DAILY && styles.repeatButtonActive]}
                  onPress={() => setRepeatType(RepeatType.DAILY)}
                >
                  <Ionicons
                    name="calendar"
                    size={14}
                    color={repeatType === RepeatType.DAILY ? APP_COLORS.text.white : APP_COLORS.text.secondary}
                  />
                  <Text style={[styles.repeatButtonText, repeatType === RepeatType.DAILY && styles.repeatButtonTextActive]}>
                    Diariamente
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.repeatButton, repeatType === RepeatType.MONTHLY && styles.repeatButtonActive]}
                  onPress={() => setRepeatType(RepeatType.MONTHLY)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={repeatType === RepeatType.MONTHLY ? APP_COLORS.text.white : APP_COLORS.text.secondary}
                  />
                  <Text style={[styles.repeatButtonText, repeatType === RepeatType.MONTHLY && styles.repeatButtonTextActive]}>
                    Mensalmente
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.repeatButton, repeatType === RepeatType.CUSTOM && styles.repeatButtonActive]}
                  onPress={() => openRepeatConfig(RepeatType.CUSTOM)}
                >
                  <Ionicons
                    name="options-outline"
                    size={14}
                    color={repeatType === RepeatType.CUSTOM ? APP_COLORS.text.white : APP_COLORS.text.secondary}
                  />
                  <Text style={[styles.repeatButtonText, repeatType === RepeatType.CUSTOM && styles.repeatButtonTextActive]}>
                    Personalizado
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.repeatButton, repeatType === RepeatType.INTERVAL && styles.repeatButtonActive]}
                  onPress={() => openRepeatConfig(RepeatType.INTERVAL)}
                >
                  <Ionicons
                    name="repeat-outline"
                    size={14}
                    color={repeatType === RepeatType.INTERVAL ? APP_COLORS.text.white : APP_COLORS.text.secondary}
                  />
                  <Text style={[styles.repeatButtonText, repeatType === RepeatType.INTERVAL && styles.repeatButtonTextActive]}>
                    Intervalo
                  </Text>
                </Pressable>
              </View>

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
                  <ActivityIndicator size="small" color={APP_COLORS.text.white} />
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
                  onChange={(_, date) => { if (date) pickerDateValueRef.current = date; }}
                  style={styles.iosDateTimePicker}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={pickerTimeValueRef.current}
                  mode="time"
                  display="spinner"
                  onChange={(_, date) => { if (date) pickerTimeValueRef.current = date; }}
                  style={styles.iosDateTimePicker}
                />
              )}
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* REPEAT CONFIGURATION MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={repeatModalVisible}
        onRequestClose={() => setRepeatModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {repeatType === RepeatType.CUSTOM ? 'Repetição Personalizada' : 'Configurar Intervalo'}
              </Text>
              <Pressable onPress={() => setRepeatModalVisible(false)}>
                <Ionicons name="close" size={24} color={APP_COLORS.text.secondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
              {repeatType === RepeatType.CUSTOM && (
                <View>
                  <Text style={styles.categoryLabel}>Selecione os dias da semana:</Text>
                  <View style={styles.weekdaysContainer}>
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                      <Pressable
                        key={index}
                        style={[
                          styles.weekdayButton,
                          tempCustomDays.includes(index) && styles.weekdayButtonActive
                        ]}
                        onPress={() => toggleWeekday(index)}
                      >
                        <Text style={[
                          styles.weekdayButtonText,
                          tempCustomDays.includes(index) && styles.weekdayButtonTextActive
                        ]}>
                          {day}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {repeatType === RepeatType.INTERVAL && (
                <View>
                  <Text style={styles.categoryLabel}>Repetir a cada:</Text>
                  <View style={styles.intervalInputContainer}>
                    <Pressable
                      style={styles.intervalButton}
                      onPress={() => setTempIntervalDays(Math.max(1, tempIntervalDays - 1))}
                    >
                      <Ionicons name="remove" size={20} color={APP_COLORS.text.secondary} />
                    </Pressable>
                    <Text style={styles.intervalValue}>{tempIntervalDays} dias</Text>
                    <Pressable
                      style={styles.intervalButton}
                      onPress={() => setTempIntervalDays(tempIntervalDays + 1)}
                    >
                      <Ionicons name="add" size={20} color={APP_COLORS.text.secondary} />
                    </Pressable>
                  </View>

                  <Text style={[styles.categoryLabel, { marginTop: 20 }]}>Duração (opcional):</Text>
                  <View style={styles.intervalInputContainer}>
                    <Pressable
                      style={styles.intervalButton}
                      onPress={() => setTempDurationMonths(Math.max(0, tempDurationMonths - 1))}
                    >
                      <Ionicons name="remove" size={20} color={APP_COLORS.text.secondary} />
                    </Pressable>
                    <Text style={styles.intervalValue}>
                      {tempDurationMonths === 0 ? 'Sem limite' : `${tempDurationMonths} meses`}
                    </Text>
                    <Pressable
                      style={styles.intervalButton}
                      onPress={() => setTempDurationMonths(tempDurationMonths + 1)}
                    >
                      <Ionicons name="add" size={20} color={APP_COLORS.text.secondary} />
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => setRepeatModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.addButton]}
                onPress={saveRepeatConfig}
              >
                <Text style={styles.addButtonText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: APP_COLORS.background.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalScrollView: { flex: 1 },
  modalScrollContent: { paddingBottom: 20 },
  input: { borderWidth: 1, borderColor: APP_COLORS.border.light, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  categoryLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: APP_COLORS.text.secondary },
  modalButtons: { flexDirection: 'row', gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: APP_COLORS.border.light },
  button: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: APP_COLORS.background.lightGray },
  addButton: { backgroundColor: APP_COLORS.primary.main },
  cancelButtonText: { color: APP_COLORS.text.secondary, fontWeight: '600' },
  addButtonText: { color: APP_COLORS.text.white, fontWeight: '600' },
  buttonDisabled: { opacity: 0.7 },
  privateToggleButtonCompact: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 12, backgroundColor: APP_COLORS.background.lightGray, gap: 4 },
  privateToggleButtonActive: { backgroundColor: APP_COLORS.text.secondary },
  privateToggleTextCompact: { fontSize: 12, color: APP_COLORS.text.secondary },
  privateToggleTextActive: { color: APP_COLORS.text.white },
  opacityDisabled: { opacity: 0.5 },
  dateTimeContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dateTimeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: APP_COLORS.border.light, borderRadius: 8 },
  dateTimeButtonText: { color: APP_COLORS.text.primary },
  iosPickerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)', justifyContent: 'flex-end' },
  iosPickerContainer: { backgroundColor: APP_COLORS.background.white, paddingBottom: 20 },
  iosPickerHeader: { padding: 16, alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: APP_COLORS.border.light },
  iosPickerDoneButtonText: { color: APP_COLORS.primary.main, fontWeight: '600', fontSize: 16 },
  iosDateTimePicker: { height: 200 },

  // Subtask styles
  subtaskModeButton: { padding: 8, borderRadius: 6 },
  subtaskModeButtonActive: { backgroundColor: APP_COLORS.primary.main },
  subtasksContainer: { marginTop: 8, marginBottom: 16 },
  subtaskItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, padding: 8, backgroundColor: APP_COLORS.background.lightGray, borderRadius: 8 },
  subtaskInput: { flex: 1, fontSize: 14, color: APP_COLORS.text.primary },
  subtaskInputDone: { textDecorationLine: 'line-through', color: APP_COLORS.text.light },
  subtaskText: { flex: 1, fontSize: 14, color: APP_COLORS.text.primary },
  addSubtaskContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  addSubtaskInput: { flex: 1, borderWidth: 1, borderColor: APP_COLORS.border.light, borderRadius: 8, padding: 10, fontSize: 14 },
  addSubtaskButton: { padding: 8 },

  // Subtask category styles
  subtaskCategoryCard: { marginBottom: 12, padding: 12, backgroundColor: APP_COLORS.background.lightGray, borderRadius: 12, borderWidth: 1, borderColor: APP_COLORS.border.light },
  subtaskCategoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subtaskCategoryTitle: { fontSize: 15, fontWeight: '600', color: APP_COLORS.text.primary },
  addCategoryContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: APP_COLORS.background.lightGray, borderRadius: 12 },
  addCategoryInput: { flex: 1, borderWidth: 1, borderColor: APP_COLORS.border.light, borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: APP_COLORS.background.white },
  cancelCategoryButton: { padding: 8, backgroundColor: APP_COLORS.border.light, borderRadius: 8 },
  saveCategoryButton: { padding: 8, backgroundColor: APP_COLORS.primary.main, borderRadius: 8 },
  addCategoryTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: APP_COLORS.background.lightGray, borderRadius: 12, borderWidth: 1, borderColor: APP_COLORS.border.light, borderStyle: 'dashed' },
  addCategoryTriggerText: { fontSize: 14, color: APP_COLORS.primary.main, fontWeight: '500' },

  // Repeat styles
  repeatButtonsContainer: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  repeatButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: APP_COLORS.background.lightGray, borderRadius: 8 },
  repeatButtonActive: { backgroundColor: APP_COLORS.primary.main },
  repeatButtonText: { fontSize: 12, color: APP_COLORS.text.secondary, fontWeight: '500' },
  repeatButtonTextActive: { color: APP_COLORS.text.white },

  // Weekday selector
  weekdaysContainer: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  weekdayButton: { width: 45, height: 45, justifyContent: 'center', alignItems: 'center', backgroundColor: APP_COLORS.background.lightGray, borderRadius: 22.5, borderWidth: 1, borderColor: APP_COLORS.border.light },
  weekdayButtonActive: { backgroundColor: APP_COLORS.primary.main, borderColor: APP_COLORS.primary.main },
  weekdayButtonText: { fontSize: 12, color: APP_COLORS.text.secondary, fontWeight: '600' },
  weekdayButtonTextActive: { color: APP_COLORS.text.white },

  // Interval config
  intervalInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 },
  intervalButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: APP_COLORS.background.lightGray, borderRadius: 20 },
  intervalValue: { fontSize: 16, fontWeight: '600', color: APP_COLORS.text.primary, minWidth: 100, textAlign: 'center' },
});

