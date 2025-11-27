import { useState, useRef } from 'react';
import { Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import LocalAuthService from '../services/auth/local-auth.service';
import Alert from '../utils/helpers/alert';
import { UserRole } from '../types/family.types';

interface UseHeaderLogicProps {
  userName: string;
  userImage?: string;
  userProfileIcon?: string;
  userRole?: UserRole;
  onUserNameChange: (newName: string) => void;
  onUserImageChange?: (newImageUrl: string) => void;
  onUserProfileIconChange?: (newProfileIcon: string) => void;
  onUserRoleChange?: (newRole: UserRole) => void;
  onJoinFamilyByCode?: (code: string) => Promise<void> | void;
  onLogout: () => void;
}

export const useHeaderLogic = ({
  userName,
  userImage,
  userProfileIcon,
  userRole,
  onUserNameChange,
  onUserImageChange,
  onUserProfileIconChange,
  onUserRoleChange,
  onJoinFamilyByCode,
  onLogout,
}: UseHeaderLogicProps) => {
  // Visibility States
  const [avatarActionsVisible, setAvatarActionsVisible] = useState(false);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);

  // Data States
  const [menuButtonLayout, setMenuButtonLayout] = useState({ top: 60, right: 20 });
  const menuButtonRef = useRef<any>(null);
  
  // Image/Icon States
  const [userImageLocal, setUserImageLocal] = useState<string | null>(userImage || null);
  const [imageLoading, setImageLoading] = useState(false);

  const handleMenuPress = () => {
    if (!menuVisible) {
      menuButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setMenuButtonLayout({
          top: pageY + height + 4,
          right: Dimensions.get('window').width - (pageX + width)
        });
      });
    }
    setMenuVisible(true);
  };

  const handleNameSave = async (newName: string): Promise<boolean> => {
    try {
      const result = await LocalAuthService.updateUserName(newName);
      
      if (result.success) {
        onUserNameChange(newName);
        Alert.alert('Sucesso', 'Nome atualizado com sucesso!');
        return true;
      } else {
        Alert.alert('Erro', result.error || 'Não foi possível atualizar o nome.');
        return false;
      }
    } catch (error) {
      console.error('Erro ao atualizar nome:', error);
      Alert.alert('Erro', 'Erro inesperado ao atualizar nome.');
      return false;
    }
  };

  const handleJoinFamily = async (code: string) => {
    if (!onJoinFamilyByCode) return;
    await onJoinFamilyByCode(code);
  };

  const handleRoleChange = (newRole: UserRole) => {
    if (onUserRoleChange && newRole !== userRole) {
      onUserRoleChange(newRole);
    }
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para alterar a foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const mimeType = result.assets[0].mimeType;
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (mimeType && !allowedTypes.includes(mimeType.toLowerCase())) {
          Alert.alert(
            'Formato não suportado', 
            'Por favor, selecione uma imagem nos formatos: JPEG, PNG, WebP ou GIF.'
          );
          return;
        }
        
        setUserImageLocal(imageUri);
        setImageLoading(true);

        try {
          const uploadResult = await LocalAuthService.uploadProfileImage(imageUri);

          if (uploadResult.success && uploadResult.photoURL) {
            setUserImageLocal(uploadResult.photoURL);
            if (onUserImageChange) {
              onUserImageChange(uploadResult.photoURL);
            }
            Alert.alert('Sucesso', 'Foto de perfil atualizada com sucesso!');
          } else {
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

  const handleSelectIcon = async (iconName: string) => {
    try {
      if (onUserProfileIconChange) {
        onUserProfileIconChange(iconName);
      }
      Alert.alert('Sucesso', 'Ícone de perfil atualizado.');
    } catch (e) {
      Alert.alert('Erro', 'Erro ao atualizar ícone.');
      throw e;
    }
  };

  return {
    // State
    avatarActionsVisible, setAvatarActionsVisible,
    iconPickerVisible, setIconPickerVisible,
    nameModalVisible, setNameModalVisible,
    profileModalVisible, setProfileModalVisible,
    menuVisible, setMenuVisible,
    joinModalVisible, setJoinModalVisible,
    calendarVisible, setCalendarVisible,
    menuButtonLayout,
    menuButtonRef,
    userImageLocal,
    imageLoading,

    // Handlers
    handleMenuPress,
    handleNameSave,
    handleJoinFamily,
    handleRoleChange,
    handleImagePicker,
    handleSelectIcon,
  };
};
