import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { UserRole } from '../types/FamilyTypes';
import FirebaseAuthService from '../services/FirebaseAuthService';

interface HeaderProps {
  userName: string;
  userImage?: string;
  userRole?: UserRole;
  familyName?: string;
  familyId?: string;
  onUserNameChange: (newName: string) => void;
  onUserImageChange?: (newImageUrl: string) => void;
  onUserRoleChange?: (newRole: UserRole) => void;
  onSettings: () => void;
  onLogout: () => void;
  notificationCount?: number;
  onNotifications?: () => void;
  onManageFamily?: () => void;
  syncStatus?: {
    hasError?: boolean;
    isOnline?: boolean;
  };
}

export const Header: React.FC<HeaderProps> = ({ 
  userName, 
  userImage,
  userRole,
  familyName,
  familyId,
  onUserNameChange,
  onUserImageChange,
  onUserRoleChange, 
  onSettings, 
  onLogout,
  notificationCount = 0,
  onNotifications,
  onManageFamily,
  syncStatus,
}) => {
  const [userImageLocal, setUserImageLocal] = useState<string | null>(userImage || null);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [newName, setNewName] = useState(userName);
  const [selectedRole, setSelectedRole] = useState<UserRole>(userRole || 'admin');
  const [nameLoading, setNameLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para alterar a foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8, // Reduzir qualidade para upload mais rápido
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      
      // Atualizar imagem local imediatamente (para UX responsiva)
      setUserImageLocal(imageUri);
      setImageLoading(true);

      try {
        // Upload para Firebase
        const uploadResult = await FirebaseAuthService.uploadProfileImage(imageUri);
        
        if (uploadResult.success && uploadResult.photoURL) {
          // Atualizar com URL do Firebase
          setUserImageLocal(uploadResult.photoURL);
          
          // Notificar componente pai sobre mudança
          if (onUserImageChange) {
            onUserImageChange(uploadResult.photoURL);
          }
          
          Alert.alert('Sucesso', 'Foto de perfil atualizada com sucesso!');
        } else {
          // Reverter para imagem anterior em caso de erro
          setUserImageLocal(userImage || null);
          Alert.alert('Erro', uploadResult.error || 'Não foi possível atualizar a foto.');
        }
      } catch (error) {
        console.error('Erro no upload da imagem:', error);
        setUserImageLocal(userImage || null);
        Alert.alert('Erro', 'Erro inesperado ao atualizar foto.');
      } finally {
        setImageLoading(false);
      }
    }
  };

  const handleNameChange = async () => {
    if (!newName.trim()) {
      Alert.alert('Nome inválido', 'O nome não pode ficar em branco.');
      return;
    }

    if (newName.trim() === userName) {
      setNameModalVisible(false);
      return;
    }

    setNameLoading(true);
    
    try {
      const result = await FirebaseAuthService.updateUserName(newName.trim());
      
      if (result.success) {
        onUserNameChange(newName.trim());
        setNameModalVisible(false);
        Alert.alert('Sucesso', 'Nome atualizado com sucesso!');
      } else {
        Alert.alert('Erro', result.error || 'Não foi possível atualizar o nome.');
      }
    } catch (error) {
      console.error('Erro ao atualizar nome:', error);
      Alert.alert('Erro', 'Erro inesperado ao atualizar nome.');
    } finally {
      setNameLoading(false);
    }
  };

  const handleHistoryPress = () => {
    setMenuVisible(false);
    onSettings(); // Esta função irá abrir o histórico
  };

  const handleRoleChange = () => {
    if (onUserRoleChange && selectedRole !== userRole) {
      onUserRoleChange(selectedRole);
    }
    setProfileModalVisible(false);
  };

  const handleLogout = () => {
    // Chamada direta do logout sem confirmação duplicada
    onLogout();
  };

  return (
    <>
      <View style={[
        styles.container,
        syncStatus?.hasError 
          ? styles.containerError 
          : syncStatus?.isOnline 
            ? styles.containerOnline 
            : styles.containerOffline
      ]}>
        <View style={styles.leftSection}>
          <Pressable onPress={handleImagePicker} style={styles.avatarContainer} disabled={imageLoading}>
            {userImageLocal ? (
              <Image source={{ uri: userImageLocal }} style={styles.avatar} />
            ) : (
              <View style={styles.defaultAvatar}>
                <Ionicons name="person" size={30} color="#666" />
              </View>
            )}
            {imageLoading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : (
              <View style={styles.editIconContainer}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            )}
          </Pressable>
          
          <Pressable onPress={() => setNameModalVisible(true)} style={styles.userInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{userName}</Text>
              <Ionicons name="pencil" size={14} color="#999" style={styles.editNameIcon} />
            </View>
            {familyName ? (
              <Text style={styles.subtitle}>{familyName}</Text>
            ) : (
              <Text style={styles.subtitle}>Família não configurada</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.rightSection}>
          <View style={styles.menuContainer}>
            <Pressable onPress={() => setMenuVisible(!menuVisible)} style={styles.iconButton}>
              <Ionicons name="ellipsis-vertical" size={24} color="#333" />
            </Pressable>
            
            {menuVisible && (
              <View style={styles.dropdownMenu}>
                {onNotifications && (
                  <>
                    <Pressable onPress={() => { setMenuVisible(false); onNotifications(); }} style={styles.menuItem}>
                      <Ionicons name="notifications-outline" size={18} color="#333" />
                      <Text style={styles.menuText}>
                        Notificações {notificationCount > 0 && `(${notificationCount})`}
                      </Text>
                      {notificationCount > 0 && (
                        <View style={styles.notificationBadge}>
                          <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
                        </View>
                      )}
                    </Pressable>
                    <View style={styles.menuSeparator} />
                  </>
                )}
                {userRole === 'admin' && onManageFamily && (
                  <>
                    <Pressable onPress={() => { setMenuVisible(false); onManageFamily(); }} style={styles.menuItem}>
                      <Ionicons name="people-outline" size={18} color="#333" />
                      <Text style={styles.menuText}>Gerenciar Família</Text>
                    </Pressable>
                    <View style={styles.menuSeparator} />
                  </>
                )}
                <Pressable onPress={handleHistoryPress} style={styles.menuItem}>
                  <Ionicons name="settings-outline" size={18} color="#333" />
                  <Text style={styles.menuText}>Configurações</Text>
                </Pressable>
              </View>
            )}
          </View>
          
          <Pressable onPress={handleLogout} style={styles.iconButton}>
            <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
          </Pressable>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={nameModalVisible}
        onRequestClose={() => setNameModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Alterar Nome</Text>
            <TextInput
              style={styles.nameInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Digite seu novo nome"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setNameModalVisible(false)}
                disabled={nameLoading}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.saveButton, nameLoading && styles.buttonDisabled]} 
                onPress={handleNameChange}
                disabled={nameLoading}
              >
                {nameLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Salvar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal de Configurações de Perfil */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
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
                  color={selectedRole === 'admin' ? '#fff' : '#007AFF'} 
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
                  color={selectedRole === 'dependente' ? '#fff' : '#007AFF'} 
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
                onPress={() => setProfileModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleRoleChange}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1, // Reduzir de 2 para 1
    },
    shadowOpacity: 0.05, // Reduzir de 0.1 para 0.05
    shadowRadius: 2, // Reduzir de 3.84 para 2
    elevation: 3, // Reduzir de 8 para 3
    zIndex: 1000,
  },
  containerOnline: {
    shadowColor: '#27ae60', // Verde para online/sincronizado
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderBottomColor: '#27ae60',
    borderBottomWidth: 2,
  },
  containerError: {
    shadowColor: '#e74c3c', // Vermelho para erro
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderBottomColor: '#e74c3c',
    borderBottomWidth: 2,
  },
  containerOffline: {
    shadowColor: '#f39c12', // Laranja para offline
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderBottomColor: '#f39c12',
    borderBottomWidth: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 16,
  },
  menuContainer: {
    position: 'relative',
    zIndex: 9999,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 9998,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  menuSeparator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editNameIcon: {
    marginLeft: 6,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  nameInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  notificationBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Estilos para modal de configurações de perfil
  roleSelectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  roleOptionsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  roleOption: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 8,
    textAlign: 'center',
  },
  roleOptionTextSelected: {
    color: '#fff',
  },
  roleDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  roleDescriptionSelected: {
    color: '#e6f3ff',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  familyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginTop: 2,
  },
  familyActionText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
  },
});