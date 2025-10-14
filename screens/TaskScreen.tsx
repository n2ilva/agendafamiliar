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
  KeyboardAvoidingView,
  Image,
  Animated,
  
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { 
  PanGestureHandler, 
  State, 
  GestureHandlerRootView 
} from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';
import NotificationService from '../services/NotificationService';
import { Header } from '../components/Header';
import { FamilyUser, UserRole, TaskStatus, TaskApproval, ApprovalNotification, Family, FamilyInvite, Task as RemoteTask } from '../types/FamilyTypes';
import LocalStorageService, { HistoryItem as StoredHistoryItem } from '../services/LocalStorageService';
import SyncService, { SyncStatus } from '../services/SyncService';
import FirestoreService from '../services/FirestoreService';
import ConnectivityService, { ConnectivityState } from '../services/ConnectivityService';
import Alert from '../utils/Alert';
import familyService from '../services/FirebaseFamilyService';
import FamilySyncHelper from '../services/FamilySyncHelper';
import LocalAuthService from '../services/LocalAuthService';
import { safeToDate, isToday, isUpcoming, isTaskOverdue, getNextRecurrenceDate, isRecurringTaskCompletable } from '../utils/DateUtils';
import { v4 as uuidv4 } from 'uuid';
import { AVAILABLE_COLORS as PALETTE_COLORS, DEFAULT_CATEGORY_COLOR_MAP } from '../utils/colors';

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
  status: TaskStatus;
  category: string;
  priority?: 'baixa' | 'media' | 'alta';
  dueDate?: Date;
  dueTime?: Date;
  repeat: RepeatConfig;
  userId: string;
  approvalId?: string;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
  familyId?: string | null;
  // Campos de autoria
  createdBy: string;
  createdByName: string;
  editedBy?: string;
  editedByName?: string;
  editedAt?: Date;
  // Subtarefas
  subtasks?: Array<{
    id: string;
    title: string;
    done: boolean;
    completedById?: string;
    completedByName?: string;
    completedAt?: Date;
  }>;
  // Flag de privacidade (apenas visível para o criador)
  private?: boolean;
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
    color: DEFAULT_CATEGORY_COLOR_MAP.work.color,
    bgColor: DEFAULT_CATEGORY_COLOR_MAP.work.bgColor,
    isDefault: true
  },
  {
    id: 'home',
    name: 'Casa',
    icon: 'home',
      color: DEFAULT_CATEGORY_COLOR_MAP.home.color,
      bgColor: DEFAULT_CATEGORY_COLOR_MAP.home.bgColor,
    isDefault: true
  },
  {
    id: 'health',
    name: 'Saúde',
    icon: 'fitness',
    color: DEFAULT_CATEGORY_COLOR_MAP.health.color,
    bgColor: DEFAULT_CATEGORY_COLOR_MAP.health.bgColor,
    isDefault: true
  },
  {
    id: 'study',
    name: 'Estudos',
    icon: 'book',
    color: DEFAULT_CATEGORY_COLOR_MAP.study.color,
    bgColor: DEFAULT_CATEGORY_COLOR_MAP.study.bgColor,
    isDefault: true
  }
];

const HISTORY_DAYS_TO_KEEP = 7;

export const AVAILABLE_ICONS = [
  'briefcase', 'home', 'fitness', 'book', 'car', 'restaurant',
  'airplane', 'camera', 'musical-notes', 'game-controller',
  'heart', 'star', 'gift', 'trophy', 'school', 'desktop'
];

export const AVAILABLE_COLORS = PALETTE_COLORS;

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
  subtasks?: Array<{
    id: string;
    title: string;
    done: boolean;
    completedById?: string;
    completedByName?: string;
    completedAt?: Date;
  }>;
  private?: boolean;
}

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

interface TaskScreenProps {
  user: FamilyUser;
  onLogout: () => Promise<void>;
  onUserNameChange: (newName: string) => void;
  onUserImageChange?: (newImageUrl: string) => void;
  onUserRoleChange?: (newRole: UserRole) => void;
}

