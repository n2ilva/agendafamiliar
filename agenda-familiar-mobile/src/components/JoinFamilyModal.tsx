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

interface JoinFamilyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const JoinFamilyModal: React.FC<JoinFamilyModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [familyCode, setFamilyCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinFamily = async () => {
    if (!familyCode.trim()) {
      Alert.alert('Erro', 'O código da família é obrigatório');
      return;
    }

    if (familyCode.length !== familyConstants.codeLength) {
      Alert.alert('Erro', `O código da família deve ter ${familyConstants.codeLength} caracteres`);
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    setLoading(true);
    try {
      // First, get the family by code
      const family = await familyService.getFamilyByCode(familyCode.trim().toUpperCase());

      if (!family) {
        Alert.alert('Erro', 'Código da família não encontrado');
        return;
      }

      if (family.members.includes(user.uid)) {
        Alert.alert('Erro', 'Você já é membro desta família');
        return;
      }

      if (family.members.length >= familyConstants.maxMembers) {
        Alert.alert('Erro', 'Esta família já atingiu o limite máximo de membros');
        return;
      }

      // Join the family
      await familyService.joinFamily(family.id!, user.uid);

      Alert.alert(
        'Sucesso',
        `Você entrou na família "${family.name}" com sucesso!`,
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (error) {
      console.error('Error joining family:', error);
      Alert.alert('Erro', 'Não foi possível entrar na família');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFamilyCode('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Entrar na Família</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.description}>
              Digite o código da família que você deseja entrar.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código da Família *</Text>
              <TextInput
                style={styles.input}
                value={familyCode}
                onChangeText={(text) => setFamilyCode(text.toUpperCase())}
                placeholder="Digite o código da família"
                maxLength={familyConstants.codeLength}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Text style={styles.hint}>
                {familyCode.length}/{familyConstants.codeLength} caracteres
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>ℹ️ Como obter o código?</Text>
              <Text style={styles.infoText}>
                Peça ao administrador da família para compartilhar o código único
                gerado durante a criação da família.
              </Text>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>⚠️ Importante</Text>
              <Text style={styles.warningText}>
                • Você só pode fazer parte de uma família por vez{'\n'}
                • Certifique-se de que o código está correto{'\n'}
                • Entre em contato com o administrador se tiver problemas
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.joinButton, loading && styles.joinButtonDisabled]}
              onPress={handleJoinFamily}
              disabled={loading}
            >
              <Text style={styles.joinText}>
                {loading ? 'Entrando...' : 'Entrar na Família'}
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
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
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
  warningBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
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
  joinButton: {
    flex: 1,
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#ccc',
  },
  joinText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});