import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const CreateFamilyModal = ({ visible, onClose }) => {
  const { createUserFamily, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateFamily = async () => {
    setIsLoading(true);
    try {
      const family = await createUserFamily();
      Alert.alert(
        'Família Criada! 🎉',
        `Sua família "${family.name}" foi criada com sucesso!\n\nChave da família: ${family.key}\n\nCompartilhe esta chave com os membros que deseja convidar.`,
        [
          {
            text: 'Copiar Chave',
            onPress: () => {
              // TODO: Implementar cópia para clipboard
              Alert.alert('Chave copiada!', `Chave: ${family.key}`);
              onClose();
            },
          },
          {
            text: 'OK',
            onPress: onClose,
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>🏠 Criar Nova Família</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={isLoading}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="home" size={60} color="#007AFF" />
            </View>

            <Text style={styles.description}>
              Você está prestes a criar uma nova família. Como administrador, você será o responsável por gerenciar os membros e aprovar tarefas.
            </Text>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                Uma chave única será gerada para que outros membros possam se juntar à sua família.
              </Text>
            </View>

            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsTitle}>O que você poderá fazer:</Text>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.benefitText}>Convidar membros da família</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.benefitText}>Compartilhar tarefas com todos</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.benefitText}>Aprovar tarefas dos dependentes</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.benefitText}>Gerenciar configurações da família</Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.button, styles.cancelButton]}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCreateFamily}
              style={[styles.button, styles.createButton]}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={18} color="white" />
                  <Text style={styles.createButtonText}>Criar Família</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
    marginLeft: 10,
    flex: 1,
  },
  benefitsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  createButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
    flexDirection: 'row',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
});

export default CreateFamilyModal;