export const TaskScreen: React.FC<TaskScreenProps> = ({ user, onLogout, onUserNameChange, onUserImageChange, onUserRoleChange }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  // Flag para indicar se a nova tarefa é privada
  const [newTaskPrivate, setNewTaskPrivate] = useState(false);
  // Subtarefas (rascunho do modal)
  const [subtasksDraft, setSubtasksDraft] = useState<Array<{ id: string; title: string; done: boolean; completedById?: string; completedByName?: string; completedAt?: Date }>>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('work');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('star');
  
  // Estados para sistema de aprovação
  const [approvals, setApprovals] = useState<TaskApproval[]>([]);
  // Solicitações de promoção a admin
  const [adminRoleRequests, setAdminRoleRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([]);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<TaskApproval | null>(null);
  const [resolvingAdminRequestId, setResolvingAdminRequestId] = useState<string | null>(null);
  
  // Estados para sistema de família
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyUser[]>([]);
  // const [familyInvites, setFamilyInvites] = useState<FamilyInvite[]>([]);
  const [familyModalVisible, setFamilyModalVisible] = useState(false);
  const [editingFamilyName, setEditingFamilyName] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  // const [inviteCode, setInviteCode] = useState<string>('');
  const [isCreatingFamilyMode, setIsCreatingFamilyMode] = useState(false);
  const [newFamilyNameInput, setNewFamilyNameInput] = useState('');
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  // Estado para contagem regressiva do código
  const [codeCountdown, setCodeCountdown] = useState<string>('');

  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  // Estados para sistema offline
  const [isOffline, setIsOffline] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSync: 0,
    pendingOperations: 0,
    hasError: false
  });
  const [connectivityState, setConnectivityState] = useState<ConnectivityState>({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi'
  });  // Estados para edição
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Estados para tabs
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');
  // Parametrização da animação de fade
  const FADE_BASE_OPACITY = 0.25; // ajuste para 0.5 se quiser menos contraste
  const FADE_DURATION_IN = 160;   // 80 para mais rápido, 160 para mais suave
  const tabFade = useRef(new Animated.Value(1)).current; // 1 = visível
  const changeTab = useCallback((next: 'today' | 'upcoming', opts?: { mid?: number; duration?: number }) => {
    if (next === activeTab) return;
    const mid = Math.min(1, Math.max(0.85, opts?.mid ?? 0.9)); // nunca abaixo de 0.85 para não sumir conteúdo
    const duration = opts?.duration ?? 120;
    const half = Math.floor(duration / 2);
    Animated.timing(tabFade, { toValue: mid, duration: half, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setActiveTab(next);
      Animated.timing(tabFade, { toValue: 1, duration: half, useNativeDriver: true }).start();
    });
  }, [activeTab, tabFade]);
  
  // Estados para histórico
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Sincronizar role do usuário ao montar a tela
  useEffect(() => {
    const syncRole = async () => {
      try {
        if (!user?.id) return;
        // Buscar família do usuário pelo serviço singleton já importado
        const family = await familyService.getUserFamily(user.id).catch(() => null);
        if (family && Array.isArray(family.members)) {
          const myMember = family.members.find((m: any) => m.id === user.id);
          if (myMember?.role && myMember.role !== user.role && onUserRoleChange) {
            await onUserRoleChange(myMember.role);
          }
        }
      } catch (e) {
        console.warn('⚠️ Falha ao sincronizar role no mount:', e);
      }
    };
    syncRole();
  }, [user?.id]);
  
  // Estado para modal de configurações
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isSavingFamilyName, setIsSavingFamilyName] = useState(false);
  
  // Estado para atualização automática
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Loading global para aguardar sincronizações específicas (ex.: exclusão remota)
  const [isGlobalLoading, setGlobalLoading] = useState(false);
  // Controle de auto-sync para evitar chamadas excessivas
  const lastAutoSyncAtRef = useRef(0);

  // Estado para IDs de tarefas pendentes de sincronização
  const [pendingSyncIds, setPendingSyncIds] = useState<string[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  
  // Estado para dropdown de filtros
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);

  // Refs para controlar estado do gesto e evitar múltiplas trocas
  const hasSwitchedRef = useRef(false);
  const gestureActiveRef = useRef(false);

  // Handler contínuo (feedback mais suave): troca assim que passa do limiar
  const onSwipeGestureEvent = useCallback((event: any) => {
    const { translationX, velocityX, state } = event.nativeEvent;
    const width = Dimensions.get('window').width;
    const distanceThreshold = width * 0.12; // 12% da largura - mais sensível
    const velocityThreshold = 400; // flick moderado

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
        const distanceThreshold = width * 0.15; // fallback um pouco maior para evitar trocas acidentais
        const velocityThreshold = 500;

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
    console.log('📤 Convertendo Local -> Remoto:', {
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
      repeatOption: task.repeat?.type === RepeatType.DAILY ? 'diario' : 
            task.repeat?.type === RepeatType.CUSTOM ? 'semanal' : 'nenhum',
      repeatDays: task.repeat?.type === RepeatType.CUSTOM ? (task.repeat.days || []) : null,
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
      }));
    }

    // Log para debug de tarefas privadas
    if ((task as any)?.private === true) {
      console.log('🔒 Tarefa PRIVADA detectada:', {
        id: remoteTask.id,
        title: remoteTask.title,
        private: remoteTask.private,
        familyId: remoteTask.familyId,
        userId: remoteTask.userId
      });
    }

    console.log('📤 Dados preparados para envio remota:', {
      id: remoteTask.id,
      title: remoteTask.title,
      remoteDueDate: remoteTask.dueDate,
      remoteDueTime: remoteTask.dueTime,
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
    const dueDate = safeToDate(remoteTask.dueDate);
    const dueTime = safeToDate(remoteTask.dueTime);

    console.log('🔄 Convertendo Remoto -> Local:', {
      id: remoteTask.id,
      title: remoteTask.title,
      remoteDueDate: remoteTask.dueDate,
      remoteDueTime: remoteTask.dueTime,
      convertedDueDate: dueDate,
      convertedDueTime: dueTime,
    });

    return {
      id: remoteTask.id,
      title: remoteTask.title,
      description: remoteTask.description || '',
      completed: remoteTask.completed,
      status: remoteTask.status,
      category: remoteTask.category,
      priority: (remoteTask as any).priority || 'media',
      familyId: (remoteTask as any).familyId ?? null,
      dueDate: dueDate,
      dueTime: dueTime, // Conversão mais segura, sem fallback para dueDate
      repeat: {
        type: remoteTask.repeatOption === 'diario' ? RepeatType.DAILY :
              remoteTask.repeatOption === 'semanal' ? RepeatType.CUSTOM : RepeatType.NONE,
        days: Array.isArray((remoteTask as any).repeatDays) ? (remoteTask as any).repeatDays : []
      },
      userId: remoteTask.userId,
      approvalId: remoteTask.approvalId,
      createdAt: safeToDate(remoteTask.createdAt) || new Date(), // Garantir que createdAt seja sempre uma data válida
      updatedAt: safeToDate(remoteTask.updatedAt) || safeToDate(remoteTask.editedAt) || safeToDate(remoteTask.createdAt) || new Date(),
      completedAt: safeToDate((remoteTask as any).completedAt) || undefined,
      subtasks: Array.isArray((remoteTask as any).subtasks) ? (remoteTask as any).subtasks.map((st: any) => ({
        id: st.id,
        title: st.title,
        done: !!st.done,
        completedById: st.completedById || undefined,
        completedByName: st.completedByName || undefined,
        completedAt: safeToDate(st.completedAt) || undefined,
      })) : [],
      // Campos de autoria com fallback para dados antigos
      createdBy: remoteTask.createdBy || remoteTask.userId,
      createdByName: remoteTask.createdByName || 'Usuário',
      editedBy: remoteTask.editedBy,
      editedByName: remoteTask.editedByName,
      editedAt: safeToDate(remoteTask.editedAt),
      // Campo de privacidade
      private: (remoteTask as any).private
    };
  };

  // Função para carregar dados do cache local
  const loadDataFromCache = async () => {
    try {
      console.log('📱 Carregando dados do cache local...');
      
      // Carregar tarefas do cache
      const cachedRemoteTasks = await LocalStorageService.getTasks();
        if (cachedRemoteTasks.length > 0) {
          const convertedTasks: Task[] = (cachedRemoteTasks.map(remoteTaskToTask as any) as Task[]);
          setTasks(convertedTasks);
        console.log(`✅ ${convertedTasks.length} tarefas carregadas do cache`);
      }

      // Carregar aprovações do cache
      const cachedApprovals = await LocalStorageService.getApprovals();
      if (cachedApprovals.length > 0) {
        setApprovals(cachedApprovals);
        console.log(`✅ ${cachedApprovals.length} aprovações carregadas do cache`);
      }

      // Se há dados em cache, mostrar indicador
      const hasCachedData = await LocalStorageService.hasCachedData();
      if (hasCachedData) {
        console.log('✅ Dados offline disponíveis');
      }

    } catch (error) {
      console.error('❌ Erro ao carregar dados do cache:', error);
    }
  };

  // Função para salvar dados no cache
  const saveDataToCache = async () => {
    try {
      // Salvar tarefas convertidas
      for (const task of tasks) {
  const remoteTask = taskToRemoteTask(task as any);
  await LocalStorageService.saveTask(remoteTask);
      }

      // Salvar aprovações
      for (const approval of approvals) {
        await LocalStorageService.saveApproval(approval);
      }

      console.log('💾 Dados salvos no cache local');
    } catch (error) {
      console.error('❌ Erro ao salvar dados no cache:', error);
    }
  };

  // Função para recarregar tarefas da família
  const reloadFamilyTasks = async () => {
  if (currentFamily && !isOffline) {
      try {
        console.log('🔄 Recarregando tarefas da família...');
  const familyTasks = await familyService.getFamilyTasks(currentFamily.id, user.id);
        
        // Converter usando função centralizada para manter dueTime e repeatDays
  let convertedTasks: Task[] = familyTasks.map(remoteTaskToTask as any);

        // Filtrar tarefas privadas que não pertencem ao usuário atual
        convertedTasks = convertedTasks.filter(t => {
          const isPrivate = (t as any).private === true;
          if (isPrivate && t.createdBy && t.createdBy !== user.id) return false;
          return true;
        });
        
  console.log('📊 Tarefas convertidas (remotas):', convertedTasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, dueTime: t.dueTime })));

  // Fazer merge inteligente: manter tarefas locais mais recentes e adicionar novas do servidor remoto
        setTasks(currentTasks => {
          console.log('📊 Tarefas locais antes do merge:', currentTasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, dueTime: t.dueTime })));
          
          const mergedTasksMap = new Map(currentTasks.map(t => [t.id, t]));

          // Para cada tarefa remota
          convertedTasks.forEach(remoteTask => {
            const existingTask = mergedTasksMap.get(remoteTask.id);
            
            if (!existingTask) {
              // Tarefa não existe localmente, adicionar
              mergedTasksMap.set(remoteTask.id, remoteTask);
              console.log(`➕ Tarefa nova adicionada: ${remoteTask.title}`);
            } else {
              // Tarefa existe, manter a versão mais recente baseada em updatedAt/editedAt
              const existingTime = existingTask.editedAt || existingTask.createdAt;
              const remoteTime = remoteTask.editedAt || remoteTask.createdAt;
              
              if (remoteTime > existingTime) {
                // Versão remota é mais recente
                mergedTasksMap.set(remoteTask.id, remoteTask);
                console.log(`🔄 Tarefa atualizada pelo servidor remoto: ${remoteTask.title}`);
              } else {
                console.log(`🚫 Mantendo versão local de: ${existingTask.title} (mais recente)`);
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
                console.log(`🛡️ Preservando tarefa privada do criador ausente no servidor: ${localTask.title}`);
                return;
              }
              mergedTasksMap.delete(localTask.id);
              console.log(`➖ Tarefa removida (não existe mais no servidor remoto): ${localTask.title}`);
            }
          });

          const finalTasks = Array.from(mergedTasksMap.values());
          console.log('📊 Tarefas locais após o merge:', finalTasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, dueTime: t.dueTime })));
          
          return finalTasks;
        });
        
        console.log(`✅ ${familyTasks.length} tarefas da família sincronizadas com merge inteligente`);
      } catch (error) {
        console.error('❌ Erro ao recarregar tarefas da família:', error);
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
      console.log('🔄 Executando atualização automática agendada...');
      forceRefresh();
    }, 60000); // 60000ms = 1 minuto

    const handleAppStateChange = (nextAppState: any) => {
      if (nextAppState === 'active') {
        console.log('📱 App tornou-se ativo, forçando atualização...');
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

        // Inicializar sincronização
        await SyncService.initialize();
        
        // Configurar listener de sincronização
        const removeSyncListener = SyncService.addSyncListener((status) => {
          setSyncStatus(status);
        });

        // Obter estado inicial
        const initialState = ConnectivityService.getCurrentState();
        setConnectivityState(initialState);
        setIsOffline(!initialState.isConnected);

        // Carregar dados do cache se estiver offline
        if (!initialState.isConnected) {
          await loadDataFromCache();
        }

        console.log('Sistema offline inicializado');

        // Cleanup function
        return () => {
          removeConnectivityListener();
          removeSyncListener();
        };
      } catch (error) {
        console.error('Erro ao inicializar sistema offline:', error);
      }
    };

    const cleanup = initializeOfflineSystem();
    
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, []);

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
          console.log('🏠 Carregando família do usuário...', {
            userId: user.id,
            familyId: user.familyId,
            isOffline: isOffline
          });
          
          if (!isOffline) {
            // Online: forçar sincronização completa para garantir dados atualizados
            await SyncService.forceFullSync();
          }
          
          const userFamily = await familyService.getUserFamily(user.id);
          console.log('🔍 Resultado da busca por família:', userFamily);
          
          if (userFamily) {
            setCurrentFamily(userFamily);
            console.log('👨‍👩‍👧‍👦 Família carregada:', userFamily.name);
            
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
            
            console.log(`📋 ${familyTasks.length} tarefas da família carregadas e convertidas`);
          } else {
            console.log('👤 Usuário não possui família');
            
            // Se não tem família, carregar tarefas do cache local
            const cachedTasks = await LocalStorageService.getTasks();
            if (cachedTasks.length > 0) {
              const localTasks: Task[] = (cachedTasks.map(remoteTaskToTask as any) as Task[]);
              setTasks(localTasks);
              console.log(`� ${localTasks.length} tarefas locais carregadas do cache`);
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro ao carregar família do usuário:', error);
        
        // Em caso de erro, tentar carregar do cache local
        try {
          const cachedTasks = await LocalStorageService.getTasks();
          if (cachedTasks.length > 0) {
            const localTasks = cachedTasks.map(remoteTaskToTask);
            setTasks(localTasks);
            console.log(`🔄 ${localTasks.length} tarefas carregadas do cache após erro`);
          }
        } catch (cacheError) {
          console.error('❌ Erro ao carregar do cache:', cacheError);
        }
      }
    };

    console.log('📊 useEffect de carregamento de família executando...', {
      hasUserId: !!user?.id,
      userId: user?.id,
      isOffline
    });
    
    loadUserFamily();
  }, [user?.id, isOffline]);

  // useEffect para carregar histórico da família
  useEffect(() => {
    let unsubscribeHistory: (() => void) | null = null;

    const loadHistory = async () => {
      try {
        // Verificar se há usuário válido antes de tentar carregar histórico
        if (!user || !user.id) {
          console.log('👤 Usuário não definido, pulando carregamento do histórico');
          return;
        }

    // Primeiro, carregar histórico do cache local
    console.log('📖 Carregando histórico do cache local...');
  const localHistory = await LocalStorageService.getHistory(100);
  setHistory(localHistory.sort((a,b)=> new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime()));

    // Limpar histórico antigo (manter apenas 7 dias)
    await LocalStorageService.clearOldHistory(HISTORY_DAYS_TO_KEEP);

        if (currentFamily && currentFamily.id && !isOffline) {
          console.log('📖 Carregando histórico da família...');

          // Configurar listener para atualizações de tarefas em tempo real
          const unsubscribeTasks = familyService.subscribeToFamilyTasks(
            currentFamily.id,
            (updatedTasks) => {
              const convertedTasks: Task[] = updatedTasks
                .map(remoteTaskToTask)
                .filter(task => {
                  // Se a tarefa estiver na lista de espera, não a atualize
                  if (pendingSyncIds.includes(task.id)) {
                    console.log(`🚫 Tarefa ${task.id} ignorada na atualização remota (pendente de sincronização).`);
                    return false; // Não incluir esta atualização
                  }

                  // Filtrar tarefas privadas de outros usuários
                  const isPrivate = (task as any).private === true;
                  if (isPrivate && task.createdBy && task.createdBy !== user.id) {
                    console.log(`🔒 Tarefa privada ${task.id} ignorada (não pertence ao usuário atual).`);
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
            console.warn('⚠️ Histórico da família inválido:', familyHistory);
            return;
          }
          
          // Converter histórico da família para formato local (usar createdAt como timestamp)
          const convertedHistory: HistoryItem[] = familyHistory.map(item => {
            // Verificar se o item tem propriedades necessárias
            if (!item || typeof item !== 'object') {
              console.warn('⚠️ Item de histórico inválido:', item);
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

          console.log(`📖 ${familyHistory.length} itens do histórico da família carregados`);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar histórico da família:', error);
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

  // Função para forçar atualização completa do aplicativo
  const forceRefresh = async () => {
    console.log('🔄 Forçando atualização completa...');
    
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

          console.log(`🔄 ${familyTasks.length} tarefas da família recarregadas (merge aplicado)`);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao forçar sincronização:', error);
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
      console.log('✅ Sincronização concluída com sucesso!');
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
          console.warn('Auto-sync falhou:', e);
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
        const dataVencimento = safeToDate(task.dueDate);
        if (!dataVencimento) return; // Skip se não conseguir converter a data

        if (task.dueTime) {
          const horaVencimento = safeToDate(task.dueTime);
          if (horaVencimento) {
            dataVencimento.setHours(horaVencimento.getHours(), horaVencimento.getMinutes());
          }
        }

        const diffMinutos = (agora.getTime() - dataVencimento.getTime()) / (1000 * 60);
        const diffHoras = diffMinutos / 60;

        // Lógica inteligente para notificações baseada no tempo de atraso:
        // - Venceu há menos de 5 minutos: notificar imediatamente
        // - Venceu há 1 hora: notificar novamente
        // - Venceu há 6 horas: notificar novamente
        // - Venceu há 24 horas: notificar novamente
        // - Depois disso, notificar a cada 24 horas (mas com prioridade menor)

        let deveNotificar = false;

        if (diffMinutos >= 0 && diffMinutos <= 5) {
          // Acabou de vencer - alta prioridade
          deveNotificar = true;
        } else if (diffHoras >= 1 && diffHoras < 1.1) {
          // Venceu há exatamente 1 hora
          deveNotificar = true;
        } else if (diffHoras >= 6 && diffHoras < 6.1) {
          // Venceu há exatamente 6 horas
          deveNotificar = true;
        } else if (diffHoras >= 24 && diffHoras < 25) {
          // Venceu há exatamente 24 horas
          deveNotificar = true;
        } else if (diffHoras >= 48 && Math.floor(diffHoras) % 24 === 0 && diffHoras < 48.1) {
          // Venceu há múltiplos de 24 horas (48h, 72h, etc.) - baixa prioridade
          deveNotificar = true;
        }

        if (deveNotificar) {
          console.log(`[TaskScreen] Notificando tarefa vencida: "${task.title}" (${Math.floor(diffHoras)}h ${Math.floor(diffMinutos % 60)}min atraso)`);
          enviarNotificacaoVencimento(task);
        }
      }
    });
  };

  const enviarNotificacaoVencimento = async (task: Task) => {
    // No web, ignorar envio de notificação imediata
    if (Platform.OS === 'web') return;

    try {
      // Usar a nova função melhorada para notificações de tarefas vencidas
      const notificationId = await NotificationService.sendOverdueTaskNotification(task);

      if (notificationId) {
        console.log(`[TaskScreen] Notificação de vencimento enviada para tarefa "${task.title}":`, notificationId);
      } else {
        console.warn(`[TaskScreen] Falha ao enviar notificação de vencimento para tarefa "${task.title}"`);
      }
    } catch (e) {
      console.warn('[TaskScreen] Erro ao enviar notificação de vencimento:', e);
    }
  };
  
  // Estados para data e hora
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // Refs para web fallback (inputs nativos do navegador)
  const webDateInputRef = React.useRef<any>(null);
  const webTimeInputRef = React.useRef<any>(null);
  
  // Estados para repetição
  const [repeatType, setRepeatType] = useState<RepeatType>(RepeatType.NONE);
  const [customDays, setCustomDays] = useState<number[]>([]);

  // Calcula uma data inicial para tarefas recorrentes quando o usuário não escolhe uma data
  const getInitialDueDateForRecurrence = (rt: RepeatType, days: number[] = []): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (rt === RepeatType.DAILY) return today;
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

  const addTask = useCallback(async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Erro', 'Por favor, insira um título para a tarefa.');
      return;
    }
    if (isAddingTask) return; // Prevenir cliques múltiplos

    // Enforcement: dependente criando/atualizando tarefa de família pública precisa de permissões
    const isFamilyContext = !!currentFamily && !newTaskPrivate; // tarefa pública de família
    if (isFamilyContext && user.role === 'dependente') {
      const selfMember = familyMembers.find(m => m.id === user.id);
      const perms = (selfMember as any)?.permissions || {};
      const needed = isEditing ? 'edit' : 'create';
      if (!perms[needed]) {
        Alert.alert('Sem permissão', `Você não tem permissão para ${needed === 'create' ? 'criar' : 'editar'} tarefas da família.`);
        return;
      }
    }

    setIsAddingTask(true);

    try {
      if (isEditing && editingTaskId) {
        // Atualizar tarefa existente
        const defaultDueDateForEdit = selectedDate || (repeatType !== RepeatType.NONE ? getInitialDueDateForRecurrence(repeatType, customDays) : undefined);
        const updatedTasks = tasks.map(task => 
          task.id === editingTaskId 
            ? {
                ...task,
                title: newTaskTitle.trim(),
                description: newTaskDescription.trim(),
                category: selectedCategory,
                dueDate: defaultDueDateForEdit,
                dueTime: selectedTime,
                repeat: {
                  type: repeatType,
                  days: repeatType === RepeatType.CUSTOM ? customDays : undefined
                },
                // Subtarefas do modal
                subtasks: subtasksDraft.map(st => ({ ...st })),
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
        
        setTasks(updatedTasks);
        
        // Adicionar ID à lista de pendentes de sincronização
        setPendingSyncIds(prev => [...prev, editingTaskId]);
        console.log(`⏳ Tarefa enfileirada para sincronização: taskId=${editingTaskId}` +
          `${currentFamily ? ` familyId=${currentFamily.id}` : ''}`);

        // Salvar no cache local
        const updatedTask = updatedTasks.find(t => t.id === editingTaskId);
        if (updatedTask) {
          const remoteTask = taskToRemoteTask(updatedTask as any);
          await LocalStorageService.saveTask(remoteTask);
          // reagendar lembrete
          try {
            await NotificationService.rescheduleTaskReminder(updatedTask as any);
          } catch (e) {
            console.warn('[Notifications] rescheduleTaskReminder falhou (ignorado):', e);
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
                console.log(`👨‍👩‍👧‍👦 Tarefa atualizada no Firestore (online): taskId=${toSave.id || (res && (res as any).id)} familyId=${currentFamily.id}`);
              } else {
                // Offline: enfileirar operação com familyId
                await SyncService.addOfflineOperation(operationType, 'tasks', {
                  ...remoteTask,
                  familyId: currentFamily.id
                });
                console.log(`👨‍👩‍👧‍👦 Tarefa enfileirada (offline family): taskId=${updatedTask?.id} familyId=${currentFamily.id}`);
              }
            } catch (error) {
              console.error('❌ Erro ao sincronizar tarefa na família via Firestore, fallback local:', error);
              // Delegar fallback para FamilySyncHelper (centraliza remote-first / fallback)
              try {
                await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, operationType);
              } catch (e) {
                console.warn('Falha no fallback FamilySyncHelper.saveTaskToFamily:', e);
              }
            }
          }
          
          console.log(`📱 Tarefa atualizada e adicionada à fila de sincronização: taskId=${updatedTask?.id}` +
            `${currentFamily ? ` familyId=${currentFamily.id}` : ''}`);
        }
        
        // Adicionar ao histórico
        await addToHistory('edited', newTaskTitle.trim(), editingTaskId);
      } else {
        // Criar nova tarefa
        console.log('📝 Criando nova tarefa:', {
          title: newTaskTitle.trim(),
          selectedDate: selectedDate,
          selectedTime: selectedTime,
          repeatType: repeatType,
          customDays: customDays
        });

        const defaultDueDate = selectedDate || (repeatType !== RepeatType.NONE ? getInitialDueDateForRecurrence(repeatType, customDays) : undefined);
        
        console.log('📅 Data final calculada para nova tarefa:', {
          defaultDueDate: defaultDueDate,
          selectedTime: selectedTime
        });

        const newTask: Task = {
          id: uuidv4(), // Usar UUID para garantir ID único
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim(),
          completed: false,
          status: 'pendente' as TaskStatus,
          category: selectedCategory,
          dueDate: defaultDueDate,
          dueTime: selectedTime,
          repeat: {
            type: repeatType,
            days: repeatType === RepeatType.CUSTOM ? customDays : undefined
          },
          userId: user.id,
          createdAt: new Date(),
          // Campos de autoria
          createdBy: user.id,
          createdByName: user.name,
          // Subtarefas iniciais
          subtasks: subtasksDraft.map(st => ({ ...st }))
          // private flag será adicionada durante a conversão remota via taskToRemoteTask
        };

        console.log('✨ Nova tarefa criada:', {
          id: newTask.id,
          title: newTask.title,
          dueDate: newTask.dueDate,
          dueTime: newTask.dueTime,
          repeatType: newTask.repeat.type
        });

  const updatedTasks = [newTask, ...tasks];
        setTasks(updatedTasks);
  // agendar lembrete da nova tarefa
  try {
    await NotificationService.scheduleTaskReminder(newTask as any);
  } catch (e) {
    console.warn('[Notifications] scheduleTaskReminder falhou (ignorado):', e);
  }
        
        // Salvar no cache local
  // Incluir flag 'private' no objeto que será convertido para envio remoto
  const remoteTask = taskToRemoteTask({ ...newTask, private: newTaskPrivate } as any);
    await LocalStorageService.saveTask(remoteTask);
        
        // Adicionar à fila de sincronização (online ou offline)
  await SyncService.addOfflineOperation('create', 'tasks', remoteTask);
        
        // Se o usuário pertence a uma família e a tarefa não for privada, salvar também na família (prefer Firestore quando online)
        if (currentFamily && (remoteTask as any)?.private !== true) {
          try {
            if (!isOffline) {
              const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
              const res = await FirestoreService.saveTask(toSave);
              await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
              console.log(`👨‍👩‍👧‍👦 Nova tarefa salva no Firestore (online): taskId=${toSave.id || (res && (res as any).id)} familyId=${currentFamily.id}`);
            } else {
              await SyncService.addOfflineOperation('create', 'tasks', { ...remoteTask, familyId: currentFamily.id });
              console.log(`👨‍👩‍👧‍👦 Nova tarefa enfileirada (offline family): taskId=${remoteTask.id} familyId=${currentFamily.id}`);
            }
          } catch (error) {
            console.error('❌ Erro ao salvar tarefa na família via Firestore, delegando ao FamilySyncHelper:', error);
            try { await FamilySyncHelper.saveTaskToFamily(remoteTask, currentFamily.id, 'create'); } catch (e) { console.warn('Falha fallback saveFamilyTask', e); }
            await SyncService.addOfflineOperation('create', 'tasks', { ...remoteTask, familyId: currentFamily.id });
          }
        }
        
        console.log(`📱 Nova tarefa criada e adicionada à fila de sincronização: taskId=${remoteTask.id}` +
          `${currentFamily ? ` familyId=${currentFamily.id}` : ''}`);
        
        // Adicionar ao histórico
        await addToHistory('created', newTask.title, newTask.id);
      }
      
      // Reset form
      resetForm();
      setModalVisible(false);
      
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      Alert.alert('Erro', 'Não foi possível salvar a tarefa. Tente novamente.');
    } finally {
      setIsAddingTask(false); // Reabilitar o botão
    }
  }, [newTaskTitle, newTaskDescription, selectedCategory, selectedDate, selectedTime, repeatType, customDays, isEditing, editingTaskId, tasks, currentFamily, isOffline, newTaskPrivate]);

  const resetForm = useCallback(() => {
    setNewTaskTitle('');
    setNewTaskDescription('');
    setSelectedCategory('work');
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setRepeatType(RepeatType.NONE);
    setCustomDays([]);
    setSubtasksDraft([]);
    setNewSubtaskTitle('');
    setIsEditing(false);
    setEditingTaskId(null);
    setModalVisible(false);
  }, []);

  const editTask = useCallback((task: Task) => {
    // Enforcement: dependente só pode editar tarefa de família se possuir permission.edit
    if (user.role === 'dependente') {
      const isFamilyTask = (task as any).familyId && (task as any).private !== true;
      if (isFamilyTask) {
        const selfMember = familyMembers.find(m => m.id === user.id);
        const perms = (selfMember as any)?.permissions || {};
        if (!perms.edit) {
          Alert.alert('Sem permissão', 'Você não tem permissão para editar tarefas da família.');
          return;
        }
      }
    }
    setNewTaskTitle(task.title);
    setNewTaskDescription(task.description);
    setSelectedCategory(task.category);
    setSelectedDate(task.dueDate);
    setSelectedTime(task.dueTime);
    setRepeatType(task.repeat.type);
    setCustomDays(task.repeat.days || []);
    setSubtasksDraft((task as any).subtasks ? (task as any).subtasks.map((st: any) => ({
      id: st.id,
      title: st.title,
      done: !!st.done,
      completedById: st.completedById,
      completedByName: st.completedByName,
      completedAt: st.completedAt ? safeToDate(st.completedAt) || undefined : undefined,
    })) : []);
    setIsEditing(true);
    setEditingTaskId(task.id);
    setModalVisible(true);
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
        })));
      }
    } else if (modalVisible && !isEditing) {
      setNewTaskPrivate(false);
      setSubtasksDraft([]);
      setNewSubtaskTitle('');
    }
  }, [modalVisible, isEditing, editingTaskId]);

  // Funções para filtrar tarefas por data
  const getTodayTasks = () => {
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
  };

  const getUpcomingTasks = () => {
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
      return task.dueDate && (
        (!task.completed && isUpcoming(task.dueDate)) ||
        (task.completed && task.repeat.type !== 'none' && isUpcoming(task.dueDate))
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
  };

  const getCurrentTasks = () => {
    if (activeTab === 'today') {
      return getTodayTasks();
    } else {
      return getUpcomingTasks();
    }
  };

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
      console.log('💾 Item de histórico salvo no cache local');
    } catch (error) {
      console.error('❌ Erro ao salvar histórico no cache:', error);
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
        console.log('👨‍👩‍👧‍👦 Item adicionado ao histórico da família');
      } catch (error) {
        console.error('❌ Erro ao adicionar ao histórico da família:', error);
        
        // Se falhou salvar no Firebase, adicionar à fila de sincronização
        try {
          const toQueue = { ...historyItem, familyId: currentFamily.id } as any;
          // remover undefined defensivamente
          Object.keys(toQueue).forEach(k => (toQueue as any)[k] === undefined && delete (toQueue as any)[k]);
          await SyncService.addOfflineOperation('create', 'history', toQueue);
          console.log('📤 Item de histórico adicionado à fila de sincronização');
        } catch (syncError) {
          console.error('❌ Erro ao adicionar histórico à fila de sincronização:', syncError);
        }
      }
    } else if (!currentFamily) {
      // Se usuário não tem família, adicionar à fila para sincronização futura
      try {
        const toQueue = { ...historyItem, familyId: null } as any;
        Object.keys(toQueue).forEach(k => (toQueue as any)[k] === undefined && delete (toQueue as any)[k]);
        await SyncService.addOfflineOperation('create', 'history', toQueue);
        console.log('📤 Item de histórico adicionado à fila de sincronização (sem família)');
      } catch (syncError) {
        console.error('❌ Erro ao adicionar histórico à fila:', syncError);
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
      case 'completed': return '#007AFF';
      case 'uncompleted': return '#f39c12';
      case 'edited': return '#9b59b6';
      case 'deleted': return '#e74c3c';
      default: return '#666';
    }
  };

  const renderHistoryItem = useCallback(({ item }: ListRenderItemInfo<any>) => {
    return (
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
          <Text style={styles.historyAuthor}>
            por {item.userName} ({item.userRole === 'admin' ? 'Admin' : 'Dependente'})
          </Text>
          {item.details && (
            <Text style={styles.historyDetails}>{item.details}</Text>
          )}
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
      </View>
    );
  }, [getActionIcon, getActionColor, getActionText]);

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
    console.log('📅 onDateChange chamado:', { event, date });
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      console.log('📅 selectedDate atualizado para:', date);
    }
  };

  const onTimeChange = (event: any, time?: Date) => {
    console.log('🕐 onTimeChange chamado:', { event, time });
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
      console.log('🕐 selectedTime atualizado para:', time);
    }
  };

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
    if (!task.completed && task.repeat.type !== 'none') {
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

  const handleTaskToggle = async (task: Task) => {
    // Safety net adicional: dependente não altera diretamente
    if (user.role === 'dependente') {
      if (!task.completed) {
        await requestTaskApproval(task);
      } else {
        Alert.alert('Permissão necessária', 'Somente administradores podem reabrir tarefas.');
      }
      return;
    }
    let updatedTasks: Task[];
    
      if (!task.completed) {
      // Marcando como concluída
      if (task.repeat.type !== 'none') {
        // Tarefa recorrente: criar nova instância para a próxima ocorrência
        console.log('🔄 Calculando próxima data para tarefa recorrente:', {
          taskTitle: task.title,
          currentDate: task.dueDate,
          repeatType: task.repeat.type,
          customDays: task.repeat.days
        });
        
        const nextDate = getNextRecurrenceDate(
          task.dueDate || new Date(), 
          task.repeat.type, 
          task.repeat.days
        );
        
        console.log('📅 Próxima data calculada:', nextDate);
        
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
            console.log('🕐 Horário preservado:', {
              original: originalTime,
              next: nextDateTime
            });
          }
        }
        
        const nextTask: Task = {
          ...task,
          id: uuidv4(),
          completed: false,
          status: 'pendente',
          dueDate: nextDate,
          dueTime: nextDateTime,
          createdAt: new Date(),
          createdBy: user.id,
          createdByName: user.name,
          editedBy: user.id,
          editedByName: user.name,
          editedAt: new Date()
        };
        
        console.log('✨ Nova tarefa recorrente criada:', {
          id: nextTask.id,
          title: nextTask.title,
          dueDate: nextTask.dueDate,
          dueTime: nextTask.dueTime
        });
        
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
          console.warn('[Notifications] cancelTaskReminder falhou (ignorado):', e);
        }
        
        // Salvar nova tarefa no Firebase e na família imediatamente
            try {
            const remoteNextTask = taskToRemoteTask(nextTask as any);
          await LocalStorageService.saveTask(remoteNextTask);
          await SyncService.addOfflineOperation('create', 'tasks', remoteNextTask);
          
          // Salvar imediatamente no Firestore se online
            if (currentFamily && !isOffline) {
              try {
                const toSave = { ...remoteNextTask, familyId: currentFamily.id } as any;
                const res = await FirestoreService.saveTask(toSave);
                await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
                console.log(`👨‍👩‍👧‍👦 Próxima ocorrência recorrente salva no Firestore: taskId=${toSave.id || (res && (res as any).id)} familyId=${currentFamily.id}`);
              } catch (e) {
                console.warn('Falha ao salvar próxima ocorrência no Firestore, fallback local:', e);
                try { await FamilySyncHelper.saveTaskToFamily(remoteNextTask as any, currentFamily.id, 'create'); } catch (_) {}
                await SyncService.addOfflineOperation('create', 'tasks', { ...remoteNextTask, familyId: currentFamily.id });
              }
            } else if (currentFamily) {
            // Enfileirar como 'tasks' e incluir explicitamente familyId para que o SyncService envie para Firestore
            await SyncService.addOfflineOperation('create', 'tasks', {
              ...remoteNextTask,
              familyId: currentFamily.id,
            });
            console.log(`📱 Próxima ocorrência enfileirada (offline): taskId=${remoteNextTask.id} familyId=${currentFamily.id}`);
          }
          
          // agendar lembrete da próxima ocorrência
          try {
            await NotificationService.scheduleTaskReminder(nextTask as any);
          } catch (e) {
            console.warn('[Notifications] scheduleTaskReminder falhou (ignorado):', e);
          }
          
          console.log(`✅ Nova tarefa recorrente criada e sincronizada com sucesso: taskId=${remoteNextTask.id}` +
            `${currentFamily ? ` familyId=${currentFamily.id}` : ''}`);
        } catch (error) {
          console.error('❌ Erro ao sincronizar nova tarefa recorrente:', error);
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
          console.warn('[Notifications] cancelTaskReminder falhou (ignorado):', e);
        }
      }
    } else {
      // Desmarcando como concluída (apenas para tarefas não recorrentes)
      if (task.repeat.type === 'none') {
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
            console.warn('[Notifications] rescheduleTaskReminder falhou (ignorado):', e);
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
        await LocalStorageService.saveTask(remoteTask);
        
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
            console.log(`👨‍👩‍👧‍👦 Tarefa atualizada no Firestore: taskId=${toSave.id || (res && (res as any).id)} familyId=${currentFamily.id}`);
          } catch (error) {
            console.error('❌ Erro ao atualizar tarefa na família via Firestore, fallback local:', error);
            try { await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, operationType); } catch (e) { console.warn('Falha fallback saveFamilyTask', e); }
            await SyncService.addOfflineOperation(operationType, 'tasks', { ...remoteTask, familyId: currentFamily.id });
          }
        } else if (currentFamily) {
          await SyncService.addOfflineOperation(operationType, 'tasks', { ...remoteTask, familyId: currentFamily.id });
          console.log(`📱 Atualização enfileirada (offline): taskId=${remoteTask.id} familyId=${currentFamily.id}`);
        }
        
        console.log(`✅ Status da tarefa atualizado e sincronizado: taskId=${updatedTask.id}` +
          `${currentFamily ? ` familyId=${currentFamily.id}` : ''}`);
      } catch (error) {
        console.error('❌ Erro ao sincronizar toggle da tarefa:', error);
      }
    }
    
    // Adicionar ao histórico
    await addToHistory(
      !task.completed ? 'completed' : 'uncompleted',
      task.title,
      task.id
    );
  };

  // Persistir alterações de subtarefas feitas no modal durante edição (salvar imediatamente)
  const persistSubtasksDraftIfEditing = useCallback(async (nextDraft: Array<{ id: string; title: string; done: boolean; completedById?: string; completedByName?: string; completedAt?: Date }>) => {
    if (!isEditing || !editingTaskId) return;
    const baseTask = tasks.find(t => t.id === editingTaskId);
    if (!baseTask) return;
    const now = new Date();
    const updatedTask: Task = {
      ...baseTask,
      subtasks: nextDraft as any,
      editedBy: user.id,
      editedByName: user.name,
      editedAt: now,
    } as any;

    // Atualizar estado local imediato
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

    try {
      const remoteTask = taskToRemoteTask(updatedTask as any);
      await LocalStorageService.saveTask(remoteTask);
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
      console.error('Erro ao persistir subtarefas do modal:', e);
    }
  }, [isEditing, editingTaskId, tasks, user, currentFamily, isOffline]);

  // Alternar subtarefa (checkbox no card)
  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Dependente pode marcar subtarefa, mas a conclusão da tarefa principal pode exigir aprovação
    const now = new Date();
    const updatedTasks = tasks.map(t => {
      if (t.id !== taskId) return t;
      const updatedSubtasks = (t as any).subtasks?.map((st: any) => {
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
      return {
        ...t,
        subtasks: updatedSubtasks,
        editedBy: user.id,
        editedByName: user.name,
        editedAt: now,
      } as any;
    });

    setTasks(updatedTasks);

    const updatedTask = updatedTasks.find(t => t.id === taskId)!;
    try {
      const remoteTask = taskToRemoteTask(updatedTask as any);
      await LocalStorageService.saveTask(remoteTask);
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
      console.error('Erro ao sincronizar subtarefa:', e);
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
      console.warn('Erro ao processar conclusão automática por subtarefas:', e);
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
      await LocalStorageService.saveTask(remoteTask);
      await SyncService.addOfflineOperation('update', 'tasks', remoteTask);
      if (currentFamily && !isOffline) {
        try {
          const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
          const res = await FirestoreService.saveTask(toSave);
          await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
        } catch (e) {
          console.warn('Falha ao salvar approval/task pending no Firestore, delegando ao FamilySyncHelper:', e);
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
      console.error('❌ Erro ao persistir status pendente_aprovacao:', err);
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
      console.warn('[Notifications] cancelTaskReminder falhou (ignorado):', e);
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
        await LocalStorageService.saveTask(remoteTask);
        await SyncService.addOfflineOperation('update', 'tasks', remoteTask);
        if (currentFamily && !isOffline) {
          try {
            const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
            const res = await FirestoreService.saveTask(toSave);
            await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
            } catch (e) {
              console.warn('Falha ao salvar aprovação/tarefa aprovada no Firestore, delegando ao FamilySyncHelper:', e);
              try { await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, 'update'); } catch (_) {}
              await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
            }
        }
      }
    } catch (e) {
      console.error('Erro ao persistir aprovação/tarefa aprovada:', e);
    }

  // Remover notificação e a própria aprovação (local e remoto)
  setNotifications(notifications.filter(n => n.taskId !== approval.taskId));
    setApprovals(prev => prev.filter(a => a.id !== approvalId));
    try {
      await LocalStorageService.removeFromCache('approvals' as any, approvalId);
      await SyncService.addOfflineOperation('delete', 'approvals', { id: approvalId });
    } catch (e) {
      console.error('Erro ao remover aprovação após aprovar:', e);
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
        console.warn('[Notifications] rescheduleTaskReminder falhou (ignorado):', e);
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
        await LocalStorageService.saveTask(remoteTask);
        await SyncService.addOfflineOperation('update', 'tasks', remoteTask);
        if (currentFamily && !isOffline) {
          try {
            const toSave = { ...remoteTask, familyId: currentFamily.id } as any;
            const res = await FirestoreService.saveTask(toSave);
            await LocalStorageService.saveTask({ ...toSave, id: toSave.id || (res && (res as any).id) } as any);
          } catch (e) {
            console.warn('Falha ao salvar aprovação/tarefa rejeitada no Firestore, delegando ao FamilySyncHelper:', e);
            try { await FamilySyncHelper.saveTaskToFamily(remoteTask as any, currentFamily.id, 'update'); } catch (_) {}
            await SyncService.addOfflineOperation('update', 'tasks', { ...remoteTask, familyId: currentFamily.id });
          }
        }
      }
    } catch (e) {
      console.error('Erro ao persistir aprovação/tarefa rejeitada:', e);
    }

  // Remover notificação e a própria aprovação (local e remoto)
  setNotifications(notifications.filter(n => n.taskId !== approval.taskId));
    setApprovals(prev => prev.filter(a => a.id !== approvalId));
    try {
      await LocalStorageService.removeFromCache('approvals' as any, approvalId);
      await SyncService.addOfflineOperation('delete', 'approvals', { id: approvalId });
    } catch (e) {
      console.error('Erro ao remover aprovação após rejeitar:', e);
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
      console.error('Erro ao resolver solicitação de admin:', e);
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
      console.error('Erro ao copiar código:', error);
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
                    try { await onUserRoleChange(selfAfter.role); } catch {}
                  }
                }
              }
              
              Alert.alert('Sucesso', `${member.name} agora é ${roleNames[newRole]}.`);
            } catch (error) {
              console.error('Erro ao alterar função do membro:', error);
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
      console.error('Erro ao atualizar nome da família:', error);
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
      console.log('⚠️ Usuário sem família - ativando modo de criação');
      setIsCreatingFamilyMode(true);
      setNewFamilyNameInput('');
      setFamilyModalVisible(true);
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
            if (onUserRoleChange) await onUserRoleChange(myMember.role);
          } catch (e) {
            console.warn('Falha ao sincronizar role do usuário ao abrir Gerenciar Família:', e);
          }
        }
        setIsCreatingFamilyMode(false);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da família:', error);
    }
    
    setFamilyModalVisible(true);
  };

  const handleCreateFamilyFromModal = async () => {
    if (!newFamilyNameInput.trim()) {
      Alert.alert('Erro', 'Por favor, insira um nome para a família');
      return;
    }

    setIsCreatingFamily(true);
    try {
      console.log('🏠 Criando nova família pelo modal:', newFamilyNameInput);
      
      const newFamily = await familyService.createFamily(newFamilyNameInput.trim(), {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'admin' as UserRole,
        isGuest: false,
        joinedAt: new Date(),
      });

      console.log('✅ Família criada com sucesso:', newFamily.id);
      
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
              console.log('✅ Modal atualizado para modo de gerenciamento');
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Erro ao criar família:', error);
      Alert.alert('Erro', 'Não foi possível criar a família. Verifique sua conexão e tente novamente.');
    } finally {
      setIsCreatingFamily(false);
    }
  };

  const deleteTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const isFamilyTask = (task as any).familyId && (task as any).private !== true;
    if (user.role === 'dependente' && isFamilyTask) {
      const selfMember = familyMembers.find(m => m.id === user.id);
      const perms = (selfMember as any)?.permissions || {};
      if (!perms.delete) {
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
              // Mostrar loading enquanto aguardamos sincronização de exclusão (apenas se online)
              if (!isOffline) setGlobalLoading(true);
              // Atualizar UI imediatamente
              setTasks(prev => prev.filter(t => t.id !== taskId));
              await NotificationService.cancelTaskReminder(taskId).catch(()=>{});

              // Usar SyncService para executar remotamente quando online ou enfileirar quando offline
              // Inclui familyId para respeitar lógica de famílias locais
              const opData: any = { id: taskId, familyId: (task as any).familyId ?? null };
              await SyncService.addOfflineOperation('delete', 'tasks', opData);

              // Remover do cache local sempre
              await LocalStorageService.removeFromCache('tasks', taskId);

              // Histórico
              await addToHistory('deleted', task.title, taskId);
            } catch (error) {
              console.error('Erro ao deletar tarefa:', error);
              Alert.alert('Erro', 'Não foi possível deletar a tarefa. Tente novamente.');
            } finally {
              setGlobalLoading(false);
            }
          },
          style: 'destructive'
        },
      ]
    );
  }, [tasks, isOffline, user.role]);

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
          onPress: () => {
            const updatedMembers = familyMembers.filter(m => m.id !== memberId);
            setFamilyMembers(updatedMembers);
            const updatedTasks = tasks.filter(t => t.userId !== memberId);
            setTasks(updatedTasks);
            Alert.alert('Sucesso', `${member.name} foi removido da família.`);
          }
        }
      ]
    );
  }, [familyMembers, user, tasks]);

  const handleSettings = () => {
    setSettingsModalVisible(true);
  };

  const handleUpdateData = () => {
    setSettingsModalVisible(false);
    forceRefresh();
  };

  const handleSystemInfo = () => {
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
  };

  const handleLogout = async () => {
    // Chamar diretamente o logout sem alerta duplicado
    // O alerta será exibido no App.tsx
    if (onLogout) {
      await onLogout();
    }
  };

  const renderTask = ({ item }: { item: Task }) => {
    const categoryConfig = getCategoryConfig(item.category);
    const isOverdue = isTaskOverdue(item.dueDate, item.dueTime, item.completed);
    const isRecurring = item.repeat.type !== 'none';
    const canComplete = isRecurringTaskCompletable(item.dueDate, isRecurring);
    const isPendingRecurring = isRecurring && !canComplete && !item.completed;
    
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
          isPendingRecurring && styles.taskPendingRecurring
        ]}
      >
        {/* Header da Categoria - Topo do Card */}
        <View style={[styles.categoryHeader, { backgroundColor: categoryConfig.bgColor }] }>
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
          {/* Indicador de tarefa privada (direita) */}
          {((item as any).private === true) && item.createdBy === user.id && (
            <View style={styles.privateIndicatorRight}>
              <Ionicons name="lock-closed" size={12} color="#666" />
              <Text style={styles.privateIndicatorRightText}>Privado</Text>
            </View>
          )}
          {/* Indicador de tarefa vencida */}
          {isOverdue && (
            <View style={styles.overdueIndicator}>
              <Ionicons name="warning" size={14} color="#e74c3c" />
              <Text style={styles.overdueLabel}>VENCIDA</Text>
            </View>
          )}
          {/* Indicador de tarefa recorrente pendente */}
          {isPendingRecurring && (
            <View style={styles.pendingRecurringIndicator}>
              <Ionicons name="time" size={14} color="#f39c12" />
              <Text style={styles.pendingRecurringLabel}>AGENDADA</Text>
            </View>
          )}
        </View>

        {/* Conteúdo Principal da Tarefa */}
        <View style={styles.taskCardHeader}>
          <View style={styles.taskMainContent}>
            <Pressable
              onPress={() => toggleTask(item.id)}
              style={styles.checkboxContainer}
              disabled={isPendingRecurring}
            >
              <View style={[
                styles.checkbox,
                item.completed && styles.checkboxCompleted,
                isPendingRecurring && styles.checkboxDisabled
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
          </View>
        </View>

        {/* Informações de Agendamento */}
        <View style={styles.scheduleInfo}>
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

          {/* Botões de ação (admin sempre; dependente somente com permissões) */}
          {(user.role === 'admin' || user.role === 'dependente') && (
            (() => {
              const isFamilyTask = (item as any).familyId && (item as any).private !== true;
              const selfMember = familyMembers.find(m => m.id === user.id);
              const perms = (selfMember as any)?.permissions || {};
              const canEdit = user.role === 'admin' || (user.role === 'dependente' && isFamilyTask && perms.edit);
              const canDelete = user.role === 'admin' || (user.role === 'dependente' && isFamilyTask && perms.delete);
              return (
                <View style={styles.scheduleActions}>
                  <Pressable
                    onPress={() => canEdit && editTask(item)}
                    disabled={!canEdit}
                    style={[styles.scheduleActionButton, !canEdit && { opacity: 0.35 }]}
                  >
                    <Ionicons name="pencil-outline" size={16} color={canEdit ? '#007AFF' : '#999'} />
                  </Pressable>
                  <Pressable
                    onPress={() => canDelete && deleteTask(item.id)}
                    disabled={!canDelete}
                    style={[styles.scheduleActionButton, !canDelete && { opacity: 0.35 }]}
                  >
                    <Ionicons name="trash-outline" size={16} color={canDelete ? '#e74c3c' : '#bbb'} />
                  </Pressable>
                </View>
              );
            })()
          )}
        </View>

        {/* Subtarefas no card */}
        {Array.isArray((item as any).subtasks) && (item as any).subtasks.length > 0 && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 8, gap: 6 }}>
            {(item as any).subtasks.map((st: any) => (
              <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable
                  onPress={() => toggleSubtask(item.id, st.id)}
                  style={[styles.checkbox, st.done && styles.checkboxCompleted]}
                >
                  {st.done && <Ionicons name="checkmark" size={16} color="#fff" />}
                </Pressable>
                <Text style={[styles.taskDescription, st.done && styles.taskDescriptionCompleted, { flex: 1 }]}>
                  {st.title || 'Subtarefa'}
                </Text>
                {st.done && st.completedByName && (
                  <Text style={[styles.authorshipText, { fontSize: 10 }]}>
                    {`por ${st.completedByName}`}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Indicador de status de aprovação */}
        {item.status === 'pendente_aprovacao' && (
          <View style={styles.approvalStatus}>
            <Ionicons name="hourglass-outline" size={16} color="#ff9800" />
            <Text style={styles.approvalStatusText}>Pendente Aprovação</Text>
          </View>
        )}
        {item.status === 'aprovada' && (
          <View style={[styles.approvalStatus, styles.approvalStatusApproved]}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={[styles.approvalStatusText, styles.approvalStatusTextApproved]}>Aprovada</Text>
          </View>
        )}
        {item.status === 'rejeitada' && (
          <View style={[styles.approvalStatus, styles.approvalStatusRejected]}>
            <Ionicons name="close-circle" size={16} color="#e74c3c" />
            <Text style={[styles.approvalStatusText, styles.approvalStatusTextRejected]}>Rejeitada</Text>
          </View>
        )}

        {/* Informações de Autoria - Compactas */}
        <View style={styles.authorshipInfo}>
          <View style={styles.authorshipRow}>
            <Ionicons name="person-outline" size={12} color="#999" />
            <Text style={styles.authorshipText}>
              {`${sanitizedCreatedByName || 'Usuário'} • ${formatDate(item.createdAt)}`}
            </Text>
          </View>
          {item.editedBy && sanitizedEditedByName && (
            <View style={styles.authorshipRow}>
              <Ionicons name="pencil-outline" size={12} color="#999" />
              <Text style={styles.authorshipText}>
                {`Editado por ${sanitizedEditedByName}${item.editedAt ? ` • ${formatDate(item.editedAt)}` : ''}`}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <Header 
          userName={user?.name || 'Usuário'}
          userImage={user?.picture}
          userRole={user?.role}
          familyName={currentFamily?.name}
          familyId={currentFamily?.id}
          onUserNameChange={onUserNameChange}
          onUserImageChange={onUserImageChange}
          onUserRoleChange={onUserRoleChange}
          onSettings={handleSettings}
          onHistory={() => setHistoryModalVisible(true)}
          onInfo={() => setSettingsModalVisible(true)}
          onLogout={handleLogout}
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
          onJoinFamilyByCode={async (code: string) => {
            try {
              if (!user) return;
              const newFamily = await familyService.joinFamily(code, user);
              setCurrentFamily(newFamily);
              // recarregar tarefas da nova família
              const familyTasks = await familyService.getFamilyTasks(newFamily.id, user.id);
              const convertedTasks: Task[] = familyTasks.map(remoteTaskToTask);
              setTasks(convertedTasks);
              // atualizar lista de membros
              setFamilyMembers(newFamily.members);
              // Sincronizar papel do usuário com a família (evitar ficar "admin" por engano)
              const myMember = newFamily.members.find(m => m.id === user.id);
              if (myMember && myMember.role && myMember.role !== user.role) {
                try {
                  if (onUserRoleChange) await onUserRoleChange(myMember.role);
                } catch (e) {
                  console.warn('Falha ao sincronizar role do usuário após entrar na família:', e);
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
                  console.warn('Falha ao criar solicitação de admin:', e);
                }
              }
              // histórico local
              await addToHistory('created', 'Entrada em nova família', '');
            } catch (e) {
              console.error('Erro ao entrar na família por código:', e);
              throw e;
            }
          }}
          syncStatus={{
            hasError: syncStatus.hasError,
            isOnline: connectivityState.isConnected
          }}
        />
        
        {/* Indicador de Status de Conectividade / Sincronização */}
        {(isOffline || syncStatus.pendingOperations > 0 || syncStatus.isSyncing) && (
          <Pressable 
            style={styles.connectivityIndicator}
            onPress={handleUpdateData}
            disabled={syncStatus.isSyncing}
          >
            <View style={styles.connectivityContent}>
              <Ionicons 
                name={isOffline ? "cloud-offline" : "sync"} 
                size={16} 
                color={isOffline ? "#ff6b6b" : "#4CAF50"} 
              />
              <Text style={[styles.connectivityText, { color: isOffline ? "#ff6b6b" : "#4CAF50" }]}>
                {isOffline 
                  ? `Modo Offline` 
                  : `Sincronizando...`}
              </Text>
              {syncStatus.isSyncing && (
                <View style={styles.syncingIndicator}>
                  <Text style={styles.syncingDot}>•</Text>
                </View>
              )}
              {!syncStatus.isSyncing && !isOffline && (
                <Ionicons 
                  name="refresh" 
                  size={14} 
                  color={isOffline ? "#ff6b6b" : "#4CAF50"} 
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>
          </Pressable>
        )}
        
        <PanGestureHandler
          onGestureEvent={onSwipeGestureEvent}
            onHandlerStateChange={handleSwipeGesture}
          activeOffsetX={[-10, 10]} // mais responsivo
          failOffsetY={[-10, 10]}
        >
          <Animated.View style={[styles.content, { opacity: tabFade }] }>

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
          <ScrollView
            style={styles.taskList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            contentContainerStyle={styles.taskListContent}
          >
            {getCurrentTasks().map((task) => (
              <View key={task.id}>
                {renderTask({ item: task })}
              </View>
            ))}
          </ScrollView>
        )}
          </Animated.View>
        </PanGestureHandler>

      {/* Container dos botões flutuantes */}
      <View style={styles.fabContainer}>
        {/* Botão Atualizar Dados (novo) */}
        <Pressable 
          style={({ pressed }) => [
            styles.filterFab,
            styles.updateFab,
            pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
          ]}
          onPress={handleUpdateData}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', borderless: true }}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
        </Pressable>
        {/* Botão de Filtro */}
        <Pressable 
          style={({ pressed }) => [
            styles.filterFab,
            pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }
          ]}
          onPress={() => setFilterDropdownVisible(!filterDropdownVisible)}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', borderless: true }}
        >
          <Ionicons name="filter" size={24} color="#fff" />
        </Pressable>

        {/* Botão de Criar Tarefa */}
        <Pressable 
          style={({ pressed }) => [
            styles.fab,
            pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }
          ]}
          onPress={() => setModalVisible(true)}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', borderless: true }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      </View>

      {/* Dropdown de Filtros - posicionado para abrir à esquerda */}
      {filterDropdownVisible && (
        <>
          {/* Overlay para fechar dropdown */}
          <Pressable
            style={styles.dropdownOverlay}
            onPress={() => setFilterDropdownVisible(false)}
            pointerEvents={filterDropdownVisible ? 'auto' : 'none'}
          />
          
          <View style={styles.filterDropdownMenuFloating} pointerEvents="auto">
            <ScrollView 
              style={{ maxHeight: 280 }} 
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
                  onLongPress={() => !category.isDefault && deleteCategory(category.id)}
                >
                  <Ionicons 
                    name={category.icon as any} 
                    size={16} 
                    color={filterCategory === category.id ? '#007AFF' : category.color} 
                  />
                  <Text style={[
                    styles.filterDropdownItemText,
                    filterCategory === category.id && styles.filterDropdownItemTextActive
                  ]}>
                    {category.name}
                  </Text>
                  {filterCategory === category.id && (
                    <Ionicons name="checkmark" size={16} color="#007AFF" />
                  )}
                </Pressable>
              ))}
              
              <View style={styles.filterDropdownSeparator} />
              
              <Pressable
                style={styles.filterDropdownItem}
                onPress={() => {
                  setCategoryModalVisible(true);
                  setFilterDropdownVisible(false);
                }}
              >
                <Ionicons name="add-circle-outline" size={16} color="#007AFF" />
                <Text style={styles.filterDropdownItemText}>Nova Categoria</Text>
              </Pressable>
            </ScrollView>
          </View>
        </>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          if (isAddingTask) return; // bloquear fechamento durante salvamento
          setModalVisible(false);
        }}
      >
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</Text>
                <Pressable onPress={resetForm} disabled={isAddingTask}>
                  <Ionicons name="close" size={24} color="#666" />
                </Pressable>
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
              </ScrollView>
            </View>

            {/* Seleção de Data e Hora */}
            <Text style={styles.categoryLabel}>Agendamento:</Text>
            
            <View style={[
              styles.dateTimeContainer,
              Platform.OS === 'web' && styles.dateTimeContainerWeb
            ]}>
              <Pressable 
                style={[
                  styles.dateTimeButton,
                  Platform.OS === 'web' && styles.dateTimeButtonWeb
                ]}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    const el = webDateInputRef.current as any;
                    if (el) {
                      if (typeof el.showPicker === 'function') el.showPicker();
                      else if (typeof el.click === 'function') el.click();
                    }
                  } else {
                    setShowDatePicker(true);
                  }
                }}
              >
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.dateTimeButtonText}>
                  {selectedDate ? formatDate(selectedDate) : 'Selecionar data'}
                </Text>
              </Pressable>
              
              <Pressable 
                style={[
                  styles.dateTimeButton,
                  Platform.OS === 'web' && styles.dateTimeButtonWeb
                ]}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    const el = webTimeInputRef.current as any;
                    if (el) {
                      if (typeof el.showPicker === 'function') el.showPicker();
                      else if (typeof el.click === 'function') el.click();
                    }
                  } else {
                    setShowTimePicker(true);
                  }
                }}
              >
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.dateTimeButtonText}>
                  {selectedTime ? formatTime(selectedTime) : 'Selecionar hora'}
                </Text>
              </Pressable>
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
                <Pressable
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
                </Pressable>
              ))}
            </View>

            {/* Seleção de dias customizados */}
            {repeatType === RepeatType.CUSTOM && (
              <View style={styles.customDaysContainer}>
                <Text style={styles.customDaysLabel}>Selecione os dias:</Text>
                <View style={styles.customDaysSelector}>
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                    <Pressable
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
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Subtarefas */}
            <Text style={[styles.categoryLabel, { marginTop: 12 }]}>Subtarefas:</Text>
            {subtasksDraft.length > 0 && (
              <View style={{ gap: 8, marginBottom: 8 }}>
                {subtasksDraft.map((st, idx) => (
                  <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable
                      onPress={() => {
                        setSubtasksDraft(prev => {
                          const next = prev.map(s => s.id === st.id ? { ...s, done: !s.done } : s);
                          persistSubtasksDraftIfEditing(next);
                          return next;
                        });
                      }}
                      style={[styles.checkbox, st.done && styles.checkboxCompleted]}
                    >
                      {st.done && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </Pressable>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder={`Subtarefa ${idx + 1}`}
                      value={st.title}
                      onChangeText={(txt) => setSubtasksDraft(prev => {
                        const next = prev.map(s => s.id === st.id ? { ...s, title: txt } : s);
                        // Não persistimos a cada digitação para evitar flood; persistiremos ao sair/salvar.
                        return next;
                      })}
                    />
                    <Pressable onPress={() => setSubtasksDraft(prev => {
                        const next = prev.filter(s => s.id !== st.id);
                        persistSubtasksDraftIfEditing(next);
                        return next;
                      })}
                      style={[styles.scheduleActionButton]}
                    >
                      <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Adicionar subtarefa"
                value={newSubtaskTitle}
                onChangeText={setNewSubtaskTitle}
              />
              <Pressable
                onPress={() => {
                  const title = newSubtaskTitle.trim();
                  if (!title) return;
                  setSubtasksDraft(prev => {
                    const next = [...prev, { id: uuidv4(), title, done: false }];
                    persistSubtasksDraftIfEditing(next);
                    return next;
                  });
                  setNewSubtaskTitle('');
                }}
                style={[styles.scheduleActionButton]}
              >
                <Ionicons name="add" size={18} color="#007AFF" />
              </Pressable>
            </View>
            
            {/* Toggle Privado */}
            <View style={styles.privateToggleContainer}>
              <Pressable
                style={[styles.privateToggleButton, newTaskPrivate && styles.privateToggleButtonActive]}
                onPress={() => setNewTaskPrivate(prev => !prev)}
              >
                <Text style={[styles.privateToggleText, newTaskPrivate && styles.privateToggleTextActive]}>Privado</Text>
                {newTaskPrivate && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </Pressable>
              <Text style={styles.privateHint}>Apenas você verá esta tarefa na família</Text>
            </View>
              </ScrollView>

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
              <Pressable onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
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
                    size={20} 
                    color={selectedIcon === icon ? '#007AFF' : '#666'} 
                  />
                </Pressable>
              ))}
            </View>

            <Text style={styles.categoryLabel}>Cor:</Text>
            <View style={styles.colorSelectorContainer}>
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
              <Pressable 
                style={[styles.button, styles.cancelButton]}
                onPress={() => setCategoryModalVisible(false)}
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
      </Modal>

      {/* Date/Time pickers (mobile nativo) */}
      {Platform.OS !== 'web' && (
        <>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={selectedTime || new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              is24Hour={true}
            />
          )}
        </>
      )}

      {/* Fallback Web: inputs nativos ocultos */}
      {Platform.OS === 'web' && (
        <View style={{ height: 0, width: 0, overflow: 'hidden' }}>
          <input
            ref={webDateInputRef}
            type="date"
            onChange={(e: any) => {
              const val = e?.target?.value as string;
              console.log('🌐 Web date input onChange:', val);
              if (val) {
                // val: YYYY-MM-DD
                const [y, m, d] = val.split('-').map((v) => parseInt(v, 10));
                if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
                  setSelectedDate(dt);
                  console.log('🌐 Web selectedDate atualizado para:', dt);
                }
              }
            }}
            min={(() => {
              const now = new Date();
              const yyyy = now.getFullYear();
              const mm = String(now.getMonth() + 1).padStart(2, '0');
              const dd = String(now.getDate()).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
            })()}
          />
          <input
            ref={webTimeInputRef}
            type="time"
            onChange={(e: any) => {
              const val = e?.target?.value as string; // HH:MM
              console.log('🌐 Web time input onChange:', val);
              if (val) {
                const [hh, mm] = val.split(':').map((v) => parseInt(v, 10));
                if (!isNaN(hh) && !isNaN(mm)) {
                  // basear em selectedDate ou hoje
                  const base = selectedDate ? new Date(selectedDate) : new Date();
                  base.setHours(hh, mm, 0, 0);
                  setSelectedTime(new Date(base));
                  console.log('🌐 Web selectedTime atualizado para:', new Date(base));
                }
              }
            }}
            step={60} // minutos
          />
        </View>
      )}

      {/* Modal de Manual e Informações */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
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
              <Text style={styles.manualListItem}>• <Ionicons name="person-circle" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Foto do Perfil:</Text> Toque na foto para alterar sua imagem de perfil. Você pode escolher uma foto da galeria ou tirar uma nova.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="pencil" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Nome:</Text> Toque no nome para editá-lo. Digite seu nome e confirme para salvar.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="settings" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Menu (Configuracoes):</Text> Acesso às configurações, histórico, manual e logout.</Text>

              <Text style={styles.manualSubtitle}>🔄 Botões Flutuantes</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="refresh" size={16} color="#28a745" /> <Text style={{fontWeight: '600'}}>Atualizar (Verde):</Text> Sincroniza os dados com o servidor. Use quando notar que as tarefas não estão atualizando.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="filter" size={16} color="#6c757d" /> <Text style={{fontWeight: '600'}}>Filtros (Cinza):</Text> Filtra tarefas por categoria. Toque para abrir menu de filtros e selecione a categoria desejada.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="add" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Criar Tarefa (Azul):</Text> Abre o modal para criar uma nova tarefa com título, descrição, categoria, data/hora e recorrência.</Text>

              <Text style={styles.manualSubtitle}>📋 Funcionamento das Tarefas</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="create" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Criando Tarefas:</Text> Use o botão + para criar. Escolha categoria, defina data/hora, configure recorrência e marque como privada se desejar.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="checkmark-circle" size={16} color="#4CAF50" /> <Text style={{fontWeight: '600'}}>Concluindo Tarefas:</Text> Toque no círculo da tarefa para marcar como concluída. Dependentes precisam de aprovação do admin.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="pencil" size={16} color="#FF9500" /> <Text style={{fontWeight: '600'}}>Editando Tarefas:</Text> Toque na tarefa para abrir detalhes e editar. Só o criador pode editar suas tarefas.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="repeat" size={16} color="#9C27B0" /> <Text style={{fontWeight: '600'}}>Tarefas Recorrentes:</Text> Configure para repetir diariamente, fins de semana ou dias específicos da semana.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="lock-closed" size={16} color="#666" /> <Text style={{fontWeight: '600'}}>Tarefas Privadas:</Text> Visíveis apenas para o criador. Outros membros da família não as verão.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="notifications" size={16} color="#e74c3c" /> <Text style={{fontWeight: '600'}}>Aprovações:</Text> Admins recebem notificações na campainha para aprovar conclusões de dependentes.</Text>

              <Text style={styles.manualSubtitle}>👨‍👩‍👧‍👦 Gerenciar Família</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="pencil" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Alterar Nome:</Text> Apenas admins podem editar o nome da família através do menu de configurações.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="people" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Ver Membros:</Text> Lista todos os membros com foto, nome, função e data de entrada.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="swap-horizontal" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Alterar Funções:</Text> Admins podem promover dependentes a administradores ou reverter.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="key" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Código de Convite:</Text> Código único para convidar novos membros. Copie e compartilhe com quem quiser adicionar.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="trash" size={16} color="#e74c3c" /> <Text style={{fontWeight: '600'}}>Remover Membros:</Text> Admins podem remover membros da família (exceto si mesmos).</Text>

              <Text style={styles.manualSubtitle}>🚪 Entrar em Outra Família</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="enter" size={16} color="#FF9500" /> <Text style={{fontWeight: '600'}}>Como Entrar:</Text> Use o código de convite fornecido pelo administrador da família que você deseja entrar.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="person" size={16} color="#34C759" /> <Text style={{fontWeight: '600'}}>Função Inicial:</Text> Novos membros entram como dependentes. Apenas admins podem alterar funções posteriormente.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="checkmark" size={16} color="#4CAF50" /> <Text style={{fontWeight: '600'}}>Confirmação:</Text> Após inserir o código válido, você será adicionado à família e poderá ver suas tarefas.</Text>

              <Text style={styles.manualSubtitle}>📜 Histórico</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="time" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Acesso:</Text> Acesse através do menu de configurações, opção Histórico.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="list" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Conteúdo:</Text> Mostra todas as ações realizadas nas tarefas nos últimos 7 dias.</Text>
              <Text style={styles.manualListItem}>• <Ionicons name="information-circle" size={16} color="#007AFF" /> <Text style={{fontWeight: '600'}}>Detalhes:</Text> Inclui quem criou/editou/concluiu tarefas, com data e hora de cada ação.</Text>

              <Text style={styles.manualSubtitle}>💡 Dicas Rápidas</Text>
              <Text style={styles.manualListItem}>• Navegação: Use as abas "Hoje" e "Próximas" para alternar entre tarefas do dia e futuras.</Text>
              <Text style={styles.manualListItem}>• Categorias: Filtre tarefas por categoria usando o botão de filtro flutuante.</Text>
              <Text style={styles.manualListItem}>• Notificações: Permita notificações no dispositivo para receber lembretes de tarefas.</Text>
              <Text style={styles.manualListItem}>• Privacidade: Tarefas privadas são visíveis apenas para seu criador.</Text>
            </ScrollView>

            <Pressable
              style={[styles.closeButton, styles.closeButtonFixed]}
              onPress={() => setSettingsModalVisible(false)}
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
            <SafeAreaView style={styles.historyModalSafeArea}>
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
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 }}>
                    Pedidos de promoção a Admin {adminRoleRequests.length > 0 ? `(${adminRoleRequests.length})` : ''}
                  </Text>
                  {adminRoleRequests.length === 0 ? (
                    <Text style={{ color: '#666' }}>Nenhum pedido de promoção pendente.</Text>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {adminRoleRequests.map((req: any) => (
                        <View key={req.id} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#eee' }}>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#333' }}>{req.requesterName}</Text>
                          <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>pediu para se tornar administrador</Text>
                          <Text style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
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
              style={[styles.closeButton, styles.closeButtonFixed]}
              onPress={() => setApprovalModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de Gerenciamento de Família */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={familyModalVisible}
        onRequestClose={() => {
          if (isCreatingFamily || isSavingFamilyName) return; // bloquear enquanto salvando/criando
          setFamilyModalVisible(false);
          setIsCreatingFamilyMode(false);
          setNewFamilyNameInput('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.familyModalContent]}>
            <View style={styles.familyModalHeader}>
              <Text style={styles.modalTitle}>
                {isCreatingFamilyMode ? 'Criar Família' : 'Gerenciar Família'}
              </Text>
            </View>

            {isCreatingFamilyMode ? (
              /* Interface de Criação de Família */
              <ScrollView style={styles.familyContent} contentContainerStyle={styles.familyContentContainer}>
                <View style={styles.familySection}>
                  <Ionicons name="people" size={60} color="#007AFF" style={styles.createFamilyIcon} />
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

                  <View style={styles.createFamilyNote}>
                    <Ionicons name="information-circle" size={20} color="#666" />
                    <Text style={styles.createFamilyNoteText}>
                      Após criar a família, você receberá um código para compartilhar com outros membros.
                    </Text>
                  </View>
                </View>
              </ScrollView>
            ) : (
              /* Interface de Gerenciamento de Família */
              <ScrollView style={styles.familyContent} contentContainerStyle={styles.familyContentContainer}>
                {/* Seção do Nome da Família */}
                <View style={[styles.familySection, styles.familyCard]}>
                  <Text style={styles.familySectionTitle}>Nome da Família</Text>
                  
                  {editingFamilyName ? (
                    <View style={styles.editFamilyNameContainer}>
                      <TextInput
                        style={styles.editFamilyNameInput}
                        value={newFamilyName}
                        onChangeText={setNewFamilyName}
                        placeholder="Digite o nome da família"
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
                          <Ionicons name="pencil" size={16} color="#007AFF" />
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>

                {/* Seção do Código da Família */}
                <View style={[styles.familySection, styles.familyCard]}>
                  <Text style={styles.familySectionTitle}>Código da Família</Text>
                  <Text style={styles.familySectionSubtitle}>
                    Use este código para convidar novos membros
                  </Text>
                  
                  <View style={styles.inviteCodeContainer}>
                    <Text style={styles.inviteCodeLabel}>Código:</Text>
                    <View style={styles.inviteCodeBox}>
                      <Text style={styles.inviteCodeText}>
                        {currentFamily?.inviteCode || 'Código não disponível'}
                      </Text>
                      <Pressable
                        onPress={copyFamilyCode}
                        style={styles.copyButton}
                      >
                        <Ionicons name="copy" size={18} color="#fff" />
                      </Pressable>
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
                </View>

                {/* Seção de Membros */}
                <View style={[styles.familySection, styles.familyCard]}>
                  <Text style={styles.familySectionTitle}>Membros da Família</Text>
                  
                  {familyMembers.map(member => (
                    <View key={member.id} style={styles.familyMemberCard}>
                      <View style={styles.memberAvatarColumn}>
                        <View style={styles.memberAvatar}>
                          {member.picture ? (
                            <Image source={{ uri: member.picture }} style={styles.memberAvatarImage} />
                          ) : (
                            <Ionicons name="person" size={20} color="#666" />
                          )}
                        </View>
                      </View>
                      <View style={styles.memberDetailsColumn}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        <View style={styles.memberRole}>
                          <Ionicons 
                            name={member.role === 'admin' ? 'shield-checkmark' : 'person'} 
                            size={14} 
                            color={member.role === 'admin' ? '#007AFF' : '#666'} 
                          />
                          <Text style={[
                            styles.memberRoleText,
                            member.role === 'admin' && styles.memberRoleAdmin
                          ]}>
                            {member.role === 'admin' ? 'Administrador' : 'Dependente'}
                          </Text>
                        </View>
                        {member.email && (
                          <Text style={styles.memberEmail}>{member.email}</Text>
                        )}
                        <Text style={styles.memberJoinDate}>
                          Entrou em: {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('pt-BR') : 'Data não disponível'}
                        </Text>
                        {member.id !== user.id && user.role === 'admin' && (
                          <View style={styles.memberActions}>
                            <Pressable
                              onPress={() => changeMemberRole(member.id)}
                              style={styles.changeMemberRoleButton}
                            >
                              <Ionicons 
                                name="swap-horizontal" 
                                size={16} 
                                color="#007AFF" 
                              />
                              <Text style={styles.changeMemberRoleButtonText}>
                                {member.role === 'admin' ? 'Tornar Dependente' : 'Tornar Admin'}
                              </Text>
                            </Pressable>
                            
                            <Pressable
                              onPress={() => removeFamilyMember(member.id)}
                              style={styles.removeMemberButton}
                            >
                              <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                            </Pressable>
                          </View>
                        )}
                        {user.role === 'admin' && member.id !== user.id && (
                          <View style={styles.permissionsContainer}>
                            <Text style={styles.permissionsTitle}>Permissões</Text>
                            <View style={styles.permissionsRow}>
                              {['create','edit','delete'].map(key => {
                                const labelMap: any = { create: 'Criar', edit: 'Editar', delete: 'Excluir' };
                                const has = !!(member as any).permissions?.[key];
                                return (
                                  <Pressable
                                    key={key}
                                    style={[styles.permissionChip, has && styles.permissionChipActive]}
                                    onPress={async () => {
                                      try {
                                        const newValue = !has;
                                        // Montar novo objeto de permissões local
                                        const updatedPerms = { ...(member as any).permissions };
                                        if (newValue) {
                                          updatedPerms[key] = true;
                                        } else {
                                          delete updatedPerms[key];
                                        }
                                        // Persistir (somente true é salvo, ausência = false)
                                        await familyService.updateMemberPermissions(currentFamily!.id, member.id, updatedPerms);
                                        // Atualizar estado local de membros
                                        setFamilyMembers(prev => prev.map(m => m.id === member.id ? { ...m, permissions: { ...updatedPerms } } : m));
                                        // Se o membro atualizado é o usuário atual, refetch das tarefas para refletir nova visibilidade/permissões
                                        if (member.id === user.id && currentFamily) {
                                          try {
                                            const refreshed = await familyService.getFamilyTasks(currentFamily.id, user.id);
                                            // Mantém tasks privadas locais + atualiza públicas
                                            setTasks(prev => {
                                              const privateTasks = prev.filter(t => (t as any).private === true || !(t as any).familyId) as any as Task[];
                                              const merged = [...privateTasks, ...(refreshed as any as Task[])];
                                              return merged as Task[];
                                            });
                                          } catch (err) {
                                            console.warn('Falha ao refazer fetch das tasks após permissão:', err);
                                          }
                                        }
                                      } catch (e) {
                                        Alert.alert('Erro', 'Não foi possível atualizar permissões.');
                                      }
                                    }}
                                  >
                                    <Text style={[styles.permissionChipText, has && styles.permissionChipTextActive]}>
                                      {labelMap[key]}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                            <Text style={styles.permissionsHint}>Ausência de seleção = sem acesso a tarefas públicas.</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
            
            {/* Botão de fechar no final do modal */}
            <Pressable 
              style={({ pressed }) => [
                styles.closeModalButton,
                (pressed && !isCreatingFamily && !isSavingFamilyName) && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                (isCreatingFamily || isSavingFamilyName) && styles.buttonDisabled
              ]}
              onPress={() => {
                if (isCreatingFamily || isSavingFamilyName) return;
                setFamilyModalVisible(false);
                setIsCreatingFamilyMode(false);
                setNewFamilyNameInput('');
              }}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
            >
              <Text style={styles.closeModalButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      
      {/* Removido overlay de atualização manual para UX mais discreta; o banner "Sincronizando..." abaixo do header já indica progresso */}
      {isGlobalLoading && (
        <View style={styles.fullscreenLoadingOverlay} pointerEvents="auto">
          <View style={styles.fullscreenLoadingContent}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.fullscreenLoadingText}>Sincronizando...</Text>
          </View>
        </View>
      )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  familyContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  familyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 16,
  },
  familyMemberCard: {
    flexDirection: 'row',
    backgroundColor: '#fdfdfd',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ececec',
    marginBottom: 12,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16, // Reduzir padding horizontal para telas menores
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
    backgroundColor: '#fff'
  },
  privateToggleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  privateToggleText: {
    marginRight: 8,
    color: '#333'
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
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  dateTimeButtonText: {
    fontSize: 13, // Reduzir tamanho da fonte
    color: '#666',
    marginLeft: 6,
    flex: 1,
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
    marginBottom: 16, // Reduzir margem
  },
  repeatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10, // Reduzir padding
    marginBottom: 6, // Reduzir margem
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
    fontSize: 13, // Reduzir tamanho da fonte
    color: '#666',
    marginLeft: 6,
  },
  repeatOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  customDaysContainer: {
    marginBottom: 16, // Reduzir margem
  },
  customDaysLabel: {
    fontSize: 13, // Reduzir tamanho da fonte
    fontWeight: '600',
    color: '#333',
    marginBottom: 6, // Reduzir margem
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
    marginBottom: 16, // Reduzir margem
  },
  summaryText: {
    fontSize: 13, // Reduzir tamanho da fonte
    color: '#666',
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
    color: '#666',
    marginTop: 16, // Reduzir margem superior
    marginBottom: 6, // Reduzir margem inferior
  },
  emptySubtext: {
    fontSize: 13, // Reduzir tamanho da fonte
    color: '#999',
    textAlign: 'center',
    lineHeight: 18, // Reduzir line height
  },
  taskList: {
    flex: 1,
    minHeight: '100%',
  },
  taskListContent: {
    paddingBottom: 120, // Espaço extra no final para o FAB e gesto
    flexGrow: 0,
  },
  taskItem: {
    backgroundColor: '#fff',
    borderRadius: 12, // Reduzir border radius
    marginHorizontal: 12, // Reduzir margem horizontal
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
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  taskCompleted: {
    opacity: 0.6,
    backgroundColor: '#f8f9fa',
  },
  // Category Header - New Styles
  categoryHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  categoryHeaderContent: {
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
    color: '#666',
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
    color: '#666',
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
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
  },
  taskTextContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16, // Reduzir tamanho da fonte
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 22, // Reduzir line height
    marginBottom: 3, // Reduzir margem
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskDescription: {
    fontSize: 13, // Reduzir tamanho da fonte
    color: '#666',
    lineHeight: 18, // Reduzir line height
    marginTop: 3, // Reduzir margem
  },
  taskDescriptionCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
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
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8, // Reduzir padding superior
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8, // Reduzir padding horizontal
    paddingVertical: 4, // Reduzir padding vertical
    borderRadius: 10, // Reduzir border radius
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  scheduleText: {
    fontSize: 11, // Reduzir tamanho da fonte
    color: '#495057',
    marginLeft: 3, // Reduzir margem
    fontWeight: '600',
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto', // Empurra para a direita
  },
  scheduleActionButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  overdueText: {
    color: '#dc3545',
    fontWeight: '700',
  },
  overdueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
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
    backgroundColor: '#007AFF',
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
    padding: 15, // Reduzir padding para telas menores
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20, // Reduzir padding interno
    width: '100%',
    maxWidth: 400,
    flex: 1,
    maxHeight: '92%', // Aumentar altura máxima
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // Reduzir margem
  },
  modalTitle: {
    fontSize: 18, // Reduzir tamanho da fonte
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10, // Reduzir padding
    fontSize: 15, // Reduzir tamanho da fonte
    marginBottom: 12, // Reduzir margem
    backgroundColor: '#f8f9fa',
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
    fontSize: 15, // Reduzir tamanho da fonte
    fontWeight: '600',
    color: '#333',
    marginBottom: 10, // Reduzir margem
  },
  categorySelectorContainer: {
    marginBottom: 16, // Reduzir margem
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
    marginBottom: 12, // Reduzir margem
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingVertical: 8, // Reduzir padding
    paddingHorizontal: 0, // Garantir que não há padding horizontal extra
  },
  // Tab Styles (DEPRECATED - mantidos para compatibilidade)
  /*
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
  */
  // Simple Tab Styles (Nova aparência simplificada)
  simpleTabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16, // Reduzir margem horizontal
    marginVertical: 10, // Reduzir margem vertical
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  simpleTab: {
    flex: 1,
    paddingVertical: 10, // Reduzir padding vertical
    paddingHorizontal: 12, // Reduzir padding horizontal
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeSimpleTab: {
    borderBottomColor: '#007AFF',
  },
  simpleTabText: {
    fontSize: 15, // Reduzir tamanho da fonte
    fontWeight: '500',
    color: '#666',
  },
  activeSimpleTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  // History Styles
  historyModalWrapper: {
    width: '92%',
    maxWidth: 520,
    maxHeight: '88%',
    minHeight: 320,
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#666',
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
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  // Pending Recurring Task Styles
  taskPendingRecurring: {
    backgroundColor: '#fffbf0',
    borderWidth: 2,
    borderColor: '#fde68a',
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
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  approvalStatusApproved: {
    backgroundColor: '#d4edda',
    borderColor: '#4CAF50',
  },
  approvalStatusRejected: {
    backgroundColor: '#f8d7da',
    borderColor: '#e74c3c',
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
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  notificationsList: {
    maxHeight: 400,
    marginVertical: 10,
  },
  notificationItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notificationTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  notificationTaskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
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
    backgroundColor: '#007AFF',
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
    maxHeight: '85%',
    minHeight: '70%',
  },
  familyModalHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 0,
  },
  closeModalButton: {
    padding: 5,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  familyContent: {
    flex: 1,
  },
  familySection: {
    marginBottom: 25,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  familySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  familySectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  generateCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  generateCodeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  inviteCodeContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inviteCodeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteCodeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  inviteCodeExpiry: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  regenCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
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
    color: '#333',
    marginBottom: 8,
  },
  activeInviteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeInviteCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  activeInviteExpiry: {
    fontSize: 12,
    color: '#666',
  },
  familyMember: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  memberAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  memberDetails: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    lineHeight: 22,
  },
  memberRole: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  memberRoleText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  memberRoleAdmin: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  memberEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  memberJoinDate: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },
  removeMemberButton: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ffe6e6',
    minHeight: 40,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  changeMemberRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e6f3ff',
    gap: 6,
    minHeight: 40,
    minWidth: 150,
  },
  changeMemberRoleButtonText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  // Estilos para edição do nome da família
  familyNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  currentFamilyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  editFamilyNameIconButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#e6f3ff',
  },
  editFamilyNameContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editFamilyNameInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  editFamilyNameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editFamilyNameButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Estilos para indicador de conectividade
  connectivityIndicator: {
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  authorshipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  authorshipText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  historyAuthor: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  syncingDot: {
    fontSize: 20,
    color: '#4CAF50',
  },
  // Estilos para botões flutuantes e dropdown de filtros
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 15,
  },
  filterFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6c757d', // Cor cinza para diferenciar do botão principal
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Estilo para o novo FAB de Atualizar Dados (verde)
  updateFab: {
    backgroundColor: '#28a745',
  },
  filterDropdownMenuFloating: {
    position: 'absolute',
    bottom: 157, // Posicionar ao lado do botão de filtro (30 + 56 + 15 + 56 = 157)
    right: 85, // Abrir à esquerda do botão
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 280, // Reduzir um pouco para garantir que cabe na tela
    zIndex: 1001,
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterDropdownItemActive: {
    backgroundColor: '#f8f9ff',
  },
  filterDropdownItemText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  filterDropdownItemTextActive: {
    color: '#007AFF',
    fontWeight: '500',
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
    backgroundColor: '#f8f9fa',
    marginBottom: 2,
    borderRadius: 8,
  },
  settingsOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
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
    backgroundColor: '#28a745',
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
    color: '#444',
    marginBottom: 12,
    lineHeight: 20,
  },
  manualSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
    marginBottom: 8,
  },
  manualListItem: {
    fontSize: 14,
    color: '#555',
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
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  createFamilySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  createFamilyInputContainer: {
    marginBottom: 25,
  },
  createFamilyInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  createFamilyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
    shadowColor: '#007AFF',
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
    fontSize: 17,
    fontWeight: 'bold',
  },
  createFamilyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  createFamilyNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // ===== Permissões de Membros =====
  permissionsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  permissionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
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
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8
  },
  permissionChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
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
    color: '#666',
    marginTop: 2
  },
});

