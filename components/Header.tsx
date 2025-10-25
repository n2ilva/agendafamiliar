import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME, getCurrentSeason } from '../utils/colors';
import * as ImagePicker from 'expo-image-picker';
import { UserRole } from '../types/FamilyTypes';
import LocalAuthService from '../services/LocalAuthService';
import Alert from '../utils/Alert';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { getBrazilHolidays } from '../utils/Holidays';

interface HeaderProps {
  userName: string;
  userImage?: string;
  userProfileIcon?: string;
  userRole?: UserRole;
  familyName?: string;
  familyId?: string;
  onUserNameChange: (newName: string) => void;
  onUserImageChange?: (newImageUrl: string) => void;
  onUserProfileIconChange?: (newProfileIcon: string) => void;
  onUserRoleChange?: (newRole: UserRole) => void;
  onSettings: () => void;
  onHistory: () => void;
  onInfo: () => void;
  onLogout: () => void;
  notificationCount?: number;
  onNotifications?: () => void;
  onManageFamily?: () => void;
  onJoinFamilyByCode?: (code: string) => Promise<void> | void;
  onRefresh?: () => void;
  syncStatus?: {
    hasError?: boolean;
    isOnline?: boolean;
  };
  isSyncingPermissions?: boolean;
  showUndoButton?: boolean;
  onUndo?: () => void;
  // Callback opcional para criação rápida de tarefa por data
  onCalendarDaySelect?: (date: Date) => void;
  // Tarefas para marcação no calendário
  tasks?: Array<{ id: string; title: string; dueDate?: Date | any; completed?: boolean }>;
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
  onUserProfileIconChange,
  onUserRoleChange, 
  onSettings,
  onHistory,
  onInfo,
  onLogout,
  notificationCount = 0,
  onNotifications,
  onManageFamily,
  onJoinFamilyByCode,
  onRefresh,
  syncStatus,
  isSyncingPermissions,
  showUndoButton = false,
  onUndo,
  onCalendarDaySelect,
  tasks = [],
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
  const [iconLoading, setIconLoading] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string | undefined>(userProfileIcon);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [familyCode, setFamilyCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Locale PT-BR para calendário
  useEffect(() => {
    LocaleConfig.locales['pt-br'] = {
      monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
      monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
      dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
      dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
      today: 'Hoje'
    };
    LocaleConfig.defaultLocale = 'pt-br';
  }, []);

  const markedDates = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const holidays = getBrazilHolidays(year);
    const map: any = {};
    holidays.forEach((h: { date: string; name: string }) => {
      map[h.date] = {
        marked: true,
        dotColor: '#FFD700',
      };
    });
    
    // Marcar dias com tarefas
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    tasks.forEach((task: any) => {
      if (task.dueDate && !task.completed) {
        let dateObj: Date | undefined;
        if (task.dueDate instanceof Date) {
          dateObj = task.dueDate;
        } else if (task.dueDate.toDate && typeof task.dueDate.toDate === 'function') {
          dateObj = task.dueDate.toDate();
        } else if (typeof task.dueDate === 'string' || typeof task.dueDate === 'number') {
          dateObj = new Date(task.dueDate);
        }
        if (dateObj && !isNaN(dateObj.getTime())) {
          const taskDate = new Date(dateObj);
          taskDate.setHours(0, 0, 0, 0);
          const isOverdue = taskDate < todayDate;
          const taskColor = isOverdue ? THEME.danger : '#4CAF50';
          
          const taskYmd = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
          if (map[taskYmd]) {
            // Dia já tem feriado, adicionar mais um dot
            map[taskYmd] = {
              ...map[taskYmd],
              dots: [{ color: '#FFD700' }, { color: taskColor }],
              marked: false,
            };
          } else {
            map[taskYmd] = {
              marked: true,
              dotColor: taskColor,
            };
          }
        }
      }
    });
    
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    map[ymd] = {
      ...(map[ymd] || {}),
      selected: true,
      selectedColor: THEME.primary,
    };
    return map;
  }, [calendarMonth, tasks]);

  // Lista de feriados do mês atual do calendário
  const monthHolidays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2,'0')}`;
    const holidays = getBrazilHolidays(year);
    return holidays.filter(h => h.date.startsWith(monthStr));
  }, [calendarMonth]);

  // Lista de tarefas do mês atual do calendário
  const monthTasks = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    return tasks.filter((task: any) => {
      if (!task.dueDate || task.completed) return false;
      let dateObj: Date | undefined;
      if (task.dueDate instanceof Date) {
        dateObj = task.dueDate;
      } else if (task.dueDate.toDate && typeof task.dueDate.toDate === 'function') {
        dateObj = task.dueDate.toDate();
      } else if (typeof task.dueDate === 'string' || typeof task.dueDate === 'number') {
        dateObj = new Date(task.dueDate);
      }
      if (dateObj && !isNaN(dateObj.getTime())) {
        return dateObj.getFullYear() === year && dateObj.getMonth() + 1 === month;
      }
      return false;
    }).sort((a: any, b: any) => {
      const dateA = a.dueDate instanceof Date ? a.dueDate : a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
      const dateB = b.dueDate instanceof Date ? b.dueDate : b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate);
      return dateA.getTime() - dateB.getTime();
    });
  }, [calendarMonth, tasks]);

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
        const mimeType = result.assets[0].mimeType;
        console.log('📸 URI da imagem:', imageUri);
        console.log('📸 Tipo MIME:', mimeType);
        
        // Validar tipo de imagem (apenas formatos comuns)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (mimeType && !allowedTypes.includes(mimeType.toLowerCase())) {
          Alert.alert(
            'Formato não suportado', 
            'Por favor, selecione uma imagem nos formatos: JPEG, PNG, WebP ou GIF.'
          );
          return;
        }
        
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

  const AVAILABLE_ICONS = [
    { emoji: '😊', name: 'happy' },
    { emoji: '😎', name: 'cool' },
    { emoji: '🤩', name: 'starstruck' },
    { emoji: '🥳', name: 'partying' },
    { emoji: '😇', name: 'angel' },
    { emoji: '🤗', name: 'hugging' },
    { emoji: '🎉', name: 'party' },
    { emoji: '🎊', name: 'confetti' },
    { emoji: '🎈', name: 'balloon' },
    { emoji: '🎁', name: 'gift' },
    { emoji: '🚀', name: 'rocket' },
    { emoji: '✈️', name: 'airplane' },
    { emoji: '🚗', name: 'car' },
    { emoji: '🚴', name: 'bicycle' },
    { emoji: '🏃', name: 'running' },
    { emoji: '⭐', name: 'star' },
    { emoji: '🌟', name: 'sparkles' },
    { emoji: '💫', name: 'dizzy' },
    { emoji: '✨', name: 'shine' },
    { emoji: '❤️', name: 'heart' },
    { emoji: '💙', name: 'blue-heart' },
    { emoji: '💚', name: 'green-heart' },
    { emoji: '💛', name: 'yellow-heart' },
    { emoji: '💜', name: 'purple-heart' },
    { emoji: '🧡', name: 'orange-heart' },
    { emoji: '🖤', name: 'black-heart' },
    { emoji: '🤍', name: 'white-heart' },
    { emoji: '🌈', name: 'rainbow' },
    { emoji: '🌸', name: 'flower' },
    { emoji: '�', name: 'hibiscus' },
    { emoji: '🌻', name: 'sunflower' },
    { emoji: '🌹', name: 'rose' },
    { emoji: '🌷', name: 'tulip' },
    { emoji: '🌿', name: 'leaf' },
    { emoji: '🍀', name: 'clover' },
    { emoji: '🌳', name: 'tree' },
    { emoji: '🌴', name: 'palm' },
    { emoji: '🐶', name: 'dog' },
    { emoji: '🐱', name: 'cat' },
    { emoji: '🐭', name: 'mouse' },
    { emoji: '🐹', name: 'hamster' },
    { emoji: '🐰', name: 'rabbit' },
    { emoji: '🦊', name: 'fox' },
    { emoji: '🐻', name: 'bear' },
    { emoji: '🐼', name: 'panda' },
    { emoji: '🐨', name: 'koala' },
    { emoji: '🐯', name: 'tiger' },
    { emoji: '🦁', name: 'lion' },
    { emoji: '🐮', name: 'cow' },
    { emoji: '🐷', name: 'pig' },
    { emoji: '🐸', name: 'frog' },
    { emoji: '🐵', name: 'monkey' },
    { emoji: '🦄', name: 'unicorn' },
    { emoji: '🐾', name: 'paw' },
    { emoji: '🦋', name: 'butterfly' },
    { emoji: '🐝', name: 'bee' },
    { emoji: '�', name: 'ladybug' },
    { emoji: '🍎', name: 'apple' },
    { emoji: '🍌', name: 'banana' },
    { emoji: '🍉', name: 'watermelon' },
    { emoji: '�', name: 'grapes' },
    { emoji: '🍓', name: 'strawberry' },
    { emoji: '🍒', name: 'cherries' },
    { emoji: '🍕', name: 'pizza' },
    { emoji: '🍔', name: 'burger' },
    { emoji: '🍟', name: 'fries' },
    { emoji: '🍦', name: 'icecream' },
    { emoji: '�', name: 'donut' },
    { emoji: '🍪', name: 'cookie' },
    { emoji: '🎂', name: 'cake' },
    { emoji: '🍰', name: 'shortcake' },
    { emoji: '☕', name: 'coffee' },
    { emoji: '🥤', name: 'drink' },
    { emoji: '🧃', name: 'juice' },
    { emoji: '⚽', name: 'soccer' },
    { emoji: '🏀', name: 'basketball' },
    { emoji: '🏈', name: 'football' },
    { emoji: '⚾', name: 'baseball' },
    { emoji: '🎾', name: 'tennis' },
    { emoji: '🏐', name: 'volleyball' },
    { emoji: '🎮', name: 'game' },
    { emoji: '🎯', name: 'dart' },
    { emoji: '🎲', name: 'dice' },
    { emoji: '🎨', name: 'art' },
    { emoji: '🎭', name: 'theater' },
    { emoji: '🎪', name: 'circus' },
    { emoji: '🎬', name: 'movie' },
    { emoji: '🎵', name: 'music' },
    { emoji: '🎸', name: 'guitar' },
    { emoji: '🎹', name: 'piano' },
    { emoji: '🎤', name: 'microphone' },
    { emoji: '📚', name: 'book' },
    { emoji: '📖', name: 'open-book' },
    { emoji: '✏️', name: 'pencil' },
    { emoji: '📝', name: 'memo' },
    { emoji: '💼', name: 'briefcase' },
    { emoji: '💻', name: 'laptop' },
    { emoji: '📱', name: 'phone' },
    { emoji: '⌚', name: 'watch' },
    { emoji: '🔑', name: 'key' },
    { emoji: '🔒', name: 'lock' },
    { emoji: '💡', name: 'bulb' },
    { emoji: '🔦', name: 'flashlight' },
    { emoji: '🕯️', name: 'candle' },
    { emoji: '🏠', name: 'home' },
    { emoji: '🏡', name: 'house' },
    { emoji: '🏖️', name: 'beach' },
    { emoji: '🏔️', name: 'mountain' },
    { emoji: '⛺', name: 'tent' },
    { emoji: '�', name: 'moon' },
    { emoji: '☀️', name: 'sun' },
    { emoji: '⭐', name: 'star2' },
    { emoji: '☁️', name: 'cloud' },
    { emoji: '⚡', name: 'lightning' },
    { emoji: '🔥', name: 'fire' },
    { emoji: '💧', name: 'droplet' },
    { emoji: '🌊', name: 'wave' },
  ];

  const handleSelectIcon = async () => {
    if (!selectedIcon) {
      Alert.alert('Atenção', 'Por favor, selecione um ícone.');
      return;
    }

    setIconLoading(true);
    try {
      const result = await LocalAuthService.setProfileIcon(selectedIcon);
      if (result.success) {
        setProfileIconLocal(selectedIcon);
        setUserImageLocal(null);
        setIconPickerVisible(false);
        // Notificar o componente pai sobre a mudança do ícone
        if (onUserProfileIconChange) {
          onUserProfileIconChange(selectedIcon);
        }
        Alert.alert('Sucesso', 'Ícone de perfil atualizado.');
      } else {
        Alert.alert('Erro', result.error || 'Não foi possível definir o ícone.');
      }
    } catch (e) {
      Alert.alert('Erro', 'Erro ao definir ícone.');
    } finally {
      setIconLoading(false);
    }
  };

  const getEmojiForIcon = (iconName: string) => {
    const icon = AVAILABLE_ICONS.find(i => i.name === iconName);
    return icon ? icon.emoji : '😊';
  };

  const renderAvatar = () => {
    if (profileIconLocal) {
      return (
        <View style={styles.avatarContainer}>
          <View style={[styles.defaultAvatar, styles.iconAvatar]}> 
            <Text style={styles.avatarEmoji}>{getEmojiForIcon(profileIconLocal)}</Text>
          </View>
          <Image 
            source={require('../assets/chapeu_natal.png')} 
            style={styles.christmasHat}
          />
        </View>
      );
    }
    return (
      <View style={styles.avatarContainer}>
        <View style={styles.defaultAvatar}>
          <Text style={styles.avatarEmoji}>😊</Text>
        </View>
        <Image 
          source={require('../assets/chapeu_natal.png')} 
          style={styles.christmasHat}
        />
      </View>
    );
  };

  return (
    <>
      <View style={{ width: '100%' }}>
        <View style={[
          styles.container,
          syncStatus?.hasError 
            ? styles.containerError 
            : syncStatus?.isOnline 
              ? styles.containerOnline 
              : styles.containerOffline
        ]}>
          <View style={styles.leftSection}>
          <Pressable onPress={() => setAvatarActionsVisible(true)} disabled={imageLoading}>
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
              <Ionicons name="pencil" size={16} color="#aaa" style={styles.editNameIcon} />
            </View>
            {familyName ? (
              <View style={styles.subtitleRow}>
                <Text style={styles.subtitle}>{familyName}</Text>
                {userRole === 'dependente' && isSyncingPermissions ? (
                  <View style={styles.syncPill} accessibilityLabel="Sincronizando permissões">
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.syncPillText}>Sincronizando permissões…</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={styles.subtitle}>Família não configurada</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.rightSection}>
          {/* Botão de Desfazer - apenas ícone */}
          {showUndoButton && onUndo && (
            <Pressable 
              onPress={() => { setMenuVisible(false); onUndo(); }} 
              style={styles.iconButton} 
              accessibilityLabel="Desfazer última ação"
            >
              <Ionicons name="arrow-undo" size={24} color={THEME.primary} />
            </Pressable>
          )}
          
          {/* Botão de Notificações fora do menu (apenas se callback existir) */}
          {onNotifications && (
            <Pressable onPress={() => { setMenuVisible(false); onNotifications(); }} style={styles.iconButton} accessibilityLabel="Notificações">
              <View style={styles.notificationIconContainer}>
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={notificationCount > 0 ? THEME.highlight : THEME.primary}
                />
                {notificationCount > 0 && (
                  <View style={styles.notificationDot}>
                    <Text style={styles.notificationDotText}>{notificationCount}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}

          {/* Botão de Calendário */}
          <Pressable
            onPress={() => { setMenuVisible(false); setCalendarVisible(true); }}
            style={styles.iconButton}
            accessibilityLabel="Calendário"
          >
            <Ionicons name="calendar-outline" size={24} color={THEME.secondary} />
          </Pressable>

          <View style={styles.menuContainer}>
            <Pressable onPress={() => setMenuVisible(true)} style={styles.iconButton}>
              <Ionicons name="settings-outline" size={24} color={THEME.secondary} />
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
                      <Ionicons name="people-outline" size={18} color={THEME.accent} />
                      <Text style={styles.menuText}>Gerenciar Família</Text>
                    </Pressable>
                    <View style={styles.menuSeparator} />
                  </>
                )}
                {onJoinFamilyByCode && (
                  <>
                    <Pressable onPress={openJoinFamily} style={styles.menuItem}>
                      <Ionicons name="key-outline" size={18} color={THEME.highlight} />
                      <Text style={styles.menuText}>Entrar em outra família</Text>
                    </Pressable>
                    <View style={styles.menuSeparator} />
                  </>
                )}
                <Pressable onPress={() => { setMenuVisible(false); onHistory(); }} style={styles.menuItem}>
                  <Ionicons name="time-outline" size={18} color={THEME.extra} />
                  <Text style={styles.menuText}>Histórico</Text>
                </Pressable>
                <View style={styles.menuSeparator} />
                <Pressable onPress={() => { setMenuVisible(false); onInfo(); }} style={styles.menuItem}>
                  <Ionicons name="information-circle-outline" size={18} color={THEME.success} />
                  <Text style={styles.menuText}>Manual e Informações</Text>
                </Pressable>
                <View style={styles.menuSeparator} />
                {/* Atualizar dados */}
                {onRefresh && (
                  <>
                    <Pressable onPress={() => { setMenuVisible(false); onRefresh(); }} style={styles.menuItem}>
                      <Ionicons name="refresh" size={18} color="#4CAF50" />
                      <Text style={styles.menuText}>Atualizar Dados</Text>
                    </Pressable>
                    <View style={styles.menuSeparator} />
                  </>
                )}
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

      {/* Modal Calendário com feriados */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={calendarVisible}
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.calendarCenterOverlay}>
          {/* Overlay para fechar ao clicar fora */}
          <Pressable style={styles.fullscreenOverlay} onPress={() => setCalendarVisible(false)} />

          <View style={styles.calendarModalCard}>
            <Calendar
              current={calendarMonth.toISOString().slice(0,10)}
              onMonthChange={(m:any) => {
                const d = new Date(m.year, m.month - 1, 1);
                setCalendarMonth(d);
              }}
              onDayPress={(day:any) => {
                setCalendarVisible(false);
                if (onCalendarDaySelect) {
                  const parts = day.dateString.split('-');
                  const selected = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                  onCalendarDaySelect(selected);
                }
              }}
              markedDates={markedDates}
              enableSwipeMonths={true}
              theme={{
                todayTextColor: THEME.primary,
                arrowColor: THEME.primary,
                textSectionTitleColor: THEME.textSecondary,
                monthTextColor: THEME.textPrimary,
                dayTextColor: THEME.textPrimary,
                selectedDayBackgroundColor: THEME.primary,
                selectedDayTextColor: '#fff',
                textDisabledColor: '#C0C0C0',
              }}
            />
            <View style={{ padding: 8 }}>
              <View style={styles.holidayListContainer}>
                {monthHolidays.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    {monthHolidays.map(h => {
                      const [y, m, d] = h.date.split('-');
                      const ddmm = `${d}/${m}`;
                      return (
                        <Text key={h.date} style={[styles.holidayListItem, { color: '#FFD700' }]}>• {ddmm} — {h.name}</Text>
                      );
                    })}
                  </View>
                )}
                {monthTasks.length > 0 && (
                  <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={true}>
                    {monthTasks.map((task: any) => {
                      let dateObj: Date | undefined;
                      if (task.dueDate instanceof Date) {
                        dateObj = task.dueDate;
                      } else if (task.dueDate.toDate && typeof task.dueDate.toDate === 'function') {
                        dateObj = task.dueDate.toDate();
                      } else if (typeof task.dueDate === 'string' || typeof task.dueDate === 'number') {
                        dateObj = new Date(task.dueDate);
                      }
                      if (dateObj && !isNaN(dateObj.getTime())) {
                        const taskDate = new Date(dateObj);
                        taskDate.setHours(0, 0, 0, 0);
                        const nowDate = new Date();
                        nowDate.setHours(0, 0, 0, 0);
                        const isOverdue = taskDate < nowDate;
                        const taskColor = isOverdue ? THEME.danger : '#4CAF50';
                        const ddmm = `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}`;
                        return (
                          <Text key={task.id} style={[styles.holidayListItem, { color: taskColor }]}>• {ddmm} — {task.title}</Text>
                        );
                      }
                      return null;
                    })}
                  </ScrollView>
                )}
                {monthHolidays.length === 0 && monthTasks.length === 0 && (
                  <Text style={styles.holidayListEmpty}>Nenhum feriado ou tarefa neste mês.</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
              placeholderTextColor="#999"
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
              placeholderTextColor="#999"
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
            <Text style={styles.modalTitle}>Emoji de Perfil</Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {renderAvatar()}
            </View>
            <View style={styles.modalButtonsColumn}>
              <Pressable style={[styles.fullWidthButton, styles.secondaryBtn]} onPress={() => { setAvatarActionsVisible(false); setIconPickerVisible(true); }}>
                <Text style={styles.buttonText}>Escolher Emoji</Text>
              </Pressable>
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
          <View style={[styles.modalContent, styles.iconModalContent]}>
            <Text style={styles.modalTitle}>Escolher Emoji</Text>
            <ScrollView 
              style={styles.iconScrollView}
              contentContainerStyle={styles.iconScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.iconGrid}>
                {AVAILABLE_ICONS.map(icon => (
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
                  setIconPickerVisible(false);
                  setSelectedIcon(profileIconLocal);
                }}
                disabled={iconLoading}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.primaryButton]} 
                onPress={handleSelectIcon}
                disabled={iconLoading}
              >
                {iconLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Confirmar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      </View>
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
  },
  containerError: {
    shadowColor: THEME.danger, // Vermelho para erro
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  containerOffline: {
    shadowColor: THEME.warning, // Laranja para offline
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
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
  christmasHat: {
    position: 'absolute',
    top: -19,
    right: -8,
    width: 35,
    height: 35,
    zIndex: 10,
    resizeMode: 'contain',
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
    paddingHorizontal: 10,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  color: THEME.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  color: THEME.textSecondary,
  },
  syncPill: {
    marginLeft: 8,
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  undoButton: {
    marginLeft: 12,
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#FF9800',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  undoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  calendarDropdownModal: {
    position: 'absolute',
    top: 60,
    right: 64,
    backgroundColor: THEME.surface,
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  calendarCenterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalCard: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    paddingVertical: 8,
    width: '95%',
    maxWidth: 500,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  holidayListContainer: {
    marginTop: 6,
    gap: 4,
  },
  holidayListItem: {
    fontSize: 12,
    color: THEME.textPrimary,
  },
  holidayListEmpty: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontStyle: 'italic',
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
    gap: 8,
  },
  editNameIcon: {
    marginLeft: 0,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '95%',
    maxWidth: 500,
    backgroundColor: THEME.surface,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    maxHeight: '75%',
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
    color: THEME.textPrimary,
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
  iconModalContent: {
    maxHeight: '75%',
  },
  iconScrollView: {
    maxHeight: 400,
  },
  iconScrollContent: {
    paddingBottom: 10,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
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
  iconOptionSelected: {
    backgroundColor: THEME.primaryBg,
    borderColor: THEME.primary,
    borderWidth: 2,
  },
  emojiIcon: {
    fontSize: 32,
  },
  avatarEmoji: {
    fontSize: 40,
    textAlign: 'center',
    width: '100%',
    alignSelf: 'center',
    ...(Platform.select({
      android: {
        includeFontPadding: false as any,
        textAlignVertical: 'center' as any,
      },
    }) as object),
  },
  primaryButton: {
    backgroundColor: THEME.primary,
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