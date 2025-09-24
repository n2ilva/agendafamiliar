import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const ConfiguracoesScreen = ({ navigation }) => {
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(3600); // padrão: 1h
  const [syncStatus, setSyncStatus] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user, userType, syncToCloud, syncFromCloud, getSyncStatus, isConvidado } = useAuth();

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Erro ao carregar status de sincronização:', error);
    }
  };

  const handleSyncToCloud = async () => {
    if (isConvidado()) {
      Alert.alert('Aviso', 'Usuários convidados não podem sincronizar dados na nuvem.');
      return;
    }

    setIsSyncing(true);
    try {
      await syncToCloud();
      Alert.alert('Sucesso', 'Dados sincronizados com a nuvem!');
      await loadSyncStatus();
    } catch (error) {
      console.error('Erro na sincronização:', error);
      Alert.alert('Erro', 'Falha ao sincronizar dados. Verifique sua conexão.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncFromCloud = async () => {
    if (isConvidado()) {
      Alert.alert('Aviso', 'Usuários convidados não podem sincronizar dados na nuvem.');
      return;
    }

    Alert.alert(
      'Confirmação',
      'Isso irá baixar os dados da nuvem e pode sobrescrever dados locais. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setIsSyncing(true);
            try {
              await syncFromCloud();
              Alert.alert('Sucesso', 'Dados baixados da nuvem!');
              await loadSyncStatus();
            } catch (error) {
              console.error('Erro no download:', error);
              Alert.alert('Erro', 'Falha ao baixar dados. Verifique sua conexão.');
            } finally {
              setIsSyncing(false);
            }
          }
        }
      ]
    );
  };

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

        {!isConvidado() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>☁️ Sincronização na Nuvem</Text>
            <Text style={styles.subtitle}>
              Mantenha seus dados sincronizados entre dispositivos através do Firebase.
            </Text>

            <View style={styles.syncStatus}>
              <Ionicons
                name={syncStatus?.status === 'completed' ? 'cloud-done' : 'cloud-offline'}
                size={24}
                color={syncStatus?.status === 'completed' ? '#4CAF50' : '#FF9800'}
              />
              <Text style={styles.syncStatusText}>
                {syncStatus?.status === 'completed'
                  ? `Última sincronização: ${new Date(syncStatus.timestamp).toLocaleString('pt-BR')}`
                  : 'Dados não sincronizados'
                }
              </Text>
            </View>

            <View style={styles.syncButtons}>
              <TouchableOpacity
                style={[styles.syncButton, styles.uploadButton, isSyncing && styles.disabledButton]}
                onPress={handleSyncToCloud}
                disabled={isSyncing}
              >
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.syncButtonText}>
                  {isSyncing ? 'Sincronizando...' : 'Enviar para Nuvem'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.syncButton, styles.downloadButton, isSyncing && styles.disabledButton]}
                onPress={handleSyncFromCloud}
                disabled={isSyncing}
              >
                <Ionicons name="cloud-download" size={20} color="#fff" />
                <Text style={styles.syncButtonText}>
                  {isSyncing ? 'Baixando...' : 'Baixar da Nuvem'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.syncInfo}>
              💡 Dica: A sincronização automática acontece quando você faz login.
              Use os botões acima para sincronização manual.
            </Text>
          </View>
        )}
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
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  syncStatusText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  syncButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 0.48,
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
  },
  downloadButton: {
    backgroundColor: '#2196F3',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  syncInfo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});