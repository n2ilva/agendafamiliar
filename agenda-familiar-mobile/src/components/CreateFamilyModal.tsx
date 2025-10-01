import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { familyService } from '../services/familyService';
import { familyConstants } from '../constants/family';

interface CreateFamilyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateFamilyModal: React.FC<CreateFamilyModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(false);

  const generateFamilyCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < familyConstants.codeLength; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Erro', 'O nome da família é obrigatório');
      return;
    }

    if (familyName.length > familyConstants.maxNameLength) {
      Alert.alert('Erro', `O nome da família deve ter no máximo ${familyConstants.maxNameLength} caracteres`);
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    setLoading(true);
    try {
      const familyCode = generateFamilyCode();
      await familyService.createFamily({
        name: familyName.trim(),
        code: familyCode,
        adminId: user.uid,
        members: [user.uid],
      });

      Alert.alert(
        'Sucesso',
        `Família "${familyName}" criada com sucesso!\n\nCódigo da família: ${familyCode}\n\nCompartilhe este código com os membros da família.`,
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (error) {
      console.error('Error creating family:', error);
      Alert.alert('Erro', 'Não foi possível criar a família');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFamilyName('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Criar Família</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.description}>
              Crie uma nova família para organizar tarefas com seus familiares.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome da Família *</Text>
              <TextInput
                style={styles.input}
                value={familyName}
                onChangeText={setFamilyName}
                placeholder="Digite o nome da família"
                maxLength={familyConstants.maxNameLength}
              />
              <Text style={styles.hint}>
                {familyName.length}/{familyConstants.maxNameLength} caracteres
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>ℹ️ Sobre códigos de família</Text>
              <Text style={styles.infoText}>
                Um código único será gerado automaticamente para sua família.
                Compartilhe este código com os membros que deseja convidar.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreateFamily}
              disabled={loading}
            >
              <Text style={styles.createText}>
                {loading ? 'Criando...' : 'Criar Família'}
              </Text>
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
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 24,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});