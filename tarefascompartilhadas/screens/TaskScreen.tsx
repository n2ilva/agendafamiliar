import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { Header } from '../components/Header';

export enum RepeatType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKENDS = 'weekends',
  CUSTOM = 'custom'
}

export interface RepeatConfig {
  type: RepeatType;
  days?: number[]; // 0-6 (domingo-sábado) para CUSTOM
}

export interface CategoryConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  isDefault?: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: string;
  dueDate?: Date;
  dueTime?: Date;
  repeat: RepeatConfig;
  createdAt: Date;
}

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    id: 'all',
    name: 'Todas',
    icon: 'apps',
    color: '#666',
    bgColor: '#f0f0f0',
    isDefault: true
  },
  {
    id: 'work',
    name: 'Trabalho',
    icon: 'briefcase',
    color: '#3498db',
    bgColor: '#e3f2fd',
    isDefault: true
  },
  {
    id: 'personal',
    name: 'Pessoal',
    icon: 'home',
    color: '#e74c3c',
    bgColor: '#ffebee',
    isDefault: true
  },
  {
    id: 'health',
    name: 'Saúde',
    icon: 'fitness',
    color: '#27ae60',
    bgColor: '#e8f5e8',
    isDefault: true
  }
];

export const AVAILABLE_ICONS = [
  'briefcase', 'home', 'fitness', 'book', 'car', 'restaurant',
  'airplane', 'camera', 'musical-notes', 'game-controller',
  'heart', 'star', 'gift', 'trophy', 'school', 'desktop'
];

export const AVAILABLE_COLORS = [
  { color: '#3498db', bgColor: '#e3f2fd' }, // Azul
  { color: '#e74c3c', bgColor: '#ffebee' }, // Vermelho
  { color: '#27ae60', bgColor: '#e8f5e8' }, // Verde
  { color: '#f39c12', bgColor: '#fff3e0' }, // Laranja
  { color: '#9b59b6', bgColor: '#f3e5f5' }, // Roxo
  { color: '#e91e63', bgColor: '#fce4ec' }, // Rosa
  { color: '#00bcd4', bgColor: '#e0f2f1' }, // Ciano
  { color: '#795548', bgColor: '#efebe9' }, // Marrom
];

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: string;
  createdAt: Date;
  dueDate?: Date;
  dueTime?: Date;
  repeat: {
    type: RepeatType;
    days?: number[];
  };
}

interface HistoryItem {
  id: string;
  action: 'created' | 'completed' | 'uncompleted' | 'edited' | 'deleted';
  taskTitle: string;
  taskId: string;
  timestamp: Date;
  details?: string;
}

export const TaskScreen: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('work');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('star');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  
  // Estados para edição
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Estados para tabs
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');
  
  // Estados para histórico
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  
  // Configurar notificações
  useEffect(() => {
    configurarNotificacoes();
    verificarTarefasVencidas();
    
    // Verificar tarefas vencidas a cada minuto
    const interval = setInterval(verificarTarefasVencidas, 60000);
    
    return () => clearInterval(interval);
  }, [tasks]);

  const configurarNotificacoes = async () => {
    // Configurar handler de notificações
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Solicitar permissões
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão de Notificação',
        'Para receber lembretes de tarefas vencidas, permita as notificações nas configurações do seu dispositivo.'
      );
    }
  };

  const verificarTarefasVencidas = () => {
    const agora = new Date();
    
    tasks.forEach(task => {
      if (task.dueDate && !task.completed) {
        const dataVencimento = new Date(task.dueDate);
        if (task.dueTime) {
          const horaVencimento = new Date(task.dueTime);
          dataVencimento.setHours(horaVencimento.getHours(), horaVencimento.getMinutes());
        }
        
        // Se a tarefa venceu há menos de 5 minutos, enviar notificação
        const diffMinutos = (agora.getTime() - dataVencimento.getTime()) / (1000 * 60);
        if (diffMinutos >= 0 && diffMinutos <= 5) {
          enviarNotificacaoVencimento(task);
        }
      }
    });
  };

  const enviarNotificacaoVencimento = async (task: Task) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Tarefa Vencida!',
        body: `A tarefa "${task.title}" venceu. Que tal completá-la agora?`,
        data: { taskId: task.id },
      },
      trigger: null, // Enviar imediatamente
    });
  };

  const isTaskOverdue = (task: Task): boolean => {
    if (!task.dueDate || task.completed) return false;
    
    const agora = new Date();
    const dataVencimento = new Date(task.dueDate);
    
    if (task.dueTime) {
      const horaVencimento = new Date(task.dueTime);
      dataVencimento.setHours(horaVencimento.getHours(), horaVencimento.getMinutes());
    } else {
      // Se não tem hora específica, considerar fim do dia
      dataVencimento.setHours(23, 59, 59);
    }
    
    return agora > dataVencimento;
  };
  
  // Estados para data e hora
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Estados para repetição
  const [repeatType, setRepeatType] = useState<RepeatType>(RepeatType.NONE);
  const [customDays, setCustomDays] = useState<number[]>([]);
  
  const [userName] = useState('João Silva'); // Em um app real, isso viria do contexto/state global

  const addTask = () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Erro', 'Por favor, insira um título para a tarefa.');
      return;
    }

    if (isEditing && editingTaskId) {
      // Atualizar tarefa existente
      setTasks(tasks.map(task => 
        task.id === editingTaskId 
          ? {
              ...task,
              title: newTaskTitle.trim(),
              description: newTaskDescription.trim(),
              category: selectedCategory,
              dueDate: selectedDate,
              dueTime: selectedTime,
              repeat: {
                type: repeatType,
                days: repeatType === RepeatType.CUSTOM ? customDays : undefined
              }
            }
          : task
      ));
      
      // Adicionar ao histórico
      addToHistory('edited', newTaskTitle.trim(), editingTaskId);
    } else {
      // Criar nova tarefa
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        completed: false,
        category: selectedCategory,
        dueDate: selectedDate,
        dueTime: selectedTime,
        repeat: {
          type: repeatType,
          days: repeatType === RepeatType.CUSTOM ? customDays : undefined
        },
        createdAt: new Date(),
      };

      setTasks([newTask, ...tasks]);
      
      // Adicionar ao histórico
      addToHistory('created', newTask.title, newTask.id);
    }
    
    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setNewTaskTitle('');
    setNewTaskDescription('');
    setSelectedCategory('work');
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setRepeatType(RepeatType.NONE);
    setCustomDays([]);
    setIsEditing(false);
    setEditingTaskId(null);
    setModalVisible(false);
  };

  const editTask = (task: Task) => {
    setNewTaskTitle(task.title);
    setNewTaskDescription(task.description);
    setSelectedCategory(task.category);
    setSelectedDate(task.dueDate);
    setSelectedTime(task.dueTime);
    setRepeatType(task.repeat.type);
    setCustomDays(task.repeat.days || []);
    setIsEditing(true);
    setEditingTaskId(task.id);
    setModalVisible(true);
  };

  // Funções para filtrar tarefas por data
  const isToday = (date?: Date): boolean => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isUpcoming = (date?: Date): boolean => {
    if (!date) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Final do dia de hoje
    return date > today;
  };

  const getTodayTasks = () => {
    return tasks.filter(task => {
      if (filterCategory !== 'all' && task.category !== filterCategory) {
        return false;
      }
      return !task.dueDate || isToday(task.dueDate);
    }).sort((a, b) => {
      // Priorizar tarefas vencidas
      const aOverdue = isTaskOverdue(a);
      const bOverdue = isTaskOverdue(b);
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      // Se ambas vencidas ou não vencidas, ordenar por data
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      
      if (a.dueTime) {
        const timeA = new Date(a.dueTime);
        dateA.setHours(timeA.getHours(), timeA.getMinutes());
      }
      if (b.dueTime) {
        const timeB = new Date(b.dueTime);
        dateB.setHours(timeB.getHours(), timeB.getMinutes());
      }
      
      return dateA.getTime() - dateB.getTime();
    });
  };

  const getUpcomingTasks = () => {
    return tasks.filter(task => {
      if (filterCategory !== 'all' && task.category !== filterCategory) {
        return false;
      }
      return task.dueDate && isUpcoming(task.dueDate);
    }).sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      
      if (a.dueTime) {
        const timeA = new Date(a.dueTime);
        dateA.setHours(timeA.getHours(), timeA.getMinutes());
      }
      if (b.dueTime) {
        const timeB = new Date(b.dueTime);
        dateB.setHours(timeB.getHours(), timeB.getMinutes());
      }
      
      return dateA.getTime() - dateB.getTime();
    });
  };

  const getCurrentTasks = () => {
    if (activeTab === 'today') {
      return getTodayTasks();
    } else {
      return getUpcomingTasks();
    }
  };

  // Funções do sistema de histórico
  const addToHistory = (
    action: 'created' | 'completed' | 'uncompleted' | 'edited' | 'deleted',
    taskTitle: string,
    taskId: string,
    details?: string
  ) => {
    const historyItem: HistoryItem = {
      id: Date.now().toString(),
      action,
      taskTitle,
      taskId,
      timestamp: new Date(),
      details
    };

    setHistory(prev => {
      const newHistory = [historyItem, ...prev];
      // Manter apenas os últimos 15 dias
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      
      return newHistory.filter(item => item.timestamp >= fifteenDaysAgo);
    });
  };

  const clearOldHistory = () => {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    setHistory(prev => prev.filter(item => item.timestamp >= fifteenDaysAgo));
  };

  // Executar limpeza do histórico a cada renderização (otimização)
  React.useEffect(() => {
    clearOldHistory();
  }, []);

  const getActionText = (action: string): string => {
    switch (action) {
      case 'created': return 'criou';
      case 'completed': return 'concluiu';
      case 'uncompleted': return 'reabriu';
      case 'edited': return 'editou';
      case 'deleted': return 'excluiu';
      default: return action;
    }
  };

  const getActionIcon = (action: string): any => {
    switch (action) {
      case 'created': return 'add-circle';
      case 'completed': return 'checkmark-circle';
      case 'uncompleted': return 'refresh-circle';
      case 'edited': return 'pencil-circle';
      case 'deleted': return 'trash';
      default: return 'ellipse';
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'created': return '#27ae60';
      case 'completed': return '#007AFF';
      case 'uncompleted': return '#f39c12';
      case 'edited': return '#9b59b6';
      case 'deleted': return '#e74c3c';
      default: return '#666';
    }
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Erro', 'Por favor, insira um nome para a categoria.');
      return;
    }

    const newCategory: CategoryConfig = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      icon: selectedIcon,
      color: AVAILABLE_COLORS[selectedColorIndex].color,
      bgColor: AVAILABLE_COLORS[selectedColorIndex].bgColor,
      isDefault: false
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName('');
    setSelectedIcon('star');
    setSelectedColorIndex(0);
    setCategoryModalVisible(false);
  };

  const deleteCategory = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    
    if (category?.isDefault) {
      Alert.alert('Erro', 'Não é possível excluir categorias padrão.');
      return;
    }

    const tasksInCategory = tasks.filter(task => task.category === categoryId);
    
    if (tasksInCategory.length > 0) {
      Alert.alert(
        'Categoria em uso',
        `Esta categoria possui ${tasksInCategory.length} tarefa(s). Deseja mover as tarefas para "Trabalho" e excluir a categoria?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, mover tarefas',
            onPress: () => {
              // Move tarefas para categoria "work"
              setTasks(tasks.map(task => 
                task.category === categoryId 
                  ? { ...task, category: 'work' }
                  : task
              ));
              setCategories(categories.filter(cat => cat.id !== categoryId));
              if (filterCategory === categoryId) {
                setFilterCategory('all');
              }
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Excluir Categoria',
        `Tem certeza que deseja excluir a categoria "${category?.name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            onPress: () => {
              setCategories(categories.filter(cat => cat.id !== categoryId));
              if (filterCategory === categoryId) {
                setFilterCategory('all');
              }
            },
            style: 'destructive'
          }
        ]
      );
    }
  };

  const getCategoryConfig = (categoryId: string): CategoryConfig => {
    return categories.find(cat => cat.id === categoryId) || categories[1];
  };

  const formatDate = (date?: Date): string => {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (time?: Date): string => {
    if (!time) return '';
    return time.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRepeatText = (repeat: RepeatConfig): string => {
    switch (repeat.type) {
      case RepeatType.DAILY:
        return 'Todos os dias';
      case RepeatType.WEEKENDS:
        return 'Fins de semana';
      case RepeatType.CUSTOM:
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return repeat.days?.map(d => dayNames[d]).join(', ') || '';
      default:
        return '';
    }
  };

  const toggleCustomDay = (day: number) => {
    if (customDays.includes(day)) {
      setCustomDays(customDays.filter(d => d !== day));
    } else {
      setCustomDays([...customDays, day].sort());
    }
  };

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const onTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
    }
  };

  const toggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
    
    // Adicionar ao histórico
    addToHistory(
      !task.completed ? 'completed' : 'uncompleted',
      task.title,
      taskId
    );
  };

  const deleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    Alert.alert(
      'Excluir Tarefa',
      'Tem certeza que deseja excluir esta tarefa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          onPress: () => {
            setTasks(tasks.filter(task => task.id !== taskId));
            // Adicionar ao histórico
            addToHistory('deleted', task.title, taskId);
          },
          style: 'destructive' 
        },
      ]
    );
  };

  const handleSettings = () => {
    Alert.alert(
      'Configurações',
      'Escolha uma opção:',
      [
        {
          text: 'Histórico',
          onPress: () => setHistoryModalVisible(true),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Fazendo logout...');
    // Aqui você implementaria a lógica de logout
  };

  const renderTask = ({ item }: { item: Task }) => {
    const categoryConfig = getCategoryConfig(item.category);
    const isOverdue = isTaskOverdue(item);
    
    return (
      <View style={[
        styles.taskItem, 
        item.completed && styles.taskCompleted,
        isOverdue && styles.taskOverdue
      ]}>
        <View style={[styles.categoryIndicator, { backgroundColor: categoryConfig.color }]} />
        
        {/* Indicador de tarefa vencida */}
        {isOverdue && (
          <View style={styles.overdueIndicator}>
            <Ionicons name="warning" size={16} color="#e74c3c" />
            <Text style={styles.overdueLabel}>VENCIDA</Text>
          </View>
        )}
        
        <TouchableOpacity 
          onPress={() => toggleTask(item.id)}
          style={styles.taskContent}
        >
          <View style={styles.taskHeader}>
            <View style={styles.checkboxContainer}>
              <Ionicons 
                name={item.completed ? "checkmark-circle" : "ellipse-outline"} 
                size={24} 
                color={item.completed ? "#4CAF50" : "#ccc"} 
              />
            </View>
            <View style={styles.taskInfo}>
              <View style={styles.taskTitleRow}>
                <Text style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}>
                  {item.title}
                </Text>
                <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.bgColor }]}>
                  <Ionicons 
                    name={categoryConfig.icon as any} 
                    size={12} 
                    color={categoryConfig.color} 
                  />
                  <Text style={[styles.categoryBadgeText, { color: categoryConfig.color }]}>
                    {categoryConfig.name}
                  </Text>
                </View>
              </View>
              
              {item.description ? (
                <Text style={[styles.taskDescription, item.completed && styles.taskDescriptionCompleted]}>
                  {item.description}
                </Text>
              ) : null}
              
              {/* Informações de agendamento */}
              <View style={styles.scheduleInfo}>
                {item.dueDate && (
                  <View style={styles.scheduleItem}>
                    <Ionicons 
                      name="calendar-outline" 
                      size={14} 
                      color={isOverdue ? "#e74c3c" : "#666"} 
                    />
                    <Text style={[styles.scheduleText, isOverdue && styles.overdueText]}>
                      {formatDate(item.dueDate)}
                    </Text>
                  </View>
                )}
                
                {item.dueTime && (
                  <View style={styles.scheduleItem}>
                    <Ionicons 
                      name="time-outline" 
                      size={14} 
                      color={isOverdue ? "#e74c3c" : "#666"} 
                    />
                    <Text style={[styles.scheduleText, isOverdue && styles.overdueText]}>
                      {formatTime(item.dueTime)}
                    </Text>
                  </View>
                )}
                
                {item.repeat.type !== RepeatType.NONE && (
                  <View style={styles.scheduleItem}>
                    <Ionicons 
                      name="repeat-outline" 
                      size={14} 
                      color="#666" 
                    />
                    <Text style={styles.scheduleText}>
                      {getRepeatText(item.repeat)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.taskActions}>
          <TouchableOpacity 
            onPress={() => editTask(item)}
            style={styles.editButton}
          >
            <Ionicons name="pencil-outline" size={18} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => deleteTask(item.id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        userName={userName}
        onSettings={handleSettings}
        onLogout={handleLogout}
      />
      
      <View style={styles.content}>
        <View style={styles.categoryFiltersContainer}>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilters}
            style={styles.categoryScrollView}
            decelerationRate="fast"
            snapToInterval={120}
            snapToAlignment="start"
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryFilter,
                  filterCategory === category.id && styles.categoryFilterActive,
                  { borderColor: category.color }
                ]}
                onPress={() => setFilterCategory(category.id)}
                onLongPress={() => !category.isDefault && deleteCategory(category.id)}
              >
                <Ionicons 
                  name={category.icon as any} 
                  size={18} 
                  color={filterCategory === category.id ? '#fff' : category.color} 
                />
                <Text style={[
                  styles.categoryFilterText,
                  filterCategory === category.id && styles.categoryFilterTextActive,
                  { color: filterCategory === category.id ? '#fff' : category.color }
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.addCategoryButton}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Ionicons name="add" size={18} color="#007AFF" />
              <Text style={styles.addCategoryText}>Nova</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Tabs para Hoje e Próximas */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'today' && styles.activeTab]}
            onPress={() => setActiveTab('today')}
          >
            <Ionicons 
              name="today-outline" 
              size={20} 
              color={activeTab === 'today' ? '#007AFF' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'today' && styles.activeTabText]}>
              Hoje
            </Text>
            <View style={[
              styles.taskCount, 
              activeTab === 'today' && { backgroundColor: '#007AFF' }
            ]}>
              <Text style={[styles.taskCountText, activeTab === 'today' && styles.activeTaskCountText]}>
                {getTodayTasks().length}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Ionicons 
              name="calendar-outline" 
              size={20} 
              color={activeTab === 'upcoming' ? '#007AFF' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
              Próximas
            </Text>
            <View style={[
              styles.taskCount, 
              activeTab === 'upcoming' && { backgroundColor: '#007AFF' }
            ]}>
              <Text style={[styles.taskCountText, activeTab === 'upcoming' && styles.activeTaskCountText]}>
                {getUpcomingTasks().length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {getCurrentTasks().filter((task: Task) => !task.completed).length} pendentes • {getCurrentTasks().filter((task: Task) => task.completed).length} concluídas
          </Text>
        </View>

        {getCurrentTasks().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={activeTab === 'today' ? 'checkmark-circle-outline' : 'calendar-outline'} 
              size={64} 
              color="#ccc" 
            />
            <Text style={styles.emptyText}>
              {activeTab === 'today' 
                ? 'Nenhuma tarefa para hoje!' 
                : 'Nenhuma tarefa próxima!'
              }
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'today' 
                ? 'Aproveite seu dia livre ☺️' 
                : 'Tudo certo por enquanto 🚀'
              }
            </Text>
          </View>
        ) : (
          <FlatList
            data={getCurrentTasks()}
            renderItem={renderTask}
            keyExtractor={(item) => item.id}
            style={styles.taskList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</Text>
                <TouchableOpacity onPress={resetForm}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  style={styles.input}
                  placeholder="Título da tarefa"
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  maxLength={100}
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Descrição (opcional)"
                  value={newTaskDescription}
                  onChangeText={setNewTaskDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={300}
                />

            <Text style={styles.categoryLabel}>Categoria:</Text>
            <View style={styles.categorySelectorContainer}>
              <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categorySelectorScroll}
                style={styles.categorySelectorScrollView}
                decelerationRate="fast"
              >
                {categories.filter(cat => cat.id !== 'all').map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categorySelector,
                      selectedCategory === category.id && styles.categorySelectorActive,
                      { 
                        borderColor: category.color,
                        backgroundColor: selectedCategory === category.id ? category.color : category.bgColor
                      }
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Ionicons 
                      name={category.icon as any} 
                      size={16} 
                      color={selectedCategory === category.id ? '#fff' : category.color} 
                    />
                    <Text style={[
                      styles.categorySelectorText,
                      { color: selectedCategory === category.id ? '#fff' : category.color }
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Seleção de Data e Hora */}
            <Text style={styles.categoryLabel}>Agendamento:</Text>
            
            <View style={styles.dateTimeContainer}>
              <TouchableOpacity 
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.dateTimeButtonText}>
                  {selectedDate ? formatDate(selectedDate) : 'Selecionar data'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.dateTimeButtonText}>
                  {selectedTime ? formatTime(selectedTime) : 'Selecionar hora'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Seleção de Repetição */}
            <Text style={styles.categoryLabel}>Repetir:</Text>
            <View style={styles.repeatContainer}>
              {[
                { type: RepeatType.NONE, label: 'Não repetir', icon: 'ban-outline' },
                { type: RepeatType.DAILY, label: 'Todos os dias', icon: 'repeat-outline' },
                { type: RepeatType.WEEKENDS, label: 'Fins de semana', icon: 'home-outline' },
                { type: RepeatType.CUSTOM, label: 'Personalizado', icon: 'settings-outline' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[
                    styles.repeatOption,
                    repeatType === option.type && styles.repeatOptionActive
                  ]}
                  onPress={() => setRepeatType(option.type)}
                >
                  <Ionicons 
                    name={option.icon as any} 
                    size={16} 
                    color={repeatType === option.type ? '#007AFF' : '#666'} 
                  />
                  <Text style={[
                    styles.repeatOptionText,
                    repeatType === option.type && styles.repeatOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Seleção de dias customizados */}
            {repeatType === RepeatType.CUSTOM && (
              <View style={styles.customDaysContainer}>
                <Text style={styles.customDaysLabel}>Selecione os dias:</Text>
                <View style={styles.customDaysSelector}>
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayButton,
                        customDays.includes(index) && styles.dayButtonActive
                      ]}
                      onPress={() => toggleCustomDay(index)}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        customDays.includes(index) && styles.dayButtonTextActive
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]}
                  onPress={resetForm}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.addButton]}
                  onPress={addTask}
                >
                  <Text style={styles.addButtonText}>{isEditing ? 'Salvar' : 'Adicionar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para criar nova categoria */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={categoryModalVisible}
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Categoria</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nome da categoria"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              maxLength={20}
            />

            <Text style={styles.categoryLabel}>Ícone:</Text>
            <View style={styles.iconSelectorContainer}>
              {AVAILABLE_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconSelector,
                    selectedIcon === icon && styles.iconSelectorActive
                  ]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Ionicons 
                    name={icon as any} 
                    size={20} 
                    color={selectedIcon === icon ? '#007AFF' : '#666'} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.categoryLabel}>Cor:</Text>
            <View style={styles.colorSelectorContainer}>
              {AVAILABLE_COLORS.map((colorConfig, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorSelector,
                    { backgroundColor: colorConfig.color },
                    selectedColorIndex === index && styles.colorSelectorActive
                  ]}
                  onPress={() => setSelectedColorIndex(index)}
                >
                  {selectedColorIndex === index && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.categoryPreview}>
              <Text style={styles.previewLabel}>Pré-visualização:</Text>
              <View style={[
                styles.categoryPreviewItem,
                { 
                  backgroundColor: AVAILABLE_COLORS[selectedColorIndex].bgColor,
                  borderColor: AVAILABLE_COLORS[selectedColorIndex].color
                }
              ]}>
                <Ionicons 
                  name={selectedIcon as any} 
                  size={16} 
                  color={AVAILABLE_COLORS[selectedColorIndex].color} 
                />
                <Text style={[
                  styles.categoryPreviewText,
                  { color: AVAILABLE_COLORS[selectedColorIndex].color }
                ]}>
                  {newCategoryName || 'Nova Categoria'}
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => setCategoryModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.addButton]}
                onPress={addCategory}
              >
                <Text style={styles.addButtonText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedTime || new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
          is24Hour={true}
        />
      )}

      {/* Modal do Histórico */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Histórico</Text>
              <View style={{ width: 24 }} />
            </View>

            <Text style={styles.historySubtitle}>
              Últimas ações realizadas (15 dias)
            </Text>

            {history.length === 0 ? (
              <View style={styles.emptyHistoryContainer}>
                <Ionicons name="time-outline" size={64} color="#ccc" />
                <Text style={styles.emptyHistoryText}>Nenhuma ação registrada</Text>
                <Text style={styles.emptyHistorySubtext}>
                  As ações realizadas nas tarefas aparecerão aqui
                </Text>
              </View>
            ) : (
              <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <View style={styles.historyIconContainer}>
                      <Ionicons 
                        name={getActionIcon(item.action)}
                        size={20}
                        color={getActionColor(item.action)}
                      />
                    </View>
                    <View style={styles.historyContent}>
                      <Text style={styles.historyText}>
                        <Text style={styles.historyAction}>
                          {getActionText(item.action)}
                        </Text>{' '}
                        a tarefa "{item.taskTitle}"
                      </Text>
                      {item.details && (
                        <Text style={styles.historyDetails}>{item.details}</Text>
                      )}
                      <Text style={styles.historyTime}>
                        {item.timestamp.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  categoryFiltersContainer: {
    marginBottom: 20,
  },
  categoryScrollView: {
    flexGrow: 0,
  },
  categoryFilters: {
    paddingHorizontal: 4,
    paddingRight: 20,
  },
  categoryFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#fff',
    minWidth: 80,
  },
  categoryFilterActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  categoryFilterTextActive: {
    color: '#fff',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    borderStyle: 'dashed',
    minWidth: 80,
  },
  addCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    color: '#007AFF',
  },
  iconSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  iconSelector: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconSelectorActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  colorSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  colorSelector: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSelectorActive: {
    borderColor: '#333',
  },
  categoryPreview: {
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  categoryPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  categoryPreviewText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  dateTimeButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  repeatContainer: {
    marginBottom: 20,
  },
  repeatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  repeatOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  repeatOptionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  repeatOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  customDaysContainer: {
    marginBottom: 20,
  },
  customDaysLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  customDaysSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dayButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  summaryContainer: {
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  taskList: {
    flex: 1,
  },
  taskItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  taskCompleted: {
    opacity: 0.7,
  },
  categoryIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  taskContent: {
    flex: 1,
    marginLeft: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  taskDescriptionCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  scheduleInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scheduleText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 3,
    fontWeight: '500',
  },
  overdueText: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
  // Task Actions Styles
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    flex: 1,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  categorySelectorContainer: {
    marginBottom: 24,
  },
  categorySelectorScrollView: {
    flexGrow: 0,
  },
  categorySelectorScroll: {
    paddingHorizontal: 4,
    paddingRight: 20,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 100,
    justifyContent: 'center',
  },
  categorySelectorActive: {
    borderWidth: 2,
  },
  categorySelectorText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Date Picker Styles
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  dateInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
    fontSize: 16,
    width: 60,
    marginHorizontal: 5,
  },
  dateSeparator: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 5,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datePickerCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  datePickerCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  datePickerConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Time Picker Styles
  timePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  timeInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
    fontSize: 18,
    width: 50,
    marginHorizontal: 5,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginHorizontal: 10,
  },
  timePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timePickerCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  timePickerCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  timePickerConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Keyboard Avoiding Styles
  keyboardAvoidingView: {
    flex: 1,
  },
  modalScrollView: {
    flex: 1,
    marginBottom: 20,
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingVertical: 10,
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
    marginRight: 8,
  },
  activeTabText: {
    color: '#007AFF',
  },
  taskCount: {
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  taskCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  activeTaskCountText: {
    color: '#fff',
  },
  // History Styles
  historySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  emptyHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  historyItem: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  historyText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
  },
  historyAction: {
    fontWeight: '600',
    color: '#007AFF',
  },
  historyDetails: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
  },
  // Overdue Task Styles
  taskOverdue: {
    backgroundColor: '#fff5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  overdueIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  overdueLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e74c3c',
    marginLeft: 2,
  },
});