import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatHistoryDateTime } from '../utils/dateUtils';

const HistoryItem = ({ item }) => (
  <View style={styles.historyItem}>
    <Text style={styles.historyTitle}>{item.title}</Text>
    <Text>Concluído por: {item.completedBy}</Text>
    <View style={styles.completionInfo}>
      <Ionicons name="time" size={16} color="#666" />
      <Text style={styles.completionDate}>
        Concluído {formatHistoryDateTime(item.completionDate)}
      </Text>
    </View>
    <Text>Aprovado: {item.approved ? 'Sim' : 'Não'}</Text>
  </View>
);

export default function HistoryScreen({ route, navigation }) {
  const { history } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico de Tarefas</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView>
        {history.length > 0 ? (
          history.map(item => <HistoryItem key={item.id} item={item} />)
        ) : (
          <Text style={styles.noHistoryText}>Nenhuma tarefa no histórico.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    padding: 5,
  },
  placeholder: {
    width: 34, // Mesmo tamanho do backButton para centralizar o título
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  historyItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  completionDate: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  noHistoryText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
});