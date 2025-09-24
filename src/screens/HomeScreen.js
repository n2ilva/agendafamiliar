import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import AddCategoryModal from '../components/AddCategoryModal';
import JoinFamilyModal from '../components/JoinFamilyModal';
import { saveData, loadData, saveFamilyTasks, loadFamilyTasks, saveFamilyHistory, loadFamilyHistory } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { USER_TYPES, TASK_STATUS } from '../constants/userTypes';
import { DEFAULT_CATEGORIES, getCategoryByName } from '../constants/categories';

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
    isFamilyMemberUser,
    isFamilyAdminUser 
  } = useAuth();
  
  // Use dados da rota se disponíveis, senão use do contexto
  const currentUser = user || routeUser;
  const currentUserType = userType || routeUserType;

  const [activeDateFilter, setActiveDateFilter] = useState('hoje');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('trabalho'); // Usando ID da categoria
  const [modalVisible, setModalVisible] = useState(false);
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [joinFamilyModalVisible, setJoinFamilyModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);

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

  // Função auxiliar para exibir o tipo de usuário
  const getUserTypeLabel = (type) => {
    switch(type) {
      case USER_TYPES.ADMIN: return 'Administrador';
      case USER_TYPES.DEPENDENTE: return 'Dependente';
      case USER_TYPES.CONVIDADO: return 'Convidado';
      default: return 'Usuário';
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

  const handleDeleteTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    
    // Verifica permissão para deletar usando currentUserType e currentUser
    const userIdentifier = currentUser?.email || currentUser?.name;
    const canDelete = currentUserType === USER_TYPES.ADMIN || task?.createdBy === userIdentifier;
    
    if (!canDelete) {
      Alert.alert(
        "Sem permissão",
        "Você só pode deletar suas próprias tarefas.",
        [{ text: "OK" }]
      );
      return;
    }    Alert.alert(
      "Apagar Tarefa",
      "Você tem certeza que deseja apagar esta tarefa?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Apagar", style: "destructive", onPress: () => {
          setTasks(tasks.filter(task => task.id !== taskId));
        }}
      ]
    );
  };

  const handleConcludeTask = (task) => {
    // Verifica permissão para concluir
    if (!canUserEditTask(task.createdBy) && !isAdmin()) {
      Alert.alert(
        "Sem permissão",
        "Você só pode concluir suas próprias tarefas.",
        [{ text: "OK" }]
      );
      return;
    }

    const canCompleteDirectly = currentUserType === USER_TYPES.ADMIN || currentUserType === USER_TYPES.CONVIDADO;
    
    if (canCompleteDirectly) {
      // Admin e convidado podem concluir diretamente
      Alert.alert(
        "Concluir Tarefa",
        "Deseja marcar esta tarefa como concluída?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Concluir", style: "default", onPress: () => {
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
            setHistory([...history, newHistoryItem]);
            setTasks(tasks.filter(t => t.id !== task.id));
          }}
        ]
      );
    } else {
      // Dependente precisa de aprovação
      Alert.alert(
        "Solicitar Aprovação",
        "Esta tarefa será enviada para aprovação do administrador.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Enviar", style: "default", onPress: () => {
            const updatedTask = {
              ...task,
              status: TASK_STATUS.AWAITING_APPROVAL,
              completedBy: currentUser?.email || currentUser?.name,
              completedByName: currentUser?.name,
              completionDate: new Date().toISOString(),
              approved: false
            };
            setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
            
            Alert.alert(
              "Enviado!",
              "Sua solicitação de aprovação foi enviada para o administrador.",
              [{ text: "OK" }]
            );
          }}
        ]
      );
    }
  };

  const handleSaveTask = (task) => {
    if (task.id) {
      // Editar - verifica permissão usando currentUserType e currentUser
      const existingTask = tasks.find(t => t.id === task.id);
      const userIdentifier = currentUser?.email || currentUser?.name;
      const canEdit = currentUserType === USER_TYPES.ADMIN || existingTask?.createdBy === userIdentifier;
      
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
      setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
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
      setTasks([...tasks, newTask]);
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

  const handleSaveCategory = (newCategory) => {
    const updatedCategories = [...categories, newCategory];
    setCategories(updatedCategories);
    // TODO: Salvar categorias no AsyncStorage
    setActiveCategoryFilter(newCategory.id);
  };

  const filteredTasks = tasks.filter(task => {
    if (!task.dueDate) return false; // Ignora tarefas sem data

    const taskDate = new Date(task.dueDate);
    const today = new Date();

    // Zera as horas para comparar apenas as datas
    taskDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const isToday = taskDate.getTime() === today.getTime();
    const isUpcoming = taskDate.getTime() > today.getTime();

    const dateFilterMatch = 
      (activeDateFilter === 'hoje' && isToday) || 
      (activeDateFilter === 'próximas' && isUpcoming);
      
    const categoryFilterMatch = task.category === activeCategoryFilter;

    return dateFilterMatch && categoryFilterMatch;
  });

  // Calcular dados de progresso
  const progressData = React.useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(task => task.status === TASK_STATUS.COMPLETED).length;
    const pending = filteredTasks.filter(task => task.status === TASK_STATUS.PENDING).length;
    const inProgress = filteredTasks.filter(task => task.status === TASK_STATUS.IN_PROGRESS).length;
    const awaitingApproval = filteredTasks.filter(task => task.status === TASK_STATUS.AWAITING_APPROVAL).length;
    
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
  }, [filteredTasks]);

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
          {isAdmin() && !isFamilyMemberUser() && (
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
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {progressData.completed}/{progressData.total} concluídas
          </Text>
          {progressData.awaitingApproval > 0 && (
            <Text style={styles.awaitingText}>
              {progressData.awaitingApproval} aguardando
            </Text>
          )}
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
        <View style={styles.taskList}>
          {filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onEdit={() => handleEditTask(task)}
                onDelete={() => handleDeleteTask(task.id)}
                onConclude={() => handleConcludeTask(task)}
              />
            ))
          ) : (
            <Text style={styles.noTasksText}>Nenhuma tarefa encontrada para os filtros selecionados.</Text>
          )}
        </View>
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
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  awaitingText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
  },
  progressBarContainer: {
    width: '100%',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressBarAwaiting: {
    height: '100%',
    backgroundColor: '#FF9500',
    borderRadius: 2,
    position: 'absolute',
    top: 0,
  },
});