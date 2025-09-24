import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { isValidFamilyKey } from '../constants/family';

const JoinFamilyModal = ({ visible, onClose }) => {
  const { joinFamily } = useAuth();
  const [familyKey, setFamilyKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinFamily = async () => {
    if (!familyKey.trim()) {
      Alert.alert('Erro', 'Digite a chave da família');
      return;
    }

    if (!isValidFamilyKey(familyKey.trim())) {
      Alert.alert('Erro', 'Formato da chave inválido. A chave deve ter 8 caracteres (letras e números)');
      return;
    }

    setIsLoading(true);
    try {
      await joinFamily(familyKey.trim());
      Alert.alert(
        'Sucesso! 🎉',
        'Você entrou na família com sucesso! Agora você pode ver e compartilhar tarefas com outros membros.',
        [
          {
            text: 'OK',
            onPress: () => {
              setFamilyKey('');
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFamilyKey = (text) => {
    // Remove caracteres inválidos e converte para maiúscula
    const cleaned = text.replace(/[^A-Z0-9]/g, '').substring(0, 8);
    setFamilyKey(cleaned);
  };

  const handleClose = () => {
    if (!isLoading) {
      setFamilyKey('');
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
            <Text style={styles.title}>👨‍👩‍👧‍👦 Entrar na Família</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={isLoading}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.description}>
              Digite a chave da família que você recebeu para se juntar e compartilhar tarefas com outros membros.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Chave da Família</Text>
              <TextInput
                style={styles.input}
                value={familyKey}
                onChangeText={formatFamilyKey}
                placeholder="Exemplo: ABC12345"
                maxLength={8}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect={false}
                editable={!isLoading}
              />
              <Text style={styles.inputHelp}>
                A chave deve ter exatamente 8 caracteres (letras e números)
              </Text>
            </View>

            <View style={styles.keyPreview}>
              <Text style={styles.keyPreviewLabel}>Preview da chave:</Text>
              <View style={styles.keyPreviewContainer}>
                <Text style={styles.keyPreviewText}>
                  {familyKey.padEnd(8, '_').split('').join(' ')}
                </Text>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                Após entrar na família, você poderá ver todas as tarefas compartilhadas e criar novas tarefas (dependendo do seu tipo de usuário).
              </Text>
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
              onPress={handleJoinFamily}
              style={[
                styles.button,
                styles.joinButton,
                (!familyKey.trim() || familyKey.length !== 8) && styles.disabledButton,
              ]}
              disabled={isLoading || !familyKey.trim() || familyKey.length !== 8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="enter-outline" size={18} color="white" />
                  <Text style={styles.joinButtonText}>Entrar na Família</Text>
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
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 25,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  inputHelp: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  keyPreview: {
    marginBottom: 20,
  },
  keyPreviewLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  keyPreviewContainer: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  keyPreviewText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
    marginLeft: 10,
    flex: 1,
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
  joinButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
    flexDirection: 'row',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
});

export default JoinFamilyModal;