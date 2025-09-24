import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { USER_TYPES, TASK_STATUS } from '../constants/userTypes';
import { saveData, loadData } from '../services/storage';

export default function ApprovalsScreen({ navigation }) {
  const { user, userType, isAdmin } = useAuth();
  const [pendingTasks, setPendingTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      const { tasks, history: loadedHistory } = await loadData();
      const pending = tasks.filter(task => task.status === TASK_STATUS.AWAITING_APPROVAL);
      
      setPendingTasks(pending);
      setAllTasks(tasks);
      setHistory(loadedHistory || []);
    } catch (error) {
      console.error('Erro ao carregar aprovações:', error);
    }
  };

  const handleApproveTask = (task) => {
    Alert.alert(
      "Aprovar Tarefa",
      `Aprovar a conclusão da tarefa "${task.title}" por ${task.completedByName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Aprovar", style: "default", onPress: () => approveTask(task) }
      ]
    );
  };

  const handleRejectTask = (task) => {
    Alert.alert(
      "Rejeitar Tarefa",
      `Rejeitar a conclusão da tarefa "${task.title}"? A tarefa voltará para pendente.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Rejeitar", style: "destructive", onPress: () => rejectTask(task) }
      ]
    );
  };

  const approveTask = async (task) => {
    try {
      // Move para o histórico
      const approvedTask = {
        ...task,
        status: TASK_STATUS.COMPLETED,
        approved: true,
        approvedBy: user?.email || user?.name,
        approvedByName: user?.name,
        approvedDate: new Date().toISOString()
      };

      const newHistory = [...history, approvedTask];
      const updatedTasks = allTasks.filter(t => t.id !== task.id);
      
      await saveData(updatedTasks, newHistory, user, userType);
      
      setPendingTasks(pendingTasks.filter(t => t.id !== task.id));
      setAllTasks(updatedTasks);
      setHistory(newHistory);
      
      Alert.alert("Sucesso", "Tarefa aprovada com sucesso!");
    } catch (error) {
      console.error('Erro ao aprovar tarefa:', error);
      Alert.alert("Erro", "Erro ao aprovar a tarefa.");
    }
  };

  const rejectTask = async (task) => {
    try {
      // Volta o status para pendente
      const rejectedTask = {
        ...task,
        status: TASK_STATUS.PENDING,
        completedBy: null,
        completedByName: null,
        completionDate: null,
        approved: false,
        rejectedBy: user?.email || user?.name,
        rejectedByName: user?.name,
        rejectedDate: new Date().toISOString(),
        rejectionReason: 'Rejeitado pelo administrador'
      };

      const updatedTasks = allTasks.map(t => t.id === task.id ? rejectedTask : t);
      
      await saveData(updatedTasks, history, user, userType);
      
      setPendingTasks(pendingTasks.filter(t => t.id !== task.id));
      setAllTasks(updatedTasks);
      
      Alert.alert("Rejeitado", "A tarefa foi rejeitada e voltou para pendente.");
    } catch (error) {
      console.error('Erro ao rejeitar tarefa:', error);
      Alert.alert("Erro", "Erro ao rejeitar a tarefa.");
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Trabalho': 'briefcase-outline',
      'Pessoal': 'person-outline',
      'Saude': 'fitness-outline',
      'Estudos': 'school-outline',
      'Família': 'home-outline',
      'Compras': 'bag-outline',
    };
    return icons[category] || 'document-outline';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isAdmin() ? 'Aprovações Pendentes' : 'Solicitações de Conclusão'}
        </Text>
        <TouchableOpacity onPress={loadPendingApprovals}>
          <Ionicons name="refresh" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {pendingTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>Nenhuma aprovação pendente</Text>
            <Text style={styles.emptyStateSubtext}>Todas as tarefas estão em dia!</Text>
          </View>
        ) : (
          pendingTasks.map(task => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={styles.taskTitleContainer}>
                  <Ionicons 
                    name={getCategoryIcon(task.category)} 
                    size={20} 
                    color="#007AFF" 
                  />
                  <Text style={styles.taskTitle}>{task.title}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Aguardando</Text>
                </View>
              </View>

              <Text style={styles.taskDescription}>{task.description}</Text>

              <View style={styles.taskDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>Concluído por: {task.completedByName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>Em: {formatDate(task.completionDate)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="pricetag-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>Categoria: {task.category}</Text>
                </View>
              </View>

              {isAdmin() && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton]} 
                    onPress={() => handleRejectTask(task)}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                    <Text style={styles.rejectButtonText}>Rejeitar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.approveButton]} 
                    onPress={() => handleApproveTask(task)}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.approveButtonText}>Aprovar</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!isAdmin() && (
                <View style={styles.infoMessage}>
                  <Ionicons name="information-circle-outline" size={16} color="#666" />
                  <Text style={styles.infoText}>Aguardando aprovação do administrador</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  taskDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic',
  },
});