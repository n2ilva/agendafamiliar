import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { getHeaderStyles } from '../HeaderStyles';
import { UserRole } from '../../../types/FamilyTypes';
import { THEME } from '../../../utils/colors';

interface ProfileSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  visible,
  onClose,
  currentRole,
  onRoleChange,
}) => {
  const { colors } = useTheme();
  const styles = getHeaderStyles(colors);
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole || 'admin');

  useEffect(() => {
    if (visible) {
      setSelectedRole(currentRole || 'admin');
    }
  }, [visible, currentRole]);

  const handleSave = () => {
    if (selectedRole !== currentRole) {
      onRoleChange(selectedRole);
    }
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Configurações de Perfil</Text>
          
          <Text style={styles.roleSelectionTitle}>Escolha seu perfil:</Text>
          
          <View style={styles.roleOptionsContainer}>
            <Pressable 
              style={[
                styles.roleOption, 
                selectedRole === 'admin' && styles.roleOptionSelected
              ]} 
              onPress={() => setSelectedRole('admin')}
            >
              <Ionicons 
                name="shield-checkmark" 
                size={24} 
                color={selectedRole === 'admin' ? '#fff' : THEME.primary} 
              />
              <Text style={[
                styles.roleOptionText, 
                selectedRole === 'admin' && styles.roleOptionTextSelected
              ]}>
                Administrador
              </Text>
              <Text style={[
                styles.roleDescription,
                selectedRole === 'admin' && styles.roleDescriptionSelected
              ]}>
                Gerencia tarefas da família
              </Text>
            </Pressable>

            <Pressable 
              style={[
                styles.roleOption, 
                selectedRole === 'dependente' && styles.roleOptionSelected
              ]} 
              onPress={() => setSelectedRole('dependente')}
            >
              <Ionicons 
                name="person" 
                size={24} 
                color={selectedRole === 'dependente' ? '#fff' : THEME.primary} 
              />
              <Text style={[
                styles.roleOptionText, 
                selectedRole === 'dependente' && styles.roleOptionTextSelected
              ]}>
                Dependente
              </Text>
              <Text style={[
                styles.roleDescription,
                selectedRole === 'dependente' && styles.roleDescriptionSelected
              ]}>
                Precisa de aprovação para concluir tarefas
              </Text>
            </Pressable>
          </View>
          
          <View style={styles.modalButtons}>
            <Pressable 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.modalButton, styles.saveButton]} 
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Salvar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
