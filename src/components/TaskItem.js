import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDateTime } from '../utils/dateUtils';
import { getCategoryById } from '../constants/categories';

export default function TaskItem({ task, onEdit, onDelete, onConclude }) {
  const category = getCategoryById(task.category);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{task.title}</Text>
        {category && (
          <View style={[styles.categoryPill, { backgroundColor: category.color }]}>
            <Text style={[styles.categoryPillText, { color: category.textColor }]}>{category.name}</Text>
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
});