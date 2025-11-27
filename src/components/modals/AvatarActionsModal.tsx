import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { useTheme } from '../../contexts/theme.context';
import { getHeaderStyles } from '../header/header.styles';
import { HeaderAvatar } from '../header/HeaderAvatar';

interface AvatarActionsModalProps {
  visible: boolean;
  onClose: () => void;
  onChooseEmoji: () => void;
  userProfileIcon?: string;
}

export const AvatarActionsModal: React.FC<AvatarActionsModalProps> = ({
  visible,
  onClose,
  onChooseEmoji,
  userProfileIcon,
}) => {
  const { colors } = useTheme();
  const styles = getHeaderStyles(colors);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Emoji de Perfil</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <HeaderAvatar userProfileIcon={userProfileIcon} />
          </View>
          <View style={styles.modalButtonsColumn}>
            <Pressable style={[styles.fullWidthButton, styles.secondaryBtn]} onPress={() => { onClose(); onChooseEmoji(); }}>
              <Text style={styles.buttonText}>Escolher Emoji</Text>
            </Pressable>
            <Pressable style={[styles.fullWidthButton, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
