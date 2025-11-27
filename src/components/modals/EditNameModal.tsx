import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/theme.context';
import { getHeaderStyles } from '../header/header.styles';
import Alert from '../../utils/helpers/alert';

interface EditNameModalProps {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  onSave: (newName: string) => Promise<boolean>;
}

export const EditNameModal: React.FC<EditNameModalProps> = ({
  visible,
  onClose,
  currentName,
  onSave,
}) => {
  const { colors } = useTheme();
  const styles = getHeaderStyles(colors);
  const [newName, setNewName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setNewName(currentName);
    }
  }, [visible, currentName]);

  const handleSave = async () => {
    if (!newName.trim()) {
      Alert.alert('Nome inválido', 'O nome não pode ficar em branco.');
      return;
    }

    if (newName.trim() === currentName) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      const success = await onSave(newName.trim());
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving name:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Alterar Nome</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Digite seu novo nome"
            placeholderTextColor={colors.textTertiary}
            autoFocus
          />
          <View style={styles.modalButtons}>
            <Pressable 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </Pressable>
            <Pressable 
              style={[styles.modalButton, styles.saveButton, loading && styles.buttonDisabled]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Salvar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
