import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ConfiguracoesScreen = ({ navigation }) => {
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(3600); // padrão: 1h

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Configurações</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notificações</Text>
          <Text style={styles.subtitle}>Receba um lembrete antes do vencimento das tarefas e um alerta quando vencer.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ fontSize: 16, flex: 1 }}>Lembrete antes do vencimento</Text>
            <TouchableOpacity
              style={[styles.button, reminderEnabled ? styles.primaryButton : styles.secondaryButton]}
              onPress={() => setReminderEnabled(!reminderEnabled)}
            >
              <Ionicons name={reminderEnabled ? 'notifications' : 'notifications-off'} size={20} color={reminderEnabled ? 'white' : '#007AFF'} />
              <Text style={[styles.buttonText, { color: reminderEnabled ? 'white' : '#007AFF' }]}>{reminderEnabled ? 'Ativado' : 'Desativado'}</Text>
            </TouchableOpacity>
          </View>
          {reminderEnabled && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, flex: 1 }}>Tempo antes:</Text>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { minWidth: 80, marginRight: 5 }]}
                onPress={() => setReminderTime(3600)}
              >
                <Text style={[styles.buttonText, { color: '#007AFF' }]}>1h</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { minWidth: 80, marginRight: 5 }]}
                onPress={() => setReminderTime(1800)}
              >
                <Text style={[styles.buttonText, { color: '#007AFF' }]}>30min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { minWidth: 80 }]}
                onPress={() => setReminderTime(300)}
              >
                <Text style={[styles.buttonText, { color: '#007AFF' }]}>5min</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ConfiguracoesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});