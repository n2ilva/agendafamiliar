import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, StatusBar, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import AddCategoryModal from '../components/AddCategoryModal';
import JoinFamilyModal from '../components/JoinFamilyModal';
import CreateFamilyModal from '../components/CreateFamilyModal';
import ManageFamilyModal from '../components/ManageFamilyModal';
import { useAutoSync } from '../hooks/useAutoSync';
import { saveData, loadData, saveFamilyTasks, loadFamilyTasks, saveFamilyHistory, loadFamilyHistory } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { USER_TYPES, TASK_STATUS } from '../constants/userTypes';
import { DEFAULT_CATEGORIES, getCategoryById } from '../constants/categories';
import { scheduleTaskDueNotification, scheduleTaskReminderNotification, cancelAllNotifications, requestNotificationPermission, scheduleTaskOverdueNotification } from '../services/notifications';

export default function HomeScreen({ route, navigation }) {
  const { user: routeUser, userType: routeUserType } = route.params || {};
  const { 
    user, 
    userType, 
    family,
    login, 
    logout, 
    checkPermission, 
    canUserEditTask, 
    isAdmin, 
    isDependente,
    isConvidado,
    isFamilyMemberUser,
    isFamilyAdminUser 
  } = useAuth();
  
  // Use dados da rota se disponíveis, senão use do contexto
  const currentUser = user || routeUser;
  const currentUserType = userType || routeUserType;

  const [activeDateFilter, setActiveDateFilter] = useState('hoje');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('todos'); // Usando ID da categoria - padrão 'Todos'
  const [modalVisible, setModalVisible] = useState(false);
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [joinFamilyModalVisible, setJoinFamilyModalVisible] = useState(false);
  const [createFamilyModalVisible, setCreateFamilyModalVisible] = useState(false);
  const [manageFamilyModalVisible, setManageFamilyModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);

  // Hook para sincronização automática
  const { autoSync, useChangeSync, useFocusSync } = useAutoSync();

  useEffect(() => {
    // Faz login se não estiver logado
    if (currentUser && currentUserType && !user) {
      login(currentUser, currentUserType);
    }
  }, [currentUser, currentUserType, user, login]);

  useEffect(() => {
    const fetchData = async () => {
      let loadedTasks = [];
      let loadedHistory = [];

      // Carrega tarefas da família se usuário for membro
      if (isFamilyMemberUser() && family) {
        loadedTasks = await loadFamilyTasks(family.id);
        loadedHistory = await loadFamilyHistory(family.id);
      } else {
        // Carrega tarefas pessoais se não tiver família
        const data = await loadData();
        loadedTasks = data.tasks;
        loadedHistory = data.history;
      }

      // Limpa o histórico antigo
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      
      const recentHistory = loadedHistory.filter(item => {
        const completionDate = new Date(item.completionDate);
        return completionDate >= fifteenDaysAgo;
      });

      if (loadedTasks.length > 0 || recentHistory.length > 0) {
        setTasks(loadedTasks);
        setHistory(recentHistory);
        // Agenda notificações para as tarefas carregadas
        await scheduleNotificationsForTasks(loadedTasks);
      } else {
        // Dados iniciais se não houver nada salvo
        const initialTasks = [
          { 
            id: 1, 
            title: 'Reunião de equipe', 
            description: 'Discutir o progresso do projeto X.', 
            createdBy: currentUser?.email || currentUser?.name || 'Sistema',
            createdByName: currentUser?.name || 'Sistema',
            assignedTo: currentUser?.email || currentUser?.name,
            dueDate: '2025-09-24', 
            category: 'trabalho', // Usando ID da categoria
            status: TASK_STATUS.PENDING 
          },
          { 
            id: 2, 
            title: 'Consulta médica', 
            description: 'Check-up anual.', 
            createdBy: currentUser?.email || currentUser?.name || 'Sistema',
            createdByName: currentUser?.name || 'Sistema',
            assignedTo: currentUser?.email || currentUser?.name,
            dueDate: '2025-09-24', 
            category: 'saude', // Usando ID da categoria
            status: TASK_STATUS.PENDING 
          },
          { 
            id: 3, 
            title: 'Estudar React Native', 
            description: 'Capítulo 5 do livro.', 
            createdBy: currentUser?.email || currentUser?.name || 'Sistema',
            createdByName: currentUser?.name || 'Sistema',
            assignedTo: currentUser?.email || currentUser?.name,
            dueDate: '2025-09-25', 
            category: 'estudos', // Usando ID da categoria
            status: TASK_STATUS.PENDING 
          },
        ];
        setTasks(initialTasks);
        // Agenda notificações para as tarefas iniciais
        await scheduleNotificationsForTasks(initialTasks);
      }
    };
    
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, family, isFamilyMemberUser]);

  useEffect(() => {
    const saveCurrentData = async () => {
      if (isFamilyMemberUser() && family) {
        // Salva tarefas da família
        await saveFamilyTasks(tasks, family.id);
        await saveFamilyHistory(history, family.id);
      } else {
        // Salva tarefas pessoais
        await saveData(tasks, history);
      }
    };
    
    saveCurrentData();
  }, [tasks, history, family, isFamilyMemberUser]);

  // Sincronização automática baseada em mudanças nos dados
  useChangeSync(
    { tasks, history, user: currentUser, userType: currentUserType },
    family,
    10000 // 10 segundos de debounce
  );

  // Sincronização automática quando o app volta ao foco
  useFocusSync(
    { tasks, history, user: currentUser, userType: currentUserType },
    family
  );

  // Verificar tarefas vencidas periodicamente e agendar notificações
  useEffect(() => {
    const checkOverdueTasks = () => {
      scheduleOverdueNotifications();
    };

    // Verifica imediatamente
    checkOverdueTasks();

    // Verifica a cada 5 minutos
    const interval = setInterval(checkOverdueTasks, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [tasks]);

  // Função auxiliar para exibir o tipo de usuário
  const getUserTypeLabel = (type) => {
    switch(type) {
      case USER_TYPES.ADMIN: return 'Administrador';
      case USER_TYPES.DEPENDENTE: return 'Dependente';
      case USER_TYPES.CONVIDADO: return 'Convidado';
      default: return 'Usuário';
    }
  };

  // Helper de confirmação cross-platform (usará window.confirm no web e Alert.alert no mobile)
  const confirmAction = (title, message, confirmText = 'OK', cancelText = 'Cancelar') => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      // window.confirm retorna booleano
      const confirmed = window.confirm(message || title);
      return Promise.resolve(confirmed);
    }

    // Mobile: usa Alert.alert com callbacks
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
          { text: confirmText, style: 'default', onPress: () => resolve(true) }
        ],
        { cancelable: true }
      );
    });
  };

  // Função para obter a cor do filtro ativo
  const getActiveFilterColor = () => {
    if (activeCategoryFilter !== 'todos') {
      const category = getCategoryById(activeCategoryFilter);
      return category ? category.color : null;
    }
    return null; // Sem destaque quando filtro é "todos"
  };

  // Função para obter a cor da categoria de uma tarefa específica
  const getTaskCategoryColor = (task) => {
    const category = getCategoryById(task.category);
    return category ? category.color : null;
  };

  // Função para determinar se uma tarefa deve ser destacada
  const shouldHighlightTask = (task) => {
    if (activeCategoryFilter === 'todos') {
      return true; // Sempre destacar quando filtro é "todos" para mostrar cores individuais
    }
    return task.category === activeCategoryFilter;
  };

  // Função para agendar notificações de vencimento
  const scheduleOverdueNotifications = async () => {
    try {
      const now = new Date();
      
      // Filtra tarefas pendentes que estão vencidas
      const overdueTasks = tasks.filter(task => 
        task.status === TASK_STATUS.PENDING && 
        task.dueDate && 
        new Date(task.dueDate) <= now
      );

      // Agenda notificações de vencimento para tarefas que ainda não foram notificadas
      for (const task of overdueTasks) {
        // Verifica se já foi notificada (pode adicionar uma propriedade notifiedOverdue se necessário)
        // Por enquanto, agenda uma notificação imediata para tarefas vencidas
        await scheduleTaskOverdueNotification(task);
      }
    } catch (error) {
      console.warn('Erro ao agendar notificações de vencimento:', error);
    }
  };
  const scheduleNotificationsForTasks = async (taskList) => {
    try {
      // Cancela todas as notificações existentes primeiro
      await cancelAllNotifications();

      // Filtra apenas tarefas pendentes com data de vencimento
      const pendingTasks = taskList.filter(task =>
        task.status === TASK_STATUS.PENDING && task.dueDate
      );

      console.log(`Agendando notificações para ${pendingTasks.length} tarefas pendentes`);

      // Agenda notificações para cada tarefa pendente
      for (const task of pendingTasks) {
        const dueDate = new Date(task.dueDate);
        const now = new Date();

        // Só agenda se a data de vencimento for no futuro
        if (dueDate > now) {
          // Agenda notificação de vencimento
          await scheduleTaskDueNotification(task);

          // Agenda lembrete 1 hora antes (se for mais de 1 hora no futuro)
          const oneHourBefore = new Date(dueDate.getTime() - 60 * 60 * 1000);
          if (oneHourBefore > now) {
            await scheduleTaskReminderNotification(task, 3600); // 1 hora antes
          }

          // Agenda lembrete 24 horas antes (se for mais de 24 horas no futuro)
          const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
          if (oneDayBefore > now) {
            await scheduleTaskReminderNotification(task, 86400); // 24 horas antes
          }

          // Agenda lembrete 1 semana antes (se for mais de 1 semana no futuro)
          const oneWeekBefore = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (oneWeekBefore > now) {
            await scheduleTaskReminderNotification(task, 604800); // 1 semana antes
          }
        }
      }

      console.log('Notificações agendadas com sucesso');
    } catch (error) {
      console.warn('Erro ao agendar notificações:', error);
    }
  };

  const handleAddTask = () => {
    setSelectedTask(null);
    setModalVisible(true);
  };

  const handleEditTask = (task) => {
    // Verifica permissão para editar usando currentUserType e currentUser
    const userIdentifier = currentUser?.email || currentUser?.name;
    const canEdit = currentUserType === USER_TYPES.ADMIN || task?.createdBy === userIdentifier;
    
    if (!canEdit) {
      Alert.alert(
        "Sem permissão",
        "Você só pode editar suas próprias tarefas.",
        [{ text: "OK" }]
      );
      return;
    }
    
    setSelectedTask(task);
    setModalVisible(true);
  };

  const handleDeleteTask = async (taskId) => {
    // debug logs removed
    const task = tasks.find(t => t.id === taskId);
    
    // Verifica permissão para deletar usando currentUserType e currentUser
  const userIdentifier = currentUser?.email || currentUser?.name;
  const canDelete = isAdmin() || task?.createdBy === userIdentifier;
    
    if (!canDelete) {
      Alert.alert(
        "Sem permissão",
        "Você só pode deletar suas próprias tarefas.",
        [{ text: "OK" }]
      );
      return;
    }
    // Cross-platform confirmation
    const confirmedDelete = await confirmAction('Apagar Tarefa', 'Você tem certeza que deseja apagar esta tarefa?', 'Apagar', 'Cancelar');
    if (!confirmedDelete) return;
    const newTasks = tasks.filter(task => String(task.id) !== String(taskId));
    setTasks(newTasks);

    // Sincronização imediata após deletar tarefa
    try {
      const localData = { tasks: newTasks, history, user: currentUser, userType: currentUserType };
      await autoSync(localData, family);
    } catch (error) {
      console.warn('Erro na sincronização após deletar tarefa:', error);
    }

    // Reagenda notificações após deletar tarefa
    try {
      await scheduleNotificationsForTasks(newTasks);
    } catch (error) {
      console.warn('Erro ao reagendar notificações após deletar tarefa:', error);
    }
  };

  const handleConcludeTask = async (task) => {
    // debug logs removed
    // Verifica permissão para concluir
    if (!canUserEditTask(task.createdBy) && !isAdmin()) {
      Alert.alert(
        "Sem permissão",
        "Você só pode concluir suas próprias tarefas.",
        [{ text: "OK" }]
      );
      return;
    }

  const canCompleteDirectly = isAdmin() || isConvidado();
    
    if (canCompleteDirectly) {
      // Admin e convidado podem concluir diretamente
      const confirmedConclude = await confirmAction('Concluir Tarefa', 'Deseja marcar esta tarefa como concluída?', 'Concluir', 'Cancelar');
      if (!confirmedConclude) return;
      const newHistoryItem = {
        ...task,
        completedBy: currentUser?.email || currentUser?.name,
        completedByName: currentUser?.name,
        completionDate: new Date().toISOString(),
        approved: true,
        approvedBy: currentUser?.email || currentUser?.name,
        approvedByName: currentUser?.name,
        status: TASK_STATUS.COMPLETED
      };
      const newHistory = [...history, newHistoryItem];
      const newTasks = tasks.filter(t => String(t.id) !== String(task.id));
      setHistory(newHistory);
      setTasks(newTasks);

      // Sincronização imediata após concluir tarefa
      try {
        const localData = { 
          tasks: newTasks, 
          history: newHistory, 
          user: currentUser, 
          userType: currentUserType 
        };
        await autoSync(localData, family);
      } catch (error) {
        console.warn('Erro na sincronização após concluir tarefa:', error);
      }

      // Reagenda notificações após concluir tarefa
      try {
        await scheduleNotificationsForTasks(newTasks);
      } catch (error) {
        console.warn('Erro ao reagendar notificações após concluir tarefa:', error);
      }
    } else {
      // Dependente precisa de aprovação
      Alert.alert(
        "Solicitar Aprovação",
        "Esta tarefa será enviada para aprovação do administrador.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Enviar", style: "default", onPress: async () => {
            const updatedTask = {
              ...task,
              status: TASK_STATUS.AWAITING_APPROVAL,
              completedBy: currentUser?.email || currentUser?.name,
              completedByName: currentUser?.name,
              completionDate: new Date().toISOString(),
              approved: false
            };
            setTasks(tasks.map(t => String(t.id) === String(task.id) ? updatedTask : t));
            
            Alert.alert(
              "Enviado!",
              "Sua solicitação de aprovação foi enviada para o administrador.",
              [{ text: "OK" }]
            );
            
            // Sincronização imediata após solicitar aprovação
            try {
              const updatedTasks = tasks.map(t => String(t.id) === String(task.id) ? updatedTask : t);
              const localData = { 
                tasks: updatedTasks, 
                history, 
                user: currentUser, 
                userType: currentUserType 
              };
              await autoSync(localData, family);
            } catch (error) {
              console.warn('Erro na sincronização após solicitar aprovação:', error);
            }
          }}
        ]
      );
    }
  };

  const handleSaveTask = async (task) => {
  if (task.id) {
      // Editar - verifica permissão usando currentUserType e currentUser
      const existingTask = tasks.find(t => t.id === task.id);
      const userIdentifier = currentUser?.email || currentUser?.name;
  const canEdit = isAdmin() || existingTask?.createdBy === userIdentifier;
      
      if (!canEdit) {
        Alert.alert(
          "Sem permissão",
          "Você só pode editar suas próprias tarefas.",
          [{ text: "OK" }]
        );
        return;
      }
      
      const updatedTask = {
        ...task,
        status: task.status || TASK_STATUS.PENDING
      };
      const newTasks = tasks.map(t => String(t.id) === String(task.id) ? updatedTask : t);
      setTasks(newTasks);
    } else {
      // Adicionar nova tarefa
      const newTask = {
        ...task,
        id: Date.now(),
        createdBy: currentUser?.email || currentUser?.name,
        createdByName: currentUser?.name,
        assignedTo: currentUser?.email || currentUser?.name, // Por padrão, atribui a si mesmo
        status: TASK_STATUS.PENDING
      };
      const newTasks = [...tasks, newTask];
      setTasks(newTasks);
    }

    // Sincronização imediata após salvar tarefa
    try {
      const localData = { tasks: (typeof newTasks !== 'undefined' ? newTasks : tasks), history, user: currentUser, userType: currentUserType };
      await autoSync(localData, family);
    } catch (error) {
      console.warn('Erro na sincronização após salvar tarefa:', error);
    }

    // Reagenda notificações após salvar tarefa
    try {
      await scheduleNotificationsForTasks(typeof newTasks !== 'undefined' ? newTasks : tasks);
    } catch (error) {
      console.warn('Erro ao reagendar notificações após salvar tarefa:', error);
    }
  };

  const handleLogout = async () => {
    console.log('Fazendo logout...');
    try {
      await logout();
      navigation.navigate('Login');
    } catch (error) {
      console.error('Erro no logout:', error);
      // Fallback: navega mesmo em caso de erro
      navigation.navigate('Login');
    }
  };

  const handleSaveCategory = async (newCategory) => {
    const updatedCategories = [...categories, newCategory];
    setCategories(updatedCategories);
    // TODO: Salvar categorias no AsyncStorage
    setActiveCategoryFilter(newCategory.id);
    
    // Sincronização imediata após salvar categoria
    try {
      const localData = { 
        tasks, 
        history, 
        user: currentUser, 
        userType: currentUserType,
        categories: updatedCategories 
      };
      await autoSync(localData, family);
    } catch (error) {
      console.warn('Erro na sincronização após salvar categoria:', error);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    // Verificar se é uma categoria padrão (não pode ser deletada)
    const categoryToDelete = categories.find(cat => cat.id === categoryId);
    if (!categoryToDelete) return;

    // Verificar se é uma categoria padrão
    const isDefaultCategory = DEFAULT_CATEGORIES.some(defaultCat => defaultCat.id === categoryId);
    if (isDefaultCategory) {
      Alert.alert(
        'Não é possível deletar',
        'Esta é uma categoria padrão do sistema e não pode ser removida.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Verificar se há tarefas usando esta categoria
    const tasksUsingCategory = tasks.filter(task => task.category === categoryId);
    if (tasksUsingCategory.length > 0) {
      Alert.alert(
        'Categoria em uso',
        `Esta categoria está sendo usada por ${tasksUsingCategory.length} tarefa(s). Mova as tarefas para outra categoria antes de deletar.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Confirmar deleção
    Alert.alert(
      'Deletar Categoria',
      `Tem certeza que deseja deletar a categoria "${categoryToDelete.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedCategories = categories.filter(cat => cat.id !== categoryId);
              setCategories(updatedCategories);

              // Se a categoria ativa foi deletada, voltar para 'todos'
              if (activeCategoryFilter === categoryId) {
                setActiveCategoryFilter('todos');
              }

              // Sincronização imediata após deletar categoria
              const localData = {
                tasks,
                history,
                user: currentUser,
                userType: currentUserType,
                categories: updatedCategories
              };
              await autoSync(localData, family);

              console.log('Categoria deletada com sucesso');
            } catch (error) {
              console.warn('Erro na sincronização após deletar categoria:', error);
              // Reverter mudança em caso de erro
              setCategories(categories);
            }
          }
        }
      ]
    );
  };

  const filteredTasks = tasks.filter(task => {
    if (!task.dueDate) return false; // Ignora tarefas sem data

    const taskDate = new Date(task.dueDate);
    const now = new Date();

    const isToday = taskDate.toDateString() === now.toDateString();
    const isUpcoming = taskDate > now;
    const isOverdue = taskDate <= now; // Tarefa vencida se data/hora é menor ou igual ao agora

    const dateFilterMatch = 
      (activeDateFilter === 'hoje' && (isToday || (activeDateFilter === 'hoje' && isOverdue))) || 
      (activeDateFilter === 'próximas' && isUpcoming);
      
    const categoryFilterMatch = activeCategoryFilter === 'todos' ? true : task.category === activeCategoryFilter;

    return dateFilterMatch && categoryFilterMatch;
  });

  // Calcular dados de progresso
  const progressData = React.useMemo(() => {
    // Inclui tarefas ativas + tarefas concluídas do histórico para cálculo total
    const activeTasks = filteredTasks;
    const completedFromHistory = history.filter(item => item.approved === true).length;

    const total = activeTasks.length + completedFromHistory;
    const completed = completedFromHistory; // Tarefas concluídas vêm do histórico
    const pending = activeTasks.filter(task => task.status === TASK_STATUS.PENDING).length;
    const inProgress = activeTasks.filter(task => task.status === TASK_STATUS.IN_PROGRESS).length;
    const awaitingApproval = activeTasks.filter(task => task.status === TASK_STATUS.AWAITING_APPROVAL).length;

    const completedPercentage = total > 0 ? (completed / total) * 100 : 0;
    const awaitingPercentage = total > 0 ? (awaitingApproval / total) * 100 : 0;

    return {
      total,
      completed,
      pending,
      inProgress,
      awaitingApproval,
      completedPercentage,
      awaitingPercentage
    };
  }, [filteredTasks, history]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {showDropdownMenu && (
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => setShowDropdownMenu(false)}
        />
      )}
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {currentUser?.picture ? (
            <Image source={{ uri: currentUser.picture }} style={styles.avatar} />
          ) : (
            <Ionicons name="person-circle-outline" size={32} color="#333" />
          )}
          <View>
            <Text style={styles.headerGreeting}>Olá, {currentUser?.name?.split(' ')[0] || 'Usuário'}</Text>
            <Text style={styles.userType}>{getUserTypeLabel(currentUserType)}</Text>
            {isFamilyMemberUser() && family && (
              <Text style={styles.familyInfo}>👨‍👩‍👧‍👦 {family.name}</Text>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowDropdownMenu(!showDropdownMenu)}
            accessibilityLabel="Abrir menu de opções"
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={30} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu - Movido para fora do header */}
      {showDropdownMenu && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              setShowDropdownMenu(false);
              navigation.navigate('History', { history });
            }}
          >
            <Ionicons name="time-outline" size={20} color="#333" />
            <Text style={styles.dropdownText}>Histórico</Text>
          </TouchableOpacity>
          {/* Aprovações - visível para todos os tipos de usuário */}
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              setShowDropdownMenu(false);
              navigation.navigate('Approvals');
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#333" />
            <Text style={styles.dropdownText}>Aprovações</Text>
            {tasks.filter(t => t.status === TASK_STATUS.AWAITING_APPROVAL).length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {tasks.filter(t => t.status === TASK_STATUS.AWAITING_APPROVAL).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              setShowDropdownMenu(false);
              navigation.navigate('Informacoes');
            }}
          >
            <Ionicons name="information-circle-outline" size={20} color="#333" />
            <Text style={styles.dropdownText}>Informações</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              setShowDropdownMenu(false);
              navigation.navigate('Configuracoes');
            }}
          >
            <Ionicons name="settings-outline" size={20} color="#333" />
            <Text style={styles.dropdownText}>Configurações</Text>
          </TouchableOpacity>
          {isFamilyAdminUser() && (
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setShowDropdownMenu(false);
                setManageFamilyModalVisible(true);
              }}
            >
              <Ionicons name="settings" size={20} color="#007AFF" />
              <Text style={[styles.dropdownText, { color: '#007AFF' }]}>Gerenciar Família</Text>
            </TouchableOpacity>
          )}
          {isAdmin() && !isFamilyMemberUser() && (
            <>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdownMenu(false);
                  setCreateFamilyModalVisible(true);
                }}
              >
                <Ionicons name="home-outline" size={20} color="#007AFF" />
                <Text style={[styles.dropdownText, { color: '#007AFF' }]}>Criar Família</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdownMenu(false);
                  setJoinFamilyModalVisible(true);
                }}
              >
                <Ionicons name="people-outline" size={20} color="#007AFF" />
                <Text style={[styles.dropdownText, { color: '#007AFF' }]}>Entrar na Família</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              setShowDropdownMenu(false);
              handleLogout();
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#E53935" />
            <Text style={[styles.dropdownText, { color: '#E53935' }]}>Sair</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.progressStatText}>
                {progressData.completed} concluídas
              </Text>
            </View>
            <View style={styles.progressStat}>
              <Ionicons name="time-outline" size={20} color="#007AFF" />
              <Text style={styles.progressStatText}>
                {progressData.pending} pendentes
              </Text>
            </View>
            {progressData.awaitingApproval > 0 && (
              <View style={styles.progressStat}>
                <Ionicons name="hourglass-outline" size={20} color="#FF9500" />
                <Text style={styles.progressStatText}>
                  {progressData.awaitingApproval} aguardando
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.progressPercentage}>
            {progressData.total > 0 ? Math.round(progressData.completedPercentage) : 0}%
          </Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill,
                { width: `${progressData.completedPercentage}%` }
              ]} 
            />
            {progressData.awaitingApproval > 0 && (
              <View 
                style={[
                  styles.progressBarAwaiting,
                  { 
                    width: `${progressData.awaitingPercentage}%`,
                    left: `${progressData.completedPercentage}%`
                  }
                ]} 
              />
            )}
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>0%</Text>
            <Text style={styles.progressLabel}>50%</Text>
            <Text style={styles.progressLabel}>100%</Text>
          </View>
        </View>
      </View>

      <ScrollView>


        {/* Date Filters */}
        <View style={styles.dateFilterContainer}>
          <TouchableOpacity 
            style={[styles.dateFilterButtonWide, activeDateFilter === 'hoje' && styles.activeFilter]}
            onPress={() => setActiveDateFilter('hoje')}
          >
            <Text style={[styles.dateFilterText, activeDateFilter === 'hoje' && styles.activeFilterText]}>Hoje</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.dateFilterButtonWide, activeDateFilter === 'próximas' && styles.activeFilter]}
            onPress={() => setActiveDateFilter('próximas')}
          >
            <Text style={[styles.dateFilterText, activeDateFilter === 'próximas' && styles.activeFilterText]}>Próximas</Text>
          </TouchableOpacity>
        </View>

        {/* Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilterContainer}>
          {categories.map(category => (
            <TouchableOpacity 
              key={category.id}
              style={[
                styles.categoryFilterButton, 
                { backgroundColor: activeCategoryFilter === category.id ? category.color : '#e9ecef' }
              ]}
              onPress={() => setActiveCategoryFilter(category.id)}
              onLongPress={() => handleDeleteCategory(category.id)}
              delayLongPress={500}
            >
              <Ionicons 
                name={category.icon} 
                size={16} 
                color={activeCategoryFilter === category.id ? category.textColor : '#333'} 
                style={styles.categoryIcon}
              />
              <Text style={[
                styles.categoryFilterText, 
                { color: activeCategoryFilter === category.id ? category.textColor : '#333' }
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
          
                    {/* Botão para adicionar nova categoria */}
          <TouchableOpacity 
            style={[styles.categoryFilterButton, styles.addCategoryButton]}
            onPress={() => setAddCategoryModalVisible(true)}
          >
            <Ionicons name="add" size={16} color="#007AFF" />
            <Text style={[styles.categoryFilterText, { color: '#007AFF' }]}>Nova</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Task List */}
        <FlatList
          data={filteredTasks}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onEdit={() => handleEditTask(item)}
              onDelete={() => handleDeleteTask(item.id)}
              onConclude={() => handleConcludeTask(item)}
              highlightColor={shouldHighlightTask(item) ? (activeCategoryFilter === 'todos' ? getTaskCategoryColor(item) : getActiveFilterColor()) : null}
            />
          )}
          ListEmptyComponent={<Text style={styles.noTasksText}>Nenhuma tarefa encontrada para os filtros selecionados.</Text>}
          contentContainerStyle={styles.taskList}
          showsVerticalScrollIndicator={false}
        />
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={handleAddTask}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
      <TaskModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)}
        onSave={handleSaveTask}
        task={selectedTask}
        categories={categories}
      />
      
      <AddCategoryModal
        visible={addCategoryModalVisible}
        onClose={() => setAddCategoryModalVisible(false)}
        onSave={handleSaveCategory}
      />
      
      <JoinFamilyModal
        visible={joinFamilyModalVisible}
        onClose={() => setJoinFamilyModalVisible(false)}
      />
      
      <CreateFamilyModal
        visible={createFamilyModalVisible}
        onClose={() => setCreateFamilyModalVisible(false)}
      />
      
      <ManageFamilyModal
        visible={manageFamilyModalVisible}
        onClose={() => setManageFamilyModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  headerGreeting: {
    fontSize: 18,
    fontWeight: '600',
  },
  userType: {
    fontSize: 12,
    color: '#666',
    marginLeft: 0,
  },
  familyInfo: {
    fontSize: 11,
    color: '#007AFF',
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  headerButton: {
    marginLeft: 15,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
    ...((Platform.OS === 'web') ? { cursor: 'pointer' } : {}),
  },
  dropdownMenu: {
    position: 'absolute',
    top: 90, // Posição fixa do topo
    right: 20, // Margem da direita
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 999,
    zIndex: 999999,
    // Propriedades específicas para web
    borderWidth: 1,
    borderColor: '#e0e0e0',
    opacity: 1,
    // Garantir que não seja transparente no web
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.3)',
      border: '2px solid #e0e0e0',
      zIndex: '999999999',
      top: '90px',
      right: '20px',
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999998,
    backgroundColor: 'transparent',
    // Garantir funcionamento no web
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      zIndex: '999999998',
      width: '100vw',
      height: '100vh',
    }),
  },
  stitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  stitButton: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addTaskButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '500',
  },
  currentDate: {
    fontSize: 14,
    color: '#666',
  },
  dateFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 10,
  },
  dateFilterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilter: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dateFilterText: {
    color: '#333',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  categoryFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  categoryFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    minWidth: 80,
  },
  categoryIcon: {
    marginRight: 6,
  },
  addCategoryButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  activeCategoryFilter: {
    backgroundColor: '#333',
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  activeCategoryFilterText: {
    color: '#fff',
  },
  taskList: {
    paddingHorizontal: 20,
  },
  dateFilterButtonWide: {
    flex: 1,
    marginHorizontal: 5,
    paddingHorizontal: 0,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  noTasksText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#666',
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#007AFF',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressStats: {
    flexDirection: 'row',
    gap: 16,
  },
  progressStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressBarContainer: {
    gap: 8,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 6,
  },
  progressBarAwaiting: {
    height: '100%',
    backgroundColor: '#FF9500',
    borderRadius: 6,
    position: 'absolute',
    top: 0,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  progressLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
});