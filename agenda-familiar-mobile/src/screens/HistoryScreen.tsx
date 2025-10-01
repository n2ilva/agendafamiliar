import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { TaskItem } from '../components/TaskItem';
import { taskService, Task } from '../services/taskService';

export const HistoryScreen: React.FC = () => {
  const { user } = useAuth();
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadCompletedTasks();
    }
  }, [user]);

  const loadCompletedTasks = async () => {
    try {
      if (!user) return;
      const allTasks = await taskService.getTasks(user.uid);
      const completed = allTasks.filter(task => task.completed);
      setCompletedTasks(completed);
    } catch (error) {
      console.error('Error loading completed tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCompletedTasks();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const groupTasksByDate = (tasks: Task[]) => {
    const grouped: { [key: string]: Task[] } = {};

    tasks.forEach(task => {
      const dateKey = formatDate(task.createdAt);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });

    return grouped;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Carregando histórico...</Text>
      </View>
    );
  }

  const groupedTasks = groupTasksByDate(completedTasks);
  const sections = Object.keys(groupedTasks)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map(date => ({
      date,
      data: groupedTasks[date],
    }));

  const renderSection = ({ item }: { item: { date: string; data: Task[] } }) => (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{item.date}</Text>
      {item.data.map(task => (
        <View key={task.id} style={styles.taskContainer}>
          <TaskItem
            task={task}
            onToggle={() => {}} // Disable toggle for history
            onEdit={() => {}} // Disable edit for history
            onDelete={() => {}} // Disable delete for history
          />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico</Text>
        <Text style={styles.subtitle}>
          Tarefas concluídas recentemente
        </Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.date}
        renderItem={renderSection}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma tarefa concluída</Text>
            <Text style={styles.emptySubtext}>
              As tarefas que você completar aparecerão aqui
            </Text>
          </View>
        }
        contentContainerStyle={sections.length === 0 ? styles.emptyList : undefined}
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
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  taskContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
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