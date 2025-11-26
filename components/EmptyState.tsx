import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  activeTab: 'today' | 'upcoming';
}

export const EmptyState: React.FC<EmptyStateProps> = ({ activeTab }) => {
  return (
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
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
