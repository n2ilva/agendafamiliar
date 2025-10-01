import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { TaskItem } from '../components/TaskItem';
import { taskService, Task } from '../services/taskService';

export const ApprovalsScreen: React.FC = () => {
  const { user } = useAuth();
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadPendingTasks();
    }
  }, [user]);

  const loadPendingTasks = async () => {
    try {
      if (!user) return;

      // In a real app, you'd filter tasks that need approval
      // For now, we'll show all tasks as an example
      const allTasks = await taskService.getTasks(user.uid);
      const pending = allTasks.filter(task => !task.completed);
      setPendingTasks(pending);
    } catch (error) {
      console.error('Error loading pending tasks:', error);
      Alert.alert('Erro', 'Não foi possível carregar as tarefas pendentes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPendingTasks();
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      // In a real app, this would mark the task as approved
      // For now, we'll just complete the task
      await taskService.updateTask(taskId, { completed: true });
      await loadPendingTasks();
      Alert.alert('Sucesso', 'Tarefa aprovada com sucesso!');
    } catch (error) {
      console.error('Error approving task:', error);
      Alert.alert('Erro', 'Não foi possível aprovar a tarefa');
    }
  };

  const handleRejectTask = async (taskId: string) => {
    Alert.alert(
      'Confirmar rejeição',
      'Tem certeza que deseja rejeitar esta tarefa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rejeitar',
          style: 'destructive',
          onPress: async () => {
            try {
              // In a real app, this would mark the task as rejected
              // For now, we'll just delete the task
              await taskService.deleteTask(taskId);
              await loadPendingTasks();
              Alert.alert('Sucesso', 'Tarefa rejeitada');
            } catch (error) {
              console.error('Error rejecting task:', error);
              Alert.alert('Erro', 'Não foi possível rejeitar a tarefa');
            }
          },
        },
      ]
    );
  };

  const renderTask = ({ item }: { item: Task }) => (
    <View style={styles.taskContainer}>
      <TaskItem
        task={item}
        onToggle={() => {}} // Disable toggle for approval screen
        onEdit={() => {}} // Disable edit for approval screen
        onDelete={() => {}} // Disable delete for approval screen
      />
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleRejectTask(item.id!)}
        >
          <Text style={styles.rejectText}>Rejeitar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleApproveTask(item.id!)}
        >
          <Text style={styles.approveText}>Aprovar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Carregando tarefas pendentes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Aprovações</Text>
        <Text style={styles.subtitle}>
          Revise e aprove tarefas pendentes
        </Text>
      </View>

      <FlatList
        data={pendingTasks}
        keyExtractor={(item) => item.id!}
        renderItem={renderTask}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma tarefa pendente</Text>
            <Text style={styles.emptySubtext}>
              Todas as tarefas foram revisadas ou não há tarefas para aprovar
            </Text>
          </View>
        }
        contentContainerStyle={pendingTasks.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  taskContainer: {
    margin: 16,
    marginTop: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  rejectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  approveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  emptyList: {
    flex: 1,
  },
});