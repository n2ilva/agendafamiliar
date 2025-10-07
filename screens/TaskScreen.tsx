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
  Image,
  Dimensions,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { 
  PanGestureHandler, 
  State, 
  GestureHandlerRootView 
} from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { Header } from '../components/Header';
import { FamilyUser, UserRole, TaskStatus, TaskApproval, ApprovalNotification, Family, FamilyInvite, Task as FirebaseTask } from '../types/FamilyTypes';
import LocalStorageService, { HistoryItem as StoredHistoryItem } from '../services/LocalStorageService';
import SyncService, { SyncStatus } from '../services/SyncService';
import ConnectivityService, { ConnectivityState } from '../services/ConnectivityService';
import familyService from '../services/FirebaseFamilyService';
import { safeToDate, isToday, isUpcoming, isTaskOverdue, getNextRecurrenceDate, isRecurringTaskCompletable } from '../utils/DateUtils';

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
  dueDate?: Date;
  dueTime?: Date;
  repeat: RepeatConfig;
  userId: string;
  approvalId?: string;
  createdAt: Date;
  // Campos de autoria
  createdBy: string;
  createdByName: string;
  editedBy?: string;
  editedByName?: string;
  editedAt?: Date;
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
  const [selectedCategory, setSelectedCategory] = useState<string>('work');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('star');
  
  // Estados para sistema de aprovação
  const [approvals, setApprovals] = useState<TaskApproval[]>([]);
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([]);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<TaskApproval | null>(null);
  
  // Estados para sistema de família
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyUser[]>([]);
  // const [familyInvites, setFamilyInvites] = useState<FamilyInvite[]>([]);
  const [familyModalVisible, setFamilyModalVisible] = useState(false);
  // const [inviteCode, setInviteCode] = useState<string>('');

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
  
  // Estados para histórico
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  
  // Estado para modal de configurações
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  
  // Estado para atualização automática
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estado para IDs de tarefas pendentes de sincronização
  const [pendingSyncIds, setPendingSyncIds] = useState<string[]>([]);
  
  // Estado para dropdown de filtros
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);

  // Função para lidar com gestos de swipe
  const handleSwipeGesture = (event: any) => {
    const { translationX, state } = event.nativeEvent;
    
    if (state === State.END) {
      const threshold = Dimensions.get('window').width * 0.3; // 30% da largura da tela
      
      if (translationX > threshold) {
        // Swipe para direita - voltar para "Hoje"
        if (activeTab === 'upcoming') {
          setActiveTab('today');
        }
      } else if (translationX < -threshold) {
        // Swipe para esquerda - ir para "Próximas"
        if (activeTab === 'today') {
          setActiveTab('upcoming');
        }
      }
    }
  };

  // Função para converter Task local para FirebaseTask
  const taskToFirebaseTask = (task: Task): FirebaseTask => {
    const firebaseTask: any = {
      id: task.id,
      title: task.title,
      description: task.description || '',
      completed: task.completed,
      status: task.status,
      category: task.category,
      priority: 'media', // valor padrão
      createdAt: task.createdAt,
      updatedAt: task.editedAt || new Date(),
      dueDate: task.dueDate,
      dueTime: task.dueTime, // Adicionar dueTime ao Firebase
      repeatOption: task.repeat?.type === RepeatType.DAILY ? 'diario' : 
                    task.repeat?.type === RepeatType.CUSTOM ? 'semanal' : 'nenhum',
      userId: task.userId,
      // Campos de autoria
      createdBy: task.createdBy,
      createdByName: task.createdByName,
    };

    // Adicionar campos apenas se não forem undefined
    if (task.completed) {
      firebaseTask.completedAt = new Date();
    }
    
    if (task.approvalId !== undefined) {
      firebaseTask.approvalId = task.approvalId;
    }
    
    if (task.editedBy !== undefined) {
      firebaseTask.editedBy = task.editedBy;
    }
    
    if (task.editedByName !== undefined) {
      firebaseTask.editedByName = task.editedByName;
    }
    
    if (task.editedAt !== undefined) {
      firebaseTask.editedAt = task.editedAt;
    }

    return firebaseTask as FirebaseTask;
  };

  // Função para converter FirebaseTask para Task local
  const firebaseTaskToTask = (firebaseTask: FirebaseTask): Task => ({
    id: firebaseTask.id,
    title: firebaseTask.title,
    description: firebaseTask.description || '',
    completed: firebaseTask.completed,
    status: firebaseTask.status,
    category: firebaseTask.category,
    dueDate: safeToDate(firebaseTask.dueDate),
    dueTime: safeToDate(firebaseTask.dueTime) || safeToDate(firebaseTask.dueDate), // usar dueTime se disponível, senão dueDate
    repeat: {
      type: firebaseTask.repeatOption === 'diario' ? RepeatType.DAILY :
            firebaseTask.repeatOption === 'semanal' ? RepeatType.CUSTOM : RepeatType.NONE,
      days: firebaseTask.repeatOption === 'semanal' ? [1, 2, 3, 4, 5] : []
    },
    userId: firebaseTask.userId,
    approvalId: firebaseTask.approvalId,
    createdAt: firebaseTask.createdAt,
    // Campos de autoria com fallback para dados antigos
    createdBy: firebaseTask.createdBy || firebaseTask.userId,
    createdByName: firebaseTask.createdByName || 'Usuário',
    editedBy: firebaseTask.editedBy,
    editedByName: firebaseTask.editedByName,
    editedAt: firebaseTask.editedAt
  });

  // Função para carregar dados do cache local
  const loadDataFromCache = async () => {
    try {
      console.log('📱 Carregando dados do cache local...');
      
      // Carregar tarefas do cache
      const cachedFirebaseTasks = await LocalStorageService.getTasks();
      if (cachedFirebaseTasks.length > 0) {
        const convertedTasks = cachedFirebaseTasks.map(firebaseTaskToTask);
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
        const firebaseTask = taskToFirebaseTask(task);
        await LocalStorageService.saveTask(firebaseTask);
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
  
  // Configurar notificações apenas uma vez
  useEffect(() => {
    configurarNotificacoes();
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
            const familyTasks = await familyService.getFamilyTasks(userFamily.id);
            
            // Converter tarefas da família para o formato local
            const convertedTasks: Task[] = familyTasks.map(familyTask => ({
              id: familyTask.id,
              title: familyTask.title,
              description: familyTask.description || '',
              completed: familyTask.completed,
              status: familyTask.status,
              category: familyTask.category,
              createdAt: familyTask.createdAt,
              dueDate: safeToDate(familyTask.dueDate),
              dueTime: safeToDate(familyTask.dueDate), // usar mesma data para time
              repeat: {
                type: familyTask.repeatOption === 'diario' ? RepeatType.DAILY : 
                      familyTask.repeatOption === 'semanal' ? RepeatType.WEEKENDS :
                      RepeatType.NONE,
                days: []
              },
              userId: familyTask.userId,
              approvalId: familyTask.approvalId,
              createdBy: familyTask.createdBy,
              createdByName: familyTask.createdByName,
              editedBy: familyTask.editedBy,
              editedByName: familyTask.editedByName,
              editedAt: familyTask.editedAt
            }));
            
            // Atualizar tarefas com as tarefas da família
            setTasks(convertedTasks);
            
            console.log(`📋 ${familyTasks.length} tarefas da família carregadas e convertidas`);
          } else {
            console.log('👤 Usuário não possui família');
            
            // Se não tem família, carregar tarefas do cache local
            const cachedTasks = await LocalStorageService.getTasks();
            if (cachedTasks.length > 0) {
              const localTasks = cachedTasks.map(firebaseTaskToTask);
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
            const localTasks = cachedTasks.map(firebaseTaskToTask);
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
        setHistory(localHistory);
        
        // Limpar histórico antigo (manter apenas 15 dias)
        await LocalStorageService.clearOldHistory(15);

        if (currentFamily && currentFamily.id && !isOffline) {
          console.log('📖 Carregando histórico da família...');

          // Configurar listener para atualizações de tarefas em tempo real
          const unsubscribeTasks = familyService.subscribeToFamilyTasks(
            currentFamily.id,
            (updatedTasks) => {
              const convertedTasks: Task[] = updatedTasks
                .map(firebaseTaskToTask)
                .filter(task => {
                  // Se a tarefa estiver na lista de espera, não a atualize
                  if (pendingSyncIds.includes(task.id)) {
                    console.log(`🚫 Tarefa ${task.id} ignorada na atualização do Firebase (pendente de sincronização).`);
                    return false; // Não incluir esta atualização
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
            }
          );
          
          // Carregar histórico inicial da família
          const familyHistory = await familyService.getFamilyHistory(currentFamily.id, 50);
          
          // Verificar se familyHistory é válido
          if (!familyHistory || !Array.isArray(familyHistory)) {
            console.warn('⚠️ Histórico da família inválido:', familyHistory);
            return;
          }
          
          // Converter histórico da família para formato local
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

            return {
              id: item.id || 'unknown-' + Date.now(),
              action: item.action || 'created',
              taskTitle: item.taskTitle || 'Tarefa desconhecida',
              taskId: item.taskId || '',
              timestamp: item.timestamp instanceof Date ? item.timestamp : new Date(),
              details: item.details || '',
              userId: item.userId || '',
              userName: item.userName || 'Usuário desconhecido',
              userRole: item.userRole || ''
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
                id: item.id,
                action: item.action,
                taskTitle: item.taskTitle,
                taskId: item.taskId,
                timestamp: item.timestamp,
                details: item.details,
                userId: item.userId,
                userName: item.userName,
                userRole: item.userRole
              }));

              setHistory(convertedUpdatedHistory);
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
          const familyTasks = await familyService.getFamilyTasks(currentFamily.id);
          const convertedTasks: Task[] = familyTasks.map(familyTask => ({
            id: familyTask.id,
            title: familyTask.title,
            description: familyTask.description || '',
            completed: familyTask.completed,
            status: familyTask.status,
            category: familyTask.category,
            createdAt: familyTask.createdAt,
            dueDate: safeToDate(familyTask.dueDate),
            dueTime: safeToDate(familyTask.dueDate),
            repeat: {
              type: familyTask.repeatOption === 'diario' ? RepeatType.DAILY : 
                    familyTask.repeatOption === 'semanal' ? RepeatType.WEEKENDS :
                    RepeatType.NONE,
              days: []
            },
            userId: familyTask.userId,
            approvalId: familyTask.approvalId,
            createdBy: familyTask.createdBy,
            createdByName: familyTask.createdByName,
            editedBy: familyTask.editedBy,
            editedByName: familyTask.editedByName,
            editedAt: familyTask.editedAt
          }));
          setTasks(convertedTasks);
          console.log(`🔄 ${familyTasks.length} tarefas da família recarregadas`);
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
    }, 1000);
  };

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
  
  // Estados para data e hora
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Estados para repetição
  const [repeatType, setRepeatType] = useState<RepeatType>(RepeatType.NONE);
  const [customDays, setCustomDays] = useState<number[]>([]);

  const addTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Erro', 'Por favor, insira um título para a tarefa.');
      return;
    }

    try {
      if (isEditing && editingTaskId) {
        // Atualizar tarefa existente
        const updatedTasks = tasks.map(task => 
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
                },
                // Campos de edição
                editedBy: user.id,
                editedByName: user.name,
                editedAt: new Date()
              }
            : task
        );
        
        setTasks(updatedTasks);
        
        // Adicionar ID à lista de pendentes de sincronização
        setPendingSyncIds(prev => [...prev, editingTaskId]);
        console.log(`⏳ Tarefa ${editingTaskId} adicionada à lista de espera de sincronização.`);

        // Salvar no cache local
        const updatedTask = updatedTasks.find(t => t.id === editingTaskId);
        if (updatedTask) {
          const firebaseTask = taskToFirebaseTask(updatedTask);
          await LocalStorageService.saveTask(firebaseTask);
          
          // Determinar se é create ou update baseado no ID
          const isTemporaryId = updatedTask.id.startsWith('temp_') || updatedTask.id === 'temp';
          const operationType = isTemporaryId ? 'create' : 'update';
          
          // Adicionar à fila de sincronização (online ou offline)
          await SyncService.addOfflineOperation(operationType, 'tasks', firebaseTask);
          
          // Se o usuário pertence a uma família, salvar também na família
          if (currentFamily && !isOffline) {
            try {
              await familyService.saveFamilyTask(firebaseTask, currentFamily.id);
              console.log('👨‍👩‍👧‍👦 Tarefa atualizada na família');
            } catch (error) {
              console.error('❌ Erro ao atualizar tarefa na família:', error);
            }
          }
          
          console.log('📱 Tarefa atualizada e adicionada à fila de sincronização');
        }
        
        // Adicionar ao histórico
        await addToHistory('edited', newTaskTitle.trim(), editingTaskId);
      } else {
        // Criar nova tarefa
        const newTask: Task = {
          id: 'temp_' + Date.now().toString(), // ID temporário para novas tarefas
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim(),
          completed: false,
          status: 'pendente' as TaskStatus,
          category: selectedCategory,
          dueDate: selectedDate,
          dueTime: selectedTime,
          repeat: {
            type: repeatType,
            days: repeatType === RepeatType.CUSTOM ? customDays : undefined
          },
          userId: user.id,
          createdAt: new Date(),
          // Campos de autoria
          createdBy: user.id,
          createdByName: user.name
        };

        const updatedTasks = [newTask, ...tasks];
        setTasks(updatedTasks);
        
        // Salvar no cache local
        const firebaseTask = taskToFirebaseTask(newTask);
        await LocalStorageService.saveTask(firebaseTask);
        
        // Adicionar à fila de sincronização (online ou offline)
        await SyncService.addOfflineOperation('create', 'tasks', firebaseTask);
        
        // Se o usuário pertence a uma família, salvar também na família
        if (currentFamily && !isOffline) {
          try {
            await familyService.saveFamilyTask(firebaseTask, currentFamily.id);
            console.log('👨‍👩‍👧‍👦 Nova tarefa salva na família');
          } catch (error) {
            console.error('❌ Erro ao salvar tarefa na família:', error);
          }
        }
        
        console.log('📱 Nova tarefa criada e adicionada à fila de sincronização');
        
        // Adicionar ao histórico
        await addToHistory('created', newTask.title, newTask.id);
      }
      
      // Reset form
      resetForm();
      setModalVisible(false);
      
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      Alert.alert('Erro', 'Não foi possível salvar a tarefa. Tente novamente.');
    }
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
  const getTodayTasks = () => {
    return tasks.filter(task => {
      if (filterCategory !== 'all' && task.category !== filterCategory) {
        return false;
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
      if (filterCategory !== 'all' && task.category !== filterCategory) {
        return false;
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
      // Manter apenas os últimos 15 dias
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      
      return newHistory.filter(item => item.timestamp >= fifteenDaysAgo);
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
        await familyService.addFamilyHistoryItem(
          currentFamily.id,
          action,
          taskTitle,
          taskId,
          historyItem.userId,
          historyItem.userName,
          historyItem.userRole,
          details
        );
        console.log('👨‍👩‍👧‍👦 Item adicionado ao histórico da família');
      } catch (error) {
        console.error('❌ Erro ao adicionar ao histórico da família:', error);
        
        // Se falhou salvar no Firebase, adicionar à fila de sincronização
        try {
          await SyncService.addOfflineOperation('create', 'history', historyItem);
          console.log('📤 Item de histórico adicionado à fila de sincronização');
        } catch (syncError) {
          console.error('❌ Erro ao adicionar histórico à fila de sincronização:', syncError);
        }
      }
    } else if (!currentFamily) {
      // Se usuário não tem família, adicionar à fila para sincronização futura
      try {
        await SyncService.addOfflineOperation('create', 'history', historyItem);
        console.log('📤 Item de histórico adicionado à fila de sincronização (sem família)');
      } catch (syncError) {
        console.error('❌ Erro ao adicionar histórico à fila:', syncError);
      }
    }
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

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
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
    
    if (user.role === 'dependente' && !task.completed) {
      // Dependente solicita aprovação para completar tarefa
      requestTaskApproval(task);
    } else if (user.role === 'admin') {
      // Admin pode completar/descompletar diretamente
      await handleTaskToggle(task);
    } else {
      // Para convidados ou outras situações
      await handleTaskToggle(task);
    }
  };

  const handleTaskToggle = async (task: Task) => {
    let updatedTasks: Task[];
    
    if (!task.completed) {
      // Marcando como concluída
      if (task.repeat.type !== 'none') {
        // Tarefa recorrente: criar nova instância para a próxima ocorrência
        const nextDate = getNextRecurrenceDate(
          task.dueDate || new Date(), 
          task.repeat.type, 
          task.repeat.days
        );
        
        // Preservar o horário original se existir
        let nextDateTime = nextDate;
        if (task.dueTime) {
          const originalTime = safeToDate(task.dueTime);
          if (originalTime) {
            nextDateTime = new Date(nextDate);
            nextDateTime.setHours(originalTime.getHours());
            nextDateTime.setMinutes(originalTime.getMinutes());
            nextDateTime.setSeconds(originalTime.getSeconds());
            nextDateTime.setMilliseconds(originalTime.getMilliseconds());
          }
        }
        
        const nextTask: Task = {
          ...task,
          id: Date.now().toString() + '_recurring',
          completed: false,
          status: 'pendente',
          dueDate: nextDate,
          dueTime: task.dueTime ? nextDateTime : undefined,
          createdAt: new Date(),
          createdBy: user.id,
          createdByName: user.name,
          editedBy: undefined,
          editedByName: undefined,
          editedAt: undefined
        };
        
        // Se a dueTime existe, manter a mesma hora na nova data
        if (nextTask.dueTime && task.dueTime) {
          const originalTime = safeToDate(task.dueTime);
          if (originalTime) {
            nextTask.dueTime.setHours(originalTime.getHours(), originalTime.getMinutes());
          }
        }
        
        // Marcar tarefa atual como concluída e adicionar nova tarefa
        updatedTasks = tasks.map(t => 
          t.id === task.id ? { 
            ...t, 
            completed: true,
            status: 'concluida' as TaskStatus
          } : t
        );
        
        // Adicionar nova tarefa recorrente
        updatedTasks.push(nextTask);
        
        // Salvar nova tarefa no Firebase
        try {
          const firebaseNextTask = taskToFirebaseTask(nextTask);
          await LocalStorageService.saveTask(firebaseNextTask);
          await SyncService.addOfflineOperation('create', 'tasks', firebaseNextTask);
          console.log('📱 Nova tarefa recorrente criada e sincronizada');
        } catch (error) {
          console.error('Erro ao sincronizar nova tarefa recorrente:', error);
        }
      } else {
        // Tarefa normal: apenas marcar como concluída
        updatedTasks = tasks.map(t => 
          t.id === task.id ? { 
            ...t, 
            completed: true,
            status: 'concluida' as TaskStatus
          } : t
        );
      }
    } else {
      // Desmarcando como concluída (apenas para tarefas não recorrentes)
      if (task.repeat.type === 'none') {
        updatedTasks = tasks.map(t => 
          t.id === task.id ? { 
            ...t, 
            completed: false,
            status: 'pendente' as TaskStatus
          } : t
        );
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
    
    setTasks(updatedTasks);
    
    // Salvar tarefa atualizada no cache local e sincronizar com Firebase
    const updatedTask = updatedTasks.find(t => t.id === task.id);
    if (updatedTask) {
      try {
        const firebaseTask = taskToFirebaseTask(updatedTask);
        await LocalStorageService.saveTask(firebaseTask);
        
        // Determinar se é create ou update baseado no ID
        const isTemporaryId = updatedTask.id.startsWith('temp_') || updatedTask.id === 'temp';
        const operationType = isTemporaryId ? 'create' : 'update';
        
        await SyncService.addOfflineOperation(operationType, 'tasks', firebaseTask);
        console.log('📱 Status da tarefa atualizado e sincronizado');
      } catch (error) {
        console.error('Erro ao sincronizar toggle da tarefa:', error);
      }
    }
    
    // Adicionar ao histórico
    await addToHistory(
      !task.completed ? 'completed' : 'uncompleted',
      task.title,
      task.id
    );
  };

  const requestTaskApproval = async (task: Task) => {
    const approval: TaskApproval = {
      id: Date.now().toString(),
      taskId: task.id,
      dependenteId: user.id,
      dependenteName: user.name,
      status: 'pendente',
      requestedAt: new Date(),
    };

    setApprovals([...approvals, approval]);

    // Atualizar tarefa para status pendente aprovação
    setTasks(tasks.map(t => 
      t.id === task.id ? { 
        ...t, 
        status: 'pendente_aprovacao',
        approvalId: approval.id
      } : t
    ));

    // Criar notificação para admins
    const notification: ApprovalNotification = {
      id: Date.now().toString(),
      type: 'task_approval_request',
      taskId: task.id,
      taskTitle: task.title,
      dependenteId: user.id,
      dependenteName: user.name,
      createdAt: new Date(),
      read: false,
    };

    setNotifications([...notifications, notification]);

    Alert.alert(
      'Solicitação Enviada',
      'Sua solicitação para completar a tarefa foi enviada para aprovação dos administradores.',
      [{ text: 'OK' }]
    );

    await addToHistory('approval_requested', task.title, task.id);
  };

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

    // Remover notificação
    setNotifications(notifications.filter(n => n.taskId !== approval.taskId));

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

    // Remover notificação
    setNotifications(notifications.filter(n => n.taskId !== approval.taskId));

    await addToHistory('rejected', approval.dependenteName + ' - ' + tasks.find(t => t.id === approval.taskId)?.title || '', approval.taskId, adminComment);

    Alert.alert('Tarefa Rejeitada', 'A solicitação de conclusão foi rejeitada.');
  };

  const openApprovalModal = (approval: TaskApproval) => {
    setSelectedApproval(approval);
    setApprovalModalVisible(true);
  };

  // Funções de gerenciamento de família
  // const generateInviteCode = () => {
  //   const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  //   const newInvite: FamilyInvite = {
  //     id: Date.now().toString(),
  //     familyId: user.familyId || 'family_001',
  //     familyName: currentFamily?.name || 'Minha Família',
  //     code: code,
  //     createdBy: user.id,
  //     createdAt: new Date(),
  //     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
  //     isActive: true
  //   };
  //   
  //   setFamilyInvites([newInvite, ...familyInvites.filter(inv => inv.isActive === false)]);
  //   setInviteCode(code);
  //   
  //   Alert.alert(
  //     'Código de Convite Gerado',
  //     `Código: ${code}\n\nEste código é válido por 24 horas. Compartilhe com quem você deseja adicionar à família.`,
  //     [{ text: 'OK' }]
  //   );
  // };

  // Função para copiar código da família
  const copyFamilyCode = async () => {
    try {
      const familyCode = currentFamily?.inviteCode;
      if (familyCode) {
        // Para Expo/React Native, usamos uma abordagem simples
        // Em um app real, você poderia usar @react-native-clipboard/clipboard
        Alert.alert(
          'Código Copiado!', 
          `Código da família: ${familyCode}\n\nCompartilhe este código com quem você deseja adicionar à família.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Erro', 'Código da família não disponível.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível copiar o código.');
    }
  };

  const removeFamilyMember = (memberId: string) => {
    console.log('Tentando remover membro:', memberId);
    console.log('Membros atuais:', familyMembers.map(m => ({ id: m.id, name: m.name })));
    console.log('Usuário atual:', user.id, 'Role:', user.role);
    
    // Verificar se o usuário é admin
    if (user.role !== 'admin') {
      console.log('Usuário não é admin!');
      Alert.alert('Erro', 'Apenas administradores podem remover membros da família.');
      return;
    }
    
    const member = familyMembers.find(m => m.id === memberId);
    console.log('Membro encontrado:', member);
    
    if (!member) {
      console.log('Membro não encontrado!');
      Alert.alert('Erro', 'Membro não encontrado.');
      return;
    }
    
    if (member.id === user.id) {
      console.log('Tentativa de remover a si mesmo!');
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
            console.log('Confirmou remoção do membro:', memberId);
            const updatedMembers = familyMembers.filter(m => m.id !== memberId);
            console.log('Novos membros:', updatedMembers.map(m => ({ id: m.id, name: m.name })));
            setFamilyMembers(updatedMembers);
            
            // Remover tarefas do membro removido
            const updatedTasks = tasks.filter(t => t.userId !== memberId);
            setTasks(updatedTasks);
            console.log('Membro removido com sucesso');
            Alert.alert('Sucesso', `${member.name} foi removido da família.`);
          }
        }
      ]
    );
  };

  const handleManageFamily = async () => {
    if (!currentFamily) {
      Alert.alert('Erro', 'Nenhuma família encontrada');
      return;
    }

    try {
      // Buscar dados atualizados da família
      const familyData = await familyService.getFamilyById(currentFamily.id);
      if (familyData) {
        setCurrentFamily(familyData);
        setFamilyMembers(familyData.members);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da família:', error);
    }
    
    setFamilyModalVisible(true);
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
          onPress: async () => {
            try {
              // Remover da lista local
              setTasks(tasks.filter(t => t.id !== taskId));
              
              // Remover do cache local
              await LocalStorageService.removeFromCache('tasks', taskId);
              
              // Adicionar à fila de sincronização (online ou offline)
              await SyncService.addOfflineOperation('delete', 'tasks', { id: taskId });
              
              // Se o usuário pertence a uma família, deletar também da família
              if (currentFamily && !isOffline) {
                try {
                  await familyService.deleteFamilyTask(taskId, currentFamily.id);
                  console.log('👨‍👩‍👧‍👦 Tarefa deletada da família');
                } catch (error) {
                  console.error('❌ Erro ao deletar tarefa da família:', error);
                }
              }
              
              console.log('📱 Tarefa deletada e adicionada à fila de sincronização');
              
              // Adicionar ao histórico
              await addToHistory('deleted', task.title, taskId);
            } catch (error) {
              console.error('Erro ao deletar tarefa:', error);
              Alert.alert('Erro', 'Não foi possível deletar a tarefa. Tente novamente.');
            }
          },
          style: 'destructive' 
        },
      ]
    );
  };

  const handleSettings = () => {
    setSettingsModalVisible(true);
  };

  const handleShowHistory = () => {
    setSettingsModalVisible(false);
    setHistoryModalVisible(true);
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
    if (Platform.OS === 'web') {
      // Para web, usar confirm em vez de Alert
      const confirmed = confirm('Tem certeza que deseja sair?');
      if (confirmed && onLogout) {
        await onLogout();
      }
    } else {
      Alert.alert(
        'Sair',
        'Tem certeza que deseja sair?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Sair', 
            onPress: async () => {
              if (onLogout) {
                await onLogout();
              }
            }, 
            style: 'destructive' 
          },
        ]
      );
    }
  };

  const renderTask = ({ item }: { item: Task }) => {
    const categoryConfig = getCategoryConfig(item.category);
    const isOverdue = isTaskOverdue(item.dueDate, item.dueTime, item.completed);
    const isRecurring = item.repeat.type !== 'none';
    const canComplete = isRecurringTaskCompletable(item.dueDate, isRecurring);
    const isPendingRecurring = isRecurring && !canComplete && !item.completed;
    
    return (
      <TouchableOpacity 
        onPress={() => toggleTask(item.id)}
        style={[
          styles.taskItem, 
          item.completed && styles.taskCompleted,
          isOverdue && styles.taskOverdue,
          isPendingRecurring && styles.taskPendingRecurring
        ]}
        activeOpacity={isPendingRecurring ? 0.5 : 0.7}
      >
        {/* Header da Categoria - Topo do Card */}
        <View style={[styles.categoryHeader, { backgroundColor: categoryConfig.bgColor }]}>
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
            <TouchableOpacity
              onPress={() => handleTaskToggle(item)}
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
            </TouchableOpacity>
            
            <View style={styles.taskTextContent}>
              <Text style={[
                styles.taskTitle,
                item.completed && styles.taskTitleCompleted,
                isPendingRecurring && styles.taskTitlePending
              ]}>
                {item.title}
              </Text>
              
              {item.description && (
                <Text style={[
                  styles.taskDescription,
                  item.completed && styles.taskDescriptionCompleted
                ]}>
                  {item.description}
                </Text>
              )}
            </View>
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

          {/* Botões de ação no final da coluna de informações */}
          <View style={styles.scheduleActions}>
            <TouchableOpacity 
              onPress={() => editTask(item)}
              style={styles.scheduleActionButton}
            >
              <Ionicons name="pencil-outline" size={16} color="#007AFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => deleteTask(item.id)}
              style={styles.scheduleActionButton}
            >
              <Ionicons name="trash-outline" size={16} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>
        
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
              {item.createdByName || 'Usuário'} • {formatDate(item.createdAt)}
            </Text>
          </View>
          {item.editedBy && item.editedByName && (
            <View style={styles.authorshipRow}>
              <Ionicons name="pencil-outline" size={12} color="#999" />
              <Text style={styles.authorshipText}>
                Editado por {item.editedByName} • {item.editedAt ? formatDate(item.editedAt) : ''}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
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
          onLogout={handleLogout}
          notificationCount={user.role === 'admin' ? notifications.filter(n => !n.read).length : 0}
          onNotifications={user.role === 'admin' ? () => setApprovalModalVisible(true) : undefined}
          onManageFamily={user.role === 'admin' ? handleManageFamily : undefined}
          syncStatus={{
            hasError: syncStatus.hasError,
            isOnline: connectivityState.isConnected
          }}
        />
        
        {/* Indicador de Status de Conectividade */}
        {(isOffline || syncStatus.pendingOperations > 0) && (
          <View style={styles.connectivityIndicator}>
            <View style={styles.connectivityContent}>
              <Ionicons 
                name={isOffline ? "cloud-offline" : "sync"} 
                size={16} 
                color={isOffline ? "#ff6b6b" : "#4CAF50"} 
              />
              <Text style={[styles.connectivityText, { color: isOffline ? "#ff6b6b" : "#4CAF50" }]}>
                {isOffline 
                  ? `Modo Offline • ${syncStatus.pendingOperations} ${syncStatus.pendingOperations === 1 ? 'sincronização pendente' : 'sincronizações pendentes'}` 
                  : syncStatus.isSyncing 
                    ? "Sincronizando..." 
                    : `${syncStatus.pendingOperations} ${syncStatus.pendingOperations === 1 ? 'sincronização pendente' : 'sincronizações pendentes'}`
                }
              </Text>
              {syncStatus.isSyncing && (
                <View style={styles.syncingIndicator}>
                  <Text style={styles.syncingDot}>•</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        <PanGestureHandler onGestureEvent={handleSwipeGesture}>
          <View style={styles.content}>

        {/* Indicador de Tabs Simplificado */}
        <View style={styles.simpleTabContainer}>
          <TouchableOpacity
            style={[styles.simpleTab, activeTab === 'today' && styles.activeSimpleTab]}
            onPress={() => setActiveTab('today')}
          >
            <Text style={[styles.simpleTabText, activeTab === 'today' && styles.activeSimpleTabText]}>
              Hoje ({getTodayTasks().length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.simpleTab, activeTab === 'upcoming' && styles.activeSimpleTab]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.simpleTabText, activeTab === 'upcoming' && styles.activeSimpleTabText]}>
              Próximas ({getUpcomingTasks().length})
            </Text>
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
        </PanGestureHandler>

      {/* Container dos botões flutuantes */}
      <View style={styles.fabContainer}>
        {/* Botão de Filtro */}
        <TouchableOpacity 
          style={styles.filterFab}
          onPress={() => setFilterDropdownVisible(!filterDropdownVisible)}
        >
          <Ionicons name="filter" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Botão de Criar Tarefa */}
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Dropdown de Filtros - posicionado para abrir à esquerda */}
      {filterDropdownVisible && (
        <>
          {/* Overlay para fechar dropdown */}
          <TouchableOpacity
            style={styles.dropdownOverlay}
            onPress={() => setFilterDropdownVisible(false)}
            activeOpacity={1}
          />
          
          <View style={styles.filterDropdownMenuFloating}>
            <ScrollView 
              style={{ maxHeight: 280 }} 
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {categories.map((category) => (
                <TouchableOpacity
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
                </TouchableOpacity>
              ))}
              
              <View style={styles.filterDropdownSeparator} />
              
              <TouchableOpacity
                style={styles.filterDropdownItem}
                onPress={() => {
                  setCategoryModalVisible(true);
                  setFilterDropdownVisible(false);
                }}
              >
                <Ionicons name="add-circle-outline" size={16} color="#007AFF" />
                <Text style={styles.filterDropdownItemText}>Nova Categoria</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </>
      )}

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

      {/* Modal de Configurações */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurações</Text>
            
            <View style={styles.settingsOptions}>
              <TouchableOpacity 
                style={styles.settingsOption}
                onPress={handleShowHistory}
              >
                <Ionicons name="time-outline" size={24} color="#007AFF" />
                <Text style={styles.settingsOptionText}>Histórico</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.settingsOption}
                onPress={handleUpdateData}
              >
                <Ionicons name="refresh-outline" size={24} color="#007AFF" />
                <Text style={styles.settingsOptionText}>Atualizar Dados</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.settingsOption}
                onPress={handleSystemInfo}
              >
                <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
                <Text style={styles.settingsOptionText}>Info do Sistema</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal do Histórico */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Informações</Text>

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
                      {/* Informações de autoria */}
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
                )}
              />
            )}
            
            {/* Botão de fechar no final do modal */}
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setHistoryModalVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal de Aprovação para Admins */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={approvalModalVisible}
        onRequestClose={() => setApprovalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Solicitações de Aprovação</Text>
            
            {notifications.filter(n => !n.read).length === 0 ? (
              <Text style={styles.noNotificationsText}>Nenhuma solicitação pendente</Text>
            ) : (
              <ScrollView style={styles.notificationsList}>
                {notifications.filter(n => !n.read).map(notification => {
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
                        <TouchableOpacity
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
                        </TouchableOpacity>
                        
                        <TouchableOpacity
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
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setApprovalModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Gerenciamento de Família */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={familyModalVisible}
        onRequestClose={() => setFamilyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.familyModalContent]}>
            <Text style={styles.modalTitle}>Gerenciar Família</Text>

            <ScrollView style={styles.familyContent}>
              {/* Seção do Código da Família */}
              <View style={styles.familySection}>
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
                    <TouchableOpacity
                      onPress={copyFamilyCode}
                      style={styles.copyButton}
                    >
                      <Ionicons name="copy" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Seção de Membros */}
              <View style={styles.familySection}>
                <Text style={styles.familySectionTitle}>Membros da Família</Text>
                
                {familyMembers.map(member => (
                  <View key={member.id} style={styles.familyMember}>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberAvatar}>
                        {member.picture ? (
                          <Image source={{ uri: member.picture }} style={styles.memberAvatarImage} />
                        ) : (
                          <Ionicons name="person" size={20} color="#666" />
                        )}
                      </View>
                      <View style={styles.memberDetails}>
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
                      </View>
                    </View>
                    
                    {member.id !== user.id && user.role === 'admin' && (
                      <TouchableOpacity
                        onPress={() => removeFamilyMember(member.id)}
                        style={styles.removeMemberButton}
                      >
                        <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
            
            {/* Botão de fechar no final do modal */}
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setFamilyModalVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
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
    shadowRadius: 4,
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
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
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
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  memberAvatarImage: {
    width: 41,
    height: 41,
    borderRadius: 20.5,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  memberRole: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  memberRoleText: {
    fontSize: 13,
    color: '#666',
  },
  memberRoleAdmin: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  memberEmail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  memberJoinDate: {
    fontSize: 11,
    color: '#999',
  },
  removeMemberButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#ffe6e6',
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
});