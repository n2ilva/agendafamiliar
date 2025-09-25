import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDateTime } from '../utils/dateUtils';
import { getCategoryById } from '../constants/categories';

export default function TaskItem({ task, onEdit, onDelete, onConclude, highlightColor }) {
  const category = getCategoryById(task.category);

  // Verificar se a tarefa está vencida
  const isOverdue = task.dueDate && new Date(task.dueDate) <= new Date();

  // Função para formatar informação de repetição
  const getRepeatInfo = () => {
    if (!task.repeat || task.repeat === 'never') {
      return 'Não repete';
    }
    
    if (task.repeat === 'daily') {
      return 'Todos os dias';
    }
    
    if (task.repeat === 'weekly') {
      if (task.repeatDays && task.repeatDays.length > 0) {
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const selectedDays = task.repeatDays.map(day => dayNames[day]).join(', ');
        return `Semanal: ${selectedDays}`;
      }
      return 'Semanal';
    }
    
    return 'Não repete';
  };

  return (
    <View style={[styles.card, highlightColor && { shadowColor: highlightColor, borderColor: highlightColor, borderWidth: 2 }, isOverdue && styles.overdueCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{task.title}</Text>
        {category && (
          <View style={[styles.categoryPill, { backgroundColor: category.color }]}>
            <Text style={[styles.categoryPillText, { color: category.textColor }]}>{category.name}</Text>
          </View>
        )}
        {isOverdue && (
          <View style={styles.overdueBadge}>
            <Ionicons name="alert-circle" size={16} color="#FF3B30" />
            <Text style={styles.overdueBadgeText}>VENCIDA</Text>
          </View>
        )}
      </View>
      <Text style={styles.description}>{task.description}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.creatorInfo}>
          <Ionicons name="person-outline" size={14} color="#666" />
          <Text style={styles.creatorText}>{task.createdBy}</Text>
        </View>
        <View style={styles.dateInfo}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.dateText}>{formatDateTime(task.dueDate)}</Text>
        </View>
      </View>
      <View style={styles.repeatInfo}>
        <Ionicons name="repeat-outline" size={14} color="#666" />
        <Text style={styles.repeatText}>{getRepeatInfo()}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.concludeButton]} onPress={onConclude}>
          <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Concluir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={onEdit}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Apagar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  category: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f1f3f4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 10,
    marginTop: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
    cursor: 'pointer', // Melhora UX na web
    userSelect: 'none', // Previne seleção de texto na web
  },
  concludeButton: {
    backgroundColor: '#34C759',
  },
  editButton: {
    backgroundColor: '#FF9500',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '500',
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  repeatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  repeatText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  overdueCard: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
    marginLeft: 8,
  },
  overdueBadgeText: {
    color: '#FF3B30',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});