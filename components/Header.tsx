import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../utils/colors';
import * as ImagePicker from 'expo-image-picker';
import { UserRole } from '../types/FamilyTypes';
import LocalAuthService from '../services/LocalAuthService';
import Alert from '../utils/Alert';

interface HeaderProps {
  userName: string;
  userImage?: string;
  userProfileIcon?: string;
  userRole?: UserRole;
  familyName?: string;
  familyId?: string;
  onUserNameChange: (newName: string) => void;
  onUserImageChange?: (newImageUrl: string) => void;
  onUserRoleChange?: (newRole: UserRole) => void;
  onSettings: () => void;
  onHistory: () => void;
  onInfo: () => void;
  onLogout: () => void;
  notificationCount?: number;
  onNotifications?: () => void;
  onManageFamily?: () => void;
  onJoinFamilyByCode?: (code: string) => Promise<void> | void;
  syncStatus?: {
    hasError?: boolean;
    isOnline?: boolean;
  };
}

export const Header: React.FC<HeaderProps> = ({ 
  userName, 
  userImage,
  userProfileIcon,
  userRole,
  familyName,
  familyId,
  onUserNameChange,
  onUserImageChange,
  onUserRoleChange, 
  onSettings,
  onHistory,
  onInfo,
  onLogout,
  notificationCount = 0,
  onNotifications,
  onManageFamily,
  onJoinFamilyByCode,
  syncStatus,
}) => {
  const [userImageLocal, setUserImageLocal] = useState<string | null>(userImage || null);
  const [profileIconLocal, setProfileIconLocal] = useState<string | undefined>(userProfileIcon);
  const [avatarActionsVisible, setAvatarActionsVisible] = useState(false);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [newName, setNewName] = useState(userName);
  const [selectedRole, setSelectedRole] = useState<UserRole>(userRole || 'admin');
  const [nameLoading, setNameLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [familyCode, setFamilyCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const sanitizeInviteCode = (value: string) => {
    // Mantém apenas A-Z e 0-9, converte para maiúsculas e limita a 6 chars
    return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  };

  const handleImagePicker = async () => {
    console.log('📸 Iniciando seleção de imagem...');
    console.log('👤 Props recebidas no Header:', { userName, userImage, userRole, familyName });
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📸 Status das permissões:', status);
      
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

      console.log('📸 Resultado do picker:', result.canceled ? 'Cancelado' : 'Imagem selecionada');

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📸 URI da imagem:', imageUri);
        
        // Atualizar imagem local imediatamente (para UX responsiva)
        setUserImageLocal(imageUri);
        setImageLoading(true);

        try {
          console.log('📤 Iniciando upload da imagem de perfil (serviço de armazenamento)');
          // Upload para o serviço de armazenamento configurado (local/remote stub)
          const uploadResult = await LocalAuthService.uploadProfileImage(imageUri);

          console.log('📤 Resultado do upload:', uploadResult);

          if (uploadResult.success && uploadResult.photoURL) {
            // Atualizar com URL retornada pelo serviço
            setUserImageLocal(uploadResult.photoURL);
            setProfileIconLocal(undefined); // limpamos ícone se existia
            
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
          console.error('❌ Erro no upload da imagem:', error);
          setUserImageLocal(userImage || null);
          Alert.alert('Erro', 'Erro inesperado ao atualizar foto.');
        } finally {
          setImageLoading(false);
        }
      }
    } catch (error) {
      console.error('❌ Erro geral no handleImagePicker:', error);
      Alert.alert('Erro', 'Erro ao acessar a galeria de imagens.');
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
  const result = await LocalAuthService.updateUserName(newName.trim());
      
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

  const openJoinFamily = () => {
    setMenuVisible(false);
    setFamilyCode('');
    setCodeError(null);
    setJoinModalVisible(true);
  };

  const handleJoinFamily = async () => {
    const code = sanitizeInviteCode(familyCode);
    if (code.length !== 6) {
      Alert.alert('Código inválido', 'O código deve ter exatamente 6 caracteres (A–Z e 0–9).');
      return;
    }
    if (!onJoinFamilyByCode) return;
    setJoinLoading(true);
    try {
      await onJoinFamilyByCode(code);
      setJoinModalVisible(false);
      Alert.alert('Sucesso', 'Você entrou na nova família.');
    } catch (e: any) {
      const msg = e?.message || 'Não foi possível entrar na família.';
      Alert.alert('Erro', msg);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const result = await LocalAuthService.removeProfilePhoto();
      if (result.success) {
        setUserImageLocal(null);
        Alert.alert('Sucesso', 'Foto removida.');
      } else {
        Alert.alert('Erro', result.error || 'Falha ao remover foto.');
      }
    } catch (e) {
      Alert.alert('Erro', 'Erro inesperado ao remover foto.');
    }
  };

  const AVAILABLE_ICONS = ['person','happy','planet','rocket','sparkles','leaf','paw','heart','star','game-controller','book','bicycle'];

  const handleSelectIcon = async (icon: string) => {
    try {
      const result = await LocalAuthService.setProfileIcon(icon);
      if (result.success) {
        setProfileIconLocal(icon);
        setUserImageLocal(null);
        setIconPickerVisible(false);
        Alert.alert('Sucesso', 'Ícone de perfil atualizado.');
      } else {
        Alert.alert('Erro', result.error || 'Não foi possível definir o ícone.');
      }
    } catch (e) {
      Alert.alert('Erro', 'Erro ao definir ícone.');
    }
  };

  const renderAvatar = () => {
    if (userImageLocal) {
      return <Image source={{ uri: userImageLocal }} style={styles.avatar} />;
    }
    if (profileIconLocal) {
      return (
        <View style={[styles.defaultAvatar, styles.iconAvatar]}> 
          <Ionicons name={profileIconLocal as any} size={30} color={THEME.primary} />
        </View>
      );
    }
    return (
      <View style={styles.defaultAvatar}>
  <Ionicons name="person" size={30} color={THEME.textSecondary} />
      </View>
    );
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
          <Pressable onPress={() => setAvatarActionsVisible(true)} style={styles.avatarContainer} disabled={imageLoading}>
            {renderAvatar()}
            {imageLoading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : (
              <View style={styles.editIconContainer}>
                <Ionicons name="create" size={12} color="#fff" />
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
          {/* Botão de Notificações fora do menu (apenas se callback existir) */}
          {onNotifications && (
            <Pressable onPress={() => { setMenuVisible(false); onNotifications(); }} style={styles.iconButton} accessibilityLabel="Notificações">
              <View style={styles.notificationIconContainer}>
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={notificationCount > 0 ? THEME.highlight : THEME.textPrimary}
                />
                {notificationCount > 0 && (
                  <View style={styles.notificationDot}>
                    <Text style={styles.notificationDotText}>{notificationCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}

          <View style={styles.menuContainer}>
            <Pressable onPress={() => setMenuVisible(true)} style={styles.iconButton}>
              <Ionicons name="settings-outline" size={24} color={THEME.textPrimary} />
            </Pressable>
          </View>

          {/* Menu em Modal para capturar toque fora em toda a tela */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={menuVisible}
            onRequestClose={() => setMenuVisible(false)}
          >
            <View style={styles.modalRoot}>
              {/* Overlay para fechar ao clicar fora */}
              <Pressable style={styles.fullscreenOverlay} onPress={() => setMenuVisible(false)} />

              {/* Dropdown alinhado ao canto superior direito */}
              <View style={styles.dropdownMenuModal}>
                {userRole === 'admin' && onManageFamily && (
                  <>
                    <Pressable onPress={() => { setMenuVisible(false); onManageFamily(); }} style={styles.menuItem}>
                      <Ionicons name="people-outline" size={18} color={THEME.textPrimary} />
                      <Text style={styles.menuText}>Gerenciar Família</Text>
                    </Pressable>
                    <View style={styles.menuSeparator} />
                  </>
                )}
                {onJoinFamilyByCode && (
                  <>
                    <Pressable onPress={openJoinFamily} style={styles.menuItem}>
                      <Ionicons name="key-outline" size={18} color={THEME.textPrimary} />
                      <Text style={styles.menuText}>Entrar em outra família</Text>
                    </Pressable>
                    <View style={styles.menuSeparator} />
                  </>
                )}
                <Pressable onPress={() => { setMenuVisible(false); onHistory(); }} style={styles.menuItem}>
                  <Ionicons name="time-outline" size={18} color={THEME.textPrimary} />
                  <Text style={styles.menuText}>Histórico</Text>
                </Pressable>
                <View style={styles.menuSeparator} />
                <Pressable onPress={() => { setMenuVisible(false); onInfo(); }} style={styles.menuItem}>
                  <Ionicons name="information-circle-outline" size={18} color={THEME.textPrimary} />
                  <Text style={styles.menuText}>Manual e Informações</Text>
                </Pressable>
                <View style={styles.menuSeparator} />
                {/* Logout no final do menu */}
                <Pressable onPress={() => { setMenuVisible(false); handleLogout(); }} style={styles.menuItem}>
                  <Ionicons name="log-out-outline" size={18} color={THEME.danger} />
                  <Text style={[styles.menuText, { color: THEME.danger }]}>Sair</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
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

      {/* Modal Entrar em outra família */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={joinModalVisible}
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Entrar em outra família</Text>
            <TextInput
              style={styles.nameInput}
              value={familyCode}
              onChangeText={(text) => {
                const sanitized = sanitizeInviteCode(text);
                setFamilyCode(sanitized);
                if (sanitized.length > 0 && sanitized.length < 6) {
                  setCodeError('O código deve ter 6 caracteres.');
                } else {
                  setCodeError(null);
                }
              }}
              placeholder="Código da família (6 caracteres)"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
            />
            {codeError ? <Text style={{ color: THEME.danger, alignSelf: 'flex-start', marginTop: -12, marginBottom: 8 }}>{codeError}</Text> : null}
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setJoinModalVisible(false)}
                disabled={joinLoading}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </Pressable>
              <Pressable 
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  (joinLoading || sanitizeInviteCode(familyCode).length !== 6) && styles.buttonDisabled
                ]} 
                onPress={handleJoinFamily}
                disabled={joinLoading || sanitizeInviteCode(familyCode).length !== 6}
              >
                {joinLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Entrar</Text>
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
      {/* Modal Ações Avatar */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={avatarActionsVisible}
        onRequestClose={() => setAvatarActionsVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Foto de Perfil</Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {renderAvatar()}
            </View>
            <View style={styles.modalButtonsColumn}>
              <Pressable style={[styles.fullWidthButton, styles.secondaryBtn]} onPress={() => { setAvatarActionsVisible(false); handleImagePicker(); }}>
                <Text style={styles.buttonText}>Alterar Foto</Text>
              </Pressable>
              <Pressable style={[styles.fullWidthButton, styles.secondaryBtn]} onPress={() => { setAvatarActionsVisible(false); setIconPickerVisible(true); }}>
                <Text style={styles.buttonText}>Escolher Ícone</Text>
              </Pressable>
              {userImageLocal && (
                <Pressable style={[styles.fullWidthButton, styles.dangerBtn]} onPress={() => { setAvatarActionsVisible(false); handleRemovePhoto(); }}>
                  <Text style={styles.buttonText}>Remover Foto</Text>
                </Pressable>
              )}
              <Pressable style={[styles.fullWidthButton, styles.cancelBtn]} onPress={() => setAvatarActionsVisible(false)}>
                <Text style={styles.cancelButtonText}>Fechar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Picker de Ícones */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={iconPickerVisible}
        onRequestClose={() => setIconPickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Escolher Ícone</Text>
            <View style={styles.iconGrid}>
              {AVAILABLE_ICONS.map(icon => (
                <Pressable key={icon} style={styles.iconOption} onPress={() => handleSelectIcon(icon)}>
                  <Ionicons name={icon as any} size={28} color={profileIconLocal === icon ? THEME.primary : '#555'} />
                </Pressable>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setIconPickerVisible(false)}>
                <Text style={styles.buttonText}>Cancelar</Text>
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
  backgroundColor: THEME.surface,
  borderBottomWidth: 1,
  borderBottomColor: THEME.border,
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
    shadowColor: THEME.success, // Verde para online/sincronizado
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  borderBottomColor: THEME.success,
    borderBottomWidth: 2,
  },
  containerError: {
    shadowColor: THEME.danger, // Vermelho para erro
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  borderBottomColor: THEME.danger,
    borderBottomWidth: 2,
  },
  containerOffline: {
    shadowColor: THEME.warning, // Laranja para offline
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  borderBottomColor: THEME.warning,
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
  backgroundColor: THEME.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  borderColor: THEME.border,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  backgroundColor: THEME.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  borderColor: THEME.surface,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  color: THEME.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
  color: THEME.textSecondary,
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
  modalRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
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
  // Dropdown usado dentro do Modal (alinhado ao topo à direita)
  dropdownMenuModal: {
    position: 'absolute',
    top: 60,
    right: 20,
  backgroundColor: THEME.surface,
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    borderWidth: 1,
  borderColor: THEME.border,
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
  color: THEME.textPrimary,
  },
  menuSeparator: {
    height: 1,
  backgroundColor: THEME.border,
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
    backgroundColor: THEME.surface,
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
  borderColor: THEME.border,
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
    backgroundColor: THEME.primary,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  notificationBadge: {
    backgroundColor: THEME.danger,
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
  notificationIconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: -4,
    right: -2,
  backgroundColor: THEME.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  borderColor: THEME.surface,
  },
  notificationDotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Estilos para modal de configurações de perfil
  roleSelectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  color: THEME.textPrimary,
    marginBottom: 15,
    textAlign: 'center',
  },
  roleOptionsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  roleOption: {
    backgroundColor: THEME.surface,
    borderWidth: 2,
    borderColor: THEME.primary,
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
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
  color: THEME.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  roleOptionTextSelected: {
    color: '#fff',
  },
  roleDescription: {
    fontSize: 11,
  color: THEME.textSecondary,
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
  iconAvatar: {
    backgroundColor: THEME.primaryBg,
    borderColor: '#d3e6ff',
  },
  modalButtonsColumn: {
    width: '100%',
    gap: 10,
  },
  fullWidthButton: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: THEME.primary,
  },
  dangerBtn: {
    backgroundColor: THEME.danger,
  },
  cancelBtn: {
    backgroundColor: '#999',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconOption: {
    width: 56,
    height: 56,
    borderRadius: 12,
  backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
    borderWidth: 1,
  borderColor: '#dce3ea'
  },
  familyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  backgroundColor: THEME.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  borderColor: THEME.primary,
    marginTop: 2,
  },
  familyActionText: {
    fontSize: 12,
  color: THEME.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
});