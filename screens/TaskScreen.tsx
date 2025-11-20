import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ListRenderItemInfo } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  AppState,
  ActivityIndicator,
  Pressable,
  Platform,
  ScrollView,
  Modal,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Image,
  Animated,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, State, PanGestureHandler } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { v4 as uuidv4 } from 'uuid';
import { 
  THEME
} from '../utils/colors';
import { useTheme } from '../contexts/ThemeContext';
import { Family, FamilyUser, UserRole, TaskApproval, ApprovalNotification, TaskStatus, Task, SubtaskCategory, Subtask } from '../types/FamilyTypes';
import ConnectivityService, { ConnectivityState } from '../services/ConnectivityService';
import { SyncStatus } from '../services/SyncService';
import familyService from '../services/LocalFamilyService';
import { safeToDate, isToday, isUpcoming, isTaskOverdue, getNextRecurrenceDate, isRecurringTaskCompletable } from '../utils/DateUtils';
import { RemoteTask } from '../services/FirestoreService';
import FirestoreService from '../services/FirestoreService';
import LocalStorageService, { HistoryItem as StoredHistoryItem } from '../services/LocalStorageService';
import SyncService from '../services/SyncService';
import FamilySyncHelper from '../services/FamilySyncHelper';
import NotificationService from '../services/NotificationService';
import Alert from '../utils/Alert';
import { Header } from '../components/Header';
import * as Notifications from 'expo-notifications';
import logger from '../utils/Logger';

const HISTORY_DAYS_TO_KEEP = 7;

// RepeatType enum definition
export enum RepeatType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKENDS = 'weekends',
  CUSTOM = 'custom',
  MONTHLY = 'monthly',
  INTERVAL = 'interval'
}

// RepeatConfig interface
interface RepeatConfig {
  type: RepeatType;
  days?: number[];
  intervalDays?: number;
  durationMonths?: number;
}

// CategoryConfig interface
export interface CategoryConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  isDefault: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt?: Date | string;
}

// Default categories
export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    id: 'all',
    name: 'Todas',
    icon: 'apps',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    isDefault: true
  },
  {
    id: 'work',
    name: 'Trabalho',
    icon: 'briefcase',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    isDefault: true
  },
  {
    id: 'home',
    name: 'Casa',
    icon: 'home',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    isDefault: true
  },
  {
    id: 'health',
    name: 'Saúde',
    icon: 'fitness',
    color: '#10B981',
    bgColor: '#ECFDF5',
    isDefault: true
  },
  {
    id: 'study',
    name: 'Estudos',
    icon: 'book',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    isDefault: true
  },
  {
    id: 'finance',
    name: 'Finanças',
    icon: 'card',
    color: '#3f9605ff',
    bgColor: '#ebffdeff',
    isDefault: true
  },
  {
    id: 'shopping',
    name: 'Compras',
    icon: 'bag',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    isDefault: true
  }
];

export const AVAILABLE_ICONS = [
  'briefcase', 'home', 'fitness', 'book', 'car', 'restaurant',
  'airplane', 'camera', 'musical-notes', 'game-controller',
  'heart', 'star', 'gift', 'trophy', 'school', 'desktop',
  'card', 'bag', 'pizza', 'beer', 'cafe', 'cart',
  'paw', 'build', 'brush', 'bulb', 'calculator', 'calendar',
  'chatbubbles', 'code', 'compass', 'flask', 'flower', 'football',
  'hammer', 'headset', 'key', 'leaf', 'magnet', 'medal',
  'megaphone', 'moon', 'newspaper', 'nutrition', 'pencil', 'planet',
  'pulse', 'rocket', 'rose', 'shield', 'shirt', 'tennisball',
  'umbrella', 'wallet', 'watch', 'wifi', 'wine', 'basketball'
];

export const AVAILABLE_COLORS = [
  { color: '#E74C3C', bgColor: '#FADBD8' }, // Vermelho
  { color: '#E67E22', bgColor: '#FDEBD0' }, // Laranja
  { color: '#F39C12', bgColor: '#FEF5E7' }, // Amarelo Ouro
  { color: '#F1C40F', bgColor: '#FCF3CF' }, // Amarelo
  { color: '#2ECC71', bgColor: '#D5F4E6' }, // Verde
  { color: '#27AE60', bgColor: '#D4EFDF' }, // Verde Escuro
  { color: '#1ABC9C', bgColor: '#D1F2EB' }, // Turquesa
  { color: '#16A085', bgColor: '#D0ECE7' }, // Verde Água
  { color: '#3498DB', bgColor: '#D6EAF8' }, // Azul
  { color: '#2980B9', bgColor: '#D4E6F1' }, // Azul Escuro
  { color: '#9B59B6', bgColor: '#EBDEF0' }, // Roxo
  { color: '#8E44AD', bgColor: '#E8DAEF' }, // Roxo Escuro
  { color: '#E91E63', bgColor: '#F8BBD0' }, // Rosa
  { color: '#FF1744', bgColor: '#FFCDD2' }, // Rosa Forte
  { color: '#795548', bgColor: '#EFEBE9' }, // Marrom
  { color: '#607D8B', bgColor: '#ECEFF1' }, // Cinza Azulado
  { color: '#FF5722', bgColor: '#FFCCBC' }, // Laranja Profundo
  { color: '#009688', bgColor: '#B2DFDB' }, // Verde Azulado
  { color: '#4CAF50', bgColor: '#C8E6C9' }, // Verde Claro
  { color: '#CDDC39', bgColor: '#F0F4C3' }, // Lima
];

// Usar Task de FamilyTypes como base - evitar conflito de tipos
type LocalTask = Task & {
  repeat?: RepeatConfig; // compatibilidade com código antigo
};

// Helper para converter RepeatConfig para repeatOption/repeatDays
const repeatConfigToOption = (repeat?: RepeatConfig): { repeatOption: 'nenhum' | 'diario' | 'semanal' | 'mensal' | 'intervalo'; repeatDays?: number[]; repeatIntervalDays?: number; repeatDurationMonths?: number } => {
  if (!repeat || repeat.type === RepeatType.NONE) {
    return { repeatOption: 'nenhum' };
  }
  if (repeat.type === RepeatType.DAILY) {
    return { repeatOption: 'diario' };
  }
  if (repeat.type === RepeatType.CUSTOM) {
    return { repeatOption: 'semanal', repeatDays: repeat.days || [] };
  }
  if (repeat.type === RepeatType.MONTHLY) {
    return { repeatOption: 'mensal' };
  }
  if (repeat.type === RepeatType.INTERVAL) {
    return { repeatOption: 'intervalo', repeatIntervalDays: repeat.intervalDays, repeatDurationMonths: repeat.durationMonths };
  }
  return { repeatOption: 'nenhum' };
};

// Helper para criar RepeatConfig a partir de repeatOption/repeatDays
const optionToRepeatConfig = (repeatOption?: string, repeatDays?: number[], opts?: { repeatIntervalDays?: number; repeatDurationMonths?: number }): RepeatConfig => {
  if (!repeatOption || repeatOption === 'nenhum') {
    return { type: RepeatType.NONE };
  }
  if (repeatOption === 'diario') {
    return { type: RepeatType.DAILY };
  }
  if (repeatOption === 'semanal') {
    return { type: RepeatType.CUSTOM, days: repeatDays || [] };
  }
  if (repeatOption === 'mensal') {
    return { type: RepeatType.MONTHLY };
  }
  if (repeatOption === 'intervalo') {
    return { type: RepeatType.INTERVAL, intervalDays: opts?.repeatIntervalDays || 1, durationMonths: opts?.repeatDurationMonths || 0 };
  }
  return { type: RepeatType.NONE };
};

// Helper para acessar repeat de forma compatível
const getRepeat = (task: Task): RepeatConfig => {
  // Se o objeto já possui a configuração estruturada, usa direto
  const anyTask: any = task as any;
  if (anyTask.repeat && typeof anyTask.repeat === 'object' && 'type' in anyTask.repeat) {
    return anyTask.repeat as RepeatConfig;
  }
  // Fallback: converte a partir de repeatOption/repeatDays
  return optionToRepeatConfig(task.repeatOption, task.repeatDays, { repeatIntervalDays: (task as any).repeatIntervalDays, repeatDurationMonths: (task as any).repeatDurationMonths });
};

interface HistoryItem {
  id: string;
  action: 'created' | 'completed' | 'uncompleted' | 'edited' | 'deleted' | 'approval_requested' | 'approved' | 'rejected';
  taskTitle: string;
  taskId: string;
  timestamp: Date;
  details?: string;
  // Informações de autoria
  userId: string;
  userName: string;
  userRole?: string;
}

// Lista de emojis disponíveis (mesma do Header)
const AVAILABLE_EMOJIS = [
  { emoji: '😊', name: 'happy' },
  { emoji: '😎', name: 'cool' },
  { emoji: '🤩', name: 'starstruck' },
  { emoji: '🥳', name: 'partying' },
  { emoji: '😇', name: 'angel' },
  { emoji: '🤗', name: 'hugging' },
  { emoji: '🎉', name: 'party' },
  { emoji: '🎊', name: 'confetti' },
  { emoji: '🎈', name: 'balloon' },
  { emoji: '🎁', name: 'gift' },
  { emoji: '🚀', name: 'rocket' },
  { emoji: '✈️', name: 'airplane' },
  { emoji: '🚗', name: 'car' },
  { emoji: '🚴', name: 'bicycle' },
  { emoji: '🏃', name: 'running' },
  { emoji: '⭐', name: 'star' },
  { emoji: '🌟', name: 'sparkles' },
  { emoji: '💫', name: 'dizzy' },
  { emoji: '✨', name: 'shine' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '💙', name: 'blue-heart' },
  { emoji: '💚', name: 'green-heart' },
  { emoji: '💛', name: 'yellow-heart' },
  { emoji: '💜', name: 'purple-heart' },
  { emoji: '🧡', name: 'orange-heart' },
  { emoji: '🖤', name: 'black-heart' },
  { emoji: '🤍', name: 'white-heart' },
  { emoji: '🌈', name: 'rainbow' },
  { emoji: '🌸', name: 'flower' },
  { emoji: '🌺', name: 'hibiscus' },
  { emoji: '🌻', name: 'sunflower' },
  { emoji: '🌹', name: 'rose' },
  { emoji: '🌷', name: 'tulip' },
  { emoji: '🌿', name: 'leaf' },
  { emoji: '🍀', name: 'clover' },
  { emoji: '🌳', name: 'tree' },
  { emoji: '🌴', name: 'palm' },
  { emoji: '🐶', name: 'dog' },
  { emoji: '🐱', name: 'cat' },
  { emoji: '🐭', name: 'mouse' },
  { emoji: '🐹', name: 'hamster' },
  { emoji: '🐰', name: 'rabbit' },
  { emoji: '🦊', name: 'fox' },
  { emoji: '🐻', name: 'bear' },
  { emoji: '🐼', name: 'panda' },
  { emoji: '🐨', name: 'koala' },
  { emoji: '🐯', name: 'tiger' },
  { emoji: '🦁', name: 'lion' },
  { emoji: '🐮', name: 'cow' },
  { emoji: '🐷', name: 'pig' },
  { emoji: '🐸', name: 'frog' },
  { emoji: '🐵', name: 'monkey' },
  { emoji: '🦄', name: 'unicorn' },
  { emoji: '🐾', name: 'paw' },
  { emoji: '🦋', name: 'butterfly' },
  { emoji: '🐝', name: 'bee' },
  { emoji: '🐞', name: 'ladybug' },
  { emoji: '🍎', name: 'apple' },
  { emoji: '🍌', name: 'banana' },
  { emoji: '🍉', name: 'watermelon' },
  { emoji: '🍇', name: 'grapes' },
  { emoji: '🍓', name: 'strawberry' },
  { emoji: '🍒', name: 'cherries' },
  { emoji: '🍕', name: 'pizza' },
  { emoji: '🍔', name: 'burger' },
  { emoji: '🍟', name: 'fries' },
  { emoji: '🍦', name: 'icecream' },
  { emoji: '🍩', name: 'donut' },
  { emoji: '🍪', name: 'cookie' },
  { emoji: '🎂', name: 'cake' },
  { emoji: '🍰', name: 'shortcake' },
  { emoji: '☕', name: 'coffee' },
  { emoji: '🥤', name: 'drink' },
  { emoji: '🧃', name: 'juice' },
  { emoji: '⚽', name: 'soccer' },
  { emoji: '🏀', name: 'basketball' },
  { emoji: '🏈', name: 'football' },
  { emoji: '⚾', name: 'baseball' },
  { emoji: '🎾', name: 'tennis' },
  { emoji: '🏐', name: 'volleyball' },
  { emoji: '🎮', name: 'game' },
  { emoji: '🎯', name: 'dart' },
  { emoji: '🎲', name: 'dice' },
  { emoji: '🎨', name: 'art' },
  { emoji: '🎭', name: 'theater' },
  { emoji: '🎪', name: 'circus' },
  { emoji: '🎬', name: 'movie' },
  { emoji: '🎵', name: 'music' },
  { emoji: '🎸', name: 'guitar' },
  { emoji: '🎹', name: 'piano' },
  { emoji: '🎤', name: 'microphone' },
  { emoji: '📚', name: 'book' },
  { emoji: '📖', name: 'open-book' },
  { emoji: '✏️', name: 'pencil' },
  { emoji: '📝', name: 'memo' },
  { emoji: '💼', name: 'briefcase' },
  { emoji: '💻', name: 'laptop' },
  { emoji: '📱', name: 'phone' },
  { emoji: '⌚', name: 'watch' },
  { emoji: '🔑', name: 'key' },
  { emoji: '🔒', name: 'lock' },
  { emoji: '💡', name: 'bulb' },
  { emoji: '🔦', name: 'flashlight' },
  { emoji: '🕯️', name: 'candle' },
  { emoji: '🏠', name: 'home' },
  { emoji: '🏡', name: 'house' },
  { emoji: '🏖️', name: 'beach' },
  { emoji: '🏔️', name: 'mountain' },
  { emoji: '⛺', name: 'tent' },
  { emoji: '🌙', name: 'moon' },
  { emoji: '☀️', name: 'sun' },
  { emoji: '⭐', name: 'star2' },
  { emoji: '☁️', name: 'cloud' },
  { emoji: '⚡', name: 'lightning' },
  { emoji: '🔥', name: 'fire' },
  { emoji: '💧', name: 'droplet' },
  { emoji: '🌊', name: 'wave' },
];

// Função helper para obter emoji do ícone
const getEmojiForIcon = (iconName?: string): string => {
  if (!iconName) return '😊';
  const icon = AVAILABLE_EMOJIS.find(i => i.name === iconName);
  return icon ? icon.emoji : '😊';
};

interface TaskScreenProps {
  user: FamilyUser;
  onLogout: () => Promise<void>;
  onUserNameChange: (newName: string) => void;
  onUserImageChange?: (newImageUrl: string) => void;
  onUserProfileIconChange?: (newProfileIcon: string) => void;
  onUserRoleChange?: (newRole: UserRole, opts?: { silent?: boolean }) => void;
}

export const TaskScreen: React.FC<TaskScreenProps> = ({ user, onLogout, onUserNameChange, onUserImageChange, onUserProfileIconChange, onUserRoleChange }) => {
  // Hook do tema
  const { colors, activeTheme } = useTheme();
  
  // Estilos dinâmicos baseados no tema
  const styles = useMemo(() => getStyles(colors, activeTheme), [colors, activeTheme]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Gating de boot inicial: evita UI "travando" enquanto sincroniza
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  // Loading global para aguardar sincronizações específicas (ex.: exclusão remota)
  const [isGlobalLoading, setGlobalLoading] = useState(false);
  // Controle de auto-sync para evitar chamadas excessivas
  const lastAutoSyncAtRef = useRef(0);

  // Estado para IDs de tarefas pendentes de sincronização
  const [pendingSyncIds, setPendingSyncIds] = useState<string[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  // Garantir 1 disparo de sync no startup (com um retry curto) para captar o estado do Firebase Auth
  const didStartupSyncRef = useRef(false);
  // Garantir 1 refresh completo quando a família estiver definida e online
  const didInitialFamilyRefreshRef = useRef(false);
  const [syncMessage, setSyncMessage] = useState('');
  // Recorrência por intervalo (a cada X dias e duração em meses)
  const [intervalDays, setIntervalDays] = useState<number>(0);
  const [durationMonths, setDurationMonths] = useState<number>(0);
  
  // Estados para controle do seletor de data/hora no modal de tarefa
  const [tempDueDate, setTempDueDate] = useState<Date | undefined>(undefined);
  const [tempDueTime, setTempDueTime] = useState<Date | undefined>(undefined);
  
  // Estado para dropdown de filtros
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  const [filterButtonLayout, setFilterButtonLayout] = useState({ top: 120, right: 16 });
  const filterButtonRef = useRef<any>(null);

  // Estados principais
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('work');
  const [filterCategory, setFilterCategory] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPrivate, setNewTaskPrivate] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');
  
  // Estado para funcionalidade de desfazer
  const [lastAction, setLastAction] = useState<{
    type: 'toggle' | 'delete' | 'edit';
    task: Task;
    previousState?: Task;
    timestamp: number;
  } | null>(null);
  const [showUndoButton, setShowUndoButton] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados de família
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyUser[]>([]);
  const [familyModalVisible, setFamilyModalVisible] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [codeCountdown, setCodeCountdown] = useState('');
  const [editMemberModalVisible, setEditMemberModalVisible] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<FamilyUser | null>(null);
  // Ref para gerenciar unsubscribe da assinatura de membros em tempo real
  const membersUnsubRef = useRef<(() => void) | null>(null);
  // Ref para controlar notificações de tarefas vencidas e evitar duplicatas
  // Formato: { taskId: timestamp da última notificação enviada }
  const overdueNotificationTrackRef = useRef<Record<string, number>>({});
  // Intervalo mínimo entre notificações da mesma tarefa (em minutos)
  const NOTIFICATION_THROTTLE_MINUTES = 30;

  const isWeb = Platform.OS === 'web';

  const sortedFamilyMembers = useMemo(() => {
    if (!familyMembers.length) return [];

    const userId = user?.id;
    const normalizeName = (name?: string) => (name || '').trim().toLocaleLowerCase('pt-BR');

    const others = familyMembers
      .filter(member => member.id !== userId)
      .sort((a, b) =>
        normalizeName(a.name).localeCompare(normalizeName(b.name), 'pt-BR', { sensitivity: 'base' })
      );

    if (!userId) {
      return others;
    }

    const currentUserEntry = familyMembers.find(member => member.id === userId);
    return currentUserEntry ? [currentUserEntry, ...others] : others;
  }, [familyMembers, user?.id]);
  
  // Helper: garante permissão atualizada do membro autenticado; retorna true/false
  const ensureFamilyPermission = useCallback(async (perm: 'create'|'edit'|'delete'): Promise<boolean> => {
    if (!currentFamily || user.role !== 'dependente') return true;
    try {
      // Sempre buscar do servidor para evitar permissões locais desatualizadas (ex.: revogadas recentemente)
      const refreshed = await familyService.getFamilyById(currentFamily.id);
      if (refreshed) {
        setCurrentFamily(refreshed);
        setFamilyMembers(refreshed.members);
        const me = refreshed.members.find(m => m.id === user.id) as any;
        return !!me?.permissions?.[perm];
      }
    } catch (e) {
      logger.warn('PERMISSIONS', 'Falha ao atualizar permissões da família');
      // Fallback: usar estado local em caso de erro de rede
      const selfMember = familyMembers.find(m => m.id === user.id) as any;
      return !!selfMember?.permissions?.[perm];
    }
    return false;
  }, [currentFamily, familyMembers, user]);
  
  // Estados de aprovação
  const [approvals, setApprovals] = useState<TaskApproval[]>([]);
  const [adminRoleRequests, setAdminRoleRequests] = useState<any[]>([]);
  
  // Estados de histórico
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyDetailModalVisible, setHistoryDetailModalVisible] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  
  // Estados de notificação
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([]);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  
  // Estados de categoria customizada
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('star');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  
  // Estados de subtarefas
  const [subtasksDraft, setSubtasksDraft] = useState<Array<{ id: string; title: string; done: boolean; completedById?: string; completedByName?: string; completedAt?: Date; dueDate?: Date; dueTime?: Date; }>>([]);
  // Sempre ter acesso ao valor mais recente das subtarefas (evita estado obsoleto ao salvar)
  const subtasksDraftRef = useRef(subtasksDraft);
  useEffect(() => {
    subtasksDraftRef.current = subtasksDraft;
  }, [subtasksDraft]);
  
  // Estados de categorias de subtarefas
  const [subtaskCategories, setSubtaskCategories] = useState<SubtaskCategory[]>([]);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newSubtaskInCategory, setNewSubtaskInCategory] = useState<{ categoryId: string; title: string } | null>(null);
  
  // Estado para controlar qual modo de subtarefa está ativo
  const [subtaskMode, setSubtaskMode] = useState<'none' | 'simple' | 'category'>('none');
  
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDate, setNewSubtaskDate] = useState<Date | undefined>(undefined);
  const [newSubtaskTime, setNewSubtaskTime] = useState<Date | undefined>(undefined);
  const [newCategorySubtaskDate, setNewCategorySubtaskDate] = useState<Date | undefined>(undefined);
  const [newCategorySubtaskTime, setNewCategorySubtaskTime] = useState<Date | undefined>(undefined);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskCategoryId, setEditingSubtaskCategoryId] = useState<string | null>(null);
  const [showSubtaskDatePicker, setShowSubtaskDatePicker] = useState(false);
  const [showSubtaskTimePicker, setShowSubtaskTimePicker] = useState(false);
  const editingSubtask = useMemo(() => {
    if (!editingSubtaskId) return null;
    // Primeiro procura nas subtarefas simples
    const simpleSubtask = subtasksDraft.find(st => st.id === editingSubtaskId);
    if (simpleSubtask) return simpleSubtask;
    // Se não encontrou, procura nas categorias
    if (editingSubtaskCategoryId) {
      const category = subtaskCategories.find(cat => cat.id === editingSubtaskCategoryId);
      if (category) {
        return category.subtasks.find(st => st.id === editingSubtaskId) || null;
      }
    }
    return null;
  }, [editingSubtaskId, editingSubtaskCategoryId, subtasksDraft, subtaskCategories]);

  // Estados de conectividade e sincronização
  const [isOffline, setIsOffline] = useState(false);
  const [connectivityState, setConnectivityState] = useState<ConnectivityState>({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi'
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSync: 0,
    pendingOperations: 0,
    isOnline: true,
    hasError: false
  });
  
  // Estados de modais adicionais
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [postponeModalVisible, setPostponeModalVisible] = useState(false);
  const [selectedTaskForPostpone, setSelectedTaskForPostpone] = useState<Task | null>(null);
  const [postponeDate, setPostponeDate] = useState(new Date());
  const [postponeTime, setPostponeTime] = useState(new Date());
  const [showPostponeDatePicker, setShowPostponeDatePicker] = useState(false);
  const [showPostponeTimePicker, setShowPostponeTimePicker] = useState(false);


  // Gerenciamento de pilha de modais: apenas o topo da pilha fica visível
  type ModalKey = 'task' | 'repeat' | 'category' | 'settings' | 'picker' | 'subtaskPicker' | 'family' | 'editMember';
  const [modalStack, setModalStack] = useState<ModalKey[]>([]);
  const isTopModal = (key: ModalKey) => modalStack[modalStack.length - 1] === key;
  const openManagedModal = (key: ModalKey) => {
    try { Keyboard.dismiss(); } catch {}
    setModalStack(prev => {
      const next = prev.filter(k => k !== key);
      next.push(key);
      return next;
    });
  };
  const closeManagedModal = (key: ModalKey) => {
    setModalStack(prev => prev.filter(k => k !== key));
  };
  const [selectedApproval, setSelectedApproval] = useState<TaskApproval | null>(null);
  
  // Estados de criação/edição de família
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [isCreatingFamilyMode, setIsCreatingFamilyMode] = useState(false);
  const [newFamilyNameInput, setNewFamilyNameInput] = useState('');
  const [isSavingFamilyName, setIsSavingFamilyName] = useState(false);
  const [editingFamilyName, setEditingFamilyName] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [isSyncingFamily, setIsSyncingFamily] = useState(false);
  
  // Estados de resolução de pedidos admin
  const [resolvingAdminRequestId, setResolvingAdminRequestId] = useState<string | null>(null);
  // Permissões efetivas do próprio usuário (atualizadas do servidor para visual)
  const [myEffectivePerms, setMyEffectivePerms] = useState<{ create?: boolean; edit?: boolean; delete?: boolean } | null>(null);
  
  // Animated value para transições de tab
  const tabFade = useRef(new Animated.Value(1)).current;

  // Função para trocar tabs
  const changeTab = useCallback((tab: 'today' | 'upcoming') => {
    setActiveTab(tab);
  }, []);

  // Atualizar permissões efetivas do dependente ao entrar/alterar família
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!currentFamily || user.role !== 'dependente') {
          setMyEffectivePerms(null);
          return;
        }
        const refreshed = await familyService.getFamilyById(currentFamily.id);
        if (!cancelled && refreshed) {
          setCurrentFamily(refreshed);
          setFamilyMembers(refreshed.members);
          const me = refreshed.members.find(m => m.id === user.id) as any;
          setMyEffectivePerms(me?.permissions || {});
        }
      } catch (e) {
        // Em caso de falha de rede, manter estado atual
        logger.warn('PERMISSIONS', 'Falha ao carregar permissões efetivas do usuário');
      }
    })();
    return () => { cancelled = true; };
  }, [currentFamily?.id, user?.id, user?.role]);

  // Assinar membros da família em tempo real quando o modal "Gerenciar Família" estiver aberto
  useEffect(() => {
    try {
      // Se o modal abrir e houver uma família atual, iniciamos a assinatura
      if (familyModalVisible && currentFamily?.id) {
        // Garante que não haja duas assinaturas ativas
        if (membersUnsubRef.current) {
          try { membersUnsubRef.current(); } catch {}
          membersUnsubRef.current = null;
        }
        const unsubscribe = (familyService as any).subscribeToFamilyMembers(
          currentFamily.id,
          (members: FamilyUser[]) => {
            setFamilyMembers(members);
          }
        );
        membersUnsubRef.current = unsubscribe;
        // Cleanup quando dependências mudarem ou componente desmontar
        return () => {
          try { unsubscribe && unsubscribe(); } catch {}
          membersUnsubRef.current = null;
        };
      }
      // Se o modal fechar, cancelar assinatura se existir
      if (!familyModalVisible && membersUnsubRef.current) {
        try { membersUnsubRef.current(); } catch {}
        membersUnsubRef.current = null;
      }
    } catch (e) {
      logger.warn('FAMILY_MODAL', 'Falha ao gerenciar assinatura de membros');
    }
    // Sem retorno aqui quando modal está fechado
  }, [familyModalVisible, currentFamily?.id]);

  // Texto unificado para indicador de sincronização dentro do modal de família
  const familySyncBanner = useMemo(() => {
    if (!familyModalVisible) return null;
    // Se dependente e as permissões efetivas ainda não foram carregadas, indicar sincronização de permissões
    if (user.role === 'dependente' && currentFamily?.id && myEffectivePerms == null) {
      return 'Sincronizando permissões…';
    }
    // Se houve pedido de sincronização explícita de família
    if (isSyncingFamily) {
      return 'Sincronizando dados da família…';
    }
    return null;
  }, [familyModalVisible, user.role, currentFamily?.id, myEffectivePerms, isSyncingFamily]);

  // Refs para controlar estado do gesto e evitar múltiplas trocas
  const hasSwitchedRef = useRef(false);
  const gestureActiveRef = useRef(false);

  // Handler contínuo (feedback mais suave): troca assim que passa do limiar
  const onSwipeGestureEvent = useCallback((event: any) => {
    const { translationX, velocityX, state } = event.nativeEvent;
    const width = Dimensions.get('window').width;
    const distanceThreshold = width * 0.30; // 30% da largura - exige arrasto mais longo
    const velocityThreshold = 800; // flick mais rápido necessário

    if (state === State.ACTIVE) {
      gestureActiveRef.current = true;
      // Swipe para esquerda -> ir para 'upcoming'
      if (!hasSwitchedRef.current && translationX < -distanceThreshold && activeTab === 'today') {
        hasSwitchedRef.current = true;
        changeTab('upcoming');
      }
      // Swipe para direita -> voltar para 'today'
      if (!hasSwitchedRef.current && translationX > distanceThreshold && activeTab === 'upcoming') {
        hasSwitchedRef.current = true;
        changeTab('today');
      }
      // Flick (alta velocidade) decide imediatamente
      if (!hasSwitchedRef.current && velocityX < -velocityThreshold && activeTab === 'today') {
        hasSwitchedRef.current = true;
        changeTab('upcoming');
      }
      if (!hasSwitchedRef.current && velocityX > velocityThreshold && activeTab === 'upcoming') {
        hasSwitchedRef.current = true;
        changeTab('today');
      }
    }
  }, [activeTab, changeTab]);

  // Handler final para fallback caso não tenha trocado durante o gesto
  const handleSwipeGesture = useCallback((event: any) => {
    const { translationX, velocityX, state } = event.nativeEvent;
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      // Se já trocou durante o movimento, apenas resetar refs
      if (!hasSwitchedRef.current) {
        const width = Dimensions.get('window').width;
        const distanceThreshold = width * 0.35; // fallback ainda maior para evitar trocas acidentais
        const velocityThreshold = 900;

        if ((translationX < -distanceThreshold || velocityX < -velocityThreshold) && activeTab === 'today') {
          changeTab('upcoming');
        } else if ((translationX > distanceThreshold || velocityX > velocityThreshold) && activeTab === 'upcoming') {
          changeTab('today');
        }
      }
      // Reset
      hasSwitchedRef.current = false;
      gestureActiveRef.current = false;
    }
  }, [activeTab]);

  // Função para converter Task local para formato remoto
  const taskToRemoteTask = (task: Task): RemoteTask => {
    logger.debug('📤 Convertendo Local -> Remoto', {
      id: task.id,
      title: task.title,
      localDueDate: task.dueDate,
      localDueTime: task.dueTime,
    });
    const remoteTask: any = {
      id: task.id,
      title: task.title,
      description: task.description || '',
      completed: task.completed,
      status: task.status,
      category: task.category,
      priority: 'media', // valor padrão
      createdAt: task.createdAt,
      updatedAt: task.editedAt || new Date(),
      dueDate: task.dueDate || null, // Converter undefined para null para preservar no Firestore
      dueTime: task.dueTime || null, // Converter undefined para null para preservar no Firestore
  repeatOption: task.repeatOption || 'nenhum',
  repeatDays: task.repeatDays || null,
  repeatIntervalDays: (task as any).repeatIntervalDays || null,
  repeatDurationMonths: (task as any).repeatDurationMonths || null,
  repeatStartDate: (task as any).repeatStartDate || (task as any).createdAt || task.dueDate || null,
      userId: task.userId,
  // Adicionar familyId se o usuário pertence a uma família, mas se a tarefa for privada garantimos null
  familyId: (task as any)?.private === true ? null : currentFamily?.id,
      // Campos de autoria
      createdBy: task.createdBy,
      createdByName: task.createdByName,
    };

    // Subtarefas -> payload simples serializável
    if (Array.isArray(task.subtasks)) {
      remoteTask.subtasks = task.subtasks.map(st => ({
        id: st.id,
        title: st.title,
        done: !!st.done,
        completedById: st.completedById || null,
        completedByName: st.completedByName || null,
        completedAt: st.completedAt || null,
        dueDate: st.dueDate || null, // Incluir dueDate da subtarefa
        dueTime: st.dueTime || null, // Incluir dueTime da subtarefa
      }));
    }

    // Categorias de subtarefas -> payload serializável
    if (Array.isArray((task as any).subtaskCategories)) {
      remoteTask.subtaskCategories = (task as any).subtaskCategories.map((cat: SubtaskCategory) => ({
        id: cat.id,
        name: cat.name,
        isExpanded: cat.isExpanded,
        createdAt: cat.createdAt,
        subtasks: cat.subtasks.map(st => ({
          id: st.id,
          title: st.title,
          done: !!st.done,
          completedById: st.completedById || null,
          completedByName: st.completedByName || null,
          completedAt: st.completedAt || null,
          dueDate: st.dueDate || null,
          dueTime: st.dueTime || null,
        }))
      }));
    }

    // Log para debug de tarefas privadas
    if ((task as any)?.private === true) {
      logger.debug('🔒 Tarefa PRIVADA detectada', {
        id: remoteTask.id,
        title: remoteTask.title,
        private: remoteTask.private,
        familyId: remoteTask.familyId,
        userId: remoteTask.userId
      });
    }

    logger.debug('📤 Dados preparados para envio remota', {
      id: remoteTask.id,
      title: remoteTask.title,
      remoteDueDate: remoteTask.dueDate,
      remoteDueTime: remoteTask.dueTime,
      repeatOption: remoteTask.repeatOption,
      repeatIntervalDays: remoteTask.repeatIntervalDays,
      repeatDurationMonths: remoteTask.repeatDurationMonths,
      repeatStartDate: remoteTask.repeatStartDate,
      editedBy: (task as any).editedBy,
      editedByName: (task as any).editedByName,
      editedAt: (task as any).editedAt
    });

    // Adicionar campos apenas se não forem undefined
    if (task.completed) {
      remoteTask.completedAt = new Date();
    }
    
    if (task.approvalId !== undefined) {
      remoteTask.approvalId = task.approvalId;
    }
    
    if (task.editedBy !== undefined) {
      remoteTask.editedBy = task.editedBy;
    }
    
    if (task.editedByName !== undefined) {
      remoteTask.editedByName = task.editedByName;
    }
    
    if (task.editedAt !== undefined) {
      remoteTask.editedAt = task.editedAt;
    }

    // Garantir que a flag 'private' sempre seja um booleano no payload enviado ao servidor remoto
    remoteTask.private = (task as any).private === true;

    return remoteTask as RemoteTask;
  };

  // Função para converter dado remoto para Task local
  const remoteTaskToTask = (remoteTask: RemoteTask): Task => {
    const remote = remoteTask as any; // Cast para acessar campos estendidos
    const dueDate = safeToDate(remote.dueDate);
    const dueTime = safeToDate(remote.dueTime);

    const repeatOption: 'nenhum' | 'diario' | 'semanal' | 'mensal' | 'intervalo' =
      remote.repeatOption === 'diario' ? 'diario' :
      remote.repeatOption === 'semanal' ? 'semanal' :
      remote.repeatOption === 'mensal' ? 'mensal' :
      remote.repeatOption === 'intervalo' ? 'intervalo' : 'nenhum';
    const repeatDays: number[] | undefined = Array.isArray(remote.repeatDays) ? remote.repeatDays : [];
    const repeatIntervalDays: number | undefined = typeof remote.repeatIntervalDays === 'number' ? remote.repeatIntervalDays : undefined;
    const repeatDurationMonths: number | undefined = typeof remote.repeatDurationMonths === 'number' ? remote.repeatDurationMonths : undefined;
    const repeatStartDate: Date | undefined = safeToDate(remote.repeatStartDate) || undefined;

    return {
      id: remoteTask.id || '',
      title: remoteTask.title,
      description: remote.description || '',
      completed: remoteTask.completed || false,
      status: remote.status || 'pendente' as TaskStatus,
      category: remote.category || 'work',
      priority: remote.priority || 'media',
      familyId: remote.familyId ?? null,
      dueDate: dueDate,
      dueTime: dueTime,
      // Campos planos para persistência e UI
      repeatOption: repeatOption,
      repeatDays: repeatDays,
      repeatIntervalDays: repeatIntervalDays,
      repeatDurationMonths: repeatDurationMonths,
      repeatStartDate: repeatStartDate,
      // Estrutura compatível usada internamente
      repeat: {
        type: repeatOption === 'diario' ? RepeatType.DAILY : repeatOption === 'mensal' ? RepeatType.MONTHLY : repeatOption === 'semanal' ? RepeatType.CUSTOM : repeatOption === 'intervalo' ? RepeatType.INTERVAL : RepeatType.NONE,
        days: repeatDays || [],
        intervalDays: repeatIntervalDays,
        durationMonths: repeatDurationMonths
      },
      userId: remoteTask.userId,
      approvalId: remote.approvalId,
      createdAt: safeToDate(remoteTask.createdAt) || new Date(),
      updatedAt: safeToDate(remoteTask.updatedAt) || safeToDate(remote.editedAt) || safeToDate(remoteTask.createdAt) || new Date(),
      completedAt: safeToDate(remote.completedAt) || undefined,
      subtasks: Array.isArray(remote.subtasks) ? remote.subtasks.map((st: any) => ({
        id: st.id,
        title: st.title,
        done: !!st.done,
        completedById: st.completedById || undefined,
        completedByName: st.completedByName || undefined,
        completedAt: safeToDate(st.completedAt) || undefined,
        dueDate: safeToDate(st.dueDate) || undefined, // Converter dueDate da subtarefa
        dueTime: safeToDate(st.dueTime) || undefined, // Converter dueTime da subtarefa
      })) : [],
      subtaskCategories: Array.isArray(remote.subtaskCategories) ? remote.subtaskCategories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        isExpanded: cat.isExpanded !== undefined ? cat.isExpanded : true,
        createdAt: safeToDate(cat.createdAt) || new Date(),
        subtasks: Array.isArray(cat.subtasks) ? cat.subtasks.map((st: any) => ({
          id: st.id,
          title: st.title,
          done: !!st.done,
          completedById: st.completedById || undefined,
          completedByName: st.completedByName || undefined,
          completedAt: safeToDate(st.completedAt) || undefined,
          dueDate: safeToDate(st.dueDate) || undefined,
          dueTime: safeToDate(st.dueTime) || undefined,
        })) : []
      })) : [],
      createdBy: remote.createdBy || remoteTask.userId,
      createdByName: remote.createdByName || 'Usuário',
      editedBy: remote.editedBy,
      editedByName: remote.editedByName,
      editedAt: safeToDate(remote.editedAt),
      private: remote.private
    } as Task;
  };

  // Função para carregar dados do cache local
  const loadDataFromCache = async () => {
    try {
      logger.debug('CACHE_LOAD', 'Carregando dados do cache local');
      
      // Carregar tarefas do cache
      const cachedRemoteTasks = await LocalStorageService.getTasks();
        if (cachedRemoteTasks.length > 0) {
          const convertedTasks: Task[] = (cachedRemoteTasks.map(remoteTaskToTask as any) as Task[]);
          setTasks(convertedTasks);
        logger.success('CACHE_LOAD', `${convertedTasks.length} tarefas carregadas`);
      }

      // Carregar aprovações do cache
      const cachedApprovals = await LocalStorageService.getApprovals();
      if (cachedApprovals.length > 0) {
        setApprovals(cachedApprovals);
        logger.success('CACHE_LOAD', `${cachedApprovals.length} aprovações carregadas`);
      }

      // Se há dados em cache, mostrar indicador
      const hasCachedData = await LocalStorageService.hasCachedData();
      if (hasCachedData) {
        logger.success('OFFLINE', 'Dados offline disponíveis');
      }

    } catch (error) {
      logger.error('CACHE_LOAD', 'Erro ao carregar dados do cache', error);
    }
  };

  // Função para salvar dados no cache
  const saveDataToCache = async () => {
    try {
      // Salvar tarefas convertidas
      for (const task of tasks) {
  const remoteTask = taskToRemoteTask(task as any);
  await LocalStorageService.saveTask(remoteTask as any);
      }

      // Salvar aprovações
      for (const approval of approvals) {
        await LocalStorageService.saveApproval(approval);
      }
    } catch (error) {
      logger.error('CACHE_SAVE', 'Erro ao salvar dados no cache', error);
    }
  };

  // Função para recarregar tarefas da família
  const reloadFamilyTasks = async () => {
    if (currentFamily) {
      try {
        logger.info('SYNC', 'Recarregando tarefas da família (sync em background)');
        
        // Se estiver online, buscar do Firebase e fazer merge com cache
        if (!isOffline) {
          const familyTasks = await familyService.getFamilyTasks(currentFamily.id, user.id);
          
          // Converter usando função centralizada para manter dueTime e repeatDays
          let convertedTasks: Task[] = familyTasks.map(remoteTaskToTask as any);

          // Filtrar tarefas privadas que não pertencem ao usuário atual
          convertedTasks = convertedTasks.filter(t => {
            const isPrivate = (t as any).private === true;
            if (isPrivate && t.createdBy && t.createdBy !== user.id) return false;
            return true;
          });
          
          logger.debug('REMOTE_TASKS', convertedTasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, dueTime: t.dueTime })));

          // Fazer merge inteligente: manter tarefas locais mais recentes e adicionar novas do servidor remoto
          setTasks(currentTasks => {
            logger.debug('LOCAL_TASKS_BEFORE', currentTasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, dueTime: t.dueTime })));
            
            const mergedTasksMap = new Map(currentTasks.map(t => [t.id, t]));

            // Para cada tarefa remota
            convertedTasks.forEach(remoteTask => {
              const existingTask = mergedTasksMap.get(remoteTask.id);
              
              if (!existingTask) {
                // Tarefa não existe localmente, adicionar
                mergedTasksMap.set(remoteTask.id, remoteTask);
                logger.success('MERGE', `Tarefa nova adicionada: ${remoteTask.title}`);
              } else {
                // Tarefa existe, manter a versão mais recente baseada em updatedAt/editedAt
                const existingTime = existingTask.editedAt || existingTask.createdAt;
                const remoteTime = remoteTask.editedAt || remoteTask.createdAt;
                
                if (remoteTime > existingTime) {
                  // Versão remota é mais recente
                  mergedTasksMap.set(remoteTask.id, remoteTask);
                  logger.info('MERGE', `Tarefa atualizada pelo servidor: ${remoteTask.title}`);
                } else {
                  logger.info('MERGE', `Mantendo versão local de: ${existingTask.title}`);
                }
              }
            });
            
            // Remover tarefas locais que não existem mais no servidor remoto (foram deletadas)
            const remoteIds = new Set(convertedTasks.map(t => t.id));
            currentTasks.forEach(localTask => {
              if (!remoteIds.has(localTask.id)) {
                // Preservar tarefas privadas do criador mesmo se ausentes no remoto
                const isCreatorPrivate = (localTask as any).private === true && localTask.createdBy === user.id;
                if (isCreatorPrivate) {
                  logger.info('MERGE', `Preservando tarefa privada: ${localTask.title}`);
                  return;
                }
                mergedTasksMap.delete(localTask.id);
                logger.debug('MERGE', `Tarefa removida: ${localTask.title}`);
              }
            });

            const finalTasks = Array.from(mergedTasksMap.values());
            logger.debug('LOCAL_TASKS_AFTER', finalTasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, dueTime: t.dueTime })));
            
            return finalTasks;
          });
          
          // Salvar tarefas atualizadas no cache
          for (const task of convertedTasks) {
            await LocalStorageService.saveTask(task as any);
          }
          
          logger.success('SYNC_COMPLETE', `${familyTasks.length} tarefas sincronizadas`);
        }
      } catch (error) {
        logger.error('RELOAD_TASKS', 'Erro ao recarregar tarefas da família', error);
      }
    }
  };

  // Configurar notificações apenas uma vez
  useEffect(() => {
    NotificationService.initialize();
  }, []);

  // Configurar atualização automática e AppState listener
  useEffect(() => {
    verificarTarefasVencidas();
    
    // Configurar atualização automática a cada minuto
    const interval = setInterval(() => {
      logger.debug('AUTO_UPDATE', 'Executando atualização automática agendada');
      forceRefresh();
    }, 60000); // 60000ms = 1 minuto

    const handleAppStateChange = (nextAppState: any) => {
      if (nextAppState === 'active') {
        logger.info('APP_STATE', 'App ativo, forçando atualização');
        forceRefresh();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, []);

  // Verificar tarefas vencidas quando há mudanças nas tasks ou atualizações automáticas
  useEffect(() => {
    verificarTarefasVencidas();
  }, [tasks, lastUpdate]);

  // Contagem regressiva do código de convite
  useEffect(() => {
    let timer: any;
    const updateCountdown = () => {
      const expiry: any = currentFamily?.inviteCodeExpiry;
      const expiryDate = expiry ? (expiry instanceof Date ? expiry : new Date(expiry)) : null;
      if (!expiryDate || isNaN(expiryDate.getTime())) {
        setCodeCountdown('');
        return;
      }
      const diff = expiryDate.getTime() - Date.now();
      if (diff <= 0) {
        setCodeCountdown('expirado');
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      setCodeCountdown(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    };
    updateCountdown();
    timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [currentFamily?.inviteCodeExpiry]);

  // useEffect para executar limpeza do histórico quando há atualizações
  useEffect(() => {
    clearOldHistory();
  }, [lastUpdate]);

  // useEffect para limpar o timeout do botão desfazer quando o componente desmontar
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  // useEffect para inicializar sistema offline
  useEffect(() => {
    const initializeOfflineSystem = async () => {
      try {
        // Inicializar conectividade
        await ConnectivityService.initialize();
        
        // Configurar listener de conectividade
        const removeConnectivityListener = ConnectivityService.addConnectivityListener((state) => {
          setConnectivityState(state);
          setIsOffline(!state.isConnected);
        });

  // Inicializar sincronização (rápido) sem bloquear UI
  await SyncService.initialize();
        
        // Configurar listener de sincronização
        const removeSyncListener = SyncService.addSyncListener((status) => {
          setSyncStatus(status);
        });

        // Obter estado inicial
        const initialState = ConnectivityService.getCurrentState();
        setConnectivityState(initialState);
        setIsOffline(!initialState.isConnected);

        // Carregar dados iniciais de forma otimista do cache
        await loadDataFromCache();

        logger.info('OFFLINE', 'Sistema offline inicializado');

        // Cleanup function
        return () => {
          removeConnectivityListener();
          removeSyncListener();
        };
      } catch (error) {
        logger.error('OFFLINE_INIT', 'Erro ao inicializar sistema offline', error);
      }
    };

    const cleanup = initializeOfflineSystem();
    
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, []);

  // Disparo defensivo de sincronização no início do app
  // Motivo: quando o app abre, podemos ter o usuário no AsyncStorage mas o Firebase Auth
  // ainda não inicializou o currentUser. Isso faz com que as primeiras consultas remotas retornem vazio.
  // Aqui garantimos um forceFullSync imediato e um retry curto (2s) para ocorrer
  // logo após o Firebase Auth ficar pronto.
  useEffect(() => {
    if (didStartupSyncRef.current) return;
    if (isOffline || !user?.id) return;

    didStartupSyncRef.current = true;

    // Tentativa imediata
    SyncService.forceFullSync().catch(e => logger.warn('STARTUP', 'forceFullSync error'));

    // Retry curto para captar o currentUser do Firebase já inicializado
    const retry = setTimeout(() => {
      SyncService.forceFullSync().catch(e => logger.warn('STARTUP', 'retry forceFullSync error'));
    }, 2000);

    return () => clearTimeout(retry);
  }, [user?.id, isOffline]);

  // useEffect para carregar dados do cache quando fica offline
  useEffect(() => {
    if (isOffline) {
      loadDataFromCache();
    }
  }, [isOffline]);

  // useEffect para carregar família do usuário e suas tarefas
  useEffect(() => {
    const loadUserFamily = async () => {
      try {
        if (user?.id) {
          logger.debug('FAMILY_LOAD', {
            userId: user.id,
            familyId: user.familyId,
            isOffline: isOffline
          });
          // Mostra overlay de boot enquanto carrega dados essenciais
          setIsBootstrapping(true);
          
          // ========================================
          // 1. CARREGAR DO CACHE LOCAL PRIMEIRO (INSTANTÂNEO)
          // ========================================
          logger.debug('CACHE_LOAD', 'Carregando dados do cache local');
          try {
            const cachedTasks = await LocalStorageService.getTasks();
            if (cachedTasks.length > 0) {
              const localTasks: Task[] = (cachedTasks.map(remoteTaskToTask as any) as Task[]);
              // Filtrar tarefas privadas que não pertencem ao usuário atual
              const filteredTasks = localTasks.filter(t => {
                const isPrivate = (t as any).private === true;
                if (isPrivate && t.createdBy && t.createdBy !== user.id) return false;
                return true;
              });
              setTasks(filteredTasks);
              logger.success('CACHE_LOAD', `${filteredTasks.length} tarefas carregadas do cache local`);
            }

            // Carregar família do cache se disponível
            const offlineData = await LocalStorageService.getOfflineData();
            if (user.familyId && offlineData.families[user.familyId]) {
              setCurrentFamily(offlineData.families[user.familyId]);
              logger.success('CACHE_LOAD', `Família carregada do cache: ${offlineData.families[user.familyId].name}`);
            }
          } catch (cacheError) {
            logger.warn('CACHE_ERROR', 'Erro ao carregar do cache local');
          }
          
          // ========================================
          // 2. SINCRONIZAR EM BACKGROUND (NÃO BLOQUEIA A UI)
          // ========================================
          if (!isOffline) {
            logger.debug('SYNC', 'Iniciando sincronização em background');
            
            // Carrega família do Firebase em background
            const userFamily = await familyService.getUserFamily(user.id);
          logger.debug('FAMILY_SEARCH', { userFamily });
          
          if (userFamily) {
            setCurrentFamily(userFamily);
            logger.success('FAMILY_LOAD', `Família atualizada do Firebase: ${userFamily.name}`);
            
            // Salvar família no cache
            await LocalStorageService.saveFamily(userFamily);
            
            // Carregar tarefas da família em background
            const familyTasks = await familyService.getFamilyTasks(userFamily.id, user.id);
            let convertedTasks: Task[] = familyTasks.map(remoteTaskToTask as any);
            
            // Filtrar tarefas privadas
            convertedTasks = convertedTasks.filter(t => {
              const isPrivate = (t as any).private === true;
              if (isPrivate && t.createdBy && t.createdBy !== user.id) return false;
              return true;
            });
            
            // Fazer merge inteligente com tarefas locais
            setTasks(currentTasks => {
              const mergedTasksMap = new Map(currentTasks.map(t => [t.id, t]));
              
              convertedTasks.forEach(remoteTask => {
                const existingTask = mergedTasksMap.get(remoteTask.id);
                
                if (!existingTask) {
                  mergedTasksMap.set(remoteTask.id, remoteTask);
                } else {
                  const existingTime = existingTask.editedAt || existingTask.createdAt;
                  const remoteTime = remoteTask.editedAt || remoteTask.createdAt;
                  
                  if (remoteTime > existingTime) {
                    mergedTasksMap.set(remoteTask.id, remoteTask);
                  }
                }
              });
              
              // Remover tarefas que não existem mais no servidor
              const remoteIds = new Set(convertedTasks.map(t => t.id));
              currentTasks.forEach(localTask => {
                if (!remoteIds.has(localTask.id)) {
                  const isCreatorPrivate = (localTask as any).private === true && localTask.createdBy === user.id;
                  if (!isCreatorPrivate) {
                    mergedTasksMap.delete(localTask.id);
                  }
                }
              });
              
              return Array.from(mergedTasksMap.values());
            });
            
            // Salvar tarefas atualizadas no cache
            for (const task of convertedTasks) {
              await LocalStorageService.saveTask(task as any);
            }
            
            logger.success('SYNC_BG', `${familyTasks.length} tarefas sincronizadas do Firebase`);
            
            // Disparar sync completo para garantir que tudo está atualizado
            SyncService.forceFullSync().catch(e => logger.warn('SYNC_BG', 'forceFullSync error'));
          } else {
            logger.info('FAMILY_LOAD', 'Usuário não possui família no Firebase');
            
            // Fallback: se temos familyId salvo, tentar carregar diretamente pelo ID
            if (user.familyId) {
              try {
                const fetchedFamily = await familyService.getFamilyById(user.familyId);
                if (fetchedFamily) {
                  setCurrentFamily(fetchedFamily);
                  await LocalStorageService.saveFamily(fetchedFamily);
                  logger.success('FAMILY_FALLBACK', `Família carregada via fallback: ${fetchedFamily.name}`);
                  
                  const familyTasks = await familyService.getFamilyTasks(fetchedFamily.id, user.id);
                  let convertedTasks: Task[] = familyTasks.map(remoteTaskToTask as any);
                  convertedTasks = convertedTasks.filter(t => {
                    const isPrivate = (t as any).private === true;
                    if (isPrivate && t.createdBy && t.createdBy !== user.id) return false;
                    return true;
                  });
                  
                  setTasks(convertedTasks);
                  
                  // Salvar no cache
                  for (const task of convertedTasks) {
                    await LocalStorageService.saveTask(task as any);
                  }
                  
                  logger.success('SYNC_FALLBACK', `${convertedTasks.length} tarefas da família sincronizadas`);
                  SyncService.forceFullSync().catch(e => logger.warn('SYNC_BG', 'forceFullSync error'));
                }
              } catch (e) {
                logger.warn('FAMILY_FALLBACK', 'Falha ao carregar família via fallback');
              }
            }
          }
          }
        }
      } catch (error) {
        logger.error('FAMILY_LOAD', 'Erro ao carregar família do usuário', error);
        
        // Em caso de erro, tentar carregar do cache local
        try {
          const cachedTasks = await LocalStorageService.getTasks();
          if (cachedTasks.length > 0) {
            setTasks(cachedTasks);
            logger.info('FALLBACK', `${cachedTasks.length} tarefas carregadas do cache`);
          }
        } catch (cacheError) {
          logger.error('FALLBACK', 'Erro ao carregar do cache', cacheError);
        }
      } finally {
        setIsBootstrapping(false);
      }
    };

    logger.debug('FAMILY_LOAD_START', {
      hasUserId: !!user?.id,
      userId: user?.id,
      isOffline
    });
    
    loadUserFamily();
  }, [user?.id, isOffline]);

  // Disparar um refresh completo uma única vez quando a família estiver definida e estivermos online
  useEffect(() => {
    if (didInitialFamilyRefreshRef.current) return;
    if (isOffline) return;
    if (!currentFamily?.id) return;
    didInitialFamilyRefreshRef.current = true;
    forceRefresh().catch(e => logger.warn('REFRESH', 'Initial forceRefresh error'));
  }, [currentFamily?.id, isOffline]);

  // useEffect para carregar histórico da família
  useEffect(() => {
    let unsubscribeHistory: (() => void) | null = null;

    const loadHistory = async () => {
      try {
        // Verificar se há usuário válido antes de tentar carregar histórico
        if (!user || !user.id) {
          logger.debug('HISTORY', 'Usuário não definido, pulando carregamento');
          return;
        }

    // Primeiro, carregar histórico do cache local
    logger.debug('HISTORY', 'Carregando histórico do cache local');
  const localHistory = await LocalStorageService.getHistory(100);
  setHistory(localHistory.sort((a,b)=> new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime()));

    // Limpar histórico antigo (manter apenas 7 dias)
    await LocalStorageService.clearOldHistory(HISTORY_DAYS_TO_KEEP);

        if (currentFamily && currentFamily.id && !isOffline) {
          logger.debug('HISTORY', 'Carregando histórico da família');

          // Configurar listener para atualizações de tarefas em tempo real
          const unsubscribeTasks = familyService.subscribeToFamilyTasks(
            currentFamily.id,
            (updatedTasks) => {
              const convertedTasks: Task[] = updatedTasks
                .filter(task => {
                  // Se a tarefa estiver na lista de espera, não a atualize
                  if (pendingSyncIds.includes(task.id)) {
                    logger.debug('REAL_TIME_SYNC', `Tarefa ${task.id} ignorada (pendente)`);
                    return false; // Não incluir esta atualização
                  }

                  // Filtrar tarefas privadas de outros usuários
                  const isPrivate = (task as any).private === true;
                  if (isPrivate && task.createdBy && task.createdBy !== user.id) {
                    logger.debug('REAL_TIME_SYNC', `Tarefa privada ${task.id} ignorada`);
                    return false;
                  }

                  return true; // Incluir esta atualização
                });

              // Mesclar com as tarefas que estão pendentes
              setTasks(prevTasks => {
                const nonPendingTasks = prevTasks.filter(t => !pendingSyncIds.includes(t.id));
                const pendingTasks = prevTasks.filter(t => pendingSyncIds.includes(t.id));

                // Criar um mapa de tarefas atualizadas para acesso rápido
                const updatedTasksMap = new Map(convertedTasks.map(t => [t.id, t]));

                // Atualizar as tarefas não pendentes
                const mergedNonPending = nonPendingTasks.map(t => updatedTasksMap.get(t.id) || t);

                // Adicionar novas tarefas que não estavam no estado anterior
                convertedTasks.forEach(t => {
                  if (!nonPendingTasks.some(nt => nt.id === t.id) && !pendingTasks.some(pt => pt.id === t.id)) {
                    mergedNonPending.push(t);
                  }
                });

                return [...mergedNonPending, ...pendingTasks];
              });
            },
            user.id
          );
          
          // Carregar histórico inicial da família
          const familyHistory = await familyService.getFamilyHistory(currentFamily.id, 50);
          
          // Verificar se familyHistory é válido
          if (!familyHistory || !Array.isArray(familyHistory)) {
            logger.warn('HISTORY_INVALID', 'Histórico da família inválido');
            return;
          }
          
          // Converter histórico da família para formato local (usar createdAt como timestamp)
          const convertedHistory: HistoryItem[] = familyHistory.map(item => {
            // Verificar se o item tem propriedades necessárias
            if (!item || typeof item !== 'object') {
              logger.warn('HISTORY_ITEM_INVALID', 'Item de histórico inválido');
              return {
                id: 'invalid-' + Date.now(),
                action: 'created',
                taskTitle: 'Item inválido',
                taskId: '',
                timestamp: new Date(),
                details: '',
                userId: '',
                userName: 'Desconhecido',
                userRole: ''
              };
            }

            const ts = safeToDate((item as any).createdAt) || safeToDate((item as any).timestamp) || new Date();

            return {
              id: (item as any).id || 'unknown-' + Date.now(),
              action: (item as any).action || 'created',
              taskTitle: (item as any).taskTitle || 'Tarefa desconhecida',
              taskId: (item as any).taskId || '',
              timestamp: ts,
              details: (item as any).details || '',
              userId: (item as any).userId || '',
              userName: (item as any).userName || 'Usuário desconhecido',
              userRole: (item as any).userRole || ''
            };
          });

          // Mesclar histórico da família com histórico local
          setHistory(prevHistory => {
            // Filtrar histórico local para evitar duplicatas
            const localOnlyHistory = prevHistory.filter(localItem => {
              return !convertedHistory.some(familyItem => 
                familyItem.taskId === localItem.taskId && 
                familyItem.action === localItem.action &&
                Math.abs(familyItem.timestamp.getTime() - localItem.timestamp.getTime()) < 5000
              );
            });

            const mergedHistory = [...convertedHistory, ...localOnlyHistory];
            
            // Ordenar por timestamp (mais recente primeiro)
            return mergedHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          });

          // Configurar listener para atualizações em tempo real
          unsubscribeHistory = familyService.subscribeToFamilyHistory(
            currentFamily.id,
            (updatedHistory) => {
              const convertedUpdatedHistory: HistoryItem[] = updatedHistory.map(item => ({
                id: (item as any).id,
                action: (item as any).action,
                taskTitle: (item as any).taskTitle,
                taskId: (item as any).taskId,
                // Garantir que timestamp esteja preenchido corretamente
                timestamp: safeToDate((item as any).createdAt) || safeToDate((item as any).timestamp) || new Date(),
                details: (item as any).details,
                userId: (item as any).userId,
                userName: (item as any).userName,
                userRole: (item as any).userRole
              }));

              // Mesclar com o histórico atual em vez de substituir, evitando "sumiço"
              setHistory(prev => {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - HISTORY_DAYS_TO_KEEP);

                // Combinar listas (novos primeiro para priorizar remotos)
                const combined = [...convertedUpdatedHistory, ...prev];

                const result: HistoryItem[] = [];
                for (const item of combined) {
                  const itemDate = item.timestamp instanceof Date ? item.timestamp : safeToDate(item.timestamp);
                  if (!itemDate || itemDate < cutoffDate) continue; // aplicar retenção

                  // Evitar duplicatas: mesmo taskId + action com timestamps muito próximos
                  const duplicateIndex = result.findIndex(r =>
                    r.taskId === item.taskId &&
                    r.action === item.action &&
                    Math.abs((r.timestamp as Date).getTime() - itemDate.getTime()) < 5000
                  );
                  if (duplicateIndex === -1) {
                    result.push({ ...item, timestamp: itemDate });
                  }
                }

                // Ordenar por timestamp desc e limitar quantidade
                return result
                  .sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime())
                  .slice(0, 100);
              });
            },
            50
          );

          logger.success('HISTORY_LOAD', `${familyHistory.length} itens carregados`);
        }
      } catch (error) {
        logger.error('HISTORY_LOAD', 'Erro ao carregar histórico da família', error);
      }
    };

    loadHistory();

    // Cleanup ao desmontar ou trocar de família
    return () => {
      if (unsubscribeHistory) {
        unsubscribeHistory();
      }
    };
  }, [currentFamily?.id, isOffline, user?.id]);

  // Assinar atualizações de approvals em tempo real
  useEffect(() => {
    const unsubscribe = SyncService.addApprovalsListener((items) => {
      // Atualizar apenas se usuário for admin ou se o approval pertencer ao usuário (dependente)
      if (user.role === 'admin') {
  setApprovals(items);
  // Separar solicitações de promoção a admin (type === 'admin_role_request')
  const adminReqs = (items as any[]).filter(a => a && (a as any).type === 'admin_role_request');
  setAdminRoleRequests(adminReqs);
      } else {
  setApprovals(items.filter(a => a.dependenteId === user.id));
  // Dependentes não veem solicitações a admin; limpar
  setAdminRoleRequests([]);
      }
    });
    return () => unsubscribe();
  }, [user.role, user.id]);

  // 🎨 Assinar atualizações de categorias da família em tempo real
  useEffect(() => {
    let unsubscribeCategories: (() => void) | null = null;

    const loadFamilyCategories = async () => {
      if (!currentFamily || !currentFamily.id) {
        logger.debug('CATEGORIES', 'Sem família, usando categorias padrão');
        setCategories(DEFAULT_CATEGORIES);
        return;
      }

      try {
        logger.debug('CATEGORIES', `Carregando categorias da família: ${currentFamily.id}`);
        
        // Carregar categorias iniciais
        const familyCategories = await familyService.getFamilyCategories(currentFamily.id);
        
        if (familyCategories.length > 0) {
          // Mesclar categorias padrão com categorias personalizadas da família
          const mergedCategories = [
            ...DEFAULT_CATEGORIES,
            ...familyCategories.filter(cat => !cat.isDefault)
          ];
          setCategories(mergedCategories);
          logger.success('CATEGORIES', `${mergedCategories.length} categorias carregadas`);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }

        // Assinar atualizações em tempo real (apenas se online)
        if (!isOffline) {
          unsubscribeCategories = familyService.subscribeToFamilyCategories(
            currentFamily.id,
            (updatedCategories) => {
              logger.debug('CATEGORIES_RT', 'Categorias atualizadas em tempo real');
              const mergedCategories = [
                ...DEFAULT_CATEGORIES,
                ...updatedCategories.filter(cat => !cat.isDefault)
              ];
              setCategories(mergedCategories);
            }
          );
        }
      } catch (error) {
        logger.error('CATEGORIES', 'Erro ao carregar categorias da família', error);
        setCategories(DEFAULT_CATEGORIES);
      }
    };

    loadFamilyCategories();

    return () => {
      if (unsubscribeCategories) {
        unsubscribeCategories();
      }
    };
  }, [currentFamily?.id, isOffline]);

  // Função para forçar atualização completa do aplicativo
  const forceRefresh = async () => {
    logger.debug('REFRESH', 'Forçando atualização completa');
    
    setIsRefreshing(true);
    
    try {
      // Forçar sincronização completa se estiver online
      if (!isOffline && user?.id) {
        await SyncService.forceFullSync();
        
        // Recarregar dados da família se houver
        if (currentFamily) {
          const familyTasks = await familyService.getFamilyTasks(currentFamily.id, user.id);
          // Converter e filtrar tarefas privadas que não pertencem ao usuário atual
          let convertedTasks: Task[] = familyTasks.map(remoteTaskToTask as any);
          convertedTasks = convertedTasks.filter(t => {
            const isPrivate = (t as any).private === true;
            if (isPrivate && t.createdBy && t.createdBy !== user.id) return false;
            return true;
          });

          // Aplicar o mesmo merge inteligente usado no reloadFamilyTasks para preservar privadas do criador
          setTasks(currentTasks => {
            const mergedTasksMap = new Map(currentTasks.map(t => [t.id, t]));

            convertedTasks.forEach(remoteTask => {
              const existingTask = mergedTasksMap.get(remoteTask.id);
              if (!existingTask) {
                mergedTasksMap.set(remoteTask.id, remoteTask);
              } else {
                const existingTime = existingTask.editedAt || existingTask.createdAt;
                const remoteTime = remoteTask.editedAt || remoteTask.createdAt;
                if (remoteTime > existingTime) {
                  mergedTasksMap.set(remoteTask.id, remoteTask);
                }
              }
            });

            const remoteIds = new Set(convertedTasks.map(t => t.id));
            currentTasks.forEach(localTask => {
              if (!remoteIds.has(localTask.id)) {
                const isCreatorPrivate = (localTask as any).private === true && localTask.createdBy === user.id;
                if (isCreatorPrivate) {
                  return;
                }
                mergedTasksMap.delete(localTask.id);
              }
            });

            return Array.from(mergedTasksMap.values());
          });

          logger.success('REFRESH', `${familyTasks.length} tarefas recarregadas (merge aplicado)`);
        }
      }
    } catch (error) {
      logger.error('REFRESH', 'Erro ao forçar sincronização', error);
    }
    
    // Atualizar timestamp
    setLastUpdate(new Date());
    
    // Verificar tarefas vencidas
    verificarTarefasVencidas();
    
    // Limpar histórico antigo
    clearOldHistory();
    
    // Simular um pequeno delay para mostrar o feedback visual
    setTimeout(() => {
      setIsRefreshing(false);
      
      // Log de confirmação de sincronização
      logger.success('REFRESH', 'Sincronização concluída com sucesso!');
    }, 1000);
  };

  // Auto-disparar sincronização quando houver pendências ou status de sincronização ativo
  useEffect(() => {
    const now = Date.now();
    const shouldAutoSync = !isOffline && (syncStatus.pendingOperations > 0 || syncStatus.isSyncing);
    const elapsed = now - (lastAutoSyncAtRef.current || 0);
    if (shouldAutoSync && elapsed > 5000) { // debouncing 5s
      lastAutoSyncAtRef.current = now;
      // Preferir forceFullSync para reconciliar cache e listeners
      (async () => {
        try {
          await SyncService.forceFullSync();
        } catch (e) {
          logger.warn('AUTO_SYNC', 'forceFullSync falhou');
        }
      })();
    }
  }, [syncStatus.pendingOperations, syncStatus.isSyncing, isOffline]);

  const configurarNotificacoes = async () => {
    // Configurar handler de notificações
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowList: true,
      }),
    });

    // Usar a função do serviço para inicializar
    const result = await NotificationService.initialize();
    
    if (!result.granted) {
      Alert.alert(
        'Permissão de Notificação',
        'Para receber lembretes de tarefas vencidas, permita as notificações nas configurações do seu dispositivo.'
      );
    }
  };

  const verificarTarefasVencidas = () => {
    const agora = new Date();
    let notificadaspendentes = 0;

    tasks.forEach(task => {
      if (task.dueDate && !task.completed) {
        const dataVencimento = safeToDate(task.dueDate);
        if (!dataVencimento) return; // Skip se não conseguir converter a data

        if (task.dueTime) {
          const horaVencimento = safeToDate(task.dueTime);
          if (horaVencimento) {
            dataVencimento.setHours(horaVencimento.getHours(), horaVencimento.getMinutes());
          }
        }

        const diffMinutos = (agora.getTime() - dataVencimento.getTime()) / (1000 * 60);

        // Usar a nova função de verificação do serviço
        if (diffMinutos >= 0 && NotificationService.shouldNotifyForOverdue(diffMinutos)) {
          // Verificar se já enviou notificação para esta tarefa recentemente
          const lastNotificationTime = overdueNotificationTrackRef.current[task.id];
          const now = Date.now();
          const throttleMs = NOTIFICATION_THROTTLE_MINUTES * 60 * 1000;
          
          if (!lastNotificationTime || (now - lastNotificationTime) > throttleMs) {
            const diffHoras = Math.floor(diffMinutos / 60);
            const diffDias = Math.floor(diffHoras / 24);
            
            const timeStr = diffDias > 0 
              ? `${diffDias}d` 
              : `${diffHoras}h`;
            
            logger.debug('NOTIFY', `Notificando tarefa vencida: "${task.title}" (${timeStr} atraso)`);
            enviarNotificacaoVencimento(task);
            
            // Atualizar timestamp da última notificação
            overdueNotificationTrackRef.current[task.id] = now;
            notificadaspendentes++;
          } else {
            // Notificação já foi enviada recentemente, ignorar
            const minutosRestantes = Math.ceil((throttleMs - (now - lastNotificationTime)) / 60000);
            logger.debug('NOTIFY', `Tarefa "${task.title}" já notificada há pouco (próxima em ${minutosRestantes}min)`);
          }
        }
      }
    });

    if (notificadaspendentes > 0) {
      logger.info('NOTIFY', `✅ ${notificadaspendentes} notificação(ões) de vencimento enviada(s)`);
    }
  };

  const enviarNotificacaoVencimento = async (task: Task) => {
    // No web, ignorar envio de notificação imediata
    if (Platform.OS === 'web') return;

    try {
      // Usar a nova função melhorada para notificações de tarefas vencidas
      const notificationId = await NotificationService.sendOverdueTaskNotification(task);

      if (notificationId) {
        logger.success('NOTIFY', `Notificação enviada para: "${task.title}"`);
      } else {
        logger.warn('NOTIFY', `Falha ao enviar notificação para: "${task.title}"`);
      }
    } catch (e) {
      logger.error('NOTIFY', 'Erro ao enviar notificação de vencimento', e);
    }
  };
  
  // Estado para controlar quais cards estão colapsados (por padrão todos colapsados)
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
  
  // Inicializar todas as tarefas como colapsadas ao carregar
  useEffect(() => {
    if (tasks.length > 0) {
      setCollapsedCards(new Set(tasks.map(t => t.id)));
    }
  }, [tasks.length]);
  
  // Toggle para colapsar/expandir um card específico
  const toggleCardCollapse = useCallback((taskId: string) => {
    setCollapsedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Debug: monitorar mudanças nos pickers
  useEffect(() => {
    logger.debug('PICKERS', {
      showDatePicker,
      showTimePicker,
      showSubtaskDatePicker: false, // será definido depois
      showSubtaskTimePicker: false
    });
  }, [showDatePicker, showTimePicker]);

  // Datas/horas estáveis para evitar resets no DateTimePicker durante re-renderizações
  // todayStart: hoje às 00:00, usado como minimumDate e fallback estável para datas
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  // stableNowRef: "agora" capturado apenas no primeiro render, usado como fallback estável para horas
  const stableNowRef = useRef<Date>(new Date());
  
  // Refs para manter valor base ao abrir pickers (evita usar "agora" como fallback)
  // IMPORTANTE: Declaradas ANTES dos useMemo que as utilizam
  const datePickerBaseRef = useRef<Date | null>(null);
  const timePickerBaseRef = useRef<Date | null>(null);
  
  // Refs para armazenar COMPLETAMENTE o valor do picker (não usa estado)
  const pickerDateValueRef = useRef<Date>(new Date());
  const pickerTimeValueRef = useRef<Date>(new Date());
  
  // Refs para subtarefas - mesma estratégia
  const pickerSubtaskDateValueRef = useRef<Date>(new Date());
  const pickerSubtaskTimeValueRef = useRef<Date>(new Date());
  
  // Refs para modal de adiamento - mesma estratégia
  const pickerPostponeDateValueRef = useRef<Date>(new Date());
  const pickerPostponeTimeValueRef = useRef<Date>(new Date());
  const originalPostponeDateRef = useRef<Date | null>(null);
  const originalPostponeTimeRef = useRef<Date | null>(null);
  
  // Valores estáveis usando APENAS refs - nunca recalcula durante re-renders
  const stableDatePickerValue = pickerDateValueRef.current;
  const stableTimePickerValue = pickerTimeValueRef.current;
  const stableSubtaskDatePickerValue = pickerSubtaskDateValueRef.current;
  const stableSubtaskTimePickerValue = pickerSubtaskTimeValueRef.current;
  const stablePostponeDatePickerValue = pickerPostponeDateValueRef.current;
  const stablePostponeTimePickerValue = pickerPostponeTimeValueRef.current;
  
  // Refs para inputs web (date/time nativos HTML5) - usando any para compatibilidade com React Native Web
  const webDateInputRef = useRef<any>(null);
  const webTimeInputRef = useRef<any>(null);
  const webSubtaskDateInputRef = useRef<any>(null);
  const webSubtaskTimeInputRef = useRef<any>(null);
  
  // useEffect para criar inputs HTML diretamente no DOM (Web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    logger.debug('WEB_INPUTS', 'Criando inputs HTML no DOM');

    // Criar container para inputs (mantê-lo no viewport, porém imperceptível)
    const container = document.createElement('div');
    container.id = 'date-time-inputs-container';
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.bottom = '0';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.overflow = 'hidden';
    container.style.zIndex = '2147483647';
    document.body.appendChild(container);

    // Pequeno helper para estilizar inputs de forma "visível" para o browser, porém invisível ao usuário
    const styleHiddenInput = (el: HTMLInputElement) => {
      el.style.position = 'absolute';
      el.style.left = '0';
      el.style.bottom = '0';
      el.style.width = '1px';
      el.style.height = '1px';
      el.style.opacity = '0.01'; // não totalmente 0 para evitar bloqueios em alguns navegadores
      el.style.border = '0';
      el.style.padding = '0';
      el.style.margin = '0';
      el.style.background = 'transparent';
      el.setAttribute('tabindex', '-1');
    };

    // Criar input de data principal
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.id = 'web-date-input';
    styleHiddenInput(dateInput);
    const dateChangeHandler = (e: Event) => {
      const target = e.target as HTMLInputElement;
      logger.debug('WEB_INPUT', `Data selecionada: ${target.value}`);
      if (target.value) {
        const [year, month, day] = target.value.split('-').map(Number);
        const newDate = new Date(year, month - 1, day);
        setTempDueDate(newDate);
        setShowDatePicker(false);
      }
    };
    dateInput.addEventListener('change', dateChangeHandler);
    container.appendChild(dateInput);
    webDateInputRef.current = dateInput as any;
    logger.debug('WEB_INPUTS', 'webDateInputRef atribuído');

    // Criar input de hora principal
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.id = 'web-time-input';
    styleHiddenInput(timeInput);
    const timeChangeHandler = (e: Event) => {
      const target = e.target as HTMLInputElement;
      logger.debug('WEB_INPUT', `Hora selecionada: ${target.value}`);
      if (target.value) {
        const [hours, minutes] = target.value.split(':').map(Number);
        const base = tempDueDate || stableNowRef.current;
        const newTime = new Date(base);
        newTime.setHours(hours, minutes, 0, 0);
        setTempDueTime(newTime);
        setShowTimePicker(false);
      }
    };
    timeInput.addEventListener('change', timeChangeHandler);
    container.appendChild(timeInput);
    webTimeInputRef.current = timeInput as any;
    logger.debug('WEB_INPUTS', 'webTimeInputRef atribuído');

    // Criar input de data da subtarefa
    const subtaskDateInput = document.createElement('input');
    subtaskDateInput.type = 'date';
    subtaskDateInput.id = 'web-subtask-date-input';
    styleHiddenInput(subtaskDateInput);
    const subtaskDateChangeHandler = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const currentEditingId = (subtaskDateInput as any)._editingSubtaskId;
      const categoryId = (subtaskDateInput as any)._categoryId;
      logger.debug('WEB_INPUT', `Data subtarefa: ${target.value}, ID: ${currentEditingId}`);
      if (target.value && currentEditingId) {
        const [year, month, day] = target.value.split('-').map(Number);
        const newDate = new Date(year, month - 1, day);
        
        // Se é nova subtarefa simples
        if (currentEditingId === 'new-subtask') {
          setNewSubtaskDate(newDate);
        }
        // Se é nova subtarefa de categoria
        else if (currentEditingId === 'new-category-subtask') {
          setNewCategorySubtaskDate(newDate);
        }
        // Se tem categoryId, atualizar subtarefa da categoria existente
        else if (categoryId) {
          setSubtaskCategories(prev =>
            prev.map(cat =>
              cat.id === categoryId
                ? {
                    ...cat,
                    subtasks: cat.subtasks.map(st =>
                      st.id === currentEditingId ? { ...st, dueDate: newDate } : st
                    )
                  }
                : cat
            )
          );
        } else {
          // Senão, atualizar subtarefa simples existente
          setSubtasksDraft(prev => prev.map(st => 
            st.id === currentEditingId ? { ...st, dueDate: newDate } : st
          ));
        }
        setShowSubtaskDatePicker(false);
      }
    };
    subtaskDateInput.addEventListener('change', subtaskDateChangeHandler);
    container.appendChild(subtaskDateInput);
    webSubtaskDateInputRef.current = subtaskDateInput as any;
    logger.debug('WEB_INPUTS', 'webSubtaskDateInputRef atribuído');

    // Criar input de hora da subtarefa
    const subtaskTimeInput = document.createElement('input');
    subtaskTimeInput.type = 'time';
    subtaskTimeInput.id = 'web-subtask-time-input';
    styleHiddenInput(subtaskTimeInput);
    const subtaskTimeChangeHandler = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const currentEditingId = (subtaskTimeInput as any)._editingSubtaskId;
      const categoryId = (subtaskTimeInput as any)._categoryId;
      logger.debug('WEB_INPUT', `Hora subtarefa: ${target.value}, ID: ${currentEditingId}`);
      if (target.value && currentEditingId) {
        const [hours, minutes] = target.value.split(':').map(Number);
        
        // Se é nova subtarefa simples
        if (currentEditingId === 'new-subtask') {
          const baseDate = newSubtaskDate || new Date();
          const newTime = new Date(baseDate);
          newTime.setHours(hours, minutes, 0, 0);
          setNewSubtaskTime(newTime);
        }
        // Se é nova subtarefa de categoria
        else if (currentEditingId === 'new-category-subtask') {
          const baseDate = newCategorySubtaskDate || new Date();
          const newTime = new Date(baseDate);
          newTime.setHours(hours, minutes, 0, 0);
          setNewCategorySubtaskTime(newTime);
        }
        // Se tem categoryId, atualizar subtarefa da categoria existente
        else if (categoryId) {
          setSubtaskCategories(prev =>
            prev.map(cat =>
              cat.id === categoryId
                ? {
                    ...cat,
                    subtasks: cat.subtasks.map(st => {
                      if (st.id !== currentEditingId) return st;
                      
                      // Preservar a data da subtarefa se existir, senão usar hoje
                      const baseDate = st.dueDate || new Date();
                      const newTime = new Date(baseDate);
                      newTime.setHours(hours, minutes, 0, 0);
                      
                      return { ...st, dueTime: newTime };
                    })
                  }
                : cat
            )
          );
        } else {
          // Senão, atualizar subtarefa simples existente
          setSubtasksDraft(prev => prev.map(st => {
            if (st.id !== currentEditingId) return st;
            
            // Preservar a data da subtarefa se existir, senão usar hoje
            const baseDate = st.dueDate || new Date();
            const newTime = new Date(baseDate);
            newTime.setHours(hours, minutes, 0, 0);
            
            return { ...st, dueTime: newTime };
          }));
        }
        setShowSubtaskTimePicker(false);
        logger.debug('WEB_INPUT', `Hora subtarefa atualizada para: ${currentEditingId}`);
      }
    };
    subtaskTimeInput.addEventListener('change', subtaskTimeChangeHandler);
    container.appendChild(subtaskTimeInput);
    webSubtaskTimeInputRef.current = subtaskTimeInput as any;
    logger.debug('WEB_INPUTS', 'webSubtaskTimeInputRef atribuído');

    logger.success('WEB_INPUTS', '4 inputs HTML criados e refs atribuídos');

    // Cleanup
    return () => {
      logger.debug('WEB_INPUTS', 'Limpando inputs HTML do DOM');
      dateInput.removeEventListener('change', dateChangeHandler);
      timeInput.removeEventListener('change', timeChangeHandler);
      subtaskDateInput.removeEventListener('change', subtaskDateChangeHandler);
      subtaskTimeInput.removeEventListener('change', subtaskTimeChangeHandler);
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, []); // Array vazio = executar apenas uma vez na montagem
  
  // Estados para repetição
  const [repeatType, setRepeatType] = useState<RepeatType>(RepeatType.NONE);
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [repeatModalVisible, setRepeatModalVisible] = useState(false);
  const [tempCustomDays, setTempCustomDays] = useState<number[]>([]);
  const [tempIntervalDays, setTempIntervalDays] = useState<number>(7); // Default: 1 semana
  const [tempDurationMonths, setTempDurationMonths] = useState<number>(0);
  const [tempWeekly, setTempWeekly] = useState<boolean>(true); // Default: modo semanas
  const [tempWeeksCount, setTempWeeksCount] = useState<number>(1);

  // Função para obter o texto descritivo da repetição
  const getRepeatLabel = (): string => {
    if (repeatType === RepeatType.NONE) return 'Não repetir';
    if (repeatType === RepeatType.DAILY) return 'Repetir diariamente';
    if (repeatType === RepeatType.MONTHLY) return 'Repetir mensalmente';
    if (repeatType === RepeatType.CUSTOM) {
      if (customDays.length === 0) return 'Repetir semanalmente';
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const selectedDays = customDays.map(d => dayNames[d]).join(', ');
      return `Repetir: ${selectedDays}`;
    }
    if (repeatType === RepeatType.INTERVAL) {
      const iv = intervalDays || 7;
      const isWeekly = iv > 0 && iv % 7 === 0;
      if (isWeekly) {
        const weeks = Math.round(iv / 7);
        return `Repetir a cada ${weeks} semana${weeks > 1 ? 's' : ''}`;
      }
      return `Repetir a cada ${iv} dia${iv > 1 ? 's' : ''}`;
    }
    return 'Não repetir';
  };

  // Calcula uma data inicial para tarefas recorrentes quando o usuário não escolhe uma data
  const getInitialDueDateForRecurrence = (rt: RepeatType, days: number[] = []): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (rt === RepeatType.DAILY) return today;
    if (rt === RepeatType.MONTHLY) return today;
    if (rt === RepeatType.WEEKENDS) {
      const dow = today.getDay(); // 0=Dom,6=Sáb
      if (dow === 6 || dow === 0) return today;
      const toSaturday = 6 - dow;
      const d = new Date(today);
      d.setDate(d.getDate() + toSaturday);
      return d;
    }
    if (rt === RepeatType.CUSTOM && days.length > 0) {
      const sorted = [...days].sort((a, b) => a - b);
      const dow = today.getDay();
      if (sorted.includes(dow)) return today;
      const next = sorted.find((d) => d > dow);
      const d = new Date(today);
      if (next === undefined) {
        const add = (7 - dow) + sorted[0];
        d.setDate(d.getDate() + add);
      } else {
        d.setDate(d.getDate() + (next - dow));
      }
      return d;
    }
    return today;
  };

  // Função para calcular horário da task principal baseado na subtarefa mais próxima
  const calculateMainTaskTimeFromSubtasks = (subtasks: any[]): { date?: Date; time?: Date } => {
    const subtasksWithDateTime = subtasks.filter(st => st.dueDate || st.dueTime);
    
    if (subtasksWithDateTime.length === 0) {
      return {};
    }

    // Converter subtarefas para timestamps para comparação
    const subtaskTimes = subtasksWithDateTime.map(st => {
      const baseDate = st.dueDate ? new Date(st.dueDate) : new Date();
      if (st.dueTime) {
        const timeDate = new Date(st.dueTime);
        baseDate.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);
      }
      return {
        subtask: st,
        timestamp: baseDate.getTime(),
        date: st.dueDate ? new Date(st.dueDate) : undefined,
        time: st.dueTime ? new Date(st.dueTime) : undefined
      };
    });

    // Ordenar por timestamp e pegar o mais próximo (mais cedo)
    subtaskTimes.sort((a, b) => a.timestamp - b.timestamp);
    const earliest = subtaskTimes[0];

    return {
      date: earliest.date,
      time: earliest.time
    };
  };

  // Função para calcular horário da task principal baseado apenas nas subtarefas NÃO CONCLUÍDAS
  const calculateMainTaskTimeFromPendingSubtasks = (subtasks: any[]): { date?: Date; time?: Date } => {
    // Filtrar apenas subtarefas não concluídas que têm data/hora
    const pendingSubtasksWithDateTime = subtasks.filter(st => !st.done && (st.dueDate || st.dueTime));
    
    if (pendingSubtasksWithDateTime.length === 0) {
      return {};
    }

    // Converter subtarefas para timestamps para comparação
    const subtaskTimes = pendingSubtasksWithDateTime.map(st => {
      const baseDate = st.dueDate ? new Date(st.dueDate) : new Date();
      if (st.dueTime) {
        const timeDate = new Date(st.dueTime);
        baseDate.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);
      }
      return {
        subtask: st,
        timestamp: baseDate.getTime(),
        date: st.dueDate ? new Date(st.dueDate) : undefined,
        time: st.dueTime ? new Date(st.dueTime) : undefined
      };
    });

    // Ordenar por timestamp e pegar o mais próximo (mais cedo)
    subtaskTimes.sort((a, b) => a.timestamp - b.timestamp);
    const earliest = subtaskTimes[0];

    return {
      date: earliest.date,
      time: earliest.time
    };
  };

  const addTask = useCallback(async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Erro', 'Por favor, insira um título para a tarefa.');
      return;
    }
    if (isAddingTask) return; // Prevenir cliques múltiplos

    // Enforcement: apenas admin pode criar/editar tarefas privadas
    if (newTaskPrivate && user.role !== 'admin') {
      Alert.alert('Sem permissão', 'Apenas administradores podem criar tarefas privadas.');
      return;
    }

    // Enforcement: dependente criando/atualizando tarefa de família pública precisa de permissões
    const isFamilyContext = !!currentFamily && !newTaskPrivate; // tarefa pública de família
    if (isFamilyContext && user.role === 'dependente') {
      const needed = isEditing ? 'edit' : 'create';
      const has = await ensureFamilyPermission(needed as 'create'|'edit'|'delete');
      if (!has) {
        Alert.alert('Sem permissão', `Você não tem permissão para ${needed === 'create' ? 'criar' : 'editar'} tarefas da família.`);
        return;
      }
    }

    setIsAddingTask(true);

    try {
      if (isEditing && editingTaskId) {
        // Atualizar tarefa existente
        const defaultDueDateForEdit = tempDueDate || (repeatType !== RepeatType.NONE ? getInitialDueDateForRecurrence(repeatType, customDays) : undefined);
        
        // Calcular horário da task principal baseado nas subtarefas (se não tiver horário manual)
  const subtaskBasedTime = calculateMainTaskTimeFromSubtasks(subtasksDraftRef.current || subtasksDraft);
        const finalDueDate = subtaskBasedTime.date || defaultDueDateForEdit;
        const finalDueTime = tempDueTime || subtaskBasedTime.time;
        
        // Atualizar os estados dos pickers se foram aplicados valores automáticos
        if (!tempDueDate && subtaskBasedTime.date) {
          setTempDueDate(subtaskBasedTime.date);
        }
        if (!tempDueTime && subtaskBasedTime.time) {
          setTempDueTime(subtaskBasedTime.time);
        }
        
  logger.debug('SAVE_TASK', 'Salvando tarefa com subtarefas');
  
        // Log dos valores de repetição ao editar tarefa
        logger.debug('REPEAT', {
          repeatType,
          repeatOption: (repeatType === RepeatType.DAILY ? 'diario' : repeatType === RepeatType.MONTHLY ? 'mensal' : repeatType === RepeatType.CUSTOM ? 'semanal' : repeatType === RepeatType.INTERVAL ? 'intervalo' : 'nenhum'),
          customDays,
          intervalDays,
          durationMonths
        });
  
        // 🔄 SALVAR ESTADO PARA DESFAZER: Guardar tarefa original antes de editar
        const originalTask = tasks.find(t => t.id === editingTaskId);
        const previousTaskState = originalTask ? { ...originalTask } : null;
        
  const updatedTasks = tasks.map(task => 
          task.id === editingTaskId 
            ? {
                ...task,
                title: newTaskTitle.trim(),
                description: newTaskDescription.trim(),
                category: selectedCategory,
                dueDate: finalDueDate,
                dueTime: finalDueTime,
                // Persistir recorrência (formato plano)
                repeatOption: (repeatType === RepeatType.DAILY ? 'diario' : repeatType === RepeatType.MONTHLY ? 'mensal' : repeatType === RepeatType.CUSTOM ? 'semanal' : repeatType === RepeatType.INTERVAL ? 'intervalo' : 'nenhum') as Task['repeatOption'],
                repeatDays: repeatType === RepeatType.CUSTOM ? customDays : undefined,
                repeatIntervalDays: repeatType === RepeatType.INTERVAL ? intervalDays || 1 : undefined,
                repeatDurationMonths: repeatType === RepeatType.INTERVAL ? durationMonths || 0 : undefined,
                repeatStartDate: repeatType === RepeatType.INTERVAL ? (task.dueDate || tempDueDate || new Date()) : (task as any).repeatStartDate,
                // Subtarefas do modal
                subtasks: (subtasksDraftRef.current || subtasksDraft).map(st => ({ ...st })),
                // Categorias de subtarefas
                subtaskCategories: subtaskCategories.map(cat => ({ ...cat })),
                // Campos de edição
                editedBy: user.id,
                editedByName: user.name,
                editedAt: new Date()
                ,
                // Preservar/atualizar flag de privacidade baseada no estado do modal
                private: newTaskPrivate
              }
            : task
        );
        
        const updatedTask = updatedTasks.find(t => t.id === editingTaskId);
        
        // Log da tarefa atualizada com valores de repetição
        logger.success('SAVE_TASK', `Tarefa editada: ${updatedTask?.title}`);
        
        setTasks(updatedTasks);
        
        // Adicionar ID à lista de pendentes de sincronização
        setPendingSyncIds(prev => [...prev, editingTaskId]);
        logger.debug('SYNC', `Tarefa enfileirada: ${editingTaskId}${currentFamily ? ` (family: ${currentFamily.id})` : ''}`);

        // Salvar no cache local
        if (updatedTask) {
          const remoteTask = taskToRemoteTask(updatedTask as any);
          await LocalStorageService.saveTask(remoteTask as any);
          // reagendar lembrete
          try {
            await NotificationService.rescheduleTaskReminder(updatedTask as any);
          } catch (e) {
            logger.warn('NOTIFY', 'rescheduleTaskReminder falhou');
          }

          // Reagendar lembretes das subtarefas
          try {
            // Cancelar todas as notificações antigas de subtarefas
            await NotificationService.cancelAllSubtaskReminders(updatedTask.id);
            // Agendar novamente com as subtarefas atualizadas
            if (Array.isArray((updatedTask as any).subtasks) && (updatedTask as any).subtasks.length > 0) {
              await NotificationService.scheduleSubtaskReminders(
                updatedTask.id, 
                updatedTask.title, 
                (updatedTask as any).subtasks
              );
            }
          } catch (e) {
            logger.warn('NOTIFY', 'Falha ao reagendar subtarefas');
          }
          
          // Determinar se é create ou update baseado no ID
          const isTemporaryId = updatedTask.id.startsWith('temp_') || updatedTask.id === 'temp';
          const operationType = isTemporaryId ? 'create' : 'update';

          // Adicionar à fila de sincronização (online ou offline)
          await SyncService.addOfflineOperation(operationType, 'tasks', remoteTask as any);

          // Se o usuário pertence a uma família e a tarefa não for privada, salvar também na família (prefer remote Firestore quando online)
          if (currentFamily && (remoteTask as any)?.private !== true) {
            try {
              if (!isOffline) {
                // Preferir Firestore como source-of-truth
                const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
                const res = await FirestoreService.saveTask(toSave);
                // Atualizar cache local com familyId
                await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
                logger.success('FIRESTORE', `Tarefa atualizada: ${toSave.id || (res && (res as any).id)}`);
              } else {
                // Offline: enfileirar operação com familyId
                await SyncService.addOfflineOperation(operationType, 'tasks', {
                  ...remoteTask,
                  familyId: currentFamily.id
                });
                logger.debug('OFFLINE_SYNC', `Tarefa enfileirada: ${updatedTask?.id}`);
              }
            } catch (error) {
              logger.error('SAVE_FAMILY_TASK', 'Erro ao sincronizar tarefa na família', error);
              // Delegar fallback para FamilySyncHelper (centraliza remote-first / fallback)
              try {
                await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, operationType);
              } catch (e) {
                logger.warn('FAMILY_SYNC_FALLBACK', 'saveTaskToFamily falhou');
              }
            }
          }
          
          logger.debug('SAVE_TASK', `Tarefa atualizada e adicionada à fila de sincronização: taskId=${updatedTask?.id}` +
            `${currentFamily ? ` familyId=${currentFamily.id}` : ''}`);
        }
        
        // Gerar detalhes das mudanças para o histórico
        const changes: string[] = [];
        
        if (originalTask) {
          // Mudança de título
          if (originalTask.title !== newTaskTitle.trim()) {
            changes.push(`Título: "${originalTask.title}" → "${newTaskTitle.trim()}"`);
          }
          
          // Mudança de descrição
          if (originalTask.description !== newTaskDescription.trim()) {
            if (!originalTask.description && newTaskDescription.trim()) {
              changes.push(`Descrição: (vazio) → "${newTaskDescription.trim()}"`);
            } else if (originalTask.description && !newTaskDescription.trim()) {
              changes.push(`Descrição: "${originalTask.description}" → (vazio)`);
            } else {
              changes.push(`Descrição: "${originalTask.description}" → "${newTaskDescription.trim()}"`);
            }
          }
          
          // Mudança de categoria
          if (originalTask.category !== selectedCategory) {
            changes.push(`Categoria: ${originalTask.category} → ${selectedCategory}`);
          }
          
          // Mudança de data
          const oldDate = originalTask.dueDate ? formatDate(originalTask.dueDate) : 'Sem data';
          const newDate = finalDueDate ? formatDate(finalDueDate) : 'Sem data';
          if (oldDate !== newDate) {
            changes.push(`Data: ${oldDate} → ${newDate}`);
          }
          
          // Mudança de hora
          const oldTime = originalTask.dueTime ? formatTime(originalTask.dueTime) : 'Sem hora';
          const newTime = finalDueTime ? formatTime(finalDueTime) : 'Sem hora';
          if (oldTime !== newTime) {
            changes.push(`Hora: ${oldTime} → ${newTime}`);
          }
          
          // Mudanças em subtarefas
          const oldSubtasks = (originalTask as any).subtasks || [];
          const newSubtasks = (subtasksDraftRef.current || subtasksDraft);
          
          // Subtarefas adicionadas
          const addedSubtasks = newSubtasks.filter((ns: any) => 
            !oldSubtasks.find((os: any) => os.id === ns.id)
          );
          addedSubtasks.forEach((st: any) => {
            changes.push(`➕ Subtarefa adicionada: "${st.title}"`);
          });
          
          // Subtarefas removidas
          const removedSubtasks = oldSubtasks.filter((os: any) => 
            !newSubtasks.find((ns: any) => ns.id === os.id)
          );
          removedSubtasks.forEach((st: any) => {
            changes.push(`➖ Subtarefa removida: "${st.title}"`);
          });
          
          // Subtarefas editadas
          newSubtasks.forEach((ns: any) => {
            const old = oldSubtasks.find((os: any) => os.id === ns.id);
            if (old && old.title !== ns.title) {
              changes.push(`✏️ Subtarefa editada: "${old.title}" → "${ns.title}"`);
            }
          });
        }
        
        const detailsText = changes.length > 0 ? changes.join('\n') : undefined;
        
        // Adicionar ao histórico com detalhes
        await addToHistory('edited', newTaskTitle.trim(), editingTaskId, detailsText);
        
        // ✅ CONFIGURAR DESFAZER: Salvar ação de edição
        if (previousTaskState && updatedTask) {
          setLastAction({
            type: 'edit',
            task: updatedTask,
            previousState: previousTaskState,
            timestamp: Date.now()
          });
          
          setShowUndoButton(true);
          
          // Timer para esconder botão de desfazer após 10 segundos
          if (undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
          }
          undoTimeoutRef.current = setTimeout(() => {
            setShowUndoButton(false);
            setLastAction(null);
          }, 10000);
        }
      } else {
        // Criar nova tarefa
        logger.debug('CREATE_TASK', `Criando tarefa: ${newTaskTitle.trim()}`);

        const defaultDueDate = tempDueDate || (repeatType !== RepeatType.NONE ? getInitialDueDateForRecurrence(repeatType, customDays) : undefined);
        
        // Calcular horário da task principal baseado nas subtarefas (se não tiver horário manual)
  const subtaskBasedTime = calculateMainTaskTimeFromSubtasks(subtasksDraftRef.current || subtasksDraft);
        const finalDueDate = subtaskBasedTime.date || defaultDueDate;
        const finalDueTime = tempDueTime || subtaskBasedTime.time;
        
        // Atualizar os estados dos pickers se foram aplicados valores automáticos
        if (!tempDueDate && subtaskBasedTime.date) {
          setTempDueDate(subtaskBasedTime.date);
        }
        if (!tempDueTime && subtaskBasedTime.time) {
          setTempDueTime(subtaskBasedTime.time);
        }
        
        logger.debug('CREATE_TASK', 'Data final calculada');

  logger.debug('CREATE_TASK', 'Salvando tarefa com subtarefas');
  
        // Log dos valores de repetição
        logger.debug('REPEAT', `Repetição ao criar: ${repeatType}`);
  
  const newTask: Task = {
          id: uuidv4(), // Usar UUID para garantir ID único
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim(),
          completed: false,
          status: 'pendente' as TaskStatus,
          category: selectedCategory,
          dueDate: finalDueDate,
          dueTime: finalDueTime,
          repeatOption: (repeatType === RepeatType.DAILY ? 'diario' : repeatType === RepeatType.MONTHLY ? 'mensal' : repeatType === RepeatType.CUSTOM ? 'semanal' : repeatType === RepeatType.INTERVAL ? 'intervalo' : 'nenhum') as Task['repeatOption'],
          repeatDays: repeatType === RepeatType.CUSTOM ? customDays : undefined,
          repeatIntervalDays: repeatType === RepeatType.INTERVAL ? intervalDays || 1 : undefined,
          repeatDurationMonths: repeatType === RepeatType.INTERVAL ? durationMonths || 0 : undefined,
          repeatStartDate: repeatType === RepeatType.INTERVAL ? (finalDueDate || new Date()) : undefined,
          userId: user.id,
          createdAt: new Date(),
          priority: 'media',
          updatedAt: new Date(),
          // Campos de autoria
          createdBy: user.id,
          createdByName: user.name,
          // Subtarefas iniciais
          subtasks: (subtasksDraftRef.current || subtasksDraft).map(st => ({ ...st })),
          // Categorias de subtarefas
          subtaskCategories: subtaskCategories.map(cat => ({ ...cat })),
          // private flag será adicionada durante a conversão remota via taskToRemoteTask
        };

        // Ajustar visibilidade imediata na lista principal:
        // - Se estiver em uma família e NÃO for privada: já marcar familyId para passar no filtro
        // - Se for privada: marcar flag private=true e deixar sem familyId para aparecer como privada do criador
        if (currentFamily) {
          if (newTaskPrivate) {
            (newTask as any).private = true;
            // garantir que não tenha familyId para ser tratada como privada
            (newTask as any).familyId = undefined;
          } else {
            (newTask as any).familyId = currentFamily.id;
            (newTask as any).private = false;
          }
        }

        logger.success('CREATE_TASK', `Nova tarefa criada: ${newTask.title}`);

  const updatedTasks = [newTask, ...tasks];
        
        // ✅ PROTEÇÃO CONTRA SOBRESCRITA: Adicionar ao pendingSyncIds para evitar que o listener sobrescreva
        setPendingSyncIds(prev => [...prev, newTask.id]);
        logger.debug('SYNC', `Tarefa protegida para sincronização: ${newTask.id}`);
        
        // ATUALIZAÇÃO IMEDIATA: Atualizar o estado local primeiro para feedback instantâneo
        setTasks(updatedTasks);
        logger.debug('UPDATE_STATE', `Tarefa adicionada ao estado local: ${newTask.id}`);
        
        // Forçar atualização da UI
        setLastUpdate(new Date());
        
        // Depois executar operações em background (notificações e sincronização)
  // agendar lembrete da nova tarefa
  try {
    await NotificationService.scheduleTaskReminder(newTask as any);
  } catch (e) {
    logger.warn('NOTIFY', 'scheduleTaskReminder falhou');
  }

  // Agendar lembretes das subtarefas
  try {
    if (Array.isArray(subtasksDraftRef.current) && subtasksDraftRef.current.length > 0) {
      await NotificationService.scheduleSubtaskReminders(newTask.id, newTask.title, subtasksDraftRef.current);
    }
  } catch (e) {
    logger.warn('NOTIFY', 'scheduleSubtaskReminders falhou');
  }
        
        // Salvar no cache local
  // Incluir flag 'private' no objeto que será convertido para envio remoto
  const remoteTask = taskToRemoteTask({ ...newTask, private: newTaskPrivate } as any);
    await LocalStorageService.saveTask(remoteTask as any);
        
        // Adicionar à fila de sincronização (online ou offline)
  await SyncService.addOfflineOperation('create', 'tasks', remoteTask);
        
        // Se o usuário pertence a uma família e a tarefa não for privada, salvar também na família (prefer Firestore quando online)
        if (currentFamily && (remoteTask as any)?.private !== true) {
          try {
            if (!isOffline) {
              const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
              const res = await FirestoreService.saveTask(toSave);
              await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
              logger.success('FIRESTORE', `Nova tarefa salva: ${toSave.id || (res && (res as any).id)}`);
              
              // ✅ REMOVER DO pendingSyncIds: Sincronização concluída com sucesso
              setPendingSyncIds(prev => prev.filter(id => id !== newTask.id));
              logger.debug('SYNC', `Tarefa sincronizada e removida do pendingSyncIds: ${newTask.id}`);
            } else {
              await SyncService.addOfflineOperation('create', 'tasks', { ...remoteTask, familyId: currentFamily.id });
              logger.debug('OFFLINE_SYNC', `Nova tarefa enfileirada: ${remoteTask.id}`);
              
              // ✅ REMOVER DO pendingSyncIds: Tarefa enfileirada para sincronização offline
              // O listener do SyncService removerá quando sincronizar de fato
              setTimeout(() => {
                setPendingSyncIds(prev => prev.filter(id => id !== newTask.id));
                logger.debug('SYNC', `Tarefa removida do pendingSyncIds após enfileiramento: ${newTask.id}`);
              }, 1000); // 1 segundo de proteção
            }
          } catch (error) {
            logger.error('SAVE_FAMILY_TASK', 'Erro ao salvar tarefa na família', error);
            try { await FamilySyncHelper.saveTaskToFamily(remoteTask, currentFamily.id, 'create'); } catch (e) { logger.warn('FAMILY_SYNC_FALLBACK', 'saveFamilyTask falhou'); }
            await SyncService.addOfflineOperation('create', 'tasks', { ...remoteTask, familyId: currentFamily.id });
            
            // ✅ REMOVER DO pendingSyncIds: Mesmo com erro, evitar bloquear a tarefa indefinidamente
            setTimeout(() => {
              setPendingSyncIds(prev => prev.filter(id => id !== newTask.id));
              logger.debug('SYNC', `Tarefa removida do pendingSyncIds após erro: ${newTask.id}`);
            }, 2000); // 2 segundos de proteção
          }
        } else {
          // Tarefa privada ou usuário sem família - remover do pendingSyncIds após salvar localmente
          setTimeout(() => {
            setPendingSyncIds(prev => prev.filter(id => id !== newTask.id));
            logger.debug('SYNC', `Tarefa privada/sem família removida do pendingSyncIds: ${newTask.id}`);
          }, 1000);
        }
        
        logger.debug('CREATE_TASK', `Tarefa criada e enfileirada: ${remoteTask.id}`);
        
        // Adicionar ao histórico
        await addToHistory('created', newTask.title, newTask.id);
      }
      
      // ✅ GARANTIR ATUALIZAÇÃO DA UI ANTES DE FECHAR O MODAL
      // Pequeno delay para garantir que o React processou o setTasks
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Reset form
      resetForm();
      setModalVisible(false);
      
      logger.debug('UPDATE_STATE', 'Modal fechado, tarefa deve estar visível na lista');
      
      // Mostrar loading de sincronização e forçar atualização dos dados
      setIsSyncing(true);
      
      // Aguardar um momento para o modal de tarefa fechar
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Usar a função forceRefresh para sincronizar os dados
      await forceRefresh();
      
      setIsSyncing(false);
      setSyncMessage('');
      
    } catch (error) {
      logger.error('CREATE_TASK', 'Erro ao salvar tarefa', error);
      Alert.alert('Erro', 'Não foi possível salvar a tarefa. Tente novamente.');
      setIsSyncing(false);
      setSyncMessage('');
    } finally {
      setIsAddingTask(false); // Reabilitar o botão
    }
  }, [newTaskTitle, newTaskDescription, selectedCategory, tempDueDate, tempDueTime, repeatType, customDays, isEditing, editingTaskId, tasks, currentFamily, isOffline, newTaskPrivate, subtasksDraft, forceRefresh]);

  const resetForm = useCallback(() => {
    setNewTaskTitle('');
    setNewTaskDescription('');
    setSelectedCategory('work');
    setTempDueDate(undefined);
    setTempDueTime(undefined);
    setRepeatType(RepeatType.NONE);
    setCustomDays([]);
  setIntervalDays(0);
  setDurationMonths(0);
    setSubtasksDraft([]);
    setSubtaskCategories([]);
    setNewSubtaskTitle('');
    setIsEditing(false);
    setEditingTaskId(null);
    setModalVisible(false);
    closeManagedModal('task');
  }, []);

  const editTask = useCallback((task: Task) => {
    // Enforcement: dependente só pode editar tarefa de família se possuir permission.edit
    if (user.role === 'dependente') {
      const isFamilyTask = (task as any).familyId && (task as any).private !== true;
      if (isFamilyTask) {
        (async () => {
          const ok = await ensureFamilyPermission('edit');
          if (!ok) {
            Alert.alert('Sem permissão', 'Você não tem permissão para editar tarefas da família.');
            return;
          } else {
            // Rechamar com permissões ok
            const repeatConfig = getRepeat(task);
            setNewTaskTitle(task.title);
            setNewTaskDescription(task.description || '');
            setSelectedCategory(task.category);
            setTempDueDate(task.dueDate);
            setTempDueTime(task.dueTime);
            setRepeatType(repeatConfig.type);
            setCustomDays(repeatConfig.days || []);
            setSubtasksDraft((task as any).subtasks ? (task as any).subtasks.map((st: any) => ({
              id: st.id,
              title: st.title,
              done: !!st.done,
              completedById: st.completedById,
              completedByName: st.completedByName,
              completedAt: st.completedAt ? safeToDate(st.completedAt) || undefined : undefined,
              dueDate: st.dueDate ? safeToDate(st.dueDate) || undefined : undefined,
              dueTime: st.dueTime ? safeToDate(st.dueTime) || undefined : undefined,
            })) : []);
            setIsEditing(true);
            setEditingTaskId(task.id);
            setModalVisible(true);
            openManagedModal('task');
          }
        })();
        return;
      }
    }
    const repeatConfig = getRepeat(task);
    setNewTaskTitle(task.title);
    setNewTaskDescription(task.description || '');
    setSelectedCategory(task.category);
    setTempDueDate(task.dueDate);
    setTempDueTime(task.dueTime);
    setRepeatType(repeatConfig.type);
    setCustomDays(repeatConfig.days || []);
  setIntervalDays(repeatConfig.intervalDays || (task as any).repeatIntervalDays || 0);
  setDurationMonths(repeatConfig.durationMonths || (task as any).repeatDurationMonths || 0);
    setSubtasksDraft((task as any).subtasks ? (task as any).subtasks.map((st: any) => ({
      id: st.id,
      title: st.title,
      done: !!st.done,
      completedById: st.completedById,
      completedByName: st.completedByName,
      completedAt: st.completedAt ? safeToDate(st.completedAt) || undefined : undefined,
      dueDate: st.dueDate ? safeToDate(st.dueDate) || undefined : undefined,
      dueTime: st.dueTime ? safeToDate(st.dueTime) || undefined : undefined,
    })) : []);
    setIsEditing(true);
    setEditingTaskId(task.id);
    setModalVisible(true);
    openManagedModal('task');
  }, []);

  // Ao abrir modal para editar/criar, sincronizar estado do campo 'private'
  useEffect(() => {
    if (modalVisible && isEditing && editingTaskId) {
      const t = tasks.find(x => x.id === editingTaskId);
      setNewTaskPrivate((t as any)?.private === true);
      // Garantir rascunho das subtarefas quando abrir modal em edição
      if (t && Array.isArray((t as any).subtasks)) {
        setSubtasksDraft((t as any).subtasks.map((st: any) => ({
          id: st.id,
          title: st.title,
          done: !!st.done,
          completedById: st.completedById,
          completedByName: st.completedByName,
          completedAt: st.completedAt ? safeToDate(st.completedAt) || undefined : undefined,
          dueDate: st.dueDate ? safeToDate(st.dueDate) || undefined : undefined,
          dueTime: st.dueTime ? safeToDate(st.dueTime) || undefined : undefined,
        })));
      }
      // Carregar categorias de subtarefas se existirem
      if ((t as any).subtaskCategories && Array.isArray((t as any).subtaskCategories)) {
        setSubtaskCategories((t as any).subtaskCategories.map((cat: any) => ({
          ...cat,
          createdAt: safeToDate(cat.createdAt) || new Date()
        })));
      } else {
        setSubtaskCategories([]);
      }
    } else if (modalVisible && !isEditing) {
      setNewTaskPrivate(false);
      setSubtasksDraft([]);
      setSubtaskCategories([]);
      setNewSubtaskTitle('');
    }
  }, [modalVisible, isEditing, editingTaskId]);

  // Funções para filtrar tarefas por data
  const getTodayTasks = useMemo(() => () => {
    // Função pura: não altera estados durante a renderização
    return tasks.filter(task => {
      // Filtrar por categoria
      if (filterCategory !== 'all' && task.category !== filterCategory) {
        return false;
      }
      
      // Filtrar por familyId: apenas tarefas da família atual ou tarefas sem família do usuário
      if (currentFamily) {
        // Se tem família, mostrar tarefas da família atual OU tarefas privadas do próprio usuário (familyId null)
        const isMyPrivate = (task as any).private === true && task.createdBy === user.id && ((task as any).familyId == null);
        if ((task as any).familyId !== currentFamily.id && !isMyPrivate) {
          return false;
        }
      } else {
        // Se não tem família, mostrar apenas tarefas pessoais (sem familyId ou do próprio usuário)
        if ((task as any).familyId || (task.userId && task.userId !== user.id)) {
          return false;
        }
      }
      
      // Excluir tarefas concluídas da página principal
      if (task.completed) {
        return false;
      }
      return !task.dueDate || isToday(task.dueDate);
    }).sort((a, b) => {
      // Priorizar tarefas vencidas
      const aOverdue = isTaskOverdue(a.dueDate, a.dueTime, a.completed);
      const bOverdue = isTaskOverdue(b.dueDate, b.dueTime, b.completed);
      
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
  }, [tasks, filterCategory, currentFamily, user.id, user.role]);

  const getUpcomingTasks = useMemo(() => () => {
    // Apenas calcula e retorna; não altere estados aqui para evitar loops de renderização
    return tasks.filter(task => {
      // Filtrar por categoria
      if (filterCategory !== 'all' && task.category !== filterCategory) {
        return false;
      }
      
      // Filtrar por familyId: apenas tarefas da família atual ou tarefas sem família do usuário
      if (currentFamily) {
        // Se tem família, mostrar tarefas da família atual OU tarefas privadas do próprio usuário (familyId null)
        const isMyPrivate = (task as any).private === true && task.createdBy === user.id && ((task as any).familyId == null);
        if ((task as any).familyId !== currentFamily.id && !isMyPrivate) {
          return false;
        }
      } else {
        // Se não tem família, mostrar apenas tarefas pessoais (sem familyId ou do próprio usuário)
        if ((task as any).familyId || (task.userId && task.userId !== user.id)) {
          return false;
        }
      }
      
      // Incluir tarefas recorrentes que foram concluídas e reagendadas para o futuro
      // ou tarefas não concluídas que têm data futura
      const repeatConfig = getRepeat(task);
      return task.dueDate && (
        (!task.completed && isUpcoming(task.dueDate)) ||
        (task.completed && repeatConfig.type !== RepeatType.NONE && isUpcoming(task.dueDate))
      );
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
  }, [tasks, filterCategory, currentFamily, user.id, getRepeat]);

  const getCurrentTasks = useMemo(() => {
    return () => {
      if (activeTab === 'today') {
        return getTodayTasks();
      } else {
        return getUpcomingTasks();
      }
    };
  }, [activeTab, getTodayTasks, getUpcomingTasks]);

  // Funções do sistema de histórico
  const addToHistory = async (
    action: 'created' | 'completed' | 'uncompleted' | 'edited' | 'deleted' | 'approval_requested' | 'approved' | 'rejected',
    taskTitle: string,
    taskId: string,
    details?: string,
    actionUserId?: string,
    actionUserName?: string
  ) => {
    const historyItem: StoredHistoryItem = {
      id: Date.now().toString(),
      action,
      taskTitle,
      taskId,
      timestamp: new Date(),
      details,
      // Informações de autoria (usar usuário atual se não fornecido)
      userId: actionUserId || user.id,
      userName: actionUserName || user.name,
      userRole: user.role
    };

    // Adicionar ao histórico local (estado da aplicação)
    setHistory(prev => {
      const newHistory = [historyItem, ...prev];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - HISTORY_DAYS_TO_KEEP);

      return newHistory
        .filter(item => {
          const itemDate = item.timestamp instanceof Date ? item.timestamp : safeToDate(item.timestamp);
          return !!itemDate && itemDate >= cutoffDate;
        })
        .sort((a,b)=> new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime());
    });

    // Salvar no cache local (LocalStorage)
    try {
      await LocalStorageService.saveHistoryItem(historyItem);
      logger.debug('HISTORY', 'Item de histórico salvo no cache local');
    } catch (error) {
      logger.error('HISTORY', 'Erro ao salvar histórico no cache', error);
    }

    // Se o usuário pertence a uma família, adicionar também ao histórico da família
    if (currentFamily && !isOffline) {
      try {
        await familyService.addFamilyHistoryItem(currentFamily.id, {
          action,
          taskTitle,
          taskId,
          userId: historyItem.userId,
          userName: historyItem.userName,
          userRole: historyItem.userRole,
          details
        });
        logger.debug('HISTORY', 'Item adicionado ao histórico da família');
      } catch (error) {
        logger.error('HISTORY', 'Erro ao adicionar ao histórico da família', error);
        
        // Se falhou salvar no Firebase, adicionar à fila de sincronização
        try {
          const toQueue = { ...historyItem, familyId: currentFamily.id } as any;
          // remover undefined defensivamente
          Object.keys(toQueue).forEach(k => (toQueue as any)[k] === undefined && delete (toQueue as any)[k]);
          await SyncService.addOfflineOperation('create', 'history', toQueue);
          logger.debug('HISTORY', 'Item de histórico adicionado à fila de sincronização');
        } catch (syncError) {
          logger.error('HISTORY', 'Erro ao adicionar histórico à fila de sincronização', syncError);
        }
      }
    } else if (!currentFamily) {
      // Se usuário não tem família, adicionar à fila para sincronização futura
      try {
        const toQueue = { ...historyItem, familyId: null } as any;
        Object.keys(toQueue).forEach(k => (toQueue as any)[k] === undefined && delete (toQueue as any)[k]);
        await SyncService.addOfflineOperation('create', 'history', toQueue);
        logger.debug('HISTORY', 'Item de histórico adicionado à fila de sincronização (sem família)');
      } catch (syncError) {
        logger.error('HISTORY', 'Erro ao adicionar histórico à fila', syncError);
      }
    }
  };

  const clearOldHistory = () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - HISTORY_DAYS_TO_KEEP);

    setHistory(prev => prev
      .filter(item => {
        const itemDate = item.timestamp instanceof Date ? item.timestamp : safeToDate(item.timestamp);
        return !!itemDate && itemDate >= cutoffDate;
      })
      .sort((a,b)=> new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime())
    );
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
      case 'uncompleted': return 'refresh'; // refresh-circle não existe em todas as versões
      case 'edited': return 'pencil-outline'; // pencil-circle não existe
      case 'deleted': return 'trash';
      default: return 'ellipse';
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'created': return '#27ae60';
      case 'completed': return THEME.primary;
      case 'uncompleted': return '#f39c12';
      case 'edited': return '#9b59b6';
      case 'deleted': return '#e74c3c';
      default: return '#666';
    }
  };

  const renderHistoryItem = useCallback(({ item }: ListRenderItemInfo<any>) => {
    return (
      <Pressable 
        style={styles.historyItem}
        onPress={() => {
          setSelectedHistoryItem(item);
          setHistoryDetailModalVisible(true);
        }}
      >
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
          <Text style={styles.historyAuthor}>
            por {item.userName} ({item.userRole === 'admin' ? 'Admin' : 'Dependente'})
          </Text>
          <Text style={styles.historyTime}>
            {item.timestamp ? new Date(item.timestamp).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Data não disponível'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>
    );
  }, [getActionIcon, getActionColor, getActionText, colors]);

  const addCategory = async () => {
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
      isDefault: false,
      createdBy: user.id,
      createdByName: user.name,
      createdAt: new Date()
    };

    try {
      // Atualizar estado local imediatamente
      const updatedCategories = [...categories, newCategory];
      setCategories(updatedCategories);
      
      // 💾 Salvar no Firebase se houver família
      if (currentFamily && !isOffline) {
        // Filtrar apenas categorias personalizadas (não padrão) para salvar
        const customCategories = updatedCategories.filter(cat => !cat.isDefault);
        await familyService.saveFamilyCategories(currentFamily.id, customCategories);
        logger.success('CATEGORIES', 'Categoria salva no Firebase: ' + newCategory.name);
      }
      
      setNewCategoryName('');
      setSelectedIcon('star');
      setSelectedColorIndex(0);
      setCategoryModalVisible(false);
      
      Alert.alert('✓', 'Categoria criada com sucesso!');
    } catch (error) {
      logger.error('CATEGORIES', 'Erro ao salvar categoria', error);
      Alert.alert('Erro', 'Não foi possível salvar a categoria. Tente novamente.');
      // Reverter estado local em caso de erro
      setCategories(categories);
    }
  };

  const deleteCategory = async (categoryId: string) => {
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
            onPress: async () => {
              try {
                // Move tarefas para categoria "work"
                setTasks(tasks.map(task => 
                  task.category === categoryId 
                    ? { ...task, category: 'work' }
                    : task
                ));
                
                const updatedCategories = categories.filter(cat => cat.id !== categoryId);
                setCategories(updatedCategories);
                
                // 💾 Sincronizar com Firebase
                if (currentFamily && !isOffline) {
                  const customCategories = updatedCategories.filter(cat => !cat.isDefault);
                  await familyService.saveFamilyCategories(currentFamily.id, customCategories);
                  logger.success('CATEGORIES', 'Categoria removida do Firebase');
                }
                
                if (filterCategory === categoryId) {
                  setFilterCategory('all');
                }
              } catch (error) {
                logger.error('CATEGORIES', 'Erro ao excluir categoria', error);
                Alert.alert('Erro', 'Não foi possível excluir a categoria.');
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
            onPress: async () => {
              try {
                const updatedCategories = categories.filter(cat => cat.id !== categoryId);
                setCategories(updatedCategories);
                
                // 💾 Sincronizar com Firebase
                if (currentFamily && !isOffline) {
                  const customCategories = updatedCategories.filter(cat => !cat.isDefault);
                  await familyService.saveFamilyCategories(currentFamily.id, customCategories);
                  logger.success('CATEGORIES', 'Categoria removida do Firebase');
                }
                
                if (filterCategory === categoryId) {
                  setFilterCategory('all');
                }
              } catch (error) {
                logger.error('CATEGORIES', 'Erro ao excluir categoria', error);
                Alert.alert('Erro', 'Não foi possível excluir a categoria.');
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
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (time?: Date | any): string => {
    const safeTime = safeToDate(time);
    if (!safeTime) return '';
    return safeTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateValue?: Date | any): string => {
    const d = safeToDate(dateValue);
    if (!d) return '';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRepeatText = (repeat: RepeatConfig): string => {
    switch (repeat.type) {
      case RepeatType.DAILY:
        return 'Todos os dias';
      case RepeatType.MONTHLY:
        return 'A cada mês';
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

  // Versões temporárias para o mini modal
  const toggleTempCustomDay = (day: number) => {
    if (tempCustomDays.includes(day)) {
      setTempCustomDays(tempCustomDays.filter(d => d !== day));
    } else {
      setTempCustomDays([...tempCustomDays, day].sort());
    }
  };

  // Função helper para fechar todos os pickers de forma segura
  const closeAllPickers = useCallback(() => {
    try {
      setShowDatePicker(false);
      setShowTimePicker(false);
      setShowSubtaskDatePicker(false);
      setShowSubtaskTimePicker(false);
      setEditingSubtaskId(null);
      // Liberar topo da pilha de modais para exibir o anterior
      closeManagedModal('picker');
      closeManagedModal('subtaskPicker');
    } catch (e) {
      logger.warn('PICKERS', 'Erro ao fechar pickers', e);
    }
  }, []);

  // Handler para mudança de data da tarefa principal - USA APENAS REFS
  const onDateChange = useCallback((event: any, date?: Date) => {
    logger.debug('PICKERS', `onDateChange: platform=${Platform.OS}, eventType=${event?.type}, date=${date}`);
    
    if (Platform.OS === 'android') {
      // Android: diálogo fecha automaticamente
      setShowDatePicker(false);
      
      if (event?.type === 'set' && date) {
        pickerDateValueRef.current = date; // Atualiza APENAS a ref
        setTempDueDate(date); // Atualiza o estado para salvar depois
        logger.debug('PICKERS', 'Data selecionada (Android): ' + date);
      } else if (event?.type === 'dismissed') {
        logger.debug('PICKERS', 'Seleção cancelada (Android)');
      }
    } else if (Platform.OS === 'ios') {
      // iOS: spinner permanece visível, atualiza em tempo real
      // Verificar se ainda está dentro do modal correto
      if (date && (showDatePicker || showSubtaskDatePicker)) {
        pickerDateValueRef.current = date; // Atualiza APENAS a ref
        // NÃO atualiza tempDueDate aqui para evitar re-renders
        logger.debug('PICKERS', 'Data selecionada (iOS): ' + date);
      }
    }
  }, [showDatePicker, showSubtaskDatePicker]);

  // Handler para mudança de hora da tarefa principal - USA APENAS REFS
  const onTimeChange = useCallback((event: any, time?: Date) => {
    logger.debug('PICKERS', `onTimeChange: platform=${Platform.OS}, eventType=${event?.type}, time=${time}`);
    
    if (Platform.OS === 'android') {
      // Android: diálogo fecha automaticamente
      setShowTimePicker(false);
      
      if (event?.type === 'set' && time) {
        // Preservar o dia previamente selecionado (se houver) ao ajustar a hora
        const base = tempDueDate || pickerDateValueRef.current;
        const merged = new Date(base);
        merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
        pickerTimeValueRef.current = merged; // Atualiza APENAS a ref
        setTempDueTime(merged); // Atualiza o estado para salvar depois
        logger.debug('PICKERS', 'Hora selecionada (Android): ' + time);
      } else if (event?.type === 'dismissed') {
        logger.debug('PICKERS', 'Seleção cancelada (Android)');
      }
    } else if (Platform.OS === 'ios') {
      // iOS: spinner permanece visível, atualiza em tempo real
      // Verificar se ainda está dentro do modal correto
      if (time && (showTimePicker || showSubtaskTimePicker)) {
        // Preservar o dia previamente selecionado (se houver) ao ajustar a hora
        const base = tempDueDate || pickerDateValueRef.current;
        const merged = new Date(base);
        merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
        pickerTimeValueRef.current = merged; // Atualiza APENAS a ref
        // NÃO atualiza tempDueTime aqui para evitar re-renders
        logger.debug('PICKERS', 'Hora selecionada (iOS): ' + time);
      }
    }
  }, [tempDueDate, showTimePicker, showSubtaskTimePicker]);

  // Handler para mudança de data de subtarefa - USA APENAS REFS
  const onSubtaskDateChange = useCallback((event: any, date?: Date) => {
    logger.debug('PICKERS', `onSubtaskDateChange: platform=${Platform.OS}, eventType=${event?.type}, date=${date}, editingSubtaskId=${editingSubtaskId}`);
    
    if (Platform.OS === 'android') {
      setShowSubtaskDatePicker(false);
      
      if (event?.type === 'set' && date && editingSubtaskId) {
        pickerSubtaskDateValueRef.current = date; // Atualiza APENAS a ref
        setSubtasksDraft(prev => {
          const next = prev.map(st => st.id === editingSubtaskId ? { ...st, dueDate: date } : st);
          return next;
        });
        setEditingSubtaskId(null);
        logger.debug('PICKERS', 'Data de subtarefa selecionada (Android): ' + date);
      } else if (event?.type === 'dismissed') {
        setEditingSubtaskId(null);
        logger.debug('PICKERS', 'Seleção de data de subtarefa cancelada (Android)');
      }
    } else if (Platform.OS === 'ios') {
      // iOS: atualiza apenas a ref em tempo real
      // Verificar se ainda está dentro do modal correto
      if (date && editingSubtaskId && showSubtaskDatePicker) {
        pickerSubtaskDateValueRef.current = date; // Atualiza APENAS a ref
        // NÃO atualiza o estado aqui para evitar re-renders
        logger.debug('PICKERS', 'Data de subtarefa selecionada (iOS): ' + date);
      }
    }
  }, [editingSubtaskId, showSubtaskDatePicker]);

  // Handler para mudança de hora de subtarefa
  const onSubtaskTimeChange = useCallback((event: any, time?: Date) => {
    logger.debug('PICKERS', `onSubtaskTimeChange: platform=${Platform.OS}, eventType=${event?.type}, time=${time}, editingSubtaskId=${editingSubtaskId}`);
    
    // Atualizar o ref sempre que o valor mudar
    if (time) {
      pickerSubtaskTimeValueRef.current = time;
    }
    
    if (Platform.OS === 'android') {
      setShowSubtaskTimePicker(false);
      
      if (event?.type === 'set' && time && editingSubtaskId) {
        setSubtasksDraft(prev => {
          const next = prev.map(st => {
            if (st.id !== editingSubtaskId) return st;
            // Preservar o dia definido na subtarefa (se houver)
            const base = st.dueDate || stableNowRef.current;
            const merged = new Date(base);
            merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
            return { ...st, dueTime: merged };
          });
          return next;
        });
        // Atualizar base com a última hora escolhida
        const base = editingSubtask?.dueDate || stableNowRef.current;
        const merged = new Date(base);
        if (time) {
          merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
        }
        timePickerBaseRef.current = merged;
        setEditingSubtaskId(null);
        logger.debug('PICKERS', 'Hora de subtarefa selecionada (Android): ' + time);
      } else if (event?.type === 'dismissed') {
        setEditingSubtaskId(null);
        logger.debug('PICKERS', 'Seleção de hora de subtarefa cancelada (Android)');
      }
    } else if (Platform.OS === 'ios') {
      // iOS: apenas atualiza o ref durante a interação, sem atualizar estado
      // Verificar se ainda está dentro do modal correto
      if (time && editingSubtaskId && showSubtaskTimePicker) {
        logger.debug('PICKERS', 'Hora de subtarefa sendo selecionada (iOS): ' + time);
      }
    }
  }, [editingSubtaskId, editingSubtask, showSubtaskTimePicker]);

  const toggleLockTask = useCallback(async (taskId: string) => {
    // Apenas admin pode bloquear/desbloquear
    if (user.role !== 'admin') {
      Alert.alert('Permissão negada', 'Apenas administradores podem bloquear/desbloquear tarefas.');
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isCurrentlyUnlocked = (task as any).unlocked === true;
    const newUnlockedState = !isCurrentlyUnlocked;

    const updatedTask: Task = {
      ...task,
      unlocked: newUnlockedState,
      unlockedBy: newUnlockedState ? user.id : undefined,
      unlockedAt: newUnlockedState ? new Date() : undefined,
      updatedAt: new Date(),
    } as Task;

    // Atualizar localmente primeiro para feedback imediato
    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    // Sincronizar com Firebase
    try {
      const isFamilyTask = (task as any).familyId && !(task as any).private;
      
      if (isFamilyTask && !isOffline) {
        // Tarefa da família online - atualizar no Firestore
        const toSave = {
          ...updatedTask,
          familyId: (task as any).familyId
        } as any;
        await FirestoreService.saveTask(toSave);
        await LocalStorageService.saveTask(toSave);
        logger.debug('SAVE_TASK', `Status de bloqueio atualizado no Firestore: ${newUnlockedState ? 'DESBLOQUEADO' : 'BLOQUEADO'}`);
      } else {
        // Tarefa privada ou offline - salvar localmente
        await LocalStorageService.saveTask(updatedTask as any);
        
        // Se for tarefa da família mas estiver offline, enfileirar
        if (isFamilyTask) {
          await SyncService.addOfflineOperation('update', 'tasks', {
            ...updatedTask,
            familyId: (task as any).familyId
          });
          logger.debug('OFFLINE_SYNC', `Status de bloqueio enfileirado (offline): ${newUnlockedState ? 'DESBLOQUEADO' : 'BLOQUEADO'}`);
        }
      }
    } catch (error) {
      logger.error('SAVE_TASK', 'Erro ao atualizar status de bloqueio', error);
      // Reverter em caso de erro
      setTasks(prev => prev.map(t => t.id === taskId ? task : t));
      Alert.alert('Erro', 'Não foi possível atualizar o status de bloqueio da tarefa.');
    }
  }, [user, tasks, isOffline]);

  const openPostponeModal = useCallback((task: Task) => {
    setSelectedTaskForPostpone(task);
    // Inicializar com a data e horário atuais da tarefa
    const initialDate = task.dueDate ? new Date(task.dueDate) : new Date();
    const initialTime = task.dueTime ? new Date(task.dueTime) : new Date();
    
    // Atualizar refs
    pickerPostponeDateValueRef.current = initialDate;
    pickerPostponeTimeValueRef.current = initialTime;
  originalPostponeDateRef.current = new Date(initialDate);
  originalPostponeTimeRef.current = new Date(initialTime);
    
    setPostponeDate(initialDate);
    setPostponeTime(initialTime);
    setPostponeModalVisible(true);
  }, []);

  const postponeTask = useCallback(async () => {
    if (!selectedTaskForPostpone) return;
    
    // Apenas admin pode adiar tarefas da família
    if (user.role !== 'admin' && (selectedTaskForPostpone as any).familyId) {
      Alert.alert('Permissão negada', 'Apenas administradores podem adiar tarefas da família.');
      return;
    }

    const task = selectedTaskForPostpone;

    // Normalizar fuso: alinhar dueDate ao início do dia local e dueTime ao horário na mesma data
    const normalizedDate = new Date(postponeDate);
    normalizedDate.setHours(0, 0, 0, 0);
    const normalizedTime = new Date(normalizedDate);
    const pt = new Date(postponeTime);
    normalizedTime.setHours(pt.getHours(), pt.getMinutes(), 0, 0);

    const updatedTask: Task = {
      ...task,
      dueDate: normalizedDate,
      dueTime: normalizedTime,
      updatedAt: new Date(),
      editedBy: user.id,
      editedByName: user.name || 'Usuário',
      editedAt: new Date(),
    } as Task;

    // Atualizar localmente
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    setPostponeModalVisible(false);
    setSelectedTaskForPostpone(null);

    // Sincronizar com Firebase
    try {
      const isFamilyTask = (task as any).familyId && !(task as any).private;
      
      if (isFamilyTask && !isOffline) {
        const toSave = {
          ...updatedTask,
          familyId: (task as any).familyId
        } as any;
        await FirestoreService.saveTask(toSave);
        await LocalStorageService.saveTask(toSave);
        logger.debug('SAVE_TASK', 'Data e horário da tarefa atualizados no Firestore');
      } else {
        await LocalStorageService.saveTask(updatedTask as any);
        
        if (isFamilyTask) {
          await SyncService.addOfflineOperation('update', 'tasks', {
            ...updatedTask,
            familyId: (task as any).familyId
          });
          logger.debug('OFFLINE_SYNC', 'Atualização de data/horário enfileirada (offline)');
        }
      }

      Alert.alert('Sucesso', 'Data e horário da tarefa atualizados.');
    } catch (error) {
      logger.error('SAVE_TASK', 'Erro ao atualizar data/horário da tarefa', error);
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      Alert.alert('Erro', 'Não foi possível atualizar a tarefa.');
    }
  }, [selectedTaskForPostpone, user, isOffline, postponeDate, postponeTime]);

  // Handler para mudança de data no modal de adiamento - USA APENAS REFS
  const onPostponeDateChange = useCallback((event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPostponeDatePicker(false);
      
      if (event?.type === 'set' && date) {
        pickerPostponeDateValueRef.current = date;
        setPostponeDate(date);
      }
    } else if (Platform.OS === 'ios') {
      if (date && showPostponeDatePicker) {
        pickerPostponeDateValueRef.current = date;
        setPostponeDate(date);
      }
    }
  }, [showPostponeDatePicker]);

  // Handler para mudança de hora no modal de adiamento - USA APENAS REFS
  const onPostponeTimeChange = useCallback((event: any, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowPostponeTimePicker(false);
      
      if (event?.type === 'set' && time) {
        const base = postponeDate || pickerPostponeDateValueRef.current;
        const merged = new Date(base);
        merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
        pickerPostponeTimeValueRef.current = merged;
        setPostponeTime(merged);
      }
    } else if (Platform.OS === 'ios') {
      if (time && showPostponeTimePicker) {
        const base = postponeDate || pickerPostponeDateValueRef.current;
        const merged = new Date(base);
        merged.setHours(time.getHours(), time.getMinutes(), 0, 0);
        pickerPostponeTimeValueRef.current = merged;
        setPostponeTime(merged);
      }
    }
  }, [showPostponeTimePicker, postponeDate]);

  // Utilidades para comparar e validar alterações de adiamento
  const hasPostponeChanged = useMemo(() => {
    const origD = originalPostponeDateRef.current;
    const origT = originalPostponeTimeRef.current;
    if (!origD || !origT) return true; // se não tivermos base, permitir confirmar

    const d1 = new Date(origD); d1.setHours(0,0,0,0);
    const d2 = new Date(postponeDate); d2.setHours(0,0,0,0);

    const sameDate = d1.getTime() === d2.getTime();

    const hm1 = { h: new Date(origT).getHours(), m: new Date(origT).getMinutes() };
    const hm2 = { h: new Date(postponeTime).getHours(), m: new Date(postponeTime).getMinutes() };
    const sameTime = hm1.h === hm2.h && hm1.m === hm2.m;

    return !(sameDate && sameTime);
  }, [postponeDate, postponeTime]);

  const combinedPostponeDateTime = useMemo(() => {
    // Combina a data selecionada com a hora selecionada em horário local
    const base = new Date(postponeDate);
    const merged = new Date(base);
    const t = new Date(postponeTime);
    merged.setHours(t.getHours(), t.getMinutes(), 0, 0);
    return merged;
  }, [postponeDate, postponeTime]);

  const postponeIsPast = useMemo(() => {
    return combinedPostponeDateTime.getTime() < new Date().getTime();
  }, [combinedPostponeDateTime]);

  const toggleTask = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    // Dependente: só pode solicitar aprovação para concluir; não pode reabrir
    if (user.role === 'dependente') {
      if (!task.completed) {
        await requestTaskApproval(task);
      } else {
        Alert.alert('Permissão necessária', 'Somente administradores podem reabrir tarefas.');
      }
      return;
    }
    
    // Verificar se tarefa recorrente pode ser concluída
    const repeatConfig = getRepeat(task);
    if (!task.completed && repeatConfig.type !== RepeatType.NONE) {
      if (!isRecurringTaskCompletable(task.dueDate, true)) {
        Alert.alert(
          'Tarefa Recorrente',
          'Esta tarefa recorrente só pode ser concluída na data de vencimento ou após.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // Para admins e demais papéis, seguir para alternar a tarefa normalmente
    await handleTaskToggle(task);
  }, [tasks, user, currentFamily, isOffline]);

  const handleTaskToggle = useCallback(async (task: Task) => {
    // Safety net adicional: dependente não altera diretamente
    if (user.role === 'dependente') {
      if (!task.completed) {
        await requestTaskApproval(task);
      } else {
        Alert.alert('Permissão necessária', 'Somente administradores podem reabrir tarefas.');
      }
      return;
    }
    
    // Salvar estado anterior para funcionalidade de desfazer
    setLastAction({
      type: 'toggle',
      task: { ...task },
      previousState: { ...task },
      timestamp: Date.now()
    });
    setShowUndoButton(true);
    
    // Limpar timeout anterior se existir
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    
    // Esconder botão de desfazer após 10 segundos
    undoTimeoutRef.current = setTimeout(() => {
      setShowUndoButton(false);
      setLastAction(null);
    }, 10000);
    
    let updatedTasks: Task[];
    
      if (!task.completed) {
      // Marcando como concluída
      const repeatConfig = getRepeat(task);
      if (repeatConfig.type !== RepeatType.NONE) {
        // Tarefa recorrente: criar nova instância para a próxima ocorrência
        logger.debug('REPEAT', `Calculando próxima data: ${task.title}, currentDate=${task.dueDate}, repeatType=${repeatConfig.type}`);
        
        // Respeitar duração em meses: se ultrapassou, não cria próxima
        if (repeatConfig.durationMonths && (task as any).repeatStartDate) {
          const start = safeToDate((task as any).repeatStartDate) || new Date();
          const end = new Date(start);
          end.setMonth(end.getMonth() + (repeatConfig.durationMonths || 0));
          const current = safeToDate(task.dueDate) || new Date();
          if (current >= end) {
            // Não cria próxima, apenas marca concluída
            logger.debug('REPEAT', 'Recorrência por intervalo expirou pela duração definida.');
            const updated = tasks.map(t => t.id === task.id ? { ...t, completed: true, status: 'concluida' as TaskStatus } : t);
            setTasks(updated);
            return;
          }
        }

        let nextDate: Date;
        if (repeatConfig.type === RepeatType.INTERVAL) {
          const step = Math.max(1, repeatConfig.intervalDays || (task as any).repeatIntervalDays || 1);
          // ✅ CORREÇÃO: Usar repeatStartDate como base para manter alinhamento com data inicial
          const startDate = (task as any).repeatStartDate ? safeToDate((task as any).repeatStartDate) : task.dueDate;
          const base = startDate || new Date();
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          
          // Calcular próxima data mantendo múltiplo do intervalo desde a data inicial
          nextDate = new Date(base);
          nextDate.setHours(0, 0, 0, 0);
          
          // Se a data base já passou, calcular quantos ciclos se passaram
          if (nextDate < hoje) {
            const diffTime = hoje.getTime() - nextDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const cyclesPassed = Math.ceil(diffDays / step);
            nextDate.setDate(base.getDate() + (cyclesPassed * step));
          } else {
            // Se ainda não passou, apenas adicionar o intervalo
            nextDate.setDate(nextDate.getDate() + step);
          }
          
          logger.debug('REPEAT', `Próxima data (intervalo) calculada: nextDate=${nextDate}`);
        } else {
          nextDate = getNextRecurrenceDate(
            task.dueDate || new Date(), 
            repeatConfig.type, 
            repeatConfig.days
          );
        }
        
        logger.debug('REPEAT', `Próxima data calculada: ${nextDate}`);
        
        // Preservar o horário original se existir
        let nextDateTime: Date | undefined = undefined;
        if (task.dueTime) {
          const originalTime = safeToDate(task.dueTime);
          if (originalTime) {
            nextDateTime = new Date(nextDate);
            nextDateTime.setHours(
              originalTime.getHours(),
              originalTime.getMinutes(),
              originalTime.getSeconds(),
              originalTime.getMilliseconds()
            );
            logger.debug('REPEAT', `Horário preservado: original=${originalTime}, next=${nextDateTime}`);
          }
        }
        
        // Resetar subtarefas para não concluídas
        const resetSubtasks = Array.isArray((task as any).subtasks) 
          ? (task as any).subtasks.map((st: any) => ({
              ...st,
              done: false,
              completedById: undefined,
              completedByName: undefined,
              completedAt: undefined
            }))
          : undefined;

        const nextTask: Task = {
          ...task,
          id: uuidv4(),
          completed: false,
          status: 'pendente',
          dueDate: nextDate,
          dueTime: nextDateTime,
          subtasks: resetSubtasks,
          createdAt: new Date(),
          createdBy: user.id,
          createdByName: user.name,
          editedBy: user.id,
          editedByName: user.name,
          editedAt: new Date()
        } as any;
        
        logger.success('REPEAT', `Nova tarefa recorrente criada: ${nextTask.title}, dueDate=${nextTask.dueDate}`);
        
        // Marcar tarefa atual como concluída e adicionar nova tarefa
        updatedTasks = tasks.map(t => 
          t.id === task.id ? { 
            ...t, 
            completed: true,
            status: 'concluida' as TaskStatus,
            editedBy: user.id,
            editedByName: user.name,
            editedAt: new Date()
          } : t
        );
        
        // Adicionar nova tarefa recorrente à lista
        updatedTasks.push(nextTask);
        
        // Atualizar estado local imediatamente
        setTasks(updatedTasks);
        
        // cancelar lembrete da tarefa atual concluída
        try {
          await NotificationService.cancelTaskReminder(task.id);
        } catch (e) {
          logger.warn('NOTIFY', 'cancelTaskReminder falhou', e);
        }
        
        // Salvar nova tarefa no Firebase e na família imediatamente
            try {
            const remoteNextTask = taskToRemoteTask(nextTask as any);
          await LocalStorageService.saveTask(remoteNextTask as any);
          await SyncService.addOfflineOperation('create', 'tasks', remoteNextTask);
          
          // Salvar imediatamente no Firestore se online
            if (currentFamily && !isOffline) {
              try {
                const toSave = { ...remoteNextTask, familyId: currentFamily.id } as any;
                const res = await FirestoreService.saveTask(toSave);
                await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
                logger.debug('SYNC', `Próxima ocorrência recorrente salva no Firestore: taskId=${toSave.id || (res && (res as any).id)} familyId=${currentFamily.id}`);
              } catch (e) {
                logger.warn('SYNC', 'Falha ao salvar próxima ocorrência no Firestore, fallback local', e);
                try { await FamilySyncHelper.saveTaskToFamily(remoteNextTask as any, currentFamily.id, 'create'); } catch (_) {}
                await SyncService.addOfflineOperation('create', 'tasks', { ...remoteNextTask, familyId: currentFamily.id });
              }
            } else if (currentFamily) {
            // Enfileirar como 'tasks' e incluir explicitamente familyId para que o SyncService envie para Firestore
            await SyncService.addOfflineOperation('create', 'tasks', {
              ...remoteNextTask,
              familyId: currentFamily.id,
            });
            logger.debug('OFFLINE_SYNC', `Próxima ocorrência enfileirada (offline): taskId=${remoteNextTask.id} familyId=${currentFamily.id}`);
          }
          
          // agendar lembrete da próxima ocorrência
          try {
            await NotificationService.scheduleTaskReminder(nextTask as any);
          } catch (e) {
            logger.warn('NOTIFY', 'scheduleTaskReminder falhou', e);
          }
          
          logger.success('REPEAT', `Nova tarefa recorrente criada e sincronizada: taskId=${remoteNextTask.id}` +
            `${currentFamily ? ` familyId=${currentFamily.id}` : ''}`);
        } catch (error) {
          logger.error('REPEAT', 'Erro ao sincronizar nova tarefa recorrente', error);
          // Em caso de erro, manter a nova tarefa no estado local
          Alert.alert(
            'Aviso',
            'A próxima tarefa foi criada localmente, mas houve um problema na sincronização. Ela será enviada quando a conexão for restabelecida.'
          );
        }
      } else {
        // Tarefa normal: apenas marcar como concluída
        updatedTasks = tasks.map(t => 
          t.id === task.id ? { 
            ...t, 
            completed: true,
            status: 'concluida' as TaskStatus,
            editedBy: user.id,
            editedByName: user.name,
            editedAt: new Date()
          } : t
        );
        
        // Atualizar estado local imediatamente
        setTasks(updatedTasks);
        
        // cancelar lembrete
        try {
          await NotificationService.cancelTaskReminder(task.id);
        } catch (e) {
          logger.warn('NOTIFY', 'cancelTaskReminder falhou', e);
        }
      }
    } else {
      // Desmarcando como concluída (apenas para tarefas não recorrentes)
      const repeatConfig = getRepeat(task);
      if (repeatConfig.type === RepeatType.NONE) {
        updatedTasks = tasks.map(t => 
          t.id === task.id ? { 
            ...t, 
            completed: false,
            status: 'pendente' as TaskStatus,
            editedBy: user.id,
            editedByName: user.name,
            editedAt: new Date()
          } : t
        );
        
        // Atualizar estado local imediatamente
        setTasks(updatedTasks);
        
        // reprogramar lembrete se ainda futuro
        const t = updatedTasks.find(x => x.id === task.id);
        if (t) {
          try {
            await NotificationService.rescheduleTaskReminder(t as any);
          } catch (e) {
            logger.warn('NOTIFY', 'rescheduleTaskReminder falhou', e);
          }
        }
      } else {
        // Para tarefas recorrentes concluídas, não permite desmarcar
        // (porque já foi criada a próxima instância)
        Alert.alert(
          'Tarefa Recorrente',
          'Tarefas recorrentes não podem ser desmarcadas. Uma nova instância já foi criada para a próxima ocorrência.'
        );
        return;
      }
    }
    
  // Salvar tarefa atualizada no cache local e sincronizar com o servidor remoto
    const updatedTask = updatedTasks.find(t => t.id === task.id);
    if (updatedTask) {
      try {
        const remoteTask = taskToRemoteTask(updatedTask as any);
        await LocalStorageService.saveTask(remoteTask as any);
        
        // Determinar se é create ou update baseado no ID
        const isTemporaryId = updatedTask.id.startsWith('temp_') || updatedTask.id === 'temp';
        const operationType = isTemporaryId ? 'create' : 'update';
        
  await SyncService.addOfflineOperation(operationType, 'tasks', remoteTask);
        
        // Para tarefas da família, sincronizar imediatamente para evitar conflitos (prefer Firestore quando online)
        if (currentFamily && !isOffline) {
          try {
            const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
            const res = await FirestoreService.saveTask(toSave);
            await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
            logger.debug('SYNC', `Tarefa atualizada no Firestore: taskId=${toSave.id || (res && (res as any).id)} familyId=${currentFamily.id}`);
          } catch (error) {
            logger.error('SYNC', 'Erro ao atualizar tarefa na família via Firestore, fallback local', error);
            try { await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, operationType); } catch (e) { logger.warn('SYNC', 'Falha fallback saveFamilyTask', e); }
            await SyncService.addOfflineOperation(operationType, 'tasks', { ...remoteTask, familyId: currentFamily.id });
          }
        } else if (currentFamily) {
          await SyncService.addOfflineOperation(operationType, 'tasks', { ...remoteTask, familyId: currentFamily.id });
          logger.debug('OFFLINE_SYNC', `Atualização enfileirada (offline): taskId=${remoteTask.id} familyId=${currentFamily.id}`);
        }
        
        logger.success('SAVE_TASK', `Status da tarefa atualizado e sincronizado: taskId=${updatedTask.id}` +
          `${currentFamily ? ` familyId=${currentFamily.id}` : ''}`);
      } catch (error) {
        logger.error('SAVE_TASK', 'Erro ao sincronizar toggle da tarefa', error);
      }
    }
    
    // Adicionar ao histórico
    await addToHistory(
      !task.completed ? 'completed' : 'uncompleted',
      task.title,
      task.id
    );
  }, [user.role, tasks]);

  // Persistir alterações de subtarefas feitas no modal durante edição (salvar imediatamente)
  // FUNÇÃO DESABILITADA: Subtarefas agora só são salvas quando o botão Salvar/Adicionar da task principal é clicado
  // const persistSubtasksDraftIfEditing = useCallback(async (nextDraft: Array<{ id: string; title: string; done: boolean; completedById?: string; completedByName?: string; completedAt?: Date }>) => {
  //   if (!isEditing || !editingTaskId) return;
  //   const baseTask = tasks.find(t => t.id === editingTaskId);
  //   if (!baseTask) return;
  //   const now = new Date();
  //   const updatedTask: Task = {
  //     ...baseTask,
  //     subtasks: nextDraft as any,
  //     editedBy: user.id,
  //     editedByName: user.name,
  //     editedAt: now,
  //   } as any;

  //   // Atualizar estado local imediato
  //   setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

  //   try {
  //     const remoteTask = taskToRemoteTask(updatedTask as any);
  //     await LocalStorageService.saveTask(remoteTask as any);
  //     await SyncService.addOfflineOperation('update', 'tasks', remoteTask);
  //     if (currentFamily) {
  //       if (!isOffline) {
  //         try {
  //           const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
  //           const res = await FirestoreService.saveTask(toSave);
  //           await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
  //         } catch (e) {
  //           try { await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, 'update'); } catch (_) {}
  //           await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
  //         }
  //       } else {
  //         await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
  //       }
  //     }
  //   } catch (e) {
  //     console.error('Erro ao persistir subtarefas do modal:', e);
  //   }
  // }, [isEditing, editingTaskId, tasks, user, currentFamily, isOffline]);


  // Alternar subtarefa (checkbox no card)
  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string, categoryId?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let subtaskToCheck: any = null;

    // Se categoryId foi fornecido, procurar na categoria específica
    if (categoryId) {
      const category = (task as any).subtaskCategories?.find((cat: any) => cat.id === categoryId);
      subtaskToCheck = category?.subtasks?.find((st: any) => st.id === subtaskId);
    } else {
      // Caso contrário, procurar nas subtarefas simples
      subtaskToCheck = (task as any).subtasks?.find((st: any) => st.id === subtaskId);
    }

    // Verificar se a subtarefa pode ser concluída (data de vencimento)
    if (subtaskToCheck && !subtaskToCheck.done && subtaskToCheck.dueDate) {
      const now = new Date();
      const dueDate = safeToDate(subtaskToCheck.dueDate);
      
      if (dueDate) {
        // Se tem hora definida, considerar data+hora, senão apenas data
        if (subtaskToCheck.dueTime) {
          const dueTime = safeToDate(subtaskToCheck.dueTime);
          if (dueTime) {
            const dueDateTimeCheck = new Date(dueDate);
            dueDateTimeCheck.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
            
            if (now < dueDateTimeCheck) {
              Alert.alert(
                'Subtarefa Agendada',
                `Esta subtarefa só pode ser concluída a partir de ${formatDate(dueDate)} às ${formatTime(dueTime)}.`
              );
              return;
            }
          }
        } else {
          // Apenas data, comparar início do dia
          const dueDateStart = new Date(dueDate);
          dueDateStart.setHours(0, 0, 0, 0);
          const nowStart = new Date(now);
          nowStart.setHours(0, 0, 0, 0);
          
          if (nowStart < dueDateStart) {
            Alert.alert(
              'Subtarefa Agendada',
              `Esta subtarefa só pode ser concluída a partir de ${formatDate(dueDate)}.`
            );
            return;
          }
        }
      }
    }

    // Dependente pode marcar subtarefa, mas a conclusão da tarefa principal pode exigir aprovação
    const now = new Date();
    const updatedTasks = tasks.map(t => {
      if (t.id !== taskId) return t;

      // Atualizar subtarefas simples ou categorias dependendo do tipo
      let updatedSubtasks = (t as any).subtasks || [];
      let updatedSubtaskCategories = (t as any).subtaskCategories || [];

      if (categoryId) {
        // Atualizar subtarefa dentro de uma categoria
        updatedSubtaskCategories = updatedSubtaskCategories.map((cat: any) => {
          if (cat.id !== categoryId) return cat;
          return {
            ...cat,
            subtasks: cat.subtasks?.map((st: any) => {
              if (st.id !== subtaskId) return st;
              const newDone = !st.done;
              return {
                ...st,
                done: newDone,
                completedById: newDone ? user.id : undefined,
                completedByName: newDone ? user.name : undefined,
                completedAt: newDone ? now : undefined,
              };
            }) || []
          };
        });
      } else {
        // Atualizar subtarefa simples
        updatedSubtasks = (t as any).subtasks?.map((st: any) => {
          if (st.id !== subtaskId) return st;
          const newDone = !st.done;
          return {
            ...st,
            done: newDone,
            completedById: newDone ? user.id : undefined,
            completedByName: newDone ? user.name : undefined,
            completedAt: newDone ? now : undefined,
          };
        }) || [];
      }

      // Coletar todas as subtarefas para recalcular tempo
      const allSubtasks = [
        ...updatedSubtasks,
        ...updatedSubtaskCategories.flatMap((cat: any) => cat.subtasks || [])
      ];

      // Recalcular data/hora da tarefa principal baseado nas subtarefas pendentes
      const subtaskBasedTime = calculateMainTaskTimeFromPendingSubtasks(allSubtasks);
      const shouldUpdateMainTaskTime = subtaskBasedTime.date || subtaskBasedTime.time;

      return {
        ...t,
        subtasks: updatedSubtasks,
        subtaskCategories: updatedSubtaskCategories,
        // Atualizar data/hora da tarefa principal se houver subtarefas pendentes com data/hora
        dueDate: shouldUpdateMainTaskTime ? (subtaskBasedTime.date || t.dueDate) : t.dueDate,
        dueTime: shouldUpdateMainTaskTime ? (subtaskBasedTime.time || t.dueTime) : t.dueTime,
        editedBy: user.id,
        editedByName: user.name,
        editedAt: now,
      } as any;
    });

    setTasks(updatedTasks);

    const updatedTask = updatedTasks.find(t => t.id === taskId)!;
    let subtask: any = null;

    if (categoryId) {
      const category = (updatedTask as any).subtaskCategories?.find((cat: any) => cat.id === categoryId);
      subtask = category?.subtasks?.find((st: any) => st.id === subtaskId);
    } else {
      subtask = (updatedTask as any).subtasks?.find((st: any) => st.id === subtaskId);
    }
    
    // Adicionar ao histórico com detalhes da subtarefa
    if (subtask) {
      const action = subtask.done ? 'completed' : 'uncompleted';
      const details = `Subtarefa: "${subtask.title}"`;
      await addToHistory(action, updatedTask.title, taskId, details);
    }
    
    // Cancelar notificação da subtarefa se foi marcada como concluída
    if (subtask?.done) {
      try {
        await NotificationService.cancelSubtaskReminder(taskId, subtaskId);
      } catch (e) {
        logger.warn('NOTIFY', 'Falha ao cancelar notificação de subtarefa', e);
      }
    }
    
    try {
      const remoteTask = taskToRemoteTask(updatedTask as any);
      await LocalStorageService.saveTask(remoteTask as any);
      await SyncService.addOfflineOperation('update', 'tasks', remoteTask);
      if (currentFamily) {
        if (!isOffline) {
          try {
            const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
            const res = await FirestoreService.saveTask(toSave);
            await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
          } catch (e) {
            try { await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, 'update'); } catch (_) {}
            await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
          }
        } else {
          await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
        }
      }
    } catch (e) {
      logger.error('SAVE_TASK', 'Erro ao sincronizar subtarefa', e);
    }

    // Se todas subtarefas concluídas, agir sobre a tarefa principal
    try {
      const allDone = Array.isArray((updatedTask as any).subtasks) && (updatedTask as any).subtasks.length > 0 && (updatedTask as any).subtasks.every((st: any) => st.done);
      if (allDone && !updatedTask.completed) {
        if (user.role === 'admin') {
          // Admin pode concluir diretamente (reutiliza fluxo do handleTaskToggle)
          await handleTaskToggle(updatedTask);
        } else {
          // Dependente: solicitar aprovação para concluir tarefa
          await requestTaskApproval(updatedTask);
        }
      }
    } catch (e) {
      logger.warn('SAVE_TASK', 'Erro ao processar conclusão automática por subtarefas', e);
    }
  }, [tasks, user, currentFamily, isOffline]);

  const requestTaskApproval = async (task: Task) => {
    const approval: TaskApproval = {
      id: Date.now().toString(),
      taskId: task.id,
      dependenteId: user.id,
      dependenteName: user.name,
      status: 'pendente',
      requestedAt: new Date(),
      // Vincular familyId usando currentFamily ou fallback para user.familyId
      ...(currentFamily?.id
        ? { familyId: currentFamily.id } as any
        : (user.familyId ? { familyId: user.familyId } as any : {})),
    };

    setApprovals([...approvals, approval]);

    // Atualizar tarefa para status pendente aprovação (local)
    setTasks(tasks.map(t => 
      t.id === task.id ? { 
        ...t, 
        status: 'pendente_aprovacao',
        approvalId: approval.id
      } : t
    ));

    // Persistir alteração para sincronização/tempo real
    try {
      const updated = { ...task, status: 'pendente_aprovacao' as TaskStatus, approvalId: approval.id };
      const remoteTask = taskToRemoteTask(updated as any);
      await LocalStorageService.saveTask(remoteTask as any);
      await SyncService.addOfflineOperation('update', 'tasks', remoteTask);
      if (currentFamily && !isOffline) {
        try {
          const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
          const res = await FirestoreService.saveTask(toSave);
          await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
        } catch (e) {
          logger.warn('APPROVAL', 'Falha ao salvar approval/task pending no Firestore, delegando ao FamilySyncHelper', e);
          try { await FamilySyncHelper.saveTaskToFamily(remoteTask, currentFamily.id, 'update'); } catch (_) {}
          await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
        }
      }
      // Persistir a aprovação (Firestore + cache + fila)
      await LocalStorageService.saveApproval(approval as any);
      // Garantir que familyId esteja no payload enviado para o Firestore; se não houver, tentar buscar
      let familyIdToSend = approval.familyId;
      if (!familyIdToSend) {
        try {
          const fam = await familyService.getUserFamily(user.id);
          familyIdToSend = fam?.id;
        } catch {}
      }
      await SyncService.addOfflineOperation('create', 'approvals', {
        ...approval,
        ...(familyIdToSend ? { familyId: familyIdToSend } : {}),
      });
    } catch (err) {
      logger.error('APPROVAL', 'Erro ao persistir status pendente_aprovacao', err);
    }

    // Notificações para admin serão derivadas de approvals (ver useEffect abaixo)

    Alert.alert(
      'Solicitação Enviada',
      'Sua solicitação para completar a tarefa foi enviada para aprovação dos administradores.',
      [{ text: 'OK' }]
    );

    await addToHistory('approval_requested', task.title, task.id);
  };

  // Derivar notificações a partir das aprovações pendentes (apenas para admins)
  useEffect(() => {
    if (user.role !== 'admin') return;
    const pending = approvals.filter(a => a.status === 'pendente');
    setNotifications(prev => {
      const existing = new Map(prev.map(n => [n.id, n]));
      const derived: ApprovalNotification[] = [];
      for (const a of pending) {
        const notifId = a.id || `${a.taskId}:${a.dependenteId}`;
        if (existing.has(notifId)) {
          // manter estado (inclui read)
          derived.push(existing.get(notifId)!);
        } else {
          const t = tasks.find(t => t.id === a.taskId);
          derived.push({
            id: notifId,
            type: 'task_approval_request',
            taskId: a.taskId,
            taskTitle: t?.title || 'Tarefa',
            dependenteId: a.dependenteId,
            dependenteName: a.dependenteName,
            createdAt: a.requestedAt || new Date(),
            read: false,
          });
        }
      }
      return derived;
    });
  }, [approvals, user.role, tasks]);

  // Quando approvals mudar (ex: sync), manter lista de adminRoleRequests atualizada para admins
  useEffect(() => {
    if (user.role !== 'admin') return;
    const adminReqs = (approvals as any[]).filter(a => (a as any).type === 'admin_role_request');
    setAdminRoleRequests(adminReqs);
  }, [approvals, user.role]);

  // Ao montar, recuperar estado de leitura do cache
  useEffect(() => {
    let mounted = true;
    const loadReads = async () => {
      const reads = await LocalStorageService.getNotificationReads();
      if (!mounted) return;
      setNotifications(prev => prev.map(n => ({ ...n, read: !!reads[n.id] })));
    };
    loadReads();
    return () => { mounted = false; };
  }, []);

  const approveTask = async (approvalId: string, adminComment?: string) => {
    const approval = approvals.find(a => a.id === approvalId);
    if (!approval || user.role !== 'admin') return;

    // Atualizar aprovação
    setApprovals(approvals.map(a => 
      a.id === approvalId ? {
        ...a,
        status: 'aprovada',
        adminId: user.id,
        resolvedAt: new Date(),
        adminComment
      } : a
    ));

    // Completar tarefa
    setTasks(tasks.map(t => 
      t.id === approval.taskId ? {
        ...t,
        completed: true,
        status: 'aprovada'
      } : t
    ));
    // cancelar notificação
    try {
      await NotificationService.cancelTaskReminder(approval.taskId);
    } catch (e) {
      logger.warn('NOTIFY', 'cancelTaskReminder falhou', e);
    }

    // Persistir aprovação e atualizar tarefa (cache + fila + família)
    try {
      const updatedApproval = {
        ...approval,
        status: 'aprovada' as const,
        adminId: user.id,
        resolvedAt: new Date(),
        adminComment
      };
      await LocalStorageService.saveApproval(updatedApproval as any);
      await SyncService.addOfflineOperation('update', 'approvals', updatedApproval);

      const t = tasks.find(t => t.id === approval.taskId);
      if (t) {
        const updatedTask = {
          ...t,
          completed: true,
          status: 'aprovada' as TaskStatus,
          completedAt: new Date(),
          editedAt: new Date(),
          editedBy: user.id,
          editedByName: user.name,
        };
        const remoteTask = taskToRemoteTask(updatedTask as any);
        await LocalStorageService.saveTask(remoteTask as any);
        await SyncService.addOfflineOperation('update', 'tasks', remoteTask);
        if (currentFamily && !isOffline) {
          try {
            const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
            const res = await FirestoreService.saveTask(toSave);
            await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
            } catch (e) {
              logger.warn('APPROVAL', 'Falha ao salvar aprovação/tarefa aprovada no Firestore, delegando ao FamilySyncHelper', e);
              try { await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, 'update'); } catch (_) {}
              await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
            }
        }
      }
    } catch (e) {
      logger.error('APPROVAL', 'Erro ao persistir aprovação/tarefa aprovada', e);
    }

  // Remover notificação e a própria aprovação (local e remoto)
  setNotifications(notifications.filter(n => n.taskId !== approval.taskId));
    setApprovals(prev => prev.filter(a => a.id !== approvalId));
    try {
      await LocalStorageService.removeFromCache('approvals' as any, approvalId);
      await SyncService.addOfflineOperation('delete', 'approvals', { id: approvalId });
    } catch (e) {
      logger.error('APPROVAL', 'Erro ao remover aprovação após aprovar', e);
    }

    await addToHistory('approved', approval.dependenteName + ' - ' + tasks.find(t => t.id === approval.taskId)?.title || '', approval.taskId, adminComment);

    Alert.alert('Tarefa Aprovada', 'A tarefa foi aprovada e marcada como concluída.');
  };

  const rejectTask = async (approvalId: string, adminComment?: string) => {
    const approval = approvals.find(a => a.id === approvalId);
    if (!approval || user.role !== 'admin') return;

    // Atualizar aprovação
    setApprovals(approvals.map(a => 
      a.id === approvalId ? {
        ...a,
        status: 'rejeitada',
        adminId: user.id,
        resolvedAt: new Date(),
        adminComment
      } : a
    ));

    // Reverter tarefa para pendente
    setTasks(tasks.map(t => 
      t.id === approval.taskId ? {
        ...t,
        status: 'rejeitada',
        approvalId: undefined
      } : t
    ));
    // reprogramar lembrete se necessário
    const t = tasks.find(x => x.id === approval.taskId);
    if (t) {
      try {
        await NotificationService.rescheduleTaskReminder(t as any);
      } catch (e) {
        logger.warn('NOTIFY', 'rescheduleTaskReminder falhou', e);
      }
    }

    // Persistir aprovação rejeitada e atualizar tarefa (cache + fila + família)
    try {
      const updatedApproval = {
        ...approval,
        status: 'rejeitada' as const,
        adminId: user.id,
        resolvedAt: new Date(),
        adminComment
      };
      await LocalStorageService.saveApproval(updatedApproval as any);
      await SyncService.addOfflineOperation('update', 'approvals', updatedApproval);

      const t2 = tasks.find(x => x.id === approval.taskId);
      if (t2) {
        const updatedTask = {
          ...t2,
          status: 'rejeitada' as TaskStatus,
          approvalId: undefined,
          editedAt: new Date(),
          editedBy: user.id,
          editedByName: user.name,
        };
        const remoteTask = taskToRemoteTask(updatedTask as any);
        await LocalStorageService.saveTask(remoteTask as any);
        await SyncService.addOfflineOperation('update', 'tasks', remoteTask);
        if (currentFamily && !isOffline) {
          try {
            const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
            const res = await FirestoreService.saveTask(toSave);
            await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
          } catch (e) {
            logger.warn('APPROVAL', 'Falha ao salvar aprovação/tarefa rejeitada no Firestore, delegando ao FamilySyncHelper', e);
            try { await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, 'update'); } catch (_) {}
            await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
          }
        }
      }
    } catch (e) {
      logger.error('APPROVAL', 'Erro ao persistir aprovação/tarefa rejeitada', e);
    }

  // Remover notificação e a própria aprovação (local e remoto)
  setNotifications(notifications.filter(n => n.taskId !== approval.taskId));
    setApprovals(prev => prev.filter(a => a.id !== approvalId));
    try {
      await LocalStorageService.removeFromCache('approvals' as any, approvalId);
      await SyncService.addOfflineOperation('delete', 'approvals', { id: approvalId });
    } catch (e) {
      logger.error('APPROVAL', 'Erro ao remover aprovação após rejeitar', e);
    }

    await addToHistory('rejected', approval.dependenteName + ' - ' + tasks.find(t => t.id === approval.taskId)?.title || '', approval.taskId, adminComment);

    Alert.alert('Tarefa Rejeitada', 'A solicitação de conclusão foi rejeitada.');
  };

  const openApprovalModal = (approval: TaskApproval) => {
    setSelectedApproval(approval);
    setApprovalModalVisible(true);
  };

  // Aprovar/Rejeitar solicitação de promoção a admin
  const resolveAdminRoleRequest = async (approvalId: string, approve: boolean) => {
    if (!currentFamily || user.role !== 'admin') return;
    try {
      setResolvingAdminRequestId(approvalId);
      await (familyService as any).resolveAdminRoleRequest(currentFamily.id, approvalId, approve, user.id, approve ? 'Aprovado para admin' : 'Rejeitado para admin');
      // Atualizar listas locais: remover da lista de pendentes
      setAdminRoleRequests(prev => prev.filter(r => r.id !== approvalId));
      // Atualizar approvals genérica também (caso listada)
      setApprovals(prev => prev.filter((a: any) => a.id !== approvalId));
      // Se aprovado, atualizar lista de membros (promovido torna-se admin)
      try {
        const updated = await familyService.getFamilyById(currentFamily.id);
        if (updated) {
          setCurrentFamily(updated);
          setFamilyMembers(updated.members);
        }
      } catch {}
    } catch (e) {
      logger.error('ADMIN', 'Erro ao resolver solicitação de admin', e);
      Alert.alert('Erro', 'Não foi possível processar a solicitação.');
    } finally {
      setResolvingAdminRequestId(null);
    }
  };

  // Função para copiar código da família
  const copyFamilyCode = async () => {
    try {
      const familyCode = currentFamily?.inviteCode;
      if (familyCode) {
        // Copia apenas o código para a área de transferência
        await Clipboard.setStringAsync(familyCode);
        
        Alert.alert(
          '✓ Código Copiado!', 
          `O código "${familyCode}" foi copiado para a área de transferência.\n\nCompartilhe com quem você deseja adicionar à família.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Erro', 'Código da família não disponível.');
      }
    } catch (error) {
      logger.error('FAMILY', 'Erro ao copiar código', error);
      Alert.alert('Erro', 'Não foi possível copiar o código.');
    }
  };


  const changeMemberRole = useCallback((memberId: string) => {
    // Verificar se o usuário é admin
    if (user.role !== 'admin') {
      Alert.alert('Erro', 'Apenas administradores podem alterar funções de membros.');
      return;
    }
    
    const member = familyMembers.find(m => m.id === memberId);
    
    if (!member) {
      Alert.alert('Erro', 'Membro não encontrado.');
      return;
    }
    
    if (member.id === user.id) {
      Alert.alert('Erro', 'Você não pode alterar sua própria função.');
      return;
    }

    const newRole: UserRole = member.role === 'admin' ? 'dependente' : 'admin';
    const roleNames = {
      'admin': 'Administrador',
      'dependente': 'Dependente'
    };

    Alert.alert(
      'Alterar Função',
      `Deseja alterar ${member.name} de ${roleNames[member.role]} para ${roleNames[newRole]}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Alterar',
          onPress: async () => {
            try {
              // Atualizar localmente primeiro para responsividade
              const updatedMembers = familyMembers.map(m => 
                m.id === memberId ? { ...m, role: newRole } : m
              );
              setFamilyMembers(updatedMembers);
              
              // Atualizar também no currentFamily se necessário
              if (currentFamily) {
                const updatedFamily = {
                  ...currentFamily,
                  members: updatedMembers
                };
                setCurrentFamily(updatedFamily);
                
                // Sincronizar com Firebase e obter família atualizada
                const refreshed = await familyService.updateMemberRole(currentFamily.id, memberId, newRole);
                if (refreshed) {
                  setCurrentFamily(refreshed as any);
                  setFamilyMembers((refreshed as any).members || updatedMembers);
                  // Se o usuário atual foi promovido/demitido, atualizar role no app
                  const selfAfter = (refreshed as any).members?.find((m: any) => m.id === user.id);
                  if (selfAfter && selfAfter.role && selfAfter.role !== user.role && onUserRoleChange) {
                    try { await onUserRoleChange(selfAfter.role, { silent: true }); } catch {}
                  }
                }
              }
              
              Alert.alert('Sucesso', `${member.name} agora é ${roleNames[newRole]}.`);
            } catch (error) {
              logger.error('FAMILY', 'Erro ao alterar função do membro', error);
              Alert.alert('Erro', 'Não foi possível alterar a função do membro.');
              
              // Reverter mudança local em caso de erro
              const revertedMembers = familyMembers.map(m => 
                m.id === memberId ? { ...m, role: member.role } : m
              );
              setFamilyMembers(revertedMembers);
            }
          }
        }
      ]
    );
  }, [familyMembers, user, currentFamily]);

  const startEditingFamilyName = () => {
    setNewFamilyName(currentFamily?.name || '');
    setEditingFamilyName(true);
  };

  const cancelEditingFamilyName = () => {
    setEditingFamilyName(false);
    setNewFamilyName('');
  };

  const saveFamilyName = async () => {
    if (!currentFamily || !newFamilyName.trim()) {
      Alert.alert('Erro', 'Digite um nome válido para a família.');
      return;
    }

    if (newFamilyName.trim() === currentFamily.name) {
      setEditingFamilyName(false);
      return;
    }

    setIsSavingFamilyName(true);
    try {
      // Atualizar localmente primeiro para responsividade
      const updatedFamily = { ...currentFamily, name: newFamilyName.trim() };
      setCurrentFamily(updatedFamily);
      setEditingFamilyName(false);

      // Sincronizar com Firebase
      await familyService.updateFamilyName(currentFamily.id, newFamilyName.trim());
      
      Alert.alert('Sucesso', 'Nome da família atualizado com sucesso!');
    } catch (error) {
      logger.error('FAMILY', 'Erro ao atualizar nome da família', error);
      Alert.alert('Erro', 'Não foi possível atualizar o nome da família.');
      
      // Reverter mudança local em caso de erro
      setCurrentFamily(currentFamily);
      setNewFamilyName(currentFamily.name);
    } finally {
      setIsSavingFamilyName(false);
    }
  };

  const handleManageFamily = async () => {
    // Se não tem família, mostrar interface de criação
    if (!currentFamily) {
      logger.debug('FAMILY', 'Usuário sem família - ativando modo de criação');
      setIsCreatingFamilyMode(true);
      setNewFamilyNameInput('');
      setFamilyModalVisible(true);
      openManagedModal('family');
      return;
    }

    try {
      // Buscar dados atualizados da família
      const familyData = await familyService.getFamilyById(currentFamily.id);
      if (familyData) {
        setCurrentFamily(familyData);
        setFamilyMembers(familyData.members);
        // Sincronizar papel do usuário com os dados da família
        const myMember = familyData.members.find(m => m.id === user.id);
        if (myMember && myMember.role && myMember.role !== user.role) {
          try {
            if (onUserRoleChange) await onUserRoleChange(myMember.role, { silent: true });
          } catch (e) {
            logger.warn('FAMILY', 'Falha ao sincronizar role do usuário ao abrir Gerenciar Família', e);
          }
        }
        setIsCreatingFamilyMode(false);
      }
    } catch (error) {
      logger.error('FAMILY', 'Erro ao carregar dados da família', error);
    }
    
    setFamilyModalVisible(true);
    openManagedModal('family');
  };

  const handleCreateFamilyFromModal = async () => {
    if (!newFamilyNameInput.trim()) {
      Alert.alert('Erro', 'Por favor, insira um nome para a família');
      return;
    }

    setIsCreatingFamily(true);
    try {
      logger.debug('FAMILY', 'Criando nova família pelo modal: ' + newFamilyNameInput);
      
      const newFamily = await familyService.createFamily(newFamilyNameInput.trim(), {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'admin' as UserRole,
        isGuest: false,
        joinedAt: new Date(),
      });

      logger.success('FAMILY', 'Família criada com sucesso: ' + newFamily.id);
      
      // Atualizar estados
      setCurrentFamily(newFamily);
      setFamilyMembers(newFamily.members);
      setIsCreatingFamilyMode(false);
      setNewFamilyNameInput('');

      Alert.alert(
        'Família Criada!',
        `Família "${newFamily.name}" criada com sucesso!\n\nCódigo da família: ${newFamily.inviteCode}\n\nCompartilhe este código com os membros da família.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Modal permanece aberto mostrando os detalhes da família
              logger.debug('FAMILY', 'Modal atualizado para modo de gerenciamento');
            }
          }
        ]
      );
    } catch (error) {
      logger.error('FAMILY', 'Erro ao criar família', error);
      Alert.alert('Erro', 'Não foi possível criar a família. Verifique sua conexão e tente novamente.');
    } finally {
      setIsCreatingFamily(false);
    }
  };

  // Função para desfazer a última ação
  const handleUndo = useCallback(async () => {
    if (!lastAction) return;

    // Limpar timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    setShowUndoButton(false);

    // ===== DESFAZER EXCLUSÃO =====
    if (lastAction.type === 'delete' && lastAction.previousState) {
      const taskToRestore = lastAction.previousState;
      
      try {
        // Adicionar tarefa de volta ao estado
        setTasks(prev => [taskToRestore, ...prev]);
        
        // Salvar no storage local e Firebase
        const remoteTask = taskToRemoteTask(taskToRestore as any);
        await LocalStorageService.saveTask(remoteTask as any);
        
        if (currentFamily && !isOffline) {
          const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
          await FirestoreService.saveTask(toSave);
          logger.debug('UNDO', `Tarefa restaurada no Firestore após exclusão: ${taskToRestore.id}`);
        } else {
          await SyncService.addOfflineOperation('create', 'tasks', { ...remoteTask, familyId: (taskToRestore as any).familyId });
        }
        
        // Reagendar notificações
        if (!taskToRestore.completed) {
          try {
            await NotificationService.scheduleTaskReminder(taskToRestore as any);
            
            // Reagendar notificações de subtarefas
            if ((taskToRestore as any).subtasks && Array.isArray((taskToRestore as any).subtasks)) {
              await NotificationService.scheduleSubtaskReminders(
                taskToRestore.id,
                taskToRestore.title,
                (taskToRestore as any).subtasks
              );
            }
          } catch (e) {
            logger.warn('NOTIFY', 'Falha ao reagendar notificações', e);
          }
        }
        
        // Adicionar ao histórico
        await addToHistory('created', taskToRestore.title, taskToRestore.id);
        
        Alert.alert('✓', 'Exclusão desfeita! Tarefa restaurada com sucesso.');
      } catch (error) {
        logger.error('UNDO', 'Erro ao desfazer exclusão', error);
        Alert.alert('Erro', 'Não foi possível desfazer a exclusão.');
      }
    }
    
    // ===== DESFAZER EDIÇÃO =====
    else if (lastAction.type === 'edit' && lastAction.previousState) {
      const taskToRestore = lastAction.previousState;
      
      try {
        // Restaurar tarefa ao estado anterior
        const updatedTasks = tasks.map(t => 
          t.id === taskToRestore.id ? { ...taskToRestore } : t
        );
        
        setTasks(updatedTasks);
        
        // Salvar no storage local e Firebase
        const remoteTask = taskToRemoteTask(taskToRestore as any);
        await LocalStorageService.saveTask(remoteTask as any);
        
        if (currentFamily && !isOffline) {
          const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
          await FirestoreService.saveTask(toSave);
          logger.debug('UNDO', `Tarefa restaurada ao estado anterior no Firestore: ${taskToRestore.id}`);
        } else {
          await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: (taskToRestore as any).familyId });
        }
        
        // Reagendar notificações com base no estado anterior
        if (!taskToRestore.completed) {
          try {
            await NotificationService.scheduleTaskReminder(taskToRestore as any);
            
            // Reagendar notificações de subtarefas
            if ((taskToRestore as any).subtasks && Array.isArray((taskToRestore as any).subtasks)) {
              await NotificationService.scheduleSubtaskReminders(
                taskToRestore.id,
                taskToRestore.title,
                (taskToRestore as any).subtasks
              );
            }
          } catch (e) {
            logger.warn('NOTIFY', 'Falha ao reagendar notificações', e);
          }
        } else {
          try {
            await NotificationService.cancelTaskReminder(taskToRestore.id);
            await NotificationService.cancelAllSubtaskReminders(taskToRestore.id);
          } catch (e) {
            logger.warn('NOTIFY', 'Falha ao cancelar notificações', e);
          }
        }
        
        Alert.alert('✓', 'Edição desfeita! Tarefa restaurada ao estado anterior.');
      } catch (error) {
        logger.error('UNDO', 'Erro ao desfazer edição', error);
        Alert.alert('Erro', 'Não foi possível desfazer a edição.');
      }
    }
    
    // ===== DESFAZER CONCLUSÃO/TOGGLE =====
    else if (lastAction.type === 'toggle' && lastAction.previousState) {
      const taskToRestore = lastAction.previousState;
      
      // Encontrar todas as tasks relacionadas (no caso de recorrente, pode ter criado uma nova)
      const updatedTasks = tasks.map(t => 
        t.id === taskToRestore.id ? { ...taskToRestore } : t
      );

      // Se a tarefa estava sendo marcada como concluída e era recorrente,
      // precisamos remover a nova instância criada
      if (!taskToRestore.completed && lastAction.task.completed) {
        const repeatConfig = getRepeat(taskToRestore);
        if (repeatConfig.type !== RepeatType.NONE) {
          // Encontrar e remover a tarefa recorrente que foi criada
          // (será a mais recente com o mesmo título e categoria)
          const possibleNewTask = tasks.find(t => 
            t.id !== taskToRestore.id &&
            t.title === taskToRestore.title &&
            t.category === taskToRestore.category &&
            !t.completed &&
            t.createdAt && new Date(t.createdAt).getTime() > Date.now() - 5000 // Criada nos últimos 5 segundos
          );

          if (possibleNewTask) {
            // Remover a tarefa recorrente criada
            const finalTasks = updatedTasks.filter(t => t.id !== possibleNewTask.id);
            setTasks(finalTasks);

            // Remover do Firebase
            try {
              if (currentFamily && !isOffline) {
                await FirestoreService.deleteTask(possibleNewTask.id);
                logger.debug('UNDO', `Tarefa recorrente removida do Firestore: ${possibleNewTask.id}`);
              }
              await SyncService.addOfflineOperation('delete', 'tasks', { id: possibleNewTask.id, familyId: (possibleNewTask as any).familyId });
              
              // Cancelar notificação da tarefa removida
              try {
                await NotificationService.cancelTaskReminder(possibleNewTask.id);
              } catch (e) {
                logger.warn('NOTIFY', 'cancelTaskReminder falhou', e);
              }
            } catch (error) {
              logger.error('UNDO', 'Erro ao remover tarefa recorrente durante desfazer', error);
            }
          } else {
            setTasks(updatedTasks);
          }
        } else {
          setTasks(updatedTasks);
        }
      } else {
        setTasks(updatedTasks);
      }

      // Salvar no Firebase e storage local
      try {
        const remoteTask = taskToRemoteTask(taskToRestore as any);
        await LocalStorageService.saveTask(remoteTask as any);
        
        if (currentFamily && !isOffline) {
          const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
          await FirestoreService.saveTask(toSave);
          logger.debug('UNDO', `Tarefa restaurada no Firestore: ${taskToRestore.id}`);
        } else {
          await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: (taskToRestore as any).familyId });
        }

        // Reagendar notificação se necessário
        if (!taskToRestore.completed) {
          try {
            await NotificationService.scheduleTaskReminder(taskToRestore as any);
          } catch (e) {
            logger.warn('NOTIFY', 'scheduleTaskReminder falhou', e);
          }
        } else {
          try {
            await NotificationService.cancelTaskReminder(taskToRestore.id);
          } catch (e) {
            logger.warn('NOTIFY', 'cancelTaskReminder falhou', e);
          }
        }

        Alert.alert('✓', 'Ação desfeita com sucesso!');
      } catch (error) {
        logger.error('UNDO', 'Erro ao desfazer ação', error);
        Alert.alert('Erro', 'Não foi possível desfazer a ação.');
      }
    }

    setLastAction(null);
  }, [lastAction, tasks, currentFamily, isOffline, user]);

  const deleteTask = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const isFamilyTask = (task as any).familyId && (task as any).private !== true;
    if (user.role === 'dependente' && isFamilyTask) {
      const ok = await ensureFamilyPermission('delete');
      if (!ok) {
        Alert.alert('Sem permissão', 'Você não tem permissão para excluir tarefas da família.');
        return;
      }
    }
    
    Alert.alert(
      'Excluir Tarefa',
      'Tem certeza que deseja excluir esta tarefa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          onPress: async () => {
            try {
              // 🔄 SALVAR ESTADO PARA DESFAZER: Salvar tarefa completa antes de excluir
              const taskToDelete = { ...task };
              
              // Mostrar loading enquanto aguardamos sincronização de exclusão (apenas se online)
              if (!isOffline) setGlobalLoading(true);
              // Atualizar UI imediatamente
              setTasks(prev => prev.filter(t => t.id !== taskId));
              await NotificationService.cancelTaskReminder(taskId).catch(()=>{});
              
              // Cancelar todas as notificações de subtarefas
              try {
                await NotificationService.cancelAllSubtaskReminders(taskId);
              } catch (e) {
                logger.warn('NOTIFY', 'Falha ao cancelar notificações de subtarefas', e);
              }

              // Usar SyncService para executar remotamente quando online ou enfileirar quando offline
              // Inclui familyId para respeitar lógica de famílias locais
              const opData: any = { id: taskId, familyId: (task as any).familyId ?? null };
              await SyncService.addOfflineOperation('delete', 'tasks', opData);

              // Remover do cache local sempre
              await LocalStorageService.removeFromCache('tasks', taskId);

              // Histórico
              await addToHistory('deleted', task.title, taskId);
              
              // ✅ CONFIGURAR DESFAZER: Salvar ação de exclusão
              setLastAction({
                type: 'delete',
                task: taskToDelete,
                previousState: taskToDelete, // Guardar tarefa completa para restauração
                timestamp: Date.now()
              });
              
              setShowUndoButton(true);
              
              // Timer para esconder botão de desfazer após 10 segundos
              if (undoTimeoutRef.current) {
                clearTimeout(undoTimeoutRef.current);
              }
              undoTimeoutRef.current = setTimeout(() => {
                setShowUndoButton(false);
                setLastAction(null);
              }, 10000);
              
            } catch (error) {
              logger.error('DELETE_TASK', 'Erro ao deletar tarefa', error);
              Alert.alert('Erro', 'Não foi possível deletar a tarefa. Tente novamente.');
            } finally {
              setGlobalLoading(false);
            }
          },
          style: 'destructive'
        },
      ]
    );
  }, [tasks, isOffline, user.role, ensureFamilyPermission]);


  const removeFamilyMember = useCallback((memberId: string) => {
    // implementação existente usa Alert.confirm onPress handler — reutilizar função deleteMember parcialmente
    const member = familyMembers.find(m => m.id === memberId);
    if (!member) {
      Alert.alert('Erro', 'Membro não encontrado.');
      return;
    }

    if (member.id === user.id) {
      Alert.alert('Erro', 'Você não pode remover a si mesmo da família.');
      return;
    }

    Alert.alert(
      'Remover Membro',
      `Tem certeza que deseja remover ${member.name} da família?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            if (!currentFamily) return;
            try {
              // Otimista: atualizar UI
              const updatedMembers = familyMembers.filter(m => m.id !== memberId);
              setFamilyMembers(updatedMembers);
              const updatedTasks = tasks.filter(t => t.userId !== memberId);
              setTasks(updatedTasks);

              // Persistir no Firestore
              await (familyService as any).removeMember(currentFamily.id, memberId);

              // Recarregar membros para garantir consistência
              try {
                const refreshed = await familyService.getFamilyById(currentFamily.id);
                if (refreshed) {
                  setCurrentFamily(refreshed);
                  setFamilyMembers(refreshed.members);
                }
              } catch {}

              Alert.alert('Sucesso', `${member.name} foi removido da família.`);
            } catch (e) {
              logger.error('FAMILY', 'Erro ao remover membro', e);
              Alert.alert('Erro', 'Não foi possível remover o membro.');
            }
          }
        }
      ]
    );
  }, [familyMembers, user, tasks, currentFamily]);

  const handleSettings = useCallback(() => {
    setSettingsModalVisible(true);
  }, []);

  const handleUpdateData = async () => {
    setSettingsModalVisible(false);
    
    // Usar a mesma lógica do carregamento inicial
    try {
      if (user?.id) {
        logger.debug('UPDATE_STATE', `Recarregando dados do usuário: userId=${user.id}, familyId=${user.familyId}, isOffline=${isOffline}`);
        
        // Não mostra overlay - usa apenas o banner do header
        // setIsBootstrapping(true);
        
        const userFamily = await familyService.getUserFamily(user.id);
        logger.debug('FAMILY', `Resultado da busca por família: ${userFamily?.name || 'nenhuma'}`);
        
        if (userFamily) {
          setCurrentFamily(userFamily);
          logger.success('FAMILY', `Família recarregada: ${userFamily.name}`);
          
          // Carregar tarefas da família
          const familyTasks = await familyService.getFamilyTasks(userFamily.id, user.id);
          let convertedTasks: Task[] = familyTasks.map(remoteTaskToTask as any);
          // Filtrar tarefas privadas que não pertencem ao usuário atual
          convertedTasks = convertedTasks.filter(t => {
            const isPrivate = (t as any).private === true;
            if (isPrivate && t.createdBy && t.createdBy !== user.id) return false;
            return true;
          });
          setTasks(convertedTasks);
          
          logger.success('SYNC', `${familyTasks.length} tarefas da família recarregadas`);
          // Disparar sync completo em background para atualizar tudo sem travar a UI
          if (!isOffline) {
            SyncService.forceFullSync().catch(e => logger.warn('SYNC', 'forceFullSync falhou em background', e));
          }
        } else {
          logger.info('FAMILY', 'Usuário não possui família');
          
          // Se não tem família, carregar tarefas do cache local
          const cachedTasks = await LocalStorageService.getTasks();
          if (cachedTasks.length > 0) {
            const localTasks: Task[] = (cachedTasks.map(remoteTaskToTask as any) as Task[]);
            setTasks(localTasks);
            logger.success('SYNC', `${localTasks.length} tarefas locais recarregadas do cache`);
          }
        }
        
        // Atualizar timestamp
        setLastUpdate(new Date());
      }
    } catch (error) {
      logger.error('UPDATE_STATE', 'Erro ao recarregar dados', error);
      
      // Em caso de erro, tentar carregar do cache local
      try {
        const cachedTasks = await LocalStorageService.getTasks();
        if (cachedTasks.length > 0) {
          setTasks(cachedTasks);
          logger.info('SYNC', `${cachedTasks.length} tarefas carregadas do cache após erro`);
        }
      } catch (cacheError) {
        logger.error('SYNC', 'Erro ao carregar do cache', cacheError);
      }
    } finally {
      // Não fecha overlay pois nunca foi aberto
      // setIsBootstrapping(false);
    }
  };

  const handleSystemInfo = useCallback(() => {
    const lastUpdateTime = lastUpdate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    setSettingsModalVisible(false);
    
    Alert.alert(
      'Informações do Sistema',
      `Última atualização: ${lastUpdateTime}\n\n` +
      `Status: ${isOffline ? 'Offline' : 'Online'}\n` +
      `Operações pendentes: ${syncStatus.pendingOperations}\n` +
      `Sincronizando: ${syncStatus.isSyncing ? 'Sim' : 'Não'}\n\n` +
      `Total de tarefas: ${tasks.length}\n` +
      `Tarefas pendentes: ${tasks.filter(t => !t.completed).length}\n` +
      `Tarefas concluídas: ${tasks.filter(t => t.completed).length}`,
      [
        { text: 'OK' },
        ...(syncStatus.pendingOperations > 0 ? [{
          text: 'Limpar Pendentes',
          onPress: async () => {
            await LocalStorageService.clearAllPendingOperations();
            await SyncService.initialize(); // Reinicializar para atualizar status
            Alert.alert('Debug', 'Operações pendentes foram limpas!');
          },
          style: 'destructive' as const
        }] : [])
      ]
    );
  }, [lastUpdate, isOffline, syncStatus.pendingOperations, syncStatus.isSyncing, tasks.length]);

  const handleLogout = useCallback(async () => {
    // Chamar diretamente o logout sem alerta duplicado
    // O alerta será exibido no App.tsx
    if (onLogout) {
      await onLogout();
    }
  }, [onLogout]);

  const renderTask = ({ item }: { item: Task }) => {
    const categoryConfig = getCategoryConfig(item.category);
    const isOverdue = isTaskOverdue(item.dueDate, item.dueTime, item.completed);
    const repeatConfig = getRepeat(item);
    const isRecurring = repeatConfig.type !== RepeatType.NONE;
    const canComplete = isRecurringTaskCompletable(item.dueDate, isRecurring);
    const isPendingRecurring = isRecurring && !canComplete && !item.completed;
    
    // Verificar se está na aba Próximas e se a tarefa está desbloqueada
    const isUpcomingTab = activeTab === 'upcoming';
    const isTaskUnlocked = (item as any).unlocked === true;
    const shouldDisableCheckbox = isUpcomingTab && !isTaskUnlocked && !item.completed;
    
    // Sanitizar valores para evitar "Unexpected text node: ." no web
    const sanitizedTitle = (item.title === '.' || !item.title) ? '' : item.title;
    const sanitizedDescription = (item.description === '.' || !item.description) ? '' : item.description;
    const sanitizedCreatedByName = (item.createdByName === '.' || !item.createdByName) ? 'Usuário' : item.createdByName;
    const sanitizedEditedByName = (item.editedByName === '.' || !item.editedByName) ? '' : item.editedByName;
    
    return (
      <View 
        style={[
          styles.taskItem, 
          item.completed && styles.taskCompleted,
          isOverdue && styles.taskOverdue,
          { borderColor: isOverdue ? THEME.danger : categoryConfig.color }
        ]}
      >
        {/* Header da Categoria - Topo do Card */}
        <Pressable 
          style={[styles.categoryHeader, { backgroundColor: categoryConfig.bgColor }]}
          onPress={() => toggleCardCollapse(item.id)}
        >
          <View style={styles.categoryHeaderContent}>
            <Ionicons 
              name={categoryConfig.icon as any} 
              size={14} 
              color={categoryConfig.color} 
            />
            <Text style={[styles.categoryHeaderText, { color: categoryConfig.color }]}>
              {categoryConfig.name}
            </Text>
            {/* Indicador de tarefa recorrente */}
            {isRecurring && (
              <Ionicons 
                name="repeat" 
                size={12} 
                color={categoryConfig.color} 
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
          {/* Lado direito do header: cadeado (se privado) + botão de expandir */}
          <View style={styles.categoryHeaderRight}>
            {((item as any).private === true) && item.createdBy === user.id && (
              <Ionicons name="lock-closed" size={14} color={THEME.textSecondary} />
            )}
            <Ionicons 
              name={collapsedCards.has(item.id) ? "chevron-down-outline" : "chevron-up-outline"} 
              size={16} 
              color={categoryConfig.color} 
            />
          </View>
        </Pressable>

        {/* Conteúdo Principal da Tarefa */}
        <View style={styles.taskCardHeader}>
          <View style={styles.taskMainContent}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
              <Pressable
                onPress={() => toggleTask(item.id)}
                style={[styles.checkboxContainer, { flex: 1 }]}
                disabled={isPendingRecurring || shouldDisableCheckbox}
              >
                <View style={[
                  styles.checkbox,
                  item.completed && styles.checkboxCompleted,
                  (isPendingRecurring || shouldDisableCheckbox) && styles.checkboxDisabled
                ]}>
                  {item.completed && (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </View>
                <Text style={styles.taskTitle}>
                  {sanitizedTitle || 'Sem título'}
                </Text>
                {sanitizedDescription && (
                  <Text style={[
                    styles.taskDescription,
                    item.completed && styles.taskDescriptionCompleted
                  ]}>
                    {sanitizedDescription}
                  </Text>
                )}
              </Pressable>
              
              {/* Botões de ação rápida (admin apenas) */}
              {!item.completed && user.role === 'admin' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {/* Ícone de Bloquear/Desbloquear - apenas na aba Próximas */}
                  {isUpcomingTab && (
                    <Pressable
                      onPress={() => toggleLockTask(item.id)}
                      style={styles.unlockIconButton}
                    >
                      <Ionicons 
                        name={isTaskUnlocked ? "lock-open-outline" : "lock-closed-outline"} 
                        size={22} 
                        color={isTaskUnlocked ? THEME.primary : "#999"} 
                      />
                    </Pressable>
                  )}
                  
                  {/* Ícone de Adiar - visível em todas as abas */}
                  <Pressable
                    onPress={() => openPostponeModal(item)}
                    style={styles.unlockIconButton}
                  >
                    <Ionicons 
                      name="calendar-outline" 
                      size={22} 
                      color="#999" 
                    />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Informações de Agendamento */}
        <View style={styles.scheduleInfo}>
          {(item.dueTime || item.dueDate) && (
            <View style={styles.scheduleItem}>
              <Ionicons 
                name="time-outline" 
                size={14} 
                color={isOverdue ? THEME.danger : THEME.textSecondary} 
              />
              <Text style={[styles.scheduleText, isOverdue && styles.overdueText]}>
                {item.dueDate ? `${formatDate(item.dueDate)} ` : ''}{formatTime(item.dueTime)}
              </Text>
            </View>
          )}

          {/* Indicador de tarefa vencida na mesma linha dos chips de data */}
          {isOverdue && (
            <View style={styles.overdueIndicator}>
              <Ionicons name="warning" size={14} color={THEME.danger} />
              <Text style={styles.overdueLabel}>VENCIDA</Text>
            </View>
          )}

          {repeatConfig.type !== RepeatType.NONE && (
            <View style={styles.scheduleItem}>
              <Ionicons 
                name="repeat-outline" 
                size={14} 
                color={THEME.textSecondary} 
              />
              <Text style={styles.scheduleText}>
                {getRepeatText(repeatConfig)}
              </Text>
            </View>
          )}
        </View>

        {/* Conteúdo Expandido (oculto quando colapsado) */}
        {!collapsedCards.has(item.id) && (
          <>
            {/* Subtarefas no card */}
            {Array.isArray((item as any).subtasks) && (item as any).subtasks.length > 0 && (
              <View style={{ paddingHorizontal: 12, paddingBottom: 8, gap: 6 }}>
                {(item as any).subtasks.map((st: any) => (
                  <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable
                      onPress={() => toggleSubtask(item.id, st.id)}
                      style={[
                        styles.checkbox, 
                        st.done && styles.checkboxCompleted,
                        shouldDisableCheckbox && styles.checkboxDisabled
                      ]}
                      disabled={shouldDisableCheckbox}
                    >
                      {st.done && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.taskDescription, st.done && styles.taskDescriptionCompleted, { flexShrink: 1 }]}>
                          {st.title || 'Subtarefa'}
                        </Text>
                        {st.done && st.completedByName && (
                          <Text style={[styles.authorshipText, { fontSize: 10, marginLeft: 8 }]}>
                            {`por ${st.completedByName}`}
                          </Text>
                        )}
                      </View>
                      {/* Horário da subtarefa */}
                      {(st.dueTime || st.dueDate) && (
                        <View style={styles.subtaskScheduleInfo}>
                          <Ionicons name="time-outline" size={12} color="#999" />
                          <Text style={styles.subtaskScheduleText}>
                            {st.dueDate ? `${formatDate(st.dueDate)} ` : ''}{formatTime(st.dueTime)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Categorias de Subtarefas no card */}
            {Array.isArray((item as any).subtaskCategories) && (item as any).subtaskCategories.length > 0 && (
              <View style={{ paddingHorizontal: 12, paddingBottom: 8, gap: 10 }}>
                {(item as any).subtaskCategories.map((category: any) => (
                  <View key={category.id} style={{ 
                    borderWidth: 1, 
                    borderColor: activeTheme === 'dark' ? '#333' : '#e0e0e0',
                    borderRadius: 8,
                    overflow: 'hidden'
                  }}>
                    {/* Cabeçalho da categoria */}
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      backgroundColor: activeTheme === 'dark' ? '#2a2a2a' : '#f5f5f5'
                    }}>
                      <Text style={{ 
                        fontSize: 12, 
                        fontWeight: '600',
                        color: activeTheme === 'dark' ? '#aaa' : '#666',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                      }}>
                        {category.name}
                      </Text>
                      <Text style={{ 
                        fontSize: 11, 
                        color: activeTheme === 'dark' ? '#888' : '#999'
                      }}>
                        {category.subtasks?.filter((st: any) => st.done).length || 0}/{category.subtasks?.length || 0}
                      </Text>
                    </View>

                    {/* Lista de subtarefas da categoria */}
                    {Array.isArray(category.subtasks) && category.subtasks.length > 0 && (
                      <View style={{ 
                        paddingHorizontal: 10, 
                        paddingVertical: 8,
                        gap: 6,
                        backgroundColor: activeTheme === 'dark' ? '#1a1a1a' : '#fff'
                      }}>
                        {category.subtasks.map((st: any) => (
                          <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Pressable
                              onPress={() => toggleSubtask(item.id, st.id, category.id)}
                              style={[
                                styles.checkbox,
                                st.done && styles.checkboxCompleted,
                                shouldDisableCheckbox && styles.checkboxDisabled
                              ]}
                              disabled={shouldDisableCheckbox}
                            >
                              {st.done && <Ionicons name="checkmark" size={16} color="#fff" />}
                            </Pressable>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[
                                  styles.taskDescription, 
                                  st.done && styles.taskDescriptionCompleted,
                                  { flexShrink: 1 }
                                ]}>
                                  {st.title || 'Subtarefa'}
                                </Text>
                                {st.done && st.completedByName && (
                                  <Text style={[styles.authorshipText, { fontSize: 10, marginLeft: 8 }]}>
                                    {`por ${st.completedByName}`}
                                  </Text>
                                )}
                              </View>
                              {/* Horário da subtarefa */}
                              {(st.dueTime || st.dueDate) && (
                                <View style={styles.subtaskScheduleInfo}>
                                  <Ionicons name="time-outline" size={12} color="#999" />
                                  <Text style={styles.subtaskScheduleText}>
                                    {st.dueDate ? `${formatDate(st.dueDate)} ` : ''}{formatTime(st.dueTime)}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Indicador de status de aprovação */}
            {item.status === 'pendente_aprovacao' && (
              <View style={styles.approvalStatus}>
                <Ionicons name="hourglass-outline" size={16} color={THEME.warning} />
                <Text style={styles.approvalStatusText}>Pendente Aprovação</Text>
              </View>
            )}
            {item.status === 'aprovada' && (
              <View style={[styles.approvalStatus, styles.approvalStatusApproved]}>
                <Ionicons name="checkmark-circle" size={16} color={THEME.success} />
                <Text style={[styles.approvalStatusText, styles.approvalStatusTextApproved]}>Aprovada</Text>
              </View>
            )}
            {item.status === 'rejeitada' && (
              <View style={[styles.approvalStatus, styles.approvalStatusRejected]}>
                <Ionicons name="close-circle" size={16} color={THEME.danger} />
                <Text style={[styles.approvalStatusText, styles.approvalStatusTextRejected]}>Rejeitada</Text>
              </View>
            )}

            {/* Informações de Autoria - Compactas */}
            <View style={styles.authorshipInfo}>
              <View style={{ flex: 1 }}>
                <View style={styles.authorshipRow}>
                  <Ionicons name="person-outline" size={12} color="#999" />
                  <Text style={styles.authorshipText}>
                    {`${sanitizedCreatedByName || 'Usuário'} • ${formatDateTime(item.createdAt)}`}
                  </Text>
                </View>
                {item.editedBy && sanitizedEditedByName && (
                  <View style={styles.authorshipRow}>
                    <Ionicons name="pencil-outline" size={12} color="#999" />
                    <Text style={styles.authorshipText}>
                      {`Editado por ${sanitizedEditedByName}${item.editedAt ? ` • ${formatDateTime(item.editedAt)}` : ''}`}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Botões de ação: sempre clicáveis; handlers validam permissão em runtime */}
              {(user.role === 'admin' || user.role === 'dependente') && (
                (() => {
                  const isFamilyTask = (item as any).familyId && (item as any).private !== true;
                  const selfMember = familyMembers.find(m => m.id === user.id);
                  // Preferir permissões efetivas; se ausentes, cair para permissões locais
                  const perms = (myEffectivePerms ?? (selfMember as any)?.permissions) || {};
                  // Visual: só mostrar como desativado se soubermos explicitamente que NÃO pode (false).
                  // Quando indefinido (ainda sincronizando), exibimos ativo (o handler fará o enforcement).
                  const visualCanEdit = user.role === 'admin' || (user.role === 'dependente' && isFamilyTask && perms.edit !== false);
                  const visualCanDelete = user.role === 'admin' || (user.role === 'dependente' && isFamilyTask && perms.delete !== false);
                  return (
                    <View style={styles.scheduleActions}>
                      <Pressable
                        onPress={() => editTask(item)}
                        style={[styles.scheduleActionButton, !visualCanEdit && { opacity: 0.5 }]}
                      >
                        <Ionicons name="pencil-outline" size={14} color={visualCanEdit ? THEME.primary : '#999'} />
                      </Pressable>
                      <Pressable
                        onPress={() => deleteTask(item.id)}
                        style={[styles.scheduleActionButton, !visualCanDelete && { opacity: 0.5 }]}
                      >
                        <Ionicons name="trash-outline" size={14} color={visualCanDelete ? '#e74c3c' : '#bbb'} />
                      </Pressable>
                    </View>
                  );
                })()
              )}
            </View>
          </>
        )}

      </View>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Header 
          userName={user?.name || 'Usuário'}
          userImage={user?.picture}
          userProfileIcon={user?.profileIcon}
          userRole={user?.role}
          familyName={currentFamily?.name}
          familyId={currentFamily?.id}
          isSyncingPermissions={user.role === 'dependente' && currentFamily?.id ? (myEffectivePerms == null) : false}
          onUserNameChange={onUserNameChange}
          onUserImageChange={onUserImageChange}
          onUserProfileIconChange={onUserProfileIconChange}
          onUserRoleChange={onUserRoleChange}
          onSettings={handleSettings}
          onHistory={() => setHistoryModalVisible(true)}
          onInfo={() => { setSettingsModalVisible(true); openManagedModal('settings'); }}
          onLogout={handleLogout}
          onRefresh={handleUpdateData}
          showUndoButton={showUndoButton}
          onUndo={handleUndo}
          notificationCount={user.role === 'admin' ? (notifications.filter(n => !n.read).length + adminRoleRequests.length) : 0}
          onNotifications={user.role === 'admin' ? async () => {
            // marcar como lidas no estado e persistir
            setNotifications((prev: ApprovalNotification[]) => prev.map(n => ({ ...n, read: true })));
            try {
              const ids = notifications.map(n => n.id);
              await LocalStorageService.setNotificationsRead(ids, true);
            } catch {}
            setApprovalModalVisible(true);
          } : undefined}
          onManageFamily={user.role === 'admin' ? handleManageFamily : undefined}
          tasks={tasks}
          onCalendarDaySelect={(date: Date) => {
            try { Keyboard.dismiss(); } catch {}
            // Preparar criação de tarefa com data selecionada
            setIsEditing(false);
            setEditingTaskId(null as any);
            setNewTaskTitle('');
            setNewTaskDescription('');
            const atMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            setTempDueDate(atMidnight);
            setTempDueTime(undefined as any);
            setModalVisible(true);
            openManagedModal('task');
          }}
          onJoinFamilyByCode={async (code: string) => {
            try {
              if (!user) return;
              const newFamily = await familyService.joinFamily(code, user);
              setCurrentFamily(newFamily);
              // recarregar tarefas da nova família
              const familyTasks = await familyService.getFamilyTasks(newFamily.id, user.id);
              setTasks(familyTasks);
              // atualizar lista de membros
              setFamilyMembers(newFamily.members);
              // Sincronizar papel do usuário com a família (evitar ficar "admin" por engano)
              const myMember = newFamily.members.find(m => m.id === user.id);
              if (myMember && myMember.role && myMember.role !== user.role) {
                try {
                  if (onUserRoleChange) await onUserRoleChange(myMember.role, { silent: true });
                } catch (e) {
                  logger.warn('FAMILY', 'Falha ao sincronizar role do usuário após entrar na família', e);
                }
              }

              // Se o usuário estava sem família e deseja ser segundo admin,
              // enviamos uma solicitação de promoção (fica como dependente inicialmente).
              // Heurística simples: se role local era 'admin' mas entrou como 'dependente', solicitar promoção.
              const wasAdminLocally = user.role === 'admin';
              const nowRole = myMember?.role || user.role;
              const hadNoFamily = !user.familyId;
              if (hadNoFamily && wasAdminLocally && nowRole !== 'admin') {
                try {
                  // Cria approval de admin para a família
                  // Usando LocalFamilyService (já exportado como familyService)
                  await familyService.requestAdminRole(newFamily.id, { ...user, familyId: newFamily.id } as any);
                  Alert.alert(
                    'Solicitação enviada',
                    'Seu pedido para ser administrador foi enviado. Você entrou como dependente e será promovido após aprovação de um administrador.'
                  );
                } catch (e) {
                  logger.warn('FAMILY', 'Falha ao criar solicitação de admin', e);
                }
              }
              // histórico local
              await addToHistory('created', 'Entrada em nova família', '');
            } catch (e) {
              logger.error('FAMILY', 'Erro ao entrar na família por código', e);
              throw e;
            }
          }}
          syncStatus={{
            hasError: syncStatus.hasError,
            isOnline: connectivityState.isConnected,
            pendingOperations: syncStatus.pendingOperations,
            isSyncing: syncStatus.isSyncing
          }}
        />
        
        {/* Árvore de Natal decorativa no background - ocupa tela toda */}
        <Image 
          source={activeTheme === 'dark' 
            ? require('../assets/arvore_dark.png')
            : require('../assets/arvore_claro.png')
          } 
          style={styles.christmasTree}
          resizeMode="cover"
        />
        
        {/* Wrapper centralizado (apenas Web aplica largura 70%) */}
        <View style={[styles.pageContainer, Platform.OS === 'web' && styles.pageContainerWeb]}>
          <PanGestureHandler
          onGestureEvent={onSwipeGestureEvent}
            onHandlerStateChange={handleSwipeGesture}
          activeOffsetX={[-10, 10]} // mais responsivo
          failOffsetY={[-10, 10]}
        >
          <Animated.View style={[styles.content, Platform.OS === 'web' && styles.contentWeb, { opacity: tabFade }] }>

        {/* Header com Tabs e Filtro */}
        <View style={styles.tabsHeaderContainer}>
          {/* Indicador de Tabs Simplificado */}
          <View style={styles.simpleTabContainer}>
            <Pressable
              style={[styles.simpleTab, activeTab === 'today' && styles.activeSimpleTab]}
              onPress={() => changeTab('today')}
            >
              <Text style={[styles.simpleTabText, activeTab === 'today' && styles.activeSimpleTabText]}>
                Hoje ({getTodayTasks().length})
              </Text>
            </Pressable>
            
            <Pressable
              style={[styles.simpleTab, activeTab === 'upcoming' && styles.activeSimpleTab]}
              onPress={() => changeTab('upcoming')}
            >
              <Text style={[styles.simpleTabText, activeTab === 'upcoming' && styles.activeSimpleTabText]}>
                Próximas ({getUpcomingTasks().length})
              </Text>
            </Pressable>
          </View>
          
          {/* Botão de Filtro separado */}
          <Pressable 
            ref={filterButtonRef}
            style={styles.filterButton}
            onPress={() => {
              if (!filterDropdownVisible) {
                // Calcular posição do botão antes de abrir
                filterButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                  setFilterButtonLayout({
                    top: pageY + height + 4, // 4px de espaçamento abaixo do botão
                    right: Dimensions.get('window').width - (pageX + width)
                  });
                });
              }
              setFilterDropdownVisible(!filterDropdownVisible);
            }}
            android_ripple={{ color: 'rgba(0, 122, 255, 0.1)', borderless: false }}
          >
            <Ionicons name="filter" size={18} color={THEME.primary} />
          </Pressable>
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
            keyExtractor={(item) => item.id}
            renderItem={({ item: task }) => (
              <View style={{ width: '100%', alignSelf: 'stretch' }}>
                {renderTask({ item: task })}
              </View>
            )}
            style={styles.taskList}
            contentContainerStyle={styles.taskListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={15}
            scrollEventThrottle={16}
          />
        )}
          </Animated.View>
        </PanGestureHandler>

        </View>

        {/* Botão Nova Tarefa Fixo */}
        <SafeAreaView style={styles.fixedButtonContainer} edges={['bottom']}>
          <Pressable 
            style={({ pressed }) => [
              styles.createTaskButtonFixed,
              pressed && { opacity: 0.9 }
            ]}
            onPress={() => { setModalVisible(true); openManagedModal('task'); }}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.createTaskButtonText}>Nova Tarefa</Text>
          </Pressable>
        </SafeAreaView>

      {/* Dropdown de Filtros - posicionado para abrir à esquerda */}
      {filterDropdownVisible && (
        <>
          {/* Overlay para fechar dropdown */}
          <Pressable
            style={styles.dropdownOverlay}
            onPress={() => setFilterDropdownVisible(false)}
            pointerEvents={filterDropdownVisible ? 'auto' : 'none'}
          />
          
          <View style={[
            styles.filterDropdownMenuFloating,
            {
              top: filterButtonLayout.top,
              right: filterButtonLayout.right
            }
          ]} pointerEvents="auto">
            <ScrollView 
              style={{ maxHeight: 320 }} 
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  style={[
                    styles.filterDropdownItem,
                    filterCategory === category.id && styles.filterDropdownItemActive
                  ]}
                  onPress={() => {
                    setFilterCategory(category.id);
                    setFilterDropdownVisible(false);
                  }}
                >
                  <View style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: 8,
                    backgroundColor: filterCategory === category.id ? `${THEME.primary}15` : category.bgColor,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Ionicons 
                      name={category.icon as any} 
                      size={18} 
                      color={filterCategory === category.id ? THEME.primary : category.color} 
                    />
                  </View>
                  <Text style={[
                    styles.filterDropdownItemText,
                    filterCategory === category.id && styles.filterDropdownItemTextActive
                  ]}>
                    {category.name}
                  </Text>
                  
                  {filterCategory === category.id && (
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: `${THEME.primary}15`,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Ionicons name="checkmark" size={16} color={THEME.primary} />
                    </View>
                  )}
                  
                  {!category.isDefault && (
                    <Pressable
                      style={styles.deleteCategoryButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        deleteCategory(category.id);
                      }}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={14} color="#9ca3af" />
                    </Pressable>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible && (isTopModal('task') || isTopModal('picker') || isTopModal('subtaskPicker'))}
        onRequestClose={() => {
          if (isAddingTask) return; // bloquear fechamento durante salvamento
          setModalVisible(false);
          closeManagedModal('task');
        }}
      >
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Cabeçalho: Título + Toggle Privado + Botão Fechar */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {/* Toggle Privado no cabeçalho */}
                  <Pressable
                    style={[
                      styles.privateToggleButtonCompact, 
                      newTaskPrivate && styles.privateToggleButtonActive,
                      user.role !== 'admin' && styles.opacityDisabled
                    ]}
                    onPress={() => {
                      if (user.role !== 'admin') {
                        Alert.alert('Sem permissão', 'Apenas administradores podem criar tarefas privadas.');
                        return;
                      }
                      setNewTaskPrivate(prev => !prev);
                    }}
                    disabled={user.role !== 'admin'}
                  >
                    <Ionicons 
                      name={newTaskPrivate ? "lock-closed" : "lock-open-outline"} 
                      size={14} 
                      color={newTaskPrivate ? "#fff" : "#666"} 
                    />
                    <Text style={[
                      styles.privateToggleTextCompact, 
                      newTaskPrivate && styles.privateToggleTextActive
                    ]}>
                      Privado
                    </Text>
                  </Pressable>
                  
                  <Pressable onPress={resetForm} disabled={isAddingTask}>
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
                {/* 1. CATEGORIAS */}
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
                      <Pressable
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
                      </Pressable>
                    ))}
                    
                    {/* Botão Nova Categoria no final da lista */}
                    <Pressable
                      style={styles.addCategoryButton}
                      onPress={() => {
                        setCategoryModalVisible(true);
                        openManagedModal('category');
                      }}
                    >
                      <Ionicons name="add-circle" size={16} color={THEME.primary} />
                      <Text style={styles.addCategoryText}>Nova</Text>
                    </Pressable>
                  </ScrollView>
                </View>

                {/* 2. TÍTULO E DESCRIÇÃO */}
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="Título da tarefa"
                  placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  maxLength={100}
                />

                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.textPrimary }]}
                  placeholder="Descrição (opcional)"
                  placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                  value={newTaskDescription}
                  onChangeText={setNewTaskDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={300}
                />

                {/* 3. SUBTAREFAS */}
                <View style={{ marginTop: 12 }}>
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.categoryLabel, { marginBottom: 8 }]}>Categorias de Subtarefas:</Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      <Pressable
                        onPress={() => setSubtaskMode(subtaskMode === 'simple' ? 'none' : 'simple')}
                        style={[
                          styles.scheduleActionButton,
                          { flex: 1, minWidth: 140 },
                          subtaskMode === 'simple' && { backgroundColor: THEME.primary }
                        ]}
                      >
                        <Ionicons name="add" size={16} color={subtaskMode === 'simple' ? "#fff" : THEME.primary} />
                        <Text style={{ 
                          color: subtaskMode === 'simple' ? '#fff' : THEME.primary, 
                          fontSize: 12, 
                          marginLeft: 4 
                        }}>
                          Subtarefas
                        </Text>
                      </Pressable>
                      
                      <Pressable
                        onPress={() => setSubtaskMode(subtaskMode === 'category' ? 'none' : 'category')}
                        style={[
                          styles.scheduleActionButton,
                          { flex: 1, minWidth: 140 },
                          subtaskMode === 'category' && { backgroundColor: THEME.primary }
                        ]}
                      >
                        <Ionicons name="add" size={16} color={subtaskMode === 'category' ? "#fff" : THEME.primary} />
                        <Text style={{ 
                          color: subtaskMode === 'category' ? '#fff' : THEME.primary, 
                          fontSize: 12, 
                          marginLeft: 4 
                        }}>
                          Com Categoria
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Modo: Subtarefas Simples */}
                  {subtaskMode === 'simple' && (
                    <View>
                      {subtasksDraft.length > 0 && (
                        <View style={{ gap: 8, marginBottom: 8 }}>
                          {subtasksDraft.map((st, idx) => (
                            <View key={st.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexWrap: 'nowrap' }}>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <TextInput
                                  style={[styles.input, { color: colors.textPrimary }]}
                                  placeholder={`Subtarefa ${idx + 1}`}
                                  placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                                  value={st.title}
                                  onChangeText={(txt) => setSubtasksDraft(prev => {
                                    const next = prev.map(s => s.id === st.id ? { ...s, title: txt } : s);
                                    return next;
                                  })}
                                />
                              </View>
                              <Pressable 
                                onPress={() => {
                                  logger.debug('PICKERS', `Botão de data da subtarefa clicado! ID: ${st.id}`);
                                  setEditingSubtaskId(st.id);
                                  if (Platform.OS === 'web') {
                                    const inputElement = webSubtaskDateInputRef.current as HTMLInputElement | null;
                                    if (inputElement) {
                                      (inputElement as any)._editingSubtaskId = st.id;
                                      if (st.dueDate) {
                                        datePickerBaseRef.current = st.dueDate;
                                      }
                                      if (st.dueDate) {
                                        const y = st.dueDate.getFullYear();
                                        const m = String(st.dueDate.getMonth() + 1).padStart(2, '0');
                                        const d = String(st.dueDate.getDate()).padStart(2, '0');
                                        inputElement.value = `${y}-${m}-${d}`;
                                      } else {
                                        const now = new Date();
                                        const y = now.getFullYear();
                                        const m = String(now.getMonth() + 1).padStart(2, '0');
                                        inputElement.value = `${y}-${m}-01`;
                                      }
                                      logger.debug('PICKERS', `ID armazenado no input: ${st.id}`);
                                      try {
                                        (inputElement as any).focus?.();
                                        if (typeof (inputElement as any).showPicker === 'function') {
                                          logger.debug('PICKERS', 'Usando showPicker() para subtarefa');
                                          (inputElement as any).showPicker();
                                        } else {
                                          logger.debug('PICKERS', 'Usando click() para subtarefa');
                                          (inputElement as any).click();
                                        }
                                      } catch (error) {
                                        logger.error('PICKERS', 'Erro ao abrir picker de subtarefa', error);
                                      }
                                    }
                                  } else {
                                    if (st.dueDate) {
                                      datePickerBaseRef.current = st.dueDate;
                                      pickerSubtaskDateValueRef.current = st.dueDate;
                                    } else {
                                      datePickerBaseRef.current = null;
                                      pickerSubtaskDateValueRef.current = stableNowRef.current;
                                    }
                                    setShowSubtaskDatePicker(true);
                                    openManagedModal('subtaskPicker');
                                  }
                                }}
                                style={[styles.scheduleActionButton, { flexShrink: 0 }, st.dueDate && styles.scheduleActionButtonActive]}
                              >
                                <Ionicons 
                                  name="calendar-outline" 
                                  size={14} 
                                  color={st.dueDate ? "#fff" : THEME.primary} 
                                />
                                {st.dueDate && (
                                  <Text style={styles.scheduleActionButtonText}>
                                    {formatDate(st.dueDate)}
                                  </Text>
                                )}
                              </Pressable>
                              <Pressable 
                                onPress={() => {
                                  logger.debug('PICKERS', `Botão de hora da subtarefa clicado! ID: ${st.id}`);
                                  setEditingSubtaskId(st.id);
                                  if (Platform.OS === 'web') {
                                    const inputElement = webSubtaskTimeInputRef.current as HTMLInputElement | null;
                                    if (inputElement) {
                                      (inputElement as any)._editingSubtaskId = st.id;
                                      if (st.dueTime) {
                                        timePickerBaseRef.current = st.dueTime;
                                      }
                                      if (st.dueTime) {
                                        const hh = String(st.dueTime.getHours()).padStart(2, '0');
                                        const mm = String(st.dueTime.getMinutes()).padStart(2, '0');
                                        inputElement.value = `${hh}:${mm}`;
                                      } else {
                                        inputElement.value = '';
                                      }
                                      logger.debug('PICKERS', `ID armazenado no input: ${st.id}`);
                                      try {
                                        (inputElement as any).focus?.();
                                        if (typeof (inputElement as any).showPicker === 'function') {
                                          logger.debug('PICKERS', 'Usando showPicker() para subtarefa');
                                          (inputElement as any).showPicker();
                                        } else {
                                          logger.debug('PICKERS', 'Usando click() para subtarefa');
                                          (inputElement as any).click();
                                        }
                                      } catch (error) {
                                        logger.error('PICKERS', 'Erro ao abrir picker de subtarefa', error);
                                      }
                                    }
                                  } else {
                                    if (st.dueTime) {
                                      timePickerBaseRef.current = st.dueTime;
                                      pickerSubtaskTimeValueRef.current = st.dueTime;
                                    } else {
                                      timePickerBaseRef.current = null;
                                      pickerSubtaskTimeValueRef.current = stableNowRef.current;
                                    }
                                    setShowSubtaskTimePicker(true);
                                    openManagedModal('subtaskPicker');
                                  }
                                }}
                                style={[styles.scheduleActionButton, { flexShrink: 0 }, st.dueTime && styles.scheduleActionButtonActive]}
                              >
                                <Ionicons 
                                  name="time-outline" 
                                  size={14} 
                                  color={st.dueTime ? "#fff" : THEME.primary} 
                                />
                                {st.dueTime && (
                                  <Text style={styles.scheduleActionButtonText}>
                                    {formatTime(st.dueTime)}
                                  </Text>
                                )}
                              </Pressable>
                              <Pressable 
                                onPress={() => setSubtasksDraft(prev => {
                                  const next = prev.filter(s => s.id !== st.id);
                                  return next;
                                })}
                                style={[styles.scheduleActionButton, { flexShrink: 0 }]}
                              >
                                <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                        <TextInput
                          style={[styles.input, { flex: 1, marginBottom: 0, minWidth: 0, color: colors.textPrimary }]}
                          placeholder="Adicionar subtarefa"
                          placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                          value={newSubtaskTitle}
                          onChangeText={setNewSubtaskTitle}
                        />
                        <Pressable
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              const inputElement = webSubtaskDateInputRef.current as HTMLInputElement | null;
                              if (inputElement) {
                                (inputElement as any)._editingSubtaskId = 'new-subtask';
                                (inputElement as any)._categoryId = null;
                                if (newSubtaskDate) {
                                  datePickerBaseRef.current = newSubtaskDate;
                                  const y = newSubtaskDate.getFullYear();
                                  const m = String(newSubtaskDate.getMonth() + 1).padStart(2, '0');
                                  const d = String(newSubtaskDate.getDate()).padStart(2, '0');
                                  inputElement.value = `${y}-${m}-${d}`;
                                } else {
                                  const now = new Date();
                                  const y = now.getFullYear();
                                  const m = String(now.getMonth() + 1).padStart(2, '0');
                                  inputElement.value = `${y}-${m}-01`;
                                }
                                try {
                                  (inputElement as any).focus?.();
                                  if (typeof (inputElement as any).showPicker === 'function') {
                                    (inputElement as any).showPicker();
                                  } else {
                                    (inputElement as any).click();
                                  }
                                } catch (error) {
                                  logger.error('PICKERS', 'Erro ao abrir picker', error);
                                }
                              }
                            } else {
                              if (newSubtaskDate) {
                                datePickerBaseRef.current = newSubtaskDate;
                                pickerSubtaskDateValueRef.current = newSubtaskDate;
                              } else {
                                datePickerBaseRef.current = null;
                                pickerSubtaskDateValueRef.current = stableNowRef.current;
                              }
                              setEditingSubtaskId('new-subtask');
                              setShowSubtaskDatePicker(true);
                              openManagedModal('subtaskPicker');
                            }
                          }}
                          style={[styles.scheduleActionButton, { marginBottom: 0, flexShrink: 0 }, newSubtaskDate && styles.scheduleActionButtonActive]}
                        >
                          <Ionicons 
                            name="calendar-outline" 
                            size={12} 
                            color={newSubtaskDate ? "#fff" : THEME.primary} 
                          />
                          {newSubtaskDate && (
                            <Text style={[styles.scheduleActionButtonText, { fontSize: 10 }]}>
                              {formatDate(newSubtaskDate)}
                            </Text>
                          )}
                        </Pressable>
                        
                        <Pressable
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              const inputElement = webSubtaskTimeInputRef.current as HTMLInputElement | null;
                              if (inputElement) {
                                (inputElement as any)._editingSubtaskId = 'new-subtask';
                                (inputElement as any)._categoryId = null;
                                if (newSubtaskTime) {
                                  timePickerBaseRef.current = newSubtaskTime;
                                  const hh = String(newSubtaskTime.getHours()).padStart(2, '0');
                                  const mm = String(newSubtaskTime.getMinutes()).padStart(2, '0');
                                  inputElement.value = `${hh}:${mm}`;
                                } else {
                                  inputElement.value = '';
                                }
                                try {
                                  (inputElement as any).focus?.();
                                  if (typeof (inputElement as any).showPicker === 'function') {
                                    (inputElement as any).showPicker();
                                  } else {
                                    (inputElement as any).click();
                                  }
                                } catch (error) {
                                  logger.error('PICKERS', 'Erro ao abrir picker', error);
                                }
                              }
                            } else {
                              if (newSubtaskTime) {
                                timePickerBaseRef.current = newSubtaskTime;
                                pickerSubtaskTimeValueRef.current = newSubtaskTime;
                              } else {
                                timePickerBaseRef.current = null;
                                pickerSubtaskTimeValueRef.current = stableNowRef.current;
                              }
                              setEditingSubtaskId('new-subtask');
                              setShowSubtaskTimePicker(true);
                              openManagedModal('subtaskPicker');
                            }
                          }}
                          style={[styles.scheduleActionButton, { marginBottom: 0, flexShrink: 0 }, newSubtaskTime && styles.scheduleActionButtonActive]}
                        >
                          <Ionicons 
                            name="time-outline" 
                            size={12} 
                            color={newSubtaskTime ? "#fff" : THEME.primary} 
                          />
                          {newSubtaskTime && (
                            <Text style={[styles.scheduleActionButtonText, { fontSize: 10 }]}>
                              {formatTime(newSubtaskTime)}
                            </Text>
                          )}
                        </Pressable>
                        
                        <Pressable
                          onPress={() => {
                            const title = newSubtaskTitle.trim();
                            if (!title) return;
                            setSubtasksDraft(prev => {
                              const next = [...prev, { 
                                id: uuidv4(), 
                                title, 
                                done: false,
                                dueDate: newSubtaskDate,
                                dueTime: newSubtaskTime
                              }];
                              return next;
                            });
                            setNewSubtaskTitle('');
                            setNewSubtaskDate(undefined);
                            setNewSubtaskTime(undefined);
                          }}
                          style={[styles.scheduleActionButton, { marginBottom: 0, flexShrink: 0 }]}
                        >
                          <Ionicons name="add" size={18} color={THEME.primary} />
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {/* Modo: Com Categoria */}
                  {subtaskMode === 'category' && (
                    <View>
                      {/* Input para adicionar nova categoria */}
                      {isAddingCategory && (
                        <View style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          gap: 8, 
                          marginBottom: 12, 
                          padding: 12, 
                          backgroundColor: activeTheme === 'dark' ? '#2a2a2a' : '#f0f0f0', 
                          borderRadius: 8 
                        }}>
                          <TextInput
                            style={[styles.input, { 
                              flex: 1, 
                              marginBottom: 0, 
                              backgroundColor: activeTheme === 'dark' ? '#1a1a1a' : '#fff',
                              color: colors.textPrimary
                            }]}
                            placeholder="Nome da categoria"
                            placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                            value={newCategoryTitle}
                            onChangeText={setNewCategoryTitle}
                            autoFocus
                          />
                          <Pressable
                            onPress={() => {
                              const title = newCategoryTitle.trim();
                              if (!title) {
                                Alert.alert('Erro', 'Digite um nome para a categoria');
                                return;
                              }
                              const newCategory: SubtaskCategory = {
                                id: uuidv4(),
                                name: title,
                                subtasks: [],
                                isExpanded: true,
                                createdAt: new Date()
                              };
                              setSubtaskCategories(prev => [...prev, newCategory]);
                              setNewCategoryTitle('');
                              setIsAddingCategory(false);
                            }}
                            style={[styles.scheduleActionButton, { backgroundColor: THEME.primary, marginBottom: 0 }]}
                          >
                            <Ionicons name="checkmark" size={18} color="#fff" />
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              setIsAddingCategory(false);
                              setNewCategoryTitle('');
                            }}
                            style={[styles.scheduleActionButton, { marginBottom: 0 }]}
                          >
                            <Ionicons name="close" size={18} color="#e74c3c" />
                          </Pressable>
                        </View>
                      )}

                      {/* Botão para adicionar categoria se não estiver adicionando */}
                      {!isAddingCategory && (
                        <Pressable
                          onPress={() => setIsAddingCategory(true)}
                          style={[styles.scheduleActionButton, { backgroundColor: THEME.primary, marginBottom: 12 }]}
                        >
                          <Ionicons name="add" size={16} color="#fff" />
                          <Text style={{ color: '#fff', fontSize: 12, marginLeft: 4 }}>Nova Categoria</Text>
                        </Pressable>
                      )}

                      {/* Lista de categorias */}
                      {subtaskCategories.map((category) => (
                        <View key={category.id} style={{ 
                          marginBottom: 12, 
                          borderWidth: 1, 
                          borderColor: activeTheme === 'dark' ? '#444' : '#e0e0e0', 
                          borderRadius: 8, 
                          overflow: 'hidden',
                          backgroundColor: activeTheme === 'dark' ? '#1a1a1a' : '#fff'
                        }}>
                          {/* Cabeçalho da categoria */}
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            padding: 12, 
                            backgroundColor: activeTheme === 'dark' ? '#2a2a2a' : '#f8f8f8' 
                          }}>
                            <Pressable
                              onPress={() => {
                                setSubtaskCategories(prev =>
                                  prev.map(cat =>
                                    cat.id === category.id
                                      ? { ...cat, isExpanded: !cat.isExpanded }
                                      : cat
                                  )
                                );
                              }}
                              style={{ marginRight: 8 }}
                            >
                              <Ionicons 
                                name={category.isExpanded ? "chevron-down" : "chevron-forward"} 
                                size={20} 
                                color={activeTheme === 'dark' ? '#aaa' : '#666'} 
                              />
                            </Pressable>
                            <Text style={{ 
                              flex: 1, 
                              fontSize: 16, 
                              fontWeight: '600', 
                              color: activeTheme === 'dark' ? '#fff' : '#333' 
                            }}>
                              {category.name}
                            </Text>
                            <Text style={{ 
                              fontSize: 12, 
                              color: activeTheme === 'dark' ? '#aaa' : '#666', 
                              marginRight: 8 
                            }}>
                              {category.subtasks.filter(st => st.done).length}/{category.subtasks.length}
                            </Text>
                            <Pressable
                              onPress={() => {
                                Alert.alert(
                                  'Remover Categoria',
                                  `Deseja remover a categoria "${category.name}" e todas as suas subtarefas?`,
                                  [
                                    { text: 'Cancelar', style: 'cancel' },
                                    {
                                      text: 'Remover',
                                      style: 'destructive',
                                      onPress: () => {
                                        setSubtaskCategories(prev => prev.filter(cat => cat.id !== category.id));
                                      }
                                    }
                                  ]
                                );
                              }}
                            >
                              <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                            </Pressable>
                          </View>

                          {/* Conteúdo da categoria (expandido) */}
                          {category.isExpanded && (
                            <View style={{ 
                              padding: 12, 
                              backgroundColor: activeTheme === 'dark' ? '#1a1a1a' : '#fff' 
                            }}>
                              {/* Lista de subtarefas da categoria */}
                              {category.subtasks.map((subtask) => (
                                <View key={subtask.id} style={{ marginBottom: 8 }}>
                                  <View style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    padding: 8, 
                                    backgroundColor: activeTheme === 'dark' ? '#2a2a2a' : '#f9f9f9', 
                                    borderRadius: 6 
                                  }}>
                                    <Pressable
                                      onPress={() => {
                                        setSubtaskCategories(prev =>
                                          prev.map(cat =>
                                            cat.id === category.id
                                              ? {
                                                  ...cat,
                                                  subtasks: cat.subtasks.map(st =>
                                                    st.id === subtask.id
                                                      ? { ...st, done: !st.done }
                                                      : st
                                                  )
                                                }
                                              : cat
                                          )
                                        );
                                      }}
                                      style={{ marginRight: 8 }}
                                    >
                                      <Ionicons
                                        name={subtask.done ? "checkbox" : "square-outline"}
                                        size={20}
                                        color={subtask.done ? THEME.primary : (activeTheme === 'dark' ? '#666' : '#999')}
                                      />
                                    </Pressable>
                                    <Text style={{ 
                                      flex: 1, 
                                      color: subtask.done ? (activeTheme === 'dark' ? '#666' : '#999') : (activeTheme === 'dark' ? '#ddd' : '#333'), 
                                      textDecorationLine: subtask.done ? 'line-through' : 'none' 
                                    }}>
                                      {subtask.title}
                                    </Text>
                                    <Pressable
                                      onPress={() => {
                                        setSubtaskCategories(prev =>
                                          prev.map(cat =>
                                            cat.id === category.id
                                              ? {
                                                  ...cat,
                                                  subtasks: cat.subtasks.filter(st => st.id !== subtask.id)
                                                }
                                              : cat
                                          )
                                        );
                                      }}
                                    >
                                      <Ionicons name="close-circle" size={20} color="#e74c3c" />
                                    </Pressable>
                                  </View>
                                  
                                  {/* Botões de data e hora da subtarefa */}
                                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, paddingLeft: 8, flexWrap: 'nowrap' }}>
                                    <Pressable
                                      onPress={() => {
                                        logger.debug('PICKERS', `Botão de data da subtarefa de categoria clicado! ID: ${subtask.id}`);
                                        setEditingSubtaskId(subtask.id);
                                        setEditingSubtaskCategoryId(category.id);
                                        if (Platform.OS === 'web') {
                                          const inputElement = webSubtaskDateInputRef.current as HTMLInputElement | null;
                                          if (inputElement) {
                                            (inputElement as any)._editingSubtaskId = subtask.id;
                                            (inputElement as any)._categoryId = category.id;
                                            if (subtask.dueDate) {
                                              datePickerBaseRef.current = subtask.dueDate;
                                            }
                                            if (subtask.dueDate) {
                                              const y = subtask.dueDate.getFullYear();
                                              const m = String(subtask.dueDate.getMonth() + 1).padStart(2, '0');
                                              const d = String(subtask.dueDate.getDate()).padStart(2, '0');
                                              inputElement.value = `${y}-${m}-${d}`;
                                            } else {
                                              const now = new Date();
                                              const y = now.getFullYear();
                                              const m = String(now.getMonth() + 1).padStart(2, '0');
                                              inputElement.value = `${y}-${m}-01`;
                                            }
                                            try {
                                              (inputElement as any).focus?.();
                                              if (typeof (inputElement as any).showPicker === 'function') {
                                                (inputElement as any).showPicker();
                                              } else {
                                                (inputElement as any).click();
                                              }
                                            } catch (error) {
                                              logger.error('PICKERS', 'Erro ao abrir picker', error);
                                            }
                                          }
                                        } else {
                                          if (subtask.dueDate) {
                                            datePickerBaseRef.current = subtask.dueDate;
                                            pickerSubtaskDateValueRef.current = subtask.dueDate;
                                          } else {
                                            datePickerBaseRef.current = null;
                                            pickerSubtaskDateValueRef.current = stableNowRef.current;
                                          }
                                          setShowSubtaskDatePicker(true);
                                          openManagedModal('subtaskPicker');
                                        }
                                      }}
                                      style={[styles.scheduleActionButton, { marginBottom: 0, flexShrink: 0 }, subtask.dueDate && styles.scheduleActionButtonActive]}
                                    >
                                      <Ionicons 
                                        name="calendar-outline" 
                                        size={12} 
                                        color={subtask.dueDate ? "#fff" : THEME.primary} 
                                      />
                                      {subtask.dueDate && (
                                        <Text style={[styles.scheduleActionButtonText, { fontSize: 10 }]}>
                                          {formatDate(subtask.dueDate)}
                                        </Text>
                                      )}
                                    </Pressable>
                                    
                                    <Pressable
                                      onPress={() => {
                                        logger.debug('PICKERS', `Botão de hora da subtarefa de categoria clicado! ID: ${subtask.id}`);
                                        setEditingSubtaskId(subtask.id);
                                        setEditingSubtaskCategoryId(category.id);
                                        if (Platform.OS === 'web') {
                                          const inputElement = webSubtaskTimeInputRef.current as HTMLInputElement | null;
                                          if (inputElement) {
                                            (inputElement as any)._editingSubtaskId = subtask.id;
                                            (inputElement as any)._categoryId = category.id;
                                            if (subtask.dueTime) {
                                              timePickerBaseRef.current = subtask.dueTime;
                                            }
                                            if (subtask.dueTime) {
                                              const hh = String(subtask.dueTime.getHours()).padStart(2, '0');
                                              const mm = String(subtask.dueTime.getMinutes()).padStart(2, '0');
                                              inputElement.value = `${hh}:${mm}`;
                                            } else {
                                              inputElement.value = '';
                                            }
                                            try {
                                              (inputElement as any).focus?.();
                                              if (typeof (inputElement as any).showPicker === 'function') {
                                                (inputElement as any).showPicker();
                                              } else {
                                                (inputElement as any).click();
                                              }
                                            } catch (error) {
                                              logger.error('PICKERS', 'Erro ao abrir picker', error);
                                            }
                                          }
                                        } else {
                                          if (subtask.dueTime) {
                                            timePickerBaseRef.current = subtask.dueTime;
                                            pickerSubtaskTimeValueRef.current = subtask.dueTime;
                                          } else {
                                            timePickerBaseRef.current = null;
                                            pickerSubtaskTimeValueRef.current = stableNowRef.current;
                                          }
                                          setShowSubtaskTimePicker(true);
                                          openManagedModal('subtaskPicker');
                                        }
                                      }}
                                      style={[styles.scheduleActionButton, { marginBottom: 0, flexShrink: 0 }, subtask.dueTime && styles.scheduleActionButtonActive]}
                                    >
                                      <Ionicons 
                                        name="time-outline" 
                                        size={12} 
                                        color={subtask.dueTime ? "#fff" : THEME.primary} 
                                      />
                                      {subtask.dueTime && (
                                        <Text style={[styles.scheduleActionButtonText, { fontSize: 10 }]}>
                                          {formatTime(subtask.dueTime)}
                                        </Text>
                                      )}
                                    </Pressable>
                                  </View>
                                </View>
                              ))}

                              {/* Input para adicionar subtarefa na categoria */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'nowrap' }}>
                                <TextInput
                                  style={[styles.input, { 
                                    flex: 1, 
                                    marginBottom: 0, 
                                    fontSize: 14,
                                    minWidth: 0,
                                    backgroundColor: activeTheme === 'dark' ? '#2a2a2a' : '#fff',
                                    color: colors.textPrimary
                                  }]}
                                  placeholder="Adicionar subtarefa"
                                  placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                                  value={newSubtaskInCategory?.categoryId === category.id ? newSubtaskInCategory.title : ''}
                                  onChangeText={(text) => setNewSubtaskInCategory({ categoryId: category.id, title: text })}
                                />
                                <Pressable
                                  onPress={() => {
                                    if (Platform.OS === 'web') {
                                      const inputElement = webSubtaskDateInputRef.current as HTMLInputElement | null;
                                      if (inputElement) {
                                        (inputElement as any)._editingSubtaskId = 'new-category-subtask';
                                        (inputElement as any)._categoryId = category.id;
                                        if (newCategorySubtaskDate) {
                                          datePickerBaseRef.current = newCategorySubtaskDate;
                                          const y = newCategorySubtaskDate.getFullYear();
                                          const m = String(newCategorySubtaskDate.getMonth() + 1).padStart(2, '0');
                                          const d = String(newCategorySubtaskDate.getDate()).padStart(2, '0');
                                          inputElement.value = `${y}-${m}-${d}`;
                                        } else {
                                          const now = new Date();
                                          const y = now.getFullYear();
                                          const m = String(now.getMonth() + 1).padStart(2, '0');
                                          inputElement.value = `${y}-${m}-01`;
                                        }
                                        try {
                                          (inputElement as any).focus?.();
                                          if (typeof (inputElement as any).showPicker === 'function') {
                                            (inputElement as any).showPicker();
                                          } else {
                                            (inputElement as any).click();
                                          }
                                        } catch (error) {
                                          logger.error('PICKERS', 'Erro ao abrir picker', error);
                                        }
                                      }
                                    } else {
                                      if (newCategorySubtaskDate) {
                                        datePickerBaseRef.current = newCategorySubtaskDate;
                                        pickerSubtaskDateValueRef.current = newCategorySubtaskDate;
                                      } else {
                                        datePickerBaseRef.current = null;
                                        pickerSubtaskDateValueRef.current = stableNowRef.current;
                                      }
                                      setEditingSubtaskId('new-category-subtask');
                                      setEditingSubtaskCategoryId(category.id);
                                      setShowSubtaskDatePicker(true);
                                      openManagedModal('subtaskPicker');
                                    }
                                  }}
                                  style={[styles.scheduleActionButton, { marginBottom: 0, flexShrink: 0 }, newCategorySubtaskDate && styles.scheduleActionButtonActive]}
                                >
                                  <Ionicons 
                                    name="calendar-outline" 
                                    size={12} 
                                    color={newCategorySubtaskDate ? "#fff" : THEME.primary} 
                                  />
                                  {newCategorySubtaskDate && (
                                    <Text style={[styles.scheduleActionButtonText, { fontSize: 10 }]}>
                                      {formatDate(newCategorySubtaskDate)}
                                    </Text>
                                  )}
                                </Pressable>
                                
                                <Pressable
                                  onPress={() => {
                                    if (Platform.OS === 'web') {
                                      const inputElement = webSubtaskTimeInputRef.current as HTMLInputElement | null;
                                      if (inputElement) {
                                        (inputElement as any)._editingSubtaskId = 'new-category-subtask';
                                        (inputElement as any)._categoryId = category.id;
                                        if (newCategorySubtaskTime) {
                                          timePickerBaseRef.current = newCategorySubtaskTime;
                                          const hh = String(newCategorySubtaskTime.getHours()).padStart(2, '0');
                                          const mm = String(newCategorySubtaskTime.getMinutes()).padStart(2, '0');
                                          inputElement.value = `${hh}:${mm}`;
                                        } else {
                                          inputElement.value = '';
                                        }
                                        try {
                                          (inputElement as any).focus?.();
                                          if (typeof (inputElement as any).showPicker === 'function') {
                                            (inputElement as any).showPicker();
                                          } else {
                                            (inputElement as any).click();
                                          }
                                        } catch (error) {
                                          logger.error('PICKERS', 'Erro ao abrir picker', error);
                                        }
                                      }
                                    } else {
                                      if (newCategorySubtaskTime) {
                                        timePickerBaseRef.current = newCategorySubtaskTime;
                                        pickerSubtaskTimeValueRef.current = newCategorySubtaskTime;
                                      } else {
                                        timePickerBaseRef.current = null;
                                        pickerSubtaskTimeValueRef.current = stableNowRef.current;
                                      }
                                      setEditingSubtaskId('new-category-subtask');
                                      setEditingSubtaskCategoryId(category.id);
                                      setShowSubtaskTimePicker(true);
                                      openManagedModal('subtaskPicker');
                                    }
                                  }}
                                  style={[styles.scheduleActionButton, { marginBottom: 0, flexShrink: 0 }, newCategorySubtaskTime && styles.scheduleActionButtonActive]}
                                >
                                  <Ionicons 
                                    name="time-outline" 
                                    size={12} 
                                    color={newCategorySubtaskTime ? "#fff" : THEME.primary} 
                                  />
                                  {newCategorySubtaskTime && (
                                    <Text style={[styles.scheduleActionButtonText, { fontSize: 10 }]}>
                                      {formatTime(newCategorySubtaskTime)}
                                    </Text>
                                  )}
                                </Pressable>
                                
                                <Pressable
                                  onPress={() => {
                                    const title = newSubtaskInCategory?.categoryId === category.id ? newSubtaskInCategory.title.trim() : '';
                                    if (!title) return;
                                    
                                    const newSubtask: Subtask = {
                                      id: uuidv4(),
                                      title,
                                      done: false,
                                      dueDate: newCategorySubtaskDate,
                                      dueTime: newCategorySubtaskTime
                                    };
                                    
                                    setSubtaskCategories(prev =>
                                      prev.map(cat =>
                                        cat.id === category.id
                                          ? { ...cat, subtasks: [...cat.subtasks, newSubtask] }
                                          : cat
                                      )
                                    );
                                    setNewSubtaskInCategory(null);
                                    setNewCategorySubtaskDate(undefined);
                                    setNewCategorySubtaskTime(undefined);
                                  }}
                                  style={[styles.scheduleActionButton, { marginBottom: 0, flexShrink: 0 }]}
                                >
                                  <Ionicons name="add" size={16} color={THEME.primary} />
                                </Pressable>
                              </View>

                              {/* Botão OK para minimizar */}
                              <Pressable
                                onPress={() => {
                                  setSubtaskCategories(prev =>
                                    prev.map(cat =>
                                      cat.id === category.id
                                        ? { ...cat, isExpanded: false }
                                        : cat
                                    )
                                  );
                                }}
                                style={{ marginTop: 12, padding: 8, backgroundColor: THEME.primary, borderRadius: 6, alignItems: 'center' }}
                              >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>OK</Text>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* 4. AGENDAMENTO */}
                <Text style={[styles.categoryLabel, { marginTop: 16 }]}>Agendamento:</Text>
                
                <View style={[
                  styles.dateTimeContainer,
                  Platform.OS === 'web' && styles.dateTimeContainerWeb
                ]}>
                  {/* Botões de Data e Hora */}
                  <Pressable 
                    style={[
                      styles.dateTimeButton,
                      Platform.OS === 'web' && styles.dateTimeButtonWeb
                    ]}
                    onPress={() => {
                      logger.debug('PICKERS', `Botão de data clicado! Platform: ${Platform.OS}`);
                      if (Platform.OS === 'web') {
                        logger.debug('PICKERS', 'Tentando abrir input de data web');
                        const inputElement = webDateInputRef.current as HTMLInputElement | null;
                        logger.debug('PICKERS', `Input element: ${inputElement ? 'encontrado' : 'não encontrado'}`);
                        
                        if (inputElement) {
                          try {
                            if (tempDueDate) {
                              const y = tempDueDate.getFullYear();
                              const m = String(tempDueDate.getMonth() + 1).padStart(2, '0');
                              const d = String(tempDueDate.getDate()).padStart(2, '0');
                              inputElement.value = `${y}-${m}-${d}`;
                            } else {
                              const now = new Date();
                              const y = now.getFullYear();
                              const m = String(now.getMonth() + 1).padStart(2, '0');
                              inputElement.value = `${y}-${m}-01`;
                            }
                            (inputElement as any).focus?.();
                            if (typeof (inputElement as any).showPicker === 'function') {
                              logger.debug('PICKERS', 'Usando showPicker()');
                              (inputElement as any).showPicker();
                            } else {
                              logger.debug('PICKERS', 'Usando click()');
                              (inputElement as any).click();
                            }
                          } catch (error) {
                            logger.error('PICKERS', 'Erro ao abrir picker', error);
                          }
                        } else {
                          logger.error('PICKERS', 'Input element não encontrado!');
                        }
                      } else {
                        // Mobile: Inicializar a ref com o valor atual antes de abrir o picker
                        logger.debug('PICKERS', 'Mobile: Inicializando picker de data');
                        logger.debug('PICKERS', `repeatModalVisible: ${repeatModalVisible}, tempDueDate: ${tempDueDate?.toISOString() || 'null'}`);

                        // iOS: fechar teclado para evitar que cubra o picker
                        Keyboard.dismiss();

                        const initialValue = tempDueDate || todayStart;
                        pickerDateValueRef.current = initialValue;
                        
                        if (!repeatModalVisible) {
                          logger.debug('PICKERS', 'Abrindo date picker - setShowDatePicker(true)');
                          setShowDatePicker(true);
                          openManagedModal('picker');
                        } else {
                          logger.warn('PICKERS', 'Modal de repetição está visível, não abrindo picker');
                        }
                      }
                    }}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.dateTimeButtonText}>
                      {tempDueDate ? formatDate(tempDueDate) : 'Selecionar data'}
                    </Text>
                  </Pressable>
                  
                  <Pressable 
                    style={[
                      styles.dateTimeButton,
                      Platform.OS === 'web' && styles.dateTimeButtonWeb
                    ]}
                    onPress={() => {
                      logger.debug('PICKERS', `Botão de hora clicado! Platform: ${Platform.OS}`);
                      if (Platform.OS === 'web') {
                        logger.debug('PICKERS', 'Tentando abrir input de hora web');
                        const inputElement = webTimeInputRef.current as HTMLInputElement | null;
                        logger.debug('PICKERS', `Input element: ${inputElement ? 'encontrado' : 'não encontrado'}`);
                        
                        if (inputElement) {
                          try {
                            if (tempDueTime) {
                              const hh = String(tempDueTime.getHours()).padStart(2, '0');
                              const mm = String(tempDueTime.getMinutes()).padStart(2, '0');
                              inputElement.value = `${hh}:${mm}`;
                            } else {
                              inputElement.value = '';
                            }
                            (inputElement as any).focus?.();
                            if (typeof (inputElement as any).showPicker === 'function') {
                              logger.debug('PICKERS', 'Usando showPicker()');
                              (inputElement as any).showPicker();
                            } else {
                              logger.debug('PICKERS', 'Usando click()');
                              (inputElement as any).click();
                            }
                          } catch (error) {
                            logger.error('PICKERS', 'Erro ao abrir picker', error);
                          }
                        } else {
                          logger.error('PICKERS', 'Input element não encontrado!');
                        }
                      } else {
                        // Mobile: Inicializar a ref com o valor atual antes de abrir o picker
                        // iOS: fechar teclado para evitar que cubra o picker
                        Keyboard.dismiss();

                        const initialValue = tempDueTime || stableNowRef.current;
                        pickerTimeValueRef.current = initialValue;
                        if (!repeatModalVisible) {
                          setShowTimePicker(true);
                          openManagedModal('picker');
                        }
                      }
                    }}
                  >
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.dateTimeButtonText}>
                      {tempDueTime ? formatTime(tempDueTime) : 'Selecionar hora'}
                    </Text>
                  </Pressable>
                </View>

                {/* Seleção de Repetição */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.categoryLabel}>Repetir:</Text>
                  <Text style={{ 
                    fontSize: 13, 
                    color: repeatType === RepeatType.NONE ? '#999' : THEME.primary,
                    fontWeight: repeatType === RepeatType.NONE ? 'normal' : '500'
                  }}>
                    {getRepeatLabel()}
                  </Text>
                </View>
                <View style={styles.repeatContainer}>
                  {[
                    { type: RepeatType.NONE, icon: 'ban-outline' },
                    { type: RepeatType.DAILY, icon: 'repeat-outline' },
                    { type: RepeatType.MONTHLY, icon: 'calendar-number-outline' },
                    { type: RepeatType.CUSTOM, icon: 'calendar-outline' },
                    { type: RepeatType.INTERVAL, icon: 'time-outline' }
                  ].map((option) => (
                    <Pressable
                      key={option.type}
                      style={[
                        styles.repeatIconButton,
                        repeatType === option.type && styles.repeatIconButtonActive
                      ]}
                      onPress={() => {
                        // Não abrir modal de repetição se há pickers ativos
                        if (showDatePicker || showTimePicker || showSubtaskDatePicker || showSubtaskTimePicker) {
                          return;
                        }
                        
                        if (option.type === RepeatType.CUSTOM || option.type === RepeatType.INTERVAL) {
                          setRepeatType(option.type);
                          // Pré-carregar os valores atuais para edição
                          setTempCustomDays(customDays);
                          const iv = intervalDays || 7; // Default: 7 dias (1 semana)
                          setTempIntervalDays(iv);
                          setTempDurationMonths(durationMonths || 0);
                          // Se o intervalo é múltiplo de 7, mostrar em semanas
                          const isWeekly = iv > 0 && iv % 7 === 0;
                          setTempWeekly(isWeekly);
                          setTempWeeksCount(Math.max(1, Math.round(iv / 7)));
                          // Fechar teclado antes de abrir modal de repetição
                          Keyboard.dismiss();
                          setRepeatModalVisible(true);
                          openManagedModal('repeat');
                        } else {
                          setRepeatType(option.type);
                        }
                      }}
                    >
                      <Ionicons 
                        name={option.icon as any} 
                        size={18} 
                        color={repeatType === option.type ? THEME.primary : '#666'} 
                      />
                    </Pressable>
                  ))}
                </View>

                {/* As opções CUSTOM/INTERVAL agora abrem um mini modal */}
              </ScrollView>

              {!(Platform.OS === 'ios' && (showDatePicker || showTimePicker || showSubtaskDatePicker || showSubtaskTimePicker)) && (
              <View style={styles.modalButtons}>
                <Pressable 
                  style={({ pressed }) => [
                    styles.button,
                    styles.cancelButton,
                    (pressed && !isAddingTask) && { opacity: 0.7 },
                    isAddingTask && styles.buttonDisabled
                  ]}
                  onPress={resetForm}
                  disabled={isAddingTask}
                  android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
                
                <Pressable 
                  style={({ pressed }) => [
                    styles.button,
                    styles.addButton,
                    isAddingTask && styles.buttonDisabled,
                    pressed && !isAddingTask && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                  ]}
                  onPress={addTask}
                  disabled={isAddingTask}
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
                >
                  {isAddingTask ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.addButtonText}>{isEditing ? 'Salvar' : 'Adicionar'}</Text>
                  )}
                </Pressable>
              </View>
              )}

              {/* iOS inline picker dentro do fluxo do conteúdo, abaixo dos botões de data/hora */}
              {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
                <View style={styles.iosInlinePickerBox}>
                  {showDatePicker && (
                    <DateTimePicker
                      value={stableDatePickerValue}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      style={styles.iosDateTimePicker}
                    />
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={stableTimePickerValue}
                      mode="time"
                      display="spinner"
                      onChange={onTimeChange}
                      is24Hour={true}
                      style={styles.iosDateTimePicker}
                    />
                  )}
                  <View style={styles.iosInlinePickerActions}>
                    <Pressable 
                      style={[styles.button, styles.cancelButton]}
                      onPress={closeAllPickers}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.button, styles.saveButton]}
                      onPress={() => {
                        if (showDatePicker) setTempDueDate(pickerDateValueRef.current);
                        if (showTimePicker) setTempDueTime(pickerTimeValueRef.current);
                        closeAllPickers();
                      }}
                    >
                      <Text style={styles.saveButtonText}>OK</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* iOS inline picker para subtasks */}
              {Platform.OS === 'ios' && (showSubtaskDatePicker || showSubtaskTimePicker) && editingSubtaskId && (
                <View style={styles.iosInlinePickerBox}>
                  {showSubtaskDatePicker && (
                    <DateTimePicker
                      value={stableSubtaskDatePickerValue}
                      mode="date"
                      display="spinner"
                      onChange={onSubtaskDateChange}
                      style={styles.iosDateTimePicker}
                    />
                  )}
                  {showSubtaskTimePicker && (
                    <DateTimePicker
                      value={stableSubtaskTimePickerValue}
                      mode="time"
                      display="spinner"
                      onChange={onSubtaskTimeChange}
                      is24Hour={true}
                      style={styles.iosDateTimePicker}
                    />
                  )}
                  <View style={styles.iosInlinePickerActions}>
                    <Pressable 
                      style={[styles.button, styles.cancelButton]}
                      onPress={closeAllPickers}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.button, styles.saveButton]}
                      onPress={() => {
                        if (showSubtaskDatePicker && editingSubtaskId) {
                          const selectedDate = pickerSubtaskDateValueRef.current;
                          if (selectedDate) {
                            // Se é nova subtarefa simples
                            if (editingSubtaskId === 'new-subtask') {
                              setNewSubtaskDate(selectedDate);
                            }
                            // Se é nova subtarefa de categoria
                            else if (editingSubtaskId === 'new-category-subtask') {
                              setNewCategorySubtaskDate(selectedDate);
                            }
                            // Se tem categoryId, atualizar subtarefa da categoria existente
                            else if (editingSubtaskCategoryId) {
                              setSubtaskCategories(prev =>
                                prev.map(cat =>
                                  cat.id === editingSubtaskCategoryId
                                    ? {
                                        ...cat,
                                        subtasks: cat.subtasks.map(st =>
                                          st.id === editingSubtaskId ? { ...st, dueDate: selectedDate } : st
                                        )
                                      }
                                    : cat
                                )
                              );
                            } else {
                              // Atualizar subtarefa simples existente
                              setSubtasksDraft(prev => {
                                const next = prev.map(st => {
                                  if (st.id !== editingSubtaskId) return st;
                                  return { ...st, dueDate: selectedDate };
                                });
                                return next;
                              });
                            }
                          }
                        }
                        if (showSubtaskTimePicker && editingSubtaskId) {
                          const selectedTime = pickerSubtaskTimeValueRef.current;
                          if (selectedTime) {
                            // Se é nova subtarefa simples
                            if (editingSubtaskId === 'new-subtask') {
                              setNewSubtaskTime(selectedTime);
                            }
                            // Se é nova subtarefa de categoria
                            else if (editingSubtaskId === 'new-category-subtask') {
                              setNewCategorySubtaskTime(selectedTime);
                            }
                            // Se tem categoryId, atualizar subtarefa da categoria existente
                            else if (editingSubtaskCategoryId) {
                              // Atualizar subtarefa da categoria
                              setSubtaskCategories(prev =>
                                prev.map(cat =>
                                  cat.id === editingSubtaskCategoryId
                                    ? {
                                        ...cat,
                                        subtasks: cat.subtasks.map(st => {
                                          if (st.id !== editingSubtaskId) return st;
                                          const base = st.dueDate || stableNowRef.current;
                                          const merged = new Date(base);
                                          merged.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                                          return { ...st, dueTime: merged };
                                        })
                                      }
                                    : cat
                                )
                              );
                            } else {
                              // Atualizar subtarefa simples existente
                              setSubtasksDraft(prev => {
                                const next = prev.map(st => {
                                  if (st.id !== editingSubtaskId) return st;
                                  const base = st.dueDate || stableNowRef.current;
                                  const merged = new Date(base);
                                  merged.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                                  return { ...st, dueTime: merged };
                                });
                                return next;
                              });
                            }
                          }
                        }
                        closeAllPickers();
                      }}
                    >
                      <Text style={styles.saveButtonText}>OK</Text>
                    </Pressable>
                  </View>
                </View>
              )}

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para criar nova categoria */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={categoryModalVisible && isTopModal('category')}
        onRequestClose={() => { setCategoryModalVisible(false); closeManagedModal('category'); }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nova Categoria</Text>
                <Pressable onPress={() => { setCategoryModalVisible(false); closeManagedModal('category'); }}>
                  <Ionicons name="close" size={24} color="#666" />
                </Pressable>
              </View>

              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Nome da categoria"
                placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                maxLength={20}
              />

              <Text style={styles.categoryLabel}>Ícone:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={Platform.OS === 'web'}
                style={[
                  styles.horizontalScrollContainer,
                  Platform.OS === 'web' && ({ overflow: 'scroll' } as any)
                ]}
                contentContainerStyle={styles.iconSelectorContainer}
              >
                {AVAILABLE_ICONS.map((icon) => (
                  <Pressable
                    key={icon}
                    style={[
                      styles.iconSelector,
                      selectedIcon === icon && styles.iconSelectorActive
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Ionicons 
                      name={icon as any} 
                      size={22} 
                      color={selectedIcon === icon ? THEME.primary : '#666'} 
                    />
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.categoryLabel}>Cor:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={Platform.OS === 'web'}
                style={[
                  styles.horizontalScrollContainer,
                  Platform.OS === 'web' && ({ overflow: 'scroll' } as any)
                ]}
                contentContainerStyle={styles.colorSelectorContainer}
              >
                {AVAILABLE_COLORS.map((colorConfig, index) => (
                  <Pressable
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
                  </Pressable>
                ))}
              </ScrollView>

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
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.button, styles.cancelButton]}
                onPress={() => { setCategoryModalVisible(false); closeManagedModal('category'); }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.button, styles.addButton]}
                onPress={addCategory}
              >
                <Text style={styles.addButtonText}>Criar</Text>
              </Pressable>
            </View>
          </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

        

        {/* Mini modal para configurar Semanal/Intervalo - usado quando NÃO está com modal de tarefa aberto no iOS, e sempre no Android/Web */}
        {repeatModalVisible && isTopModal('repeat') && (
          <Modal
            key="repeat-modal"
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => { setRepeatModalVisible(false); closeManagedModal('repeat'); }}
          >
            <Pressable 
              style={styles.smallModalBackdrop}
              onPress={() => { setRepeatModalVisible(false); closeManagedModal('repeat'); }}
            >
              <Pressable style={styles.smallModalContent} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.smallModalTitle}>
                  {repeatType === RepeatType.CUSTOM ? 'Repetir semanalmente' : 'Sistema de Repetição'}
                </Text>
                {repeatType === RepeatType.CUSTOM && (
                  <View style={styles.customDaysSelector}>
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                      <Pressable
                        key={index}
                        style={[
                          styles.dayButton,
                          tempCustomDays.includes(index) && styles.dayButtonActive
                        ]}
                        onPress={() => toggleTempCustomDay(index)}
                      >
                        <Text style={[
                          styles.dayButtonText,
                          tempCustomDays.includes(index) && styles.dayButtonTextActive
                        ]}>
                          {day}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {repeatType === RepeatType.INTERVAL && (
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <Pressable
                        style={[styles.toggleButton, !tempWeekly && styles.toggleButtonActive]}
                        onPress={() => setTempWeekly(false)}
                      >
                        <Text style={[styles.toggleButtonText, !tempWeekly && styles.toggleButtonTextActive]}>Dias</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.toggleButton, tempWeekly && styles.toggleButtonActive]}
                        onPress={() => {
                          setTempWeekly(true);
                          const currentDays = tempIntervalDays || 7;
                          const weeks = Math.max(1, Math.round(currentDays / 7));
                          setTempWeeksCount(weeks);
                          setTempIntervalDays(weeks * 7);
                        }}
                      >
                        <Text style={[styles.toggleButtonText, tempWeekly && styles.toggleButtonTextActive]}>Semanas</Text>
                      </Pressable>
                    </View>
                    {!tempWeekly && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.customDaysLabel, { flex: 0, minWidth: 60 }]}>A cada</Text>
                        <TextInput
                          style={[styles.input, { width: 80, textAlign: 'center' }]}
                          keyboardType="number-pad"
                          value={String(tempIntervalDays || '')}
                          onChangeText={(v) => setTempIntervalDays(Math.max(1, parseInt(v || '0', 10) || 0))}
                          placeholder="dias"
                          placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                        />
                        <Text style={styles.customDaysLabel}>dias</Text>
                      </View>
                    )}
                    {tempWeekly && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.customDaysLabel, { flex: 0, minWidth: 60 }]}>A cada</Text>
                        <TextInput
                          style={[styles.input, { width: 80, textAlign: 'center' }]}
                          keyboardType="number-pad"
                          value={String(tempWeeksCount || '')}
                          onChangeText={(v) => {
                            const w = Math.max(1, parseInt(v || '0', 10) || 0);
                            setTempWeeksCount(w);
                            setTempIntervalDays(w * 7);
                          }}
                          placeholder="semanas"
                          placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                        />
                        <Text style={styles.customDaysLabel}>semana(s)</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.customDaysLabel, { flex: 0, minWidth: 60 }]}>Duração</Text>
                      <TextInput
                        style={[styles.input, { width: 80, textAlign: 'center' }]}
                        keyboardType="number-pad"
                        value={String(tempDurationMonths || '')}
                        onChangeText={(v) => setTempDurationMonths(Math.max(0, parseInt(v || '0', 10) || 0))}
                        placeholder="meses"
                        placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                      />
                      <Text style={styles.customDaysLabel}>meses</Text>
                    </View>
                  </View>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                  <Pressable style={[styles.button, styles.cancelButton]} onPress={() => { setRepeatModalVisible(false); closeManagedModal('repeat'); }}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.button, styles.saveButton]}
                    onPress={() => {
                      if (repeatType === RepeatType.CUSTOM) {
                        setCustomDays(tempCustomDays);
                        logger.success('REPEAT', `Dias customizados salvos: ${JSON.stringify(tempCustomDays)}`);
                      } else if (repeatType === RepeatType.INTERVAL) {
                        const calculatedIntervalDays = Math.max(1, (tempWeekly ? (Math.max(1, tempWeeksCount || 1) * 7) : (tempIntervalDays || 1)));
                        const calculatedDurationMonths = Math.max(0, tempDurationMonths || 0);
                        setIntervalDays(calculatedIntervalDays);
                        setDurationMonths(calculatedDurationMonths);
                        logger.success('REPEAT', `Intervalo salvo: intervalDays=${calculatedIntervalDays}, durationMonths=${calculatedDurationMonths}`);
                      }
                      setRepeatModalVisible(false);
                      closeManagedModal('repeat');
                    }}
                  >
                    <Text style={styles.saveButtonText}>OK</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        )}

      {/* DateTimePickers nativos para iOS e Android */}
      {Platform.OS !== 'web' && (
        <>
          {/* iOS: Pickers em Modal com botão Concluído (somente quando não há modal de tarefa aberto) */}
          {Platform.OS === 'ios' && !modalVisible && (showDatePicker || showTimePicker || showSubtaskDatePicker || showSubtaskTimePicker) && (
            <Modal
              key="ios-datetime-picker"
              transparent={true}
              animationType="slide"
              visible={true}
              presentationStyle="overFullScreen"
              statusBarTranslucent={true}
              onShow={() => logger.debug('PICKERS', 'Modal iOS DateTimePicker foi aberto!')}
              onRequestClose={() => {
                logger.debug('PICKERS', 'Modal iOS DateTimePicker - onRequestClose chamado');
                closeAllPickers();
              }}
            >
              <Pressable 
                style={styles.iosPickerOverlay}
                onPress={() => {
                  logger.debug('PICKERS', 'Clicou no overlay - fechando pickers');
                  closeAllPickers();
                }}
              >
                <Pressable 
                  style={styles.iosPickerContainer} 
                  onPress={(e) => {
                    logger.debug('PICKERS', 'Clicou no container do picker');
                    e.stopPropagation();
                  }}
                >
                  <View style={styles.iosPickerHeader}>
                    <Pressable 
                      onPress={() => {
                        // SALVAR os valores das refs no estado antes de fechar (iOS)
                        if (showDatePicker) {
                          setTempDueDate(pickerDateValueRef.current);
                        }
                        if (showTimePicker) {
                          setTempDueTime(pickerTimeValueRef.current);
                        }
                        if (showSubtaskDatePicker && editingSubtaskId) {
                          const selectedDate = pickerSubtaskDateValueRef.current;
                          if (selectedDate) {
                            setSubtasksDraft(prev => {
                              const next = prev.map(st => {
                                if (st.id !== editingSubtaskId) return st;
                                return { ...st, dueDate: selectedDate };
                              });
                              return next;
                            });
                          }
                        }
                        if (showSubtaskTimePicker && editingSubtaskId) {
                          const selectedTime = pickerSubtaskTimeValueRef.current;
                          if (selectedTime) {
                            setSubtasksDraft(prev => {
                              const next = prev.map(st => {
                                if (st.id !== editingSubtaskId) return st;
                                const base = st.dueDate || stableNowRef.current;
                                const merged = new Date(base);
                                merged.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                                return { ...st, dueTime: merged };
                              });
                              return next;
                            });
                          }
                        }
                        
                        // Fechar pickers de forma segura
                        closeAllPickers();
                      }}
                      style={styles.iosPickerDoneButton}
                    >
                      <Text style={styles.iosPickerDoneButtonText}>Concluído</Text>
                    </Pressable>
                  </View>
                  
                  {showDatePicker && (
                    <DateTimePicker
                      value={stableDatePickerValue}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      style={styles.iosDateTimePicker}
                    />
                  )}
                  
                  {showTimePicker && (
                    <DateTimePicker
                      value={stableTimePickerValue}
                      mode="time"
                      display="spinner"
                      onChange={onTimeChange}
                      is24Hour={true}
                      style={styles.iosDateTimePicker}
                    />
                  )}
                  
                  {showSubtaskDatePicker && editingSubtask && (
                    <DateTimePicker
                      value={stableSubtaskDatePickerValue}
                      mode="date"
                      display="spinner"
                      onChange={onSubtaskDateChange}
                      style={styles.iosDateTimePicker}
                    />
                  )}
                  
                  {showSubtaskTimePicker && editingSubtask && (
                    <DateTimePicker
                      value={stableSubtaskTimePickerValue}
                      mode="time"
                      display="spinner"
                      onChange={onSubtaskTimeChange}
                      is24Hour={true}
                      style={styles.iosDateTimePicker}
                    />
                  )}
                </Pressable>
              </Pressable>
            </Modal>
          )}
          
          {/* Android: Pickers de Diálogo (sem Modal adicional) */}
          {Platform.OS === 'android' && (
            <>
              {showDatePicker && (
                <DateTimePicker
                  value={stableDatePickerValue}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}
              
              {showTimePicker && (
                <DateTimePicker
                  value={stableTimePickerValue}
                  mode="time"
                  display="default"
                  onChange={onTimeChange}
                  is24Hour={true}
                />
              )}
              
              {showSubtaskDatePicker && editingSubtask && (
                <DateTimePicker
                  value={stableSubtaskDatePickerValue}
                  mode="date"
                  display="default"
                  onChange={onSubtaskDateChange}
                />
              )}
              
              {showSubtaskTimePicker && editingSubtask && (
                <DateTimePicker
                  value={stableSubtaskTimePickerValue}
                  mode="time"
                  display="default"
                  onChange={onSubtaskTimeChange}
                  is24Hour={true}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Modal de Manual e Informações */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={settingsModalVisible && isTopModal('settings')}
        onRequestClose={() => { setSettingsModalVisible(false); closeManagedModal('settings'); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.manualModalContent]}>
            <Text style={styles.modalTitle}>Manual de Uso</Text>

            <ScrollView
              style={styles.manualScroll}
              contentContainerStyle={styles.manualContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.manualParagraph}>
                Bem-vindo ao Agenda Familiar! Aqui você pode organizar as tarefas da família, aprovar pedidos dos dependentes e acompanhar o histórico de ações.
              </Text>

              <Text style={styles.manualSubtitle}>📱 Header do App</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="person-circle" size={16} color={THEME.primary} /> <Text style={{fontWeight: '600'}}>Ícone do Perfil:</Text> Toque no ícone para escolher um emoji como foto de perfil. Selecione entre diversos emojis disponíveis.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="pencil" size={16} color={THEME.primary} /> <Text style={{fontWeight: '600'}}>Nome:</Text> Toque no nome para editá-lo. Digite seu nome e confirme para salvar.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="notifications" size={16} color={THEME.primary} /> <Text style={{fontWeight: '600'}}>Notificações:</Text> Campainha mostra o número de aprovações pendentes. Toque para ver solicitações de conclusão de tarefas.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="calendar" size={16} color={THEME.primary} /> <Text style={{fontWeight: '600'}}>Calendário:</Text> Visualize feriados brasileiros (amarelo) e tarefas agendadas (verde). Tarefas vencidas aparecem em vermelho. Toque em um dia para criar tarefa rápida.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="arrow-undo" size={16} color={THEME.primary} /> <Text style={{fontWeight: '600'}}>Desfazer:</Text> Reverte a última ação (concluir, excluir ou editar tarefa). Aparece temporariamente após cada ação.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="settings" size={16} color={THEME.primary} /> <Text style={{fontWeight: '600'}}>Menu (Configurações):</Text> Acesso às configurações, histórico, manual, atualizar dados e logout.</Text>

              <Text style={styles.manualSubtitle}>� Navegação e Filtros</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="today" size={16} color={THEME.primary} /> <Text style={{fontWeight: '600'}}>Abas Hoje/Próximas:</Text> Alterne entre tarefas do dia atual e tarefas futuras tocando nas abas.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="filter" size={16} color="#6c757d" /> <Text style={{fontWeight: '600'}}>Filtros:</Text> Ao lado do texto "Próximas", o botão de filtro permite filtrar tarefas por categoria específica.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="add" size={16} color={THEME.primary} /> <Text style={{fontWeight: '600'}}>Criar Tarefa:</Text> Botão fixo no canto inferior direito abre o modal para criar uma nova tarefa com todos os detalhes.</Text>

              <Text style={styles.manualSubtitle}>📋 Funcionamento das Tarefas</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="chevron-down" size={16} color={THEME.primary} /> <Text style={{fontWeight: '600'}}>Expandir/Colapsar:</Text> Tarefas vêm colapsadas por padrão. Toque no cabeçalho colorido para expandir e ver detalhes completos.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="create" size={16} color={THEME.primary} /> <Text style={{fontWeight: '600'}}>Criando Tarefas:</Text> Use o botão + para criar. Escolha categoria, defina data/hora, configure recorrência e marque como privada se desejar.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="checkmark-circle" size={16} color="#4CAF50" /> <Text style={{fontWeight: '600'}}>Concluindo Tarefas:</Text> Toque no círculo da tarefa para marcar como concluída. Dependentes precisam de aprovação do admin.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="pencil" size={16} color="#FF9500" /> <Text style={{fontWeight: '600'}}>Editando Tarefas:</Text> Toque na tarefa para abrir detalhes e editar. Só o criador pode editar suas tarefas.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="list" size={16} color="#9C27B0" /> <Text style={{fontWeight: '600'}}>Subtarefas:</Text> Adicione subtarefas com datas/horários individuais. Marque como concluídas independentemente.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="repeat" size={16} color="#9C27B0" /> <Text style={{fontWeight: '600'}}>Tarefas Recorrentes:</Text> Configure para repetir diariamente, fins de semana ou dias específicos da semana com duração definida.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="lock-closed" size={16} color="#666" /> <Text style={{fontWeight: '600'}}>Tarefas Privadas:</Text> Visíveis apenas para o criador. Outros membros da família não as verão.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="color-palette" size={16} color="#FF6B6B" /> <Text style={{fontWeight: '600'}}>Cores das Bordas:</Text> Cada tarefa tem borda colorida igual à sua categoria. Tarefas vencidas ficam com borda vermelha.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="notifications" size={16} color="#e74c3c" /> <Text style={{fontWeight: '600'}}>Aprovações:</Text> Admins recebem notificações na campainha para aprovar conclusões de dependentes.</Text>

              <Text style={styles.manualSubtitle}>📅 Calendário</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="ellipse" size={16} color="#FFD700" /> <Text style={{fontWeight: '600'}}>Feriados (Amarelo):</Text> Todos os feriados nacionais brasileiros do ano são marcados automaticamente.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="ellipse" size={16} color="#4CAF50" /> <Text style={{fontWeight: '600'}}>Tarefas (Verde):</Text> Dias com tarefas pendentes são marcados com ponto verde.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="ellipse" size={16} color={THEME.danger} /> <Text style={{fontWeight: '600'}}>Vencidas (Vermelho):</Text> Tarefas com data passada aparecem em vermelho no calendário e na lista.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="add-circle" size={16} color={THEME.primary} /> <Text style={{fontWeight: '600'}}>Criar do Calendário:</Text> Toque em qualquer dia para criar tarefa já com aquela data preenchida.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="list" size={16} color={THEME.primary} /> <Text style={{fontWeight: '600'}}>Lista do Mês:</Text> Abaixo do calendário aparecem feriados e tarefas do mês selecionado com scroll automático.</Text>

              <Text style={styles.manualSubtitle}>👨‍👩‍👧‍👦 Gerenciar Família</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="pencil" size={16} color={THEME.secondary} /> <Text style={{fontWeight: '600'}}>Alterar Nome:</Text> Apenas admins podem editar o nome da família através do menu de configurações.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="people" size={16} color={THEME.secondary} /> <Text style={{fontWeight: '600'}}>Ver Membros:</Text> Lista todos os membros com foto, nome, função e data de entrada.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="swap-horizontal" size={16} color={THEME.accent} /> <Text style={{fontWeight: '600'}}>Alterar Funções:</Text> Admins podem promover dependentes a administradores ou reverter.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="key" size={16} color={THEME.highlight} /> <Text style={{fontWeight: '600'}}>Código de Convite:</Text> Código único para convidar novos membros. Copie e compartilhe com quem quiser adicionar.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="trash" size={16} color="#e74c3c" /> <Text style={{fontWeight: '600'}}>Remover Membros:</Text> Admins podem remover membros da família (exceto si mesmos).</Text>

              <Text style={styles.manualSubtitle}>🚪 Entrar em Outra Família</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="enter" size={16} color="#FF9500" /> <Text style={{fontWeight: '600'}}>Como Entrar:</Text> Use o código de convite fornecido pelo administrador da família que você deseja entrar.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="person" size={16} color="#34C759" /> <Text style={{fontWeight: '600'}}>Função Inicial:</Text> Novos membros entram como dependentes. Apenas admins podem alterar funções posteriormente.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="checkmark" size={16} color="#4CAF50" /> <Text style={{fontWeight: '600'}}>Confirmação:</Text> Após inserir o código válido, você será adicionado à família e poderá ver suas tarefas.</Text>

              <Text style={styles.manualSubtitle}>📜 Histórico</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="time" size={16} color={THEME.extra} /> <Text style={{fontWeight: '600'}}>Acesso:</Text> Acesse através do menu de configurações, opção Histórico.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="list" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Conteúdo:</Text> Mostra todas as ações realizadas nas tarefas nos últimos 7 dias.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="information-circle" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Detalhes:</Text> Inclui quem criou/editou/concluiu tarefas, com data e hora de cada ação.</Text>

              <Text style={styles.manualSubtitle}>💡 Dicas Rápidas</Text>
              <Text style={styles.manualListItem}>• Navegação: Use as abas "Hoje" e "Próximas" para alternar entre tarefas do dia e futuras.</Text>
              <Text style={styles.manualListItem}>• Categorias: Filtre tarefas por categoria usando o botão de filtro ao lado da aba "Próximas".</Text>
              <Text style={styles.manualListItem}>• Emojis: Personalize seu perfil escolhendo um emoji como foto de perfil.</Text>
              <Text style={styles.manualListItem}>• Calendário: Use o calendário para visualizar feriados e criar tarefas rapidamente em datas específicas.</Text>
              <Text style={styles.manualListItem}>• Notificações: Permita notificações no dispositivo para receber lembretes de tarefas.</Text>
              <Text style={styles.manualListItem}>• Privacidade: Tarefas privadas são visíveis apenas para seu criador.</Text>
              <Text style={styles.manualListItem}>• Cores: Bordas coloridas indicam a categoria. Borda vermelha indica tarefa vencida.</Text>
            </ScrollView>

            <Pressable
              style={[styles.closeButton, styles.closeButtonFixed]}
              onPress={() => { setSettingsModalVisible(false); closeManagedModal('settings'); }}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal do Histórico */}
      <Modal
        visible={historyModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.historyModalWrapper}>
            <SafeAreaView style={styles.historyModalSafeArea} edges={['top', 'left', 'right']}>
              <Text style={styles.modalTitle}>Informações</Text>

              <Text style={styles.historySubtitle}>
                Últimas ações realizadas (7 dias)
              </Text>

              <View style={styles.historyListContainer}>
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
                    showsVerticalScrollIndicator={true}
                    renderItem={renderHistoryItem}
                    style={styles.historyList}
                    contentContainerStyle={styles.historyListContent}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={15}
                    updateCellsBatchingPeriod={50}
                    initialNumToRender={20}
                    scrollEventThrottle={16}
                  />
                )}
              </View>
              
              {/* Botão de fechar fixo no rodapé do modal */}
              <Pressable 
                style={[styles.closeButton, styles.closeButtonFixed]}
                onPress={() => setHistoryModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Fechar</Text>
              </Pressable>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* Modal de Detalhes do Histórico */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={historyDetailModalVisible}
        onRequestClose={() => setHistoryDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Detalhes da Alteração</Text>
            
            {selectedHistoryItem && (
              <ScrollView 
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {/* Informações Gerais */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.categoryLabel, { marginBottom: 8 }]}>Ação Realizada</Text>
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    gap: 10,
                    padding: 12,
                    backgroundColor: colors.inputBackground,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}>
                    <Ionicons 
                      name={getActionIcon(selectedHistoryItem.action)}
                      size={24}
                      color={getActionColor(selectedHistoryItem.action)}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: '600', 
                        color: colors.textPrimary 
                      }}>
                        {getActionText(selectedHistoryItem.action)}
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                        Tarefa: "{selectedHistoryItem.taskTitle}"
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Autor e Data */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.categoryLabel, { marginBottom: 8 }]}>Informações</Text>
                  <View style={{ 
                    padding: 12,
                    backgroundColor: colors.inputBackground,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    gap: 8
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                      <Text style={{ fontSize: 14, color: colors.textPrimary }}>
                        <Text style={{ fontWeight: '600' }}>Autor:</Text> {selectedHistoryItem.userName}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="shield-outline" size={18} color={colors.textSecondary} />
                      <Text style={{ fontSize: 14, color: colors.textPrimary }}>
                        <Text style={{ fontWeight: '600' }}>Perfil:</Text> {selectedHistoryItem.userRole === 'admin' ? 'Administrador' : 'Dependente'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                      <Text style={{ fontSize: 14, color: colors.textPrimary }}>
                        <Text style={{ fontWeight: '600' }}>Data:</Text> {selectedHistoryItem.timestamp ? new Date(selectedHistoryItem.timestamp).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Data não disponível'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Detalhes das Mudanças */}
                {selectedHistoryItem.details && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={[styles.categoryLabel, { marginBottom: 8 }]}>Alterações Realizadas</Text>
                    <View style={{ 
                      padding: 12,
                      backgroundColor: colors.inputBackground,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.border
                    }}>
                      {selectedHistoryItem.details.split('\n').map((line, index) => {
                        // Detectar se é uma linha de mudança (contém →)
                        if (line.includes('→')) {
                          const parts = line.split('→');
                          return (
                            <View key={index} style={{ marginBottom: 8 }}>
                              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>
                                {parts[0].split(':')[0]}:
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={{ 
                                  flex: 1, 
                                  padding: 8, 
                                  backgroundColor: activeTheme === 'dark' ? '#2a2a2a' : '#ffebee',
                                  borderRadius: 6,
                                  borderLeftWidth: 3,
                                  borderLeftColor: '#ef5350'
                                }}>
                                  <Text style={{ fontSize: 12, color: activeTheme === 'dark' ? '#ff8a80' : '#c62828' }}>
                                    {parts[0].split(':')[1]?.trim() || '(vazio)'}
                                  </Text>
                                </View>
                                <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
                                <View style={{ 
                                  flex: 1, 
                                  padding: 8, 
                                  backgroundColor: activeTheme === 'dark' ? '#2a2a2a' : '#e8f5e9',
                                  borderRadius: 6,
                                  borderLeftWidth: 3,
                                  borderLeftColor: '#66bb6a'
                                }}>
                                  <Text style={{ fontSize: 12, color: activeTheme === 'dark' ? '#69f0ae' : '#2e7d32' }}>
                                    {parts[1]?.trim() || '(vazio)'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        } else {
                          // Linha simples
                          return (
                            <Text key={index} style={{ 
                              fontSize: 13, 
                              color: colors.textPrimary,
                              marginBottom: 6 
                            }}>
                              • {line}
                            </Text>
                          );
                        }
                      })}
                    </View>
                  </View>
                )}

                {/* Mensagem quando não há detalhes */}
                {!selectedHistoryItem.details && (
                  <View style={{ 
                    padding: 20,
                    alignItems: 'center',
                    backgroundColor: colors.inputBackground,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}>
                    <Ionicons name="information-circle-outline" size={48} color={colors.textSecondary} />
                    <Text style={{ 
                      fontSize: 14, 
                      color: colors.textSecondary,
                      marginTop: 12,
                      textAlign: 'center'
                    }}>
                      Não há detalhes adicionais para esta ação
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <Pressable 
              style={[styles.closeButton, { marginTop: 16 }]}
              onPress={() => setHistoryDetailModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de Aprovação para Admins */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={approvalModalVisible}
        onRequestClose={() => setApprovalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.approvalModalContent]}>
            <Text style={styles.modalTitle}>Solicitações de Aprovação</Text>
            {user.role === 'admin' && (
              <>
                {/* Seção: Solicitações para virar Admin */}
                <View style={{ paddingHorizontal: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
                   {adminRoleRequests.length > 0 ? `(${adminRoleRequests.length})` : ''}
                  </Text>
                    {adminRoleRequests.length === 0 ? (
                    <Text style={{ color: colors.textPrimary }}></Text>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {adminRoleRequests.map((req: any) => (
                        <View key={req.id} style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border }}>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>{req.requesterName}</Text>
                          <Text style={{ fontSize: 13, color: colors.textPrimary, marginTop: 2 }}>pediu para se tornar administrador</Text>
                          <Text style={{ fontSize: 12, color: colors.textPrimary, marginTop: 6 }}>
                            {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <Pressable
                              disabled={!!resolvingAdminRequestId}
                              onPress={() => resolveAdminRoleRequest(req.id, false)}
                              style={[styles.approvalButton, styles.rejectButton, resolvingAdminRequestId === req.id && { opacity: 0.6 }]}
                            >
                              <Ionicons name="close-circle" size={20} color="#fff" />
                              <Text style={styles.approvalButtonText}>{resolvingAdminRequestId === req.id ? 'Processando...' : 'Rejeitar'}</Text>
                            </Pressable>
                            <Pressable
                              disabled={!!resolvingAdminRequestId}
                              onPress={() => resolveAdminRoleRequest(req.id, true)}
                              style={[styles.approvalButton, styles.approveButton, resolvingAdminRequestId === req.id && { opacity: 0.6 }]}
                            >
                              <Ionicons name="checkmark-circle" size={20} color="#fff" />
                              <Text style={styles.approvalButtonText}>{resolvingAdminRequestId === req.id ? 'Processando...' : 'Aprovar'}</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <View style={{ height: 1, backgroundColor: '#eee', marginHorizontal: 4, marginBottom: 12 }} />
              </>
            )}
            
            {notifications.length === 0 ? (
              <Text style={styles.noNotificationsText}>Nenhuma solicitação pendente</Text>
            ) : (
              <ScrollView 
                style={styles.notificationsList}
                contentContainerStyle={{ paddingBottom: 80 }}
                showsVerticalScrollIndicator={true}
              >
                {notifications.map(notification => {
                  const approval = approvals.find(a => a.taskId === notification.taskId);
                  const task = tasks.find(t => t.id === notification.taskId);
                  
                  if (!approval || !task) return null;
                  
                  return (
                    <View key={notification.id} style={styles.notificationItem}>
                      <Text style={styles.notificationTitle}>
                        {notification.dependenteName} quer completar:
                      </Text>
                      <Text style={styles.notificationTaskTitle}>
                        "{notification.taskTitle}"
                      </Text>
                      <Text style={styles.notificationTime}>
                        {approval.requestedAt ? new Date(approval.requestedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Data não disponível'}
                      </Text>
                      
                      <View style={styles.approvalActions}>
                        <Pressable
                          style={[styles.approvalButton, styles.rejectButton]}
                          onPress={() => {
                            rejectTask(approval.id, 'Rejeitado pelo administrador');
                            setNotifications(notifications.map(n => 
                              n.id === notification.id ? { ...n, read: true } : n
                            ));
                          }}
                        >
                          <Ionicons name="close-circle" size={20} color="#fff" />
                          <Text style={styles.approvalButtonText}>Rejeitar</Text>
                        </Pressable>
                        
                        <Pressable
                          style={[styles.approvalButton, styles.approveButton]}
                          onPress={() => {
                            approveTask(approval.id, 'Aprovado pelo administrador');
                            setNotifications(notifications.map(n => 
                              n.id === notification.id ? { ...n, read: true } : n
                            ));
                          }}
                        >
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.approvalButtonText}>Aprovar</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            
            <Pressable
              style={[styles.closeButton, styles.closeButtonFixed, Platform.OS === 'web' && styles.closeButtonFixedWeb]}
              onPress={() => setApprovalModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de Gerenciamento de Família */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={familyModalVisible && isTopModal('family')}
        onRequestClose={() => {
          if (isCreatingFamily || isSavingFamilyName) return; // bloquear enquanto salvando/criando
          setFamilyModalVisible(false);
          setIsCreatingFamilyMode(false);
          setNewFamilyNameInput('');
          closeManagedModal('family');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.familyModalContent]}>
            <View style={styles.familyModalHeader}>
              <Text style={[styles.modalTitle, { color: THEME.primary }]}>
                {isCreatingFamilyMode ? 'Criar Família' : 'Gerenciar Família'}
              </Text>
              {familySyncBanner && (
                <View style={styles.familySyncBanner} accessibilityLabel="Indicador de sincronização da família">
                  <ActivityIndicator size="small" color={THEME.secondary} style={{ marginRight: 8 }} />
                  <Text style={[styles.familySyncBannerText, { color: THEME.secondary }]}>{familySyncBanner}</Text>
                </View>
              )}
            </View>

            {isCreatingFamilyMode ? (
              /* Interface de Criação de Família */
              <ScrollView
                style={styles.familyContent}
                contentContainerStyle={[styles.familyContentContainer, Platform.OS === 'web' && styles.familyContentContainerWeb]}
              >
                <View style={[styles.familyCard, isWeb ? styles.familyCardWeb : styles.familyCardMobile]}>
                  <Ionicons name="people" size={60} color={THEME.primary} style={styles.createFamilyIcon} />
                  <Text style={styles.createFamilyTitle}>Criar Nova Família</Text>
                  <Text style={styles.createFamilySubtitle}>
                    Você precisa estar em uma família para gerenciar tarefas em grupo.
                  </Text>
                  
                  <View style={styles.createFamilyInputContainer}>
                    <Text style={styles.familySectionTitle}>Nome da Família</Text>
                    <TextInput
                      style={styles.createFamilyInput}
                      value={newFamilyNameInput}
                      onChangeText={setNewFamilyNameInput}
                      placeholder="Ex: Família Silva"
                      placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                      maxLength={50}
                      editable={!isCreatingFamily}
                      autoFocus
                    />
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.createFamilyButton,
                      (!newFamilyNameInput.trim() || isCreatingFamily) && styles.createFamilyButtonDisabled,
                      pressed && newFamilyNameInput.trim() && !isCreatingFamily && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                    ]}
                    onPress={handleCreateFamilyFromModal}
                    disabled={!newFamilyNameInput.trim() || isCreatingFamily}
                    android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
                  >
                    {isCreatingFamily ? (
                      <Text style={styles.createFamilyButtonText}>Criando...</Text>
                    ) : (
                      <>
                        <Ionicons name="add-circle" size={20} color="#fff" />
                        <Text style={styles.createFamilyButtonText}>Criar Família</Text>
                      </>
                    )}
                  </Pressable>

                  <View style={[styles.createFamilyNote, Platform.OS === 'web' && styles.createFamilyNoteWeb]}>
                    <Ionicons name="information-circle" size={20} color={THEME.textSecondary} />
                    <Text style={styles.createFamilyNoteText}>
                      Após criar a família, você receberá um código para compartilhar com outros membros.
                    </Text>
                  </View>
                </View>
              </ScrollView>
            ) : (
              /* Interface de Gerenciamento de Família */
              <ScrollView
                style={styles.familyContent}
                contentContainerStyle={[styles.familyContentContainer, Platform.OS === 'web' && styles.familyContentContainerWeb]}
              >
                {/* Seção do Nome da Família */}
                <View style={[styles.familyCard, isWeb ? styles.familyCardWeb : styles.familyCardMobile]}>
                  {isWeb ? (
                    <>
                      <Text style={styles.familySectionTitle}>Nome da Família</Text>

                      {editingFamilyName ? (
                        <View style={styles.editFamilyNameContainer}>
                          <TextInput
                            style={styles.editFamilyNameInput}
                            value={newFamilyName}
                            onChangeText={setNewFamilyName}
                            placeholder="Digite o nome da família"
                            placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                            maxLength={50}
                            autoFocus
                          />
                          <View style={styles.editFamilyNameActions}>
                            <Pressable
                              style={[
                                styles.editFamilyNameButton,
                                styles.cancelButton,
                                (isSavingFamilyName) && styles.buttonDisabled
                              ]}
                              onPress={cancelEditingFamilyName}
                              disabled={isSavingFamilyName}
                            >
                              <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                              style={[
                                styles.editFamilyNameButton,
                                styles.saveButton,
                                (isSavingFamilyName) && styles.buttonDisabled
                              ]}
                              onPress={saveFamilyName}
                              disabled={isSavingFamilyName}
                            >
                              {isSavingFamilyName ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={styles.saveButtonText}>Salvar</Text>
                              )}
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.familyNameContainer}>
                          <Text style={styles.currentFamilyName}>
                            {currentFamily?.name || 'Nome não definido'}
                          </Text>
                          {user.role === 'admin' && (
                            <Pressable
                              style={styles.editFamilyNameIconButton}
                              onPress={startEditingFamilyName}
                            >
                              <Ionicons name="pencil" size={16} color={THEME.primary} />
                            </Pressable>
                          )}
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <View style={styles.familyCardRow}>
                        <Text style={styles.familySectionTitle}>Nome da Família</Text>
                        {user.role === 'admin' && !editingFamilyName && (
                          <Pressable
                            style={styles.familyCardActionButton}
                            onPress={startEditingFamilyName}
                          >
                            <Ionicons name="pencil" size={18} color={THEME.primary} />
                            <Text style={styles.familyCardActionText}>Editar</Text>
                          </Pressable>
                        )}
                      </View>

                      {editingFamilyName ? (
                        <View style={styles.editFamilyNameContainer}>
                          <TextInput
                            style={styles.editFamilyNameInput}
                            value={newFamilyName}
                            onChangeText={setNewFamilyName}
                            placeholder="Digite o nome da família"
                            placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                            maxLength={50}
                            autoFocus
                          />
                          <View style={styles.editFamilyNameActions}>
                            <Pressable
                              style={[
                                styles.editFamilyNameButton,
                                styles.cancelButton,
                                (isSavingFamilyName) && styles.buttonDisabled
                              ]}
                              onPress={cancelEditingFamilyName}
                              disabled={isSavingFamilyName}
                            >
                              <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                              style={[
                                styles.editFamilyNameButton,
                                styles.saveButton,
                                (isSavingFamilyName) && styles.buttonDisabled
                              ]}
                              onPress={saveFamilyName}
                              disabled={isSavingFamilyName}
                            >
                              {isSavingFamilyName ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={styles.saveButtonText}>Salvar</Text>
                              )}
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.familyCardValueRow}>
                          <Text style={styles.currentFamilyName}>
                            {currentFamily?.name || 'Nome não definido'}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>

                {/* Seção do Código da Família */}
                <View style={[styles.familyCard, isWeb ? styles.familyCardWeb : styles.familyCardMobile]}>
                  {isWeb ? (
                    <>
                      <Text style={styles.familySectionTitle}>Código da Família</Text>
                      <Text style={styles.familySectionSubtitle}>
                        Use este código para convidar novos membros
                      </Text>

                      <View style={styles.inviteCodeContainer}>
                        <Text style={styles.inviteCodeLabel}>Código:</Text>
                        <View style={[styles.inviteCodeBox, styles.inviteCodeBoxWeb]}>
                          <Text style={styles.inviteCodeText}>
                            {currentFamily?.inviteCode || 'Código não disponível'}
                          </Text>
                          {isWeb && (
                            <Pressable
                              onPress={copyFamilyCode}
                              style={styles.copyButton}
                            >
                              <Ionicons name="copy" size={18} color="#fff" />
                            </Pressable>
                          )}
                        </View>
                        {/* Indicador de validade e ação de regerar */}
                        {currentFamily?.inviteCodeExpiry && (
                          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={styles.inviteCodeExpiry}>
                              Validade: {new Date(currentFamily.inviteCodeExpiry as any).toLocaleString('pt-BR')} {codeCountdown ? `• ${codeCountdown}` : ''}
                            </Text>
                            {user.role === 'admin' && (
                              <Pressable
                                style={styles.regenCodeButton}
                                onPress={async () => {
                                  if (!currentFamily?.id) return;
                                  try {
                                    const updated = await familyService.regenerateInviteCode(currentFamily.id);
                                    setCurrentFamily(updated);
                                    Alert.alert('Novo código gerado', `Código: ${updated.inviteCode}`);
                                  } catch (e) {
                                    Alert.alert('Erro', 'Não foi possível regerar o código.');
                                  }
                                }}
                              >
                                <Ionicons name="refresh" size={16} color="#fff" />
                                <Text style={styles.regenCodeButtonText}>Regerar código</Text>
                              </Pressable>
                            )}
                          </View>
                        )}
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.familyCardRow}>
                        <View style={styles.familyCardHeaderText}>
                          <Text style={styles.familySectionTitle}>Código da Família</Text>
                          <Text style={styles.familySectionSubtitle}>
                            Use este código para convidar novos membros
                          </Text>
                        </View>
                      </View>

                        <View style={[styles.inviteCodeBox, styles.inviteCodeBoxMobile]}>
                        <Text style={styles.inviteCodeText}>
                          {currentFamily?.inviteCode || 'Código não disponível'}
                        </Text>
                          <Pressable
                            onPress={copyFamilyCode}
                            style={[styles.copyButton, styles.copyButtonMobile]}
                          >
                            <Ionicons name="copy" size={18} color="#fff" />
                          </Pressable>
                      </View>

                      {currentFamily?.inviteCodeExpiry && (
                          <View style={[styles.inviteCodeMetaRow, styles.inviteCodeMetaMobile]}>
                            <Text style={[styles.inviteCodeExpiry, styles.inviteCodeExpiryMobile]}>
                            Validade: {new Date(currentFamily.inviteCodeExpiry as any).toLocaleString('pt-BR')} {codeCountdown ? `• ${codeCountdown}` : ''}
                          </Text>
                          {user.role === 'admin' && (
                            <Pressable
                                style={[styles.regenCodeButton, styles.regenCodeButtonMobile]}
                              onPress={async () => {
                                if (!currentFamily?.id) return;
                                try {
                                  const updated = await familyService.regenerateInviteCode(currentFamily.id);
                                  setCurrentFamily(updated);
                                  Alert.alert('Novo código gerado', `Código: ${updated.inviteCode}`);
                                } catch (e) {
                                  Alert.alert('Erro', 'Não foi possível regerar o código.');
                                }
                              }}
                            >
                              <Ionicons name="refresh" size={16} color="#fff" />
                              <Text style={styles.regenCodeButtonText}>Regerar código</Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>

                {/* Seção de Membros */}
                <View style={[styles.familyCard, isWeb ? styles.familyCardWeb : styles.familyCardMobile]}>
                  {isWeb ? (
                    <Text style={styles.familySectionTitle}>Membros da Família</Text>
                  ) : (
                    <View style={styles.familyCardRow}>
                      <Text style={styles.familySectionTitle}>Membros da Família</Text>
                      <Text style={styles.familyCardBadge}>
                        {familyMembers.length} {familyMembers.length === 1 ? 'membro' : 'membros'}
                      </Text>
                    </View>
                  )}

                  {sortedFamilyMembers.map(member => (
                    <View
                      key={member.id}
                      style={[
                        styles.familyMemberCard,
                        isWeb ? styles.familyMemberCardWeb : styles.familyMemberCardMobile
                      ]}
                    >
                      <View style={styles.memberCardContent}>
                        <View style={styles.memberAvatarAndInfo}>
                          <View style={styles.memberAvatar}>
                            {member.profileIcon ? (
                              <Text style={styles.memberAvatarEmoji}>{getEmojiForIcon(member.profileIcon)}</Text>
                            ) : (
                              <Text style={styles.memberAvatarEmoji}>😊</Text>
                            )}
                          </View>
                          
                          <View style={styles.memberInfo}>
                            <Text style={styles.memberName}>{member.name}</Text>
                            <View style={styles.memberRoleBadge}>
                              <Ionicons 
                                name={member.role === 'admin' ? 'shield-checkmark' : 'person'} 
                                size={14} 
                                color={member.role === 'admin' ? THEME.primary : THEME.textSecondary} 
                              />
                              <Text style={[
                                styles.memberRoleText,
                                member.role === 'admin' && styles.memberRoleAdmin
                              ]}>
                                {member.role === 'admin' ? 'Administrador' : 'Dependente'}
                              </Text>
                            </View>
                            <Text style={styles.memberJoinDate}>
                              Entrou em: {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                            </Text>
                          </View>
                        </View>

                        {member.id !== user.id && user.role === 'admin' && (
                          <Pressable
                            style={({ pressed }) => [
                              styles.editMemberButton,
                              pressed && { opacity: 0.7 }
                            ]}
                            onPress={() => {
                              setSelectedMemberForEdit(member);
                              setEditMemberModalVisible(true);
                              openManagedModal('editMember');
                            }}
                          >
                            <Ionicons name="create-outline" size={20} color={THEME.primary} />
                            <Text style={styles.editMemberButtonText}>Editar</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
            
            <Pressable
              style={[styles.closeButton, styles.closeButtonFixed]}
              onPress={() => {
                if (isCreatingFamily || isSavingFamilyName) return;
                setFamilyModalVisible(false);
                setIsCreatingFamilyMode(false);
                setNewFamilyNameInput('');
                closeManagedModal('family');
              }}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de Edição de Membro */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editMemberModalVisible && isTopModal('editMember')}
        presentationStyle="overFullScreen"
        onRequestClose={() => {
          setEditMemberModalVisible(false);
          setSelectedMemberForEdit(null);
          closeManagedModal('editMember');
        }}
      >
        <View style={[styles.modalOverlay, { zIndex: 9999 }]}>
          <View style={[styles.modalContent, styles.editMemberModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Membro</Text>
              <Pressable
                onPress={() => {
                  setEditMemberModalVisible(false);
                  setSelectedMemberForEdit(null);
                  closeManagedModal('editMember');
                }}
                style={styles.closeIconButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>

            {selectedMemberForEdit && (
              <ScrollView style={styles.editMemberScroll}>
                {/* Informações do Membro */}
                <View style={styles.editMemberInfo}>
                  <View style={styles.editMemberAvatar}>
                    {selectedMemberForEdit.profileIcon ? (
                      <Text style={styles.editMemberAvatarEmoji}>{getEmojiForIcon(selectedMemberForEdit.profileIcon)}</Text>
                    ) : (
                      <Text style={styles.editMemberAvatarEmoji}>😊</Text>
                    )}
                  </View>
                  <Text style={styles.editMemberName}>{selectedMemberForEdit.name}</Text>
                  <Text style={styles.editMemberJoinDate}>
                    Membro desde {selectedMemberForEdit.joinedAt ? new Date(selectedMemberForEdit.joinedAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                  </Text>
                </View>

                {/* Permissões (somente para dependente) */}
                {selectedMemberForEdit.role === 'dependente' && (
                <View style={styles.editSection}>
                  <Text style={styles.editSectionTitle}>Permissões</Text>
                  <Text style={styles.editSectionDescription}>
                    Defina quais ações este membro pode realizar com as tarefas da família
                  </Text>
                  <View style={styles.permissionsEditContainer}>
                    {['create','edit','delete'].map(key => {
                      const labelMap: any = { 
                        create: { label: 'Criar Tarefas', icon: 'add-circle-outline' },
                        edit: { label: 'Editar Tarefas', icon: 'create-outline' },
                        delete: { label: 'Excluir Tarefas', icon: 'trash-outline' }
                      };
                      const has = !!(selectedMemberForEdit as any).permissions?.[key];
                      return (
                        <Pressable
                          key={key}
                          style={[styles.permissionEditItem, has && styles.permissionEditItemActive]}
                          onPress={async () => {
                            try {
                              const newValue = !has;
                              const updatedPerms = { ...(selectedMemberForEdit as any).permissions };
                              if (newValue) {
                                updatedPerms[key] = true;
                              } else {
                                delete updatedPerms[key];
                              }
                              await familyService.updateMemberPermissions(currentFamily!.id, selectedMemberForEdit.id, updatedPerms);
                              setFamilyMembers(prev => prev.map(m => m.id === selectedMemberForEdit.id ? { ...m, permissions: { ...updatedPerms } } : m));
                              setSelectedMemberForEdit({ ...selectedMemberForEdit, permissions: { ...updatedPerms } } as any);
                              
                              if (selectedMemberForEdit.id === user.id && currentFamily) {
                                try {
                                  const refreshed = await familyService.getFamilyTasks(currentFamily.id, user.id);
                                  setTasks(prev => {
                                    const privateTasks = prev.filter(t => (t as any).private === true || !(t as any).familyId) as any as Task[];
                                    const merged = [...privateTasks, ...(refreshed as any as Task[])];
                                    return merged as Task[];
                                  });
                                } catch (err) {
                                  logger.warn('FAMILY', 'Falha ao refazer fetch das tasks após permissão', err);
                                }
                              }
                            } catch (e) {
                              Alert.alert('Erro', 'Não foi possível atualizar permissões.');
                            }
                          }}
                        >
                          <View style={styles.permissionEditLeft}>
                            <Ionicons 
                              name={labelMap[key].icon} 
                              size={24} 
                              color={has ? THEME.primary : THEME.textSecondary} 
                            />
                            <Text style={[styles.permissionEditLabel, has && styles.permissionEditLabelActive]}>
                              {labelMap[key].label}
                            </Text>
                          </View>
                          <View style={[styles.permissionCheckbox, has && styles.permissionCheckboxActive]}>
                            {has && <Ionicons name="checkmark" size={16} color="#fff" />}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.permissionsNote}>
                    Sem permissões selecionadas, o membro não terá acesso às tarefas públicas da família.
                  </Text>
                </View>
                )}

                {/* Alterar Função */}
                <View style={styles.editSection}>
                  <Text style={styles.editSectionTitle}>Função na Família</Text>
                  <Text style={styles.editSectionDescription}>
                    {selectedMemberForEdit.role === 'admin' 
                      ? 'Este membro é um administrador e tem controle total sobre a família.' 
                      : 'Este membro é um dependente e pode ter permissões limitadas.'}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.changeRoleButton,
                      pressed && { opacity: 0.7 }
                    ]}
                    onPress={() => {
                      setEditMemberModalVisible(false);
                      closeManagedModal('editMember');
                      changeMemberRole(selectedMemberForEdit.id);
                    }}
                  >
                    <Ionicons name="swap-horizontal" size={20} color={THEME.primary} />
                    <Text style={styles.changeRoleButtonText}>
                      {selectedMemberForEdit.role === 'admin' ? 'Tornar Dependente' : 'Tornar Administrador'}
                    </Text>
                  </Pressable>
                </View>

                {/* Remover Membro */}
                <View style={styles.editSection}>
                  <Text style={styles.editSectionTitle}>Zona de Perigo</Text>
                  <Text style={styles.editSectionDescription}>
                    Remover este membro da família. Esta ação não pode ser desfeita.
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.removeMemberButtonEdit,
                      pressed && { opacity: 0.7 }
                    ]}
                    onPress={() => {
                      setEditMemberModalVisible(false);
                      closeManagedModal('editMember');
                      removeFamilyMember(selectedMemberForEdit.id);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.removeMemberButtonTextEdit}>Remover da Família</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.closeModalButton,
                Platform.OS === 'web' && styles.closeModalButtonWeb,
                pressed && { opacity: 0.8 }
              ]}
              onPress={() => {
                setEditMemberModalVisible(false);
                setSelectedMemberForEdit(null);
                closeManagedModal('editMember');
              }}
            >
              <Text style={styles.closeModalButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      
      {/* Overlay de carregamento removido - o banner "Sincronizando..." do header fornece feedback suficiente */}

      {/* Modal de Loading de Sincronização */}
      {isSyncing && (
        <Modal
          visible={isSyncing}
          transparent
          animationType="fade"
        >
          <View style={styles.syncLoadingOverlay}>
            <View style={styles.syncLoadingContainer}>
              <ActivityIndicator size="large" color={THEME.primary} />
              <Text style={styles.syncLoadingText}>{syncMessage}</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal de Adiamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={postponeModalVisible}
        onRequestClose={() => setPostponeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.postponeModalContent}>
            <Text style={styles.modalTitle}>Adiar Tarefa</Text>
            <Text style={styles.modalSubtitle}>
              {selectedTaskForPostpone?.title}
            </Text>

            {/* Agendamento - igual subtarefas: dois botões lado a lado */}
            <Text style={[styles.pickerLabel, { marginTop: 8 }]}>Agendamento</Text>
            <View style={[
              styles.dateTimeContainer,
              Platform.OS === 'web' && styles.dateTimeContainerWeb
            ]}>
              {/* Botão de Data */}
              <Pressable 
                style={[
                  styles.dateTimeButton,
                  Platform.OS === 'web' && styles.dateTimeButtonWeb
                ]}
                onPress={() => {
                  if (Platform.OS === 'android') Vibration.vibrate(10);
                  const initialValue = postponeDate || new Date();
                  pickerPostponeDateValueRef.current = initialValue;
                  setShowPostponeDatePicker(true);
                }}
              >
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.dateTimeButtonText}>
                  {postponeDate ? formatDate(postponeDate) : 'Selecionar data'}
                </Text>
              </Pressable>

              {/* Botão de Hora */}
              <Pressable 
                style={[
                  styles.dateTimeButton,
                  Platform.OS === 'web' && styles.dateTimeButtonWeb
                ]}
                onPress={() => {
                  if (Platform.OS === 'android') Vibration.vibrate(10);
                  const base = postponeDate || new Date();
                  const initialValue = postponeTime || base;
                  pickerPostponeTimeValueRef.current = initialValue;
                  setShowPostponeTimePicker(true);
                }}
              >
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.dateTimeButtonText}>
                  {postponeTime ? formatTime(postponeTime) : 'Selecionar horário'}
                </Text>
              </Pressable>
            </View>

            {/* DateTimePicker para Data */}
            {showPostponeDatePicker && (
              <DateTimePicker
                value={stablePostponeDatePickerValue}
                mode="date"
                display="default"
                onChange={onPostponeDateChange}
              />
            )}

            {/* DateTimePicker para Horário */}
            {showPostponeTimePicker && (
              <DateTimePicker
                value={stablePostponeTimePickerValue}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={onPostponeTimeChange}
              />
            )}

            {/* Aviso sutil se data/hora estiver no passado */}
            {postponeIsPast && (
              <Text style={styles.postponeWarningText}>
                A nova data/horário está no passado.
              </Text>
            )}

            {/* Botões de Ação - mesmo estilo dos outros modais */}
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => setPostponeModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.addButton, !hasPostponeChanged && styles.buttonDisabled]}
                disabled={!hasPostponeChanged}
                onPress={postponeTask}
              >
                <Text style={styles.addButtonText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const getStyles = (colors: any, activeTheme: 'light' | 'dark') => StyleSheet.create({
  // Árvore de Natal decorativa - ocupa tela toda
  christmasTree: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: activeTheme === 'dark' ? 0.15 : 0.2, // Menos opaca no dark para não escurecer demais
    zIndex: -1, // Atrás de todo o conteúdo
  },
  // Wrapper de página: mantém o layout atual no mobile; na web centraliza e limita largura
  pageContainer: {
    flex: 1,
    alignSelf: 'stretch',
  },
  pageContainerWeb: {
    width: '100%',
    maxWidth: 1100, // Limita a largura máxima em pixels para desktop
    minWidth: 320,
    alignSelf: 'center',
  },
  familyContentContainer: {
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 40,
    width: '100%',
  },
  familyContentContainerWeb: {
    paddingHorizontal: 20,
  },
  familyCard: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 12,
    width: '100%',
  },
  familyCardMobile: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 20,
  },
  familyCardWeb: {
    borderRadius: 12,
    borderWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    marginHorizontal: 0,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  familyCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  familyCardHeaderText: {
    flex: 1,
    gap: 4,
  },
  familyCardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  familyCardActionText: {
    color: THEME.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  familyCardValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 12,
    backgroundColor: colors.inputBackground,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  familyCardBadge: {
    backgroundColor: THEME.primary + '20',
    color: THEME.primary,
    fontWeight: '600',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  familyMemberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: THEME.primary,
    marginBottom: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  familyMemberCardMobile: {
    flexDirection: 'column',
    gap: 16,
    padding: 18,
  },
  // Container para centralizar a lista de membros
  familyMemberCardWeb: {
    flexDirection: 'column',
    gap: 16,
    padding: 18,
  },
  inviteCodeBoxWeb: {
    borderRadius: 10,
    borderWidth: 2,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    marginHorizontal: 0,
    marginVertical: 12,
    shadowColor: THEME.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteCodeBoxMobile: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
    marginHorizontal: 4,
  },
  copyButtonMobile: {
    marginLeft: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inviteCodeMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  inviteCodeMetaMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 10,
  },
  inviteCodeExpiryMobile: {
    textAlign: 'center',
    width: '100%',
  },
  regenCodeButtonMobile: {
    alignSelf: 'center',
    marginLeft: 0,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  createFamilyNoteWeb: {
    borderRadius: 10,
    borderWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    marginHorizontal: 0,
  },
  closeModalButtonWeb: {
    borderRadius: 8,
    marginTop: 16,
    marginHorizontal: 16,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 480,
  },
  closeButtonFixedWeb: {
    position: 'relative',
    left: undefined as unknown as number,
    right: undefined as unknown as number,
    bottom: 0,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 480,
    marginTop: 16,
    marginBottom: 16,
  },
  // Bloco esquerdo: avatar + detalhes (ocupa o espaço disponível)
  memberLeftContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 12,
  },
  memberLeftContainerMobile: {
    paddingRight: 0,
    width: '100%',
  },
  // Coluna direita: ações (mantém à direita)
  memberRightColumn: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  // Alinhamento à direita para o grupo de ações
  memberActionsRight: {
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    zIndex: 1, // Garante que o conteúdo fique acima do background
  },
  content: {
    flex: 1,
    paddingHorizontal: 8, // padding menor no mobile
    paddingTop: 12, // Reduzir padding superior
    paddingBottom: 100, // Aumentar padding inferior para os botões flutuantes
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
    backgroundColor: colors.surface,
    minWidth: 80,
  },
  categoryFilterActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
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
    borderColor: THEME.primary,
    backgroundColor: colors.surface,
    borderStyle: 'dashed',
    minWidth: 80,
  },
  addCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    color: THEME.primary,
  },
  horizontalScrollContainer: {
    marginBottom: 20,
    maxHeight: 70,
    ...Platform.select({
      web: {
        overflowX: 'scroll' as any,
        overflowY: 'hidden' as any,
        WebkitOverflowScrolling: 'touch' as any,
      },
    }),
  },
  iconSelectorContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
    ...Platform.select({
      web: {
        flexWrap: 'nowrap' as any,
      },
    }),
  },
  iconSelector: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconSelectorActive: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primaryBg,
  },
  colorSelectorContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
    ...Platform.select({
      web: {
        flexWrap: 'nowrap' as any,
      },
    }),
  },
  colorSelector: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSelectorActive: {
    borderColor: colors.textPrimary,
  },
  categoryPreview: {
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  privateToggleContainer: {
    marginTop: 12,
    marginBottom: 6,
    alignItems: 'flex-start'
  },
  privateToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: colors.surface
  },
  privateToggleButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: colors.surface,
    gap: 4,
  },
  privateToggleButtonActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary
  },
  privateToggleText: {
    marginRight: 8,
    color: colors.textPrimary
  },
  privateToggleTextCompact: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  privateToggleTextActive: {
    color: '#fff'
  },
  privateHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#888'
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
    marginBottom: 16, // Reduzir margem
    gap: 8, // Reduzir gap
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10, // Reduzir padding
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
  },
  dateTimeButtonText: {
    fontSize: 13, // Reduzir tamanho da fonte
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  // Web: manter um pouco mais de respiro lateral
  contentWeb: {
    paddingHorizontal: 16,
  },
  // Estilos específicos para Web para centralizar os botões de Data/Hora
  dateTimeContainerWeb: {
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  dateTimeButtonWeb: {
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 160,
    marginHorizontal: 6,
  },
  repeatContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  repeatIconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatIconButtonActive: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primaryBg,
  },
  customDaysContainer: {
    marginBottom: 16, // Reduzir margem
  },
  customDaysLabel: {
    fontSize: 13, // Reduzir tamanho da fonte
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6, // Reduzir margem
  },
  customDaysSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chipButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  chipButtonActive: {
    backgroundColor: THEME.primaryBg,
    borderColor: THEME.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: THEME.primary,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayButtonActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  dayButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButtonActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  summaryContainer: {
    marginBottom: 16, // Reduzir margem
  },
  summaryText: {
    fontSize: 13, // Reduzir tamanho da fonte
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30, // Reduzir padding horizontal
  },
  emptyText: {
    fontSize: 16, // Reduzir tamanho da fonte
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginTop: 16, // Reduzir margem superior
    marginBottom: 6, // Reduzir margem inferior
  },
  emptySubtext: {
    fontSize: 13, // Reduzir tamanho da fonte
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18, // Reduzir line height
  },
  smallModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  smallModalContent: {
    width: '95%',
    maxWidth: 500,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 16,
    maxHeight: '75%',
  },
  smallModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
    textAlign: 'center',
  },
  taskList: {
    flex: 1,
    minHeight: '100%',
  },
  taskListContent: {
    paddingBottom: 100, // Espaço para o botão fixo
    flexGrow: 0,
    alignItems: 'stretch',
  },
  taskItem: {
    backgroundColor: colors.surface,
    borderRadius: 12, // Reduzir border radius
    marginHorizontal: 0, // ocupar 100% do container
    marginBottom: 12, // Reduzir margem inferior
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignSelf: 'stretch',
    width: '100%',
  },
  taskCompleted: {
    opacity: 0.6,
    backgroundColor: colors.surfaceSecondary,
  },
  // Category Header - New Styles
  categoryHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: activeTheme === 'dark' ? 0 : 1,
    borderBottomColor: activeTheme === 'dark' ? 'transparent' : 'rgba(0,0,0,0.05)',
  },
  categoryHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privateIndicatorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)'
  },
  privateIndicatorRightText: {
    marginLeft: 4,
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700'
  },
  privateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)'
  },
  privateIndicatorText: {
    marginLeft: 4,
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700'
  },
  categoryHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskCardHeader: {
    padding: 12, // Reduzir padding
    paddingBottom: 8, // Reduzir padding inferior
  },
  taskMainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: 12, // Reduzir margem
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: activeTheme === 'dark' ? '#fff' : THEME.primary,
    backgroundColor: activeTheme === 'dark' ? 'transparent' : colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  checkboxDisabled: {
    backgroundColor: activeTheme === 'dark' ? 'transparent' : colors.background,
    borderColor: activeTheme === 'dark' ? '#555' : '#ccc',
  },
  unlockIconButton: {
    padding: 8,
    marginLeft: 8,
  },
  taskTextContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16, // Reduzir tamanho da fonte
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22, // Reduzir line height
    marginBottom: 3, // Reduzir margem
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  taskDescription: {
    fontSize: 13, // Reduzir tamanho da fonte
    color: activeTheme === 'dark' ? '#fff' : colors.textSecondary,
    lineHeight: 18, // Reduzir line height
    marginTop: 3, // Reduzir margem
  },
  taskDescriptionCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 70,
    justifyContent: 'center',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  scheduleInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12, // Reduzir padding horizontal
    paddingBottom: 12, // Reduzir padding inferior
    gap: 6, // Reduzir gap
    borderTopWidth: activeTheme === 'dark' ? 0 : 1,
    borderTopColor: activeTheme === 'dark' ? 'transparent' : '#f0f0f0',
    paddingTop: 8, // Reduzir padding superior
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 8, // Reduzir padding horizontal
    paddingVertical: 4, // Reduzir padding vertical
    borderRadius: 10, // Reduzir border radius
    borderWidth: activeTheme === 'dark' ? 0 : 1,
    borderColor: activeTheme === 'dark' ? 'transparent' : '#e9ecef',
  },
  scheduleText: {
    fontSize: 11, // Reduzir tamanho da fonte
    color: activeTheme === 'dark' ? '#fff' : '#495057',
    marginLeft: 3, // Reduzir margem
    fontWeight: '600',
  },
  // Estilos para horário das subtarefas
  subtaskScheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginLeft: 2,
  },
  subtaskScheduleText: {
    fontSize: 10,
    color: activeTheme === 'dark' ? '#fff' : colors.textTertiary,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto', // Empurra para a direita
  },
  collapseButton: {
    backgroundColor: 'transparent',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseButtonContainer: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleActionButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  scheduleActionButtonActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  scheduleActionButtonText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  overdueText: {
    color: '#dc3545',
    fontWeight: '700',
  },
  overdueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: activeTheme === 'dark' ? 'rgba(220,53,69,0.15)' : '#fff5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: activeTheme === 'dark' ? 'rgba(220,53,69,0.4)' : '#fecaca',
  },
  overdueLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc3545',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  modalOverlayMobile: {
    padding: 0,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '95%',
    maxWidth: 500,
    height: '75%',
    alignSelf: 'center',
  },
  // No web, expandir o modal de Gerenciar Família para ocupar tela cheia (como mobile)
  modalContentWeb: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    minHeight: '100%',
    maxHeight: '100%',
    borderRadius: 0,
    padding: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignSelf: 'center',
  },
  // Conteúdo do modal de configurações com espaço para o botão fixo
  settingsModalContent: {
    position: 'relative',
    paddingBottom: 72, // espaço para o botão "Fechar" fixo
  },
  // Conteúdo do modal de aprovações com espaço para o botão fixo
  approvalModalContent: {
    position: 'relative',
    paddingBottom: 72, // espaço para o botão "Fechar" fixo
  },
  fullscreenLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  fullscreenLoadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
  },
  fullscreenLoadingText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  loadingIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingChristmasHat: {
    position: 'absolute',
    top: -15,
    left: -8,
    width: 50,
    height: 50,
    zIndex: 10,
    resizeMode: 'contain',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // Reduzir margem
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10, // Reduzir padding
    fontSize: 15, // Reduzir tamanho da fonte
    marginBottom: 12, // Reduzir margem
    backgroundColor: colors.surfaceSecondary,
    width: '99%', // Garantir que ocupe toda a largura disponível
    alignSelf: 'stretch', // Garantir que se estenda corretamente
  },
  textArea: {
    height: 70, // Reduzir altura
    textAlignVertical: 'top',
    width: '99%', // Garantir largura total
    alignSelf: 'stretch', // Garantir que se estenda corretamente
  },
  
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  categorySelectorContainer: {
    marginBottom: 16,
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
    paddingHorizontal: 10, // Reduzir padding
    paddingVertical: 6, // Reduzir padding
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 85, // Reduzir largura mínima
    justifyContent: 'center',
  },
  categorySelectorActive: {
    borderWidth: 2,
  },
  categorySelectorText: {
    fontSize: 11, // Reduzir tamanho da fonte
    fontWeight: '600',
    marginLeft: 3, // Reduzir margem
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4, // Reduzir margem superior
    paddingTop: 8, // Adicionar um pouco de padding
  },
  button: {
    flex: 1,
    paddingVertical: 10, // Reduzir padding vertical
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surfaceSecondary,
    marginRight: 8,
  },
  cancelButtonText: {
    color: THEME.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: THEME.primary,
    marginLeft: 8,
  },
  buttonDisabled: {
    backgroundColor: '#a0c8ff', // Cor mais clara para indicar que está desabilitado
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Date Picker Styles
  datePickerModal: {
    backgroundColor: colors.surface,
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
    color: colors.textPrimary,
  },
  dateInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.surfaceSecondary,
    marginRight: 8,
  },
  datePickerCancelText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: THEME.primary,
    marginLeft: 8,
  },
  datePickerConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Time Picker Styles
  timePickerModal: {
    backgroundColor: colors.surface,
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
    color: colors.textPrimary,
  },
  timeInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.surfaceSecondary,
    marginRight: 8,
  },
  timePickerCancelText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: THEME.primary,
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
    marginBottom: 12, // Reduzir margem
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  // Tab Styles (DEPRECATED - mantidos para compatibilidade)
  /*
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
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
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 6,
    marginRight: 8,
  },
  activeTabText: {
    color: THEME.primary,
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
    color: colors.textSecondary,
  },
  activeTaskCountText: {
    color: '#fff',
  },
  */
  // Container principal para tabs e filtro
  tabsHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingBottom: 10,
  },
  // Simple Tab Styles (Nova aparência simplificada)
  simpleTabContainer: {
    flexDirection: 'row',
    flex: 1, // Ocupa o espaço disponível
  },
  simpleTab: {
    flex: 1,
    paddingVertical: 10, // Reduzir padding vertical
    paddingHorizontal: 8, // Reduzir mais o padding horizontal para mobile
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeSimpleTab: {
    borderBottomColor: THEME.primary,
  },
  simpleTabText: {
    fontSize: 15, // Reduzir tamanho da fonte
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeSimpleTabText: {
    color: THEME.primary,
    fontWeight: '600',
  },
  // History Styles
  historyModalWrapper: {
    width: '95%',
    maxWidth: 500,
    maxHeight: '75%',
    minHeight: 320,
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  historyModalSafeArea: {
    flex: 1,
    position: 'relative',
    paddingBottom: 72, // espaço para o botão "Fechar" fixo
  },
  historySubtitle: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  historyListContainer: {
    flex: 1,
    width: '100%',
    marginBottom: 12,
    minHeight: 200,
  },
  historyList: {
    flex: 1,
  },
  historyListContent: {
    paddingBottom: 84, // garantir que o conteúdo não fique sob o botão fixo
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
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  historyItem: {
    flexDirection: 'row',
    padding: 16,
    width: '95%',
    alignSelf: 'center',
    marginVertical: 4,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surfaceSecondary,
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
    color: colors.textPrimary,
    marginBottom: 4,
  },
  historyAction: {
    fontWeight: '600',
    color: THEME.primary,
  },
  historyDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  historyTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  // Overdue Task Styles
  taskOverdue: {
    // Manter o fundo do card conforme o tema; no dark permanecer escuro
    backgroundColor: activeTheme === 'dark' ? colors.surface : '#fff5f5',
    borderWidth: 2,
    borderColor: activeTheme === 'dark' ? 'rgba(220,53,69,0.4)' : '#fecaca',
  },
  pendingRecurringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  pendingRecurringLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f39c12',
    textTransform: 'uppercase',
  },
  taskTitlePending: {
    color: '#b45309',
  },
  taskDescriptionPending: {
    color: '#92400e',
  },
  lastUpdateText: {
    fontSize: 11,
    color: '#28a745',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  refreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  refreshButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f0f9f0',
  },
  refreshButtonActive: {
    backgroundColor: '#e7f3ff',
  },
  rotating: {
    transform: [{ rotate: '45deg' }],
  },
  approvalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: activeTheme === 'dark' ? 'rgba(255,193,7,0.15)' : '#fff3cd',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: activeTheme === 'dark' ? 'rgba(255,152,0,0.4)' : '#ff9800',
  },
  approvalStatusApproved: {
    backgroundColor: activeTheme === 'dark' ? 'rgba(76,175,80,0.15)' : '#d4edda',
    borderColor: activeTheme === 'dark' ? 'rgba(76,175,80,0.4)' : '#4CAF50',
  },
  approvalStatusRejected: {
    backgroundColor: activeTheme === 'dark' ? 'rgba(231,76,60,0.15)' : '#f8d7da',
    borderColor: activeTheme === 'dark' ? 'rgba(231,76,60,0.4)' : '#e74c3c',
  },
  approvalStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ff9800',
    marginLeft: 4,
  },
  approvalStatusTextApproved: {
    color: '#4CAF50',
  },
  approvalStatusTextRejected: {
    color: '#e74c3c',
  },
  noNotificationsText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginVertical: 20,
  },
  notificationsList: {
    maxHeight: 400,
    marginVertical: 10,
  },
  notificationItem: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  notificationTaskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 10,
  },
  approvalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  approvalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 5,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  approvalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: THEME.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  // Botão "Fechar" fixo no rodapé do modal de aprovações
  closeButtonFixed: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    marginTop: 0,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
  // Estilos do Modal de Família
  familyModalContent: {
    maxHeight: '75%',
    minHeight: '75%',
    paddingBottom: 20, // espaço para o botão "Fechar" fixo
  },
  familyModalContentMobile: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    minHeight: '100%',
    maxHeight: '100%',
    borderRadius: 0,
    padding: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    paddingBottom: 20, // espaço para o botão "Fechar" fixo
  },
  familyModalHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  closeModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: THEME.primary,
    marginTop: 15,
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  familyContent: {
    flex: 1,
  },

  familySectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  familySectionSubtitle: {
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 16,
    lineHeight: 22,
  },
  generateCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  generateCodeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  inviteCodeContainer: {
    marginTop: 15,
    marginHorizontal: 0,
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
  },
  inviteCodeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: THEME.primary,
    width: '100%',
  },
  inviteCodeText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: THEME.primary,
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    backgroundColor: THEME.primary,
    padding: 12,
    borderRadius: 8,
    marginLeft: 12,
  },
  inviteCodeExpiry: {
    fontSize: 12,
    color: colors.textPrimary,
    fontStyle: 'italic',
    marginTop: 5,
  },
  regenCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 8
  },
  regenCodeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6
  },
  activeInvites: {
    marginTop: 15,
  },
  activeInvitesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    marginBottom: 8,
  },
  activeInviteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    padding: 10,
    borderRadius: 6,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeInviteCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  activeInviteExpiry: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  familyMember: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  memberAvatarColumn: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberDetailsColumn: {
    flex: 1,
    paddingLeft: 16,
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  memberAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  memberAvatarEmoji: {
    fontSize: 32,
  },
  memberDetails: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  memberRole: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  memberRoleText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  memberRoleAdmin: {
    color: THEME.primary,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 18,
  },
  memberJoinDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  removeMemberButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: THEME.danger + '20',
    minHeight: 48,
    minWidth: 48,
  },
  removeMemberButtonMobile: {
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  memberActionsMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  changeMemberRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: THEME.primary + '20',
    gap: 8,
    minHeight: 48,
    minWidth: 160,
  },
  changeMemberRoleButtonMobile: {
    flex: 1,
  },
  changeMemberRoleButtonText: {
    fontSize: 15,
    color: THEME.primary,
    fontWeight: '600',
  },
  
  // Novos estilos para cards de membros - Design simplificado
  memberCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
  },
  memberAvatarAndInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 200,
  },
  memberRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  editMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#e6f3ff',
    borderRadius: 8,
    minWidth: 100,
  },
  editMemberButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
  },

  // Estilos do Modal de Edição de Membro
  editMemberModalContent: {
    maxHeight: '75%',
    minHeight: '60%',
    paddingBottom: 20,
  },
  editMemberScroll: {
    flex: 1,
  },
  editMemberInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editMemberAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.border,
    marginBottom: 12,
  },
  editMemberAvatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  editMemberAvatarEmoji: {
    fontSize: 48,
  },
  editMemberName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  editMemberJoinDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  editSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  editSectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  permissionsEditContainer: {
    gap: 12,
  },
  permissionEditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  permissionEditItemActive: {
    backgroundColor: '#e6f3ff',
    borderColor: THEME.primary,
  },
  permissionEditLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionEditLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  permissionEditLabelActive: {
    color: THEME.primary,
  },
  permissionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionCheckboxActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  permissionsNote: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  changeRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: THEME.primary + '20',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.primary,
  },
  changeRoleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.primary,
  },
  removeMemberButtonEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: THEME.danger,
    borderRadius: 10,
  },
  removeMemberButtonTextEdit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  closeIconButton: {
    padding: 4,
  },
  
  // Estilos para edição do nome da família
  familyNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSecondary,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentFamilyName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  editFamilyNameIconButton: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: THEME.primary + '20',
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editFamilyNameContainer: {
    backgroundColor: THEME.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  editFamilyNameInput: {
    backgroundColor: THEME.background,
    borderWidth: 2,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    marginBottom: 16,
  },
  editFamilyNameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editFamilyNameButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: THEME.primary,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Estilos para indicador de conectividade
  connectivityIndicator: {
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  connectivityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connectivityText: {
    fontSize: 13,
    fontWeight: '500',
  },
  syncingIndicator: {
    marginLeft: 4,
  },
  // Estilos para informações de autoria
  authorshipInfo: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopWidth: activeTheme === 'dark' ? 0 : 1,
    borderTopColor: activeTheme === 'dark' ? 'transparent' : '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorshipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  authorshipText: {
    fontSize: 11,
    color: activeTheme === 'dark' ? '#fff' : colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  historyAuthor: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  syncingDot: {
    fontSize: 20,
    color: '#4CAF50',
  },
  // Estilos para botão de filtro e rodapé
  filterButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: THEME.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginLeft: 8, // Espaçamento do container de tabs
  },
  createTaskButton: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    maxWidth: 300,
    marginBottom: 15,
    borderRadius: 12,
    gap: 8,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    elevation: 4,
    
  },
  // Container para o botão fixo respeitando safe area
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent', // Removido o background
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    // Removidas as propriedades de borda e sombra
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTaskButtonFixed: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    maxWidth: 250,
    width: '100%',
    borderRadius: 12,
    gap: 8,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    elevation: 4,
  },
  createTaskButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filterDropdownMenuFloating: {
    position: 'absolute',
    // top e right serão definidos dinamicamente via inline style
    width: 240,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    maxHeight: 320,
    zIndex: 1001,
    overflow: 'hidden',
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
    minHeight: 52,
  },
  filterDropdownItemActive: {
    backgroundColor: '#f0f4ff',
  },
  filterDropdownItemText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
    fontWeight: '400',
  },
  filterDropdownItemTextActive: {
    color: THEME.primary,
    fontWeight: '600',
  },
  deleteCategoryButton: {
    padding: 6,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#f9fafb',
  },
  filterDropdownSeparator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  // Estilos para modal de configurações
  settingsOptions: {
    width: '100%',
    marginVertical: 20,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.surfaceSecondary,
    marginBottom: 2,
    borderRadius: 8,
  },
  settingsOptionText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 15,
    fontWeight: '500',
  },
  // Botão de ação do modal de configurações (redondo e verde)
  settingsActionFab: {
    position: 'absolute',
    bottom: 86, // acima do botão Fechar (que está em bottom: 16)
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  // Estilos do Modal do Manual
  manualModalContent: {
    position: 'relative',
    paddingBottom: 72,
  },
  manualScroll: {
    flexGrow: 0,
  },
  manualContent: {
    paddingBottom: 8,
  },
  manualParagraph: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
    lineHeight: 20,
  },
  manualSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.secondary,
    marginTop: 8,
    marginBottom: 8,
  },
  manualListItem: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 20,
  },
  // Estilos para interface de criação de família
  createFamilyIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  createFamilyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  createFamilySubtitle: {
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  createFamilyInputContainer: {
    marginBottom: 25,
  },
  createFamilyInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 17,
    color: colors.textPrimary,
  },
  createFamilyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.primary,
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  createFamilyButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  createFamilyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createFamilyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff9e6',
    padding: 16,
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ffc107',
    gap: 10,
    marginTop: 20,
    marginHorizontal: -20,
  },
  createFamilyNoteText: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // ===== Permissões de Membros =====
  permissionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8'
  },
  permissionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6
  },
  permissionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  permissionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbb',
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8
  },
  permissionChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary
  },
  permissionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555'
  },
  permissionChipTextActive: {
    color: '#fff'
  },
  permissionsHint: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2
  },
  // Banner unificado de sincronização no modal de família
  familySyncBanner: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f6ff',
    borderWidth: 1,
    borderColor: '#cfe3ff',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
  },
  familySyncBannerText: {
    color: '#0a58ca',
    fontSize: 13,
    fontWeight: '600',
  },
  // Estilos para o modal de picker do iOS
  iosPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 9999,
    elevation: 9999,
  },
  iosPickerContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    zIndex: 10000,
    elevation: 10000,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  iosPickerDoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iosPickerDoneButtonText: {
    color: THEME.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  iosDateTimePicker: {
    backgroundColor: colors.surface,
    height: 200,
  },
  // iOS inline picker dentro do container do modal de tarefa
  iosInlinePickerBox: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  iosInlinePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: colors.surface,
  },
  // Estilos do modal de loading de sincronização
  syncLoadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncLoadingContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  syncLoadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  postponeModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  pickerSection: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.textPrimary,
    marginBottom: 8,
  },
  
  postponeWarningText: {
    marginTop: 6,
    marginBottom: 2,
    color: '#b45309', // amber-700
    fontSize: 12,
    textAlign: 'center',
  },
  opacityDisabled: {
    opacity: 0.5,
  },
});

