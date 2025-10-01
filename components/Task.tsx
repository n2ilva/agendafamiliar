import { format, parseISO } from 'date-fns';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Checkbox } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoryContext';
import { useTasks } from '../context/TaskContext';

export type TaskData = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  categoryId?: string; // referência estável para Category
  date?: string; // due date
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  createdBy?: string;
  approvedBy?: string;
};

type TaskProps = {
  task: TaskData;
  onToggleCompletion?: (id: string) => void;
};

// Cores agora vêm da categoria dinâmica (fallback default)
const DEFAULT_CATEGORY_COLOR = '#827717';

const statusColors: Record<string, string> = {
  pending: '#ffa000',
  approved: '#2e7d32',
  rejected: '#c62828',
  completed: '#1565c0'
};

const Task = ({ task, onToggleCompletion }: TaskProps) => {
  const { user } = useAuth();
  const { approveTask, rejectTask, getUserName } = useTasks();
  const { categories } = useCategories();
  const catColor = React.useMemo(() => {
    if (!task.categoryId) return DEFAULT_CATEGORY_COLOR;
    const c = categories.find(c => c.id === task.categoryId);
    return c?.color || DEFAULT_CATEGORY_COLOR;
  }, [task.categoryId, categories]);
  const containerStyle = {
    ...styles.container,
    borderLeftColor: catColor,
    opacity: task.status === 'rejected' ? 0.5 : 1,
  };

  const handlePress = () => {
    if (onToggleCompletion) {
      onToggleCompletion(task.id);
    }
  };

  return (
    <Pressable style={containerStyle} onPress={handlePress}>
      <Checkbox
        status={task.completed ? 'checked' : 'unchecked'}
        onPress={() => {
          if (task.status === 'pending') return; // não permite completar antes de aprovação
          handlePress();
        }}
        disabled={task.status === 'pending'}
      />
      <View style={styles.textContainer}>
        <Text style={[styles.taskText, task.completed && styles.completedTaskText]}>
          {task.title}
        </Text>
        {task.status && (
          <Text style={[styles.statusBadge, { backgroundColor: statusColors[task.status] || '#999' }]}>
            {task.status.toUpperCase()}
          </Text>
        )}
        {task.description && (
          <Text style={styles.descriptionText}>{task.description}</Text>
        )}
        {task.status && task.status !== 'pending' && task.approvedBy && (
          <Text style={styles.approvedBy}>Aprovado por: {getUserName(task.approvedBy) || task.approvedBy}</Text>
        )}
        {task.date && (
          <Text style={styles.dateText}>
            {format(parseISO(task.date), "dd/MM/yyyy HH:mm")}
          </Text>
        )}
        {user?.role === 'admin' && task.status === 'pending' && (
          <View style={styles.adminActions}>
            <Pressable style={[styles.actionButton, styles.approve]} onPress={() => approveTask(task.id)}>
              <Text style={styles.actionText}>Aprovar</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.reject]} onPress={() => rejectTask(task.id)}>
              <Text style={styles.actionText}>Rejeitar</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 5,
    borderLeftWidth: 5,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    // Shadow for Android
    elevation: 3,
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
  },
  taskText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    color: 'gray',
    fontWeight: 'normal',
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: 'gray',
    marginTop: 4,
  },
  adminActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  approve: {
    backgroundColor: '#2e7d32',
  },
  reject: {
    backgroundColor: '#c62828',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  approvedBy: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
    fontStyle: 'italic',
  },
});

export default Task;
