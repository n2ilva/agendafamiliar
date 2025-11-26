import React, { useState } from 'react';
import { Modal, View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { getHeaderStyles } from '../HeaderStyles';
import { AVAILABLE_EMOJIS } from '../../../utils/TaskConstants';
import Alert from '../../../utils/Alert';

interface AvatarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentIcon?: string;
  onSelectIcon: (iconName: string) => Promise<void>;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  visible,
  onClose,
  currentIcon,
  onSelectIcon,
}) => {
  const { colors } = useTheme();
  const styles = getHeaderStyles(colors);
  const [selectedIcon, setSelectedIcon] = useState<string | undefined>(currentIcon);
  const [loading, setLoading] = useState(false);

  // Update local state when modal opens or currentIcon changes
  React.useEffect(() => {
    if (visible) {
      setSelectedIcon(currentIcon);
    }
  }, [visible, currentIcon]);

  const handleConfirm = async () => {
    if (!selectedIcon) {
      Alert.alert('Atenção', 'Por favor, selecione um ícone.');
      return;
    }

    setLoading(true);
    try {
      await onSelectIcon(selectedIcon);
      onClose();
    } catch (e) {
      console.error('Error selecting icon:', e);
      Alert.alert('Erro', 'Erro ao atualizar ícone.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, styles.iconModalContent]}>
          <Text style={styles.modalTitle}>Escolher Emoji</Text>
          <ScrollView 
            style={styles.iconScrollView}
            contentContainerStyle={styles.iconScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.iconGrid}>
              {AVAILABLE_EMOJIS.map(icon => (
                <Pressable 
                  key={icon.name} 
                  style={[
                    styles.iconOption,
                    selectedIcon === icon.name && styles.iconOptionSelected
                  ]} 
                  onPress={() => setSelectedIcon(icon.name)}
                >
                  <Text style={styles.emojiIcon}>{icon.emoji}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalButtons}>
            <Pressable 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={() => {
                onClose();
                setSelectedIcon(currentIcon);
              }}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </Pressable>
            <Pressable 
              style={[styles.modalButton, styles.primaryButton]} 
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Confirmar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
