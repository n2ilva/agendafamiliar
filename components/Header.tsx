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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../utils/colors';
import * as ImagePicker from 'expo-image-picker';
import { UserRole } from '../types/FamilyTypes';
import LocalAuthService from '../services/LocalAuthService';
import Alert from '../utils/Alert';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { getBrazilHolidays } from '../utils/Holidays';
import { useTheme } from '../contexts/ThemeContext';

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
    pendingOperations?: number;
    isSyncing?: boolean;
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
  const [menuButtonLayout, setMenuButtonLayout] = useState({ top: 60, right: 20 });
  const menuButtonRef = React.useRef<any>(null);
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
  
  // Hook do tema
  const { themeMode, setThemeMode, colors } = useTheme();
  
  // Estilos dinâmicos
  const styles = useMemo(() => getStyles(colors), [colors]);
  
  // Sincronizar profileIconLocal quando o prop muda
  useEffect(() => {
    if (userProfileIcon !== undefined && userProfileIcon !== profileIconLocal) {
      setProfileIconLocal(userProfileIcon);
      setSelectedIcon(userProfileIcon);
    }
  }, [userProfileIcon]);

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
    
    // Marcar feriados com borda circular azul E background azul
    holidays.forEach((h: { date: string; name: string }) => {
      map[h.date] = {
        customStyles: {
          container: {
            borderWidth: 2,
            borderColor: '#2196F3',
            borderRadius: 20,
            backgroundColor: 'rgba(33, 150, 243, 0.2)', // Background azul apenas para feriados
          },
          text: {
            color: colors.textPrimary,
            fontWeight: '500',
          },
        },
      };
    });
    
    // Marcar dias com tarefas com borda circular (SEM background)
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    tasks.forEach((task: any) => {
      if (!task.dueDate) return;
      
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
        
        // Determinar a cor baseado no status da tarefa
        let taskColor: string;
        
        if (task.completed) {
          // Verificar se foi completada no prazo ou vencida
          let completedDate: Date | undefined;
          if (task.completedAt) {
            if (task.completedAt instanceof Date) {
              completedDate = task.completedAt;
            } else if (task.completedAt.toDate && typeof task.completedAt.toDate === 'function') {
              completedDate = task.completedAt.toDate();
            } else if (typeof task.completedAt === 'string' || typeof task.completedAt === 'number') {
              completedDate = new Date(task.completedAt);
            }
          }
          
          if (completedDate) {
            const completedDateOnly = new Date(completedDate);
            completedDateOnly.setHours(0, 0, 0, 0);
            
            // Verde: completada no prazo (antes ou na data de vencimento)
            // Laranja: completada vencida (depois da data de vencimento)
            taskColor = completedDateOnly <= taskDate ? '#4CAF50' : '#FF9800';
          } else {
            // Se está marcada como completada mas não tem data, considerar verde
            taskColor = '#4CAF50';
          }
        } else {
          // Tarefa não completada
          const isOverdue = taskDate < todayDate;
          // Vermelho: não completada e vencida
          // Verde: não completada mas ainda não venceu
          taskColor = isOverdue ? THEME.danger : '#4CAF50';
        }
        
        const taskYmd = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
        if (map[taskYmd]) {
          // Dia já tem feriado, manter background azul do feriado e adicionar borda da tarefa
          map[taskYmd] = {
            customStyles: {
              container: {
                borderWidth: 2,
                borderColor: taskColor,
                borderRadius: 20,
                backgroundColor: 'rgba(33, 150, 243, 0.2)', // Manter background azul do feriado
              },
              text: {
                color: colors.textPrimary,
                fontWeight: 'bold',
              },
            },
          };
        } else {
          // Dia com tarefa mas sem feriado - apenas borda, SEM background
          map[taskYmd] = {
            customStyles: {
              container: {
                borderWidth: 2,
                borderColor: taskColor,
                borderRadius: 20,
                // SEM backgroundColor
              },
              text: {
                color: colors.textPrimary,
                fontWeight: '500',
              },
            },
          };
        }
      }
    });
    
    // Marcar dia de hoje com background na mesma cor da borda (se tiver evento) ou azul primary
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const existingStyle = map[ymd]?.customStyles || {};
    
    // Se já existe uma marcação no dia de hoje
    if (map[ymd] && existingStyle.container?.borderColor) {
      const borderColor = existingStyle.container.borderColor;
      map[ymd] = {
        customStyles: {
          container: {
            ...existingStyle.container,
            backgroundColor: borderColor, // Background na mesma cor da borda
            borderRadius: 20,
          },
          text: {
            color: '#fff', // Texto branco para contraste
            fontWeight: 'bold',
          },
        },
      };
    } else {
      // Se não tem evento no dia de hoje, marcar com background azul primary
      map[ymd] = {
        customStyles: {
          container: {
            backgroundColor: THEME.primary,
            borderRadius: 20,
          },
          text: {
            color: '#fff',
            fontWeight: 'bold',
          },
        },
      };
    }
    return map;
  }, [calendarMonth, tasks, colors]);

  // Lista de feriados do mês atual do calendário
  const monthHolidays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2,'0')}`;
    const holidays = getBrazilHolidays(year);
    return holidays.filter(h => h.date.startsWith(monthStr));
  }, [calendarMonth]);

  // Lista de tarefas do mês atual do calendário (apenas tarefas futuras/não vencidas)
  const monthTasks = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    return tasks.filter((task: any) => {
      // Não mostrar tarefas completadas
      if (task.completed) return false;
      
      if (!task.dueDate) return false;
      
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
        
        // Apenas mostrar tarefas futuras (hoje ou depois)
        const isFutureOrToday = taskDate >= todayDate;
        
        // E do mês atual
        const isCurrentMonth = dateObj.getFullYear() === year && dateObj.getMonth() + 1 === month;
        
        return isFutureOrToday && isCurrentMonth;
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
      // Atualizar estado local imediatamente
      setProfileIconLocal(selectedIcon);
      setUserImageLocal(null);
      setIconPickerVisible(false);
      
      // Notificar o componente pai que cuidará da sincronização com Firebase
      if (onUserProfileIconChange) {
        onUserProfileIconChange(selectedIcon);
      }
      Alert.alert('Sucesso', 'Ícone de perfil atualizado.');
    } catch (e) {
      Alert.alert('Erro', 'Erro ao atualizar ícone.');
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
          {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 15,
            backgroundColor: colors.surface,
            zIndex: 1000,
          },
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
              <Text style={[styles.userName, { color: colors.textPrimary }]}>{userName}</Text>
              <Ionicons name="pencil" size={16} color={colors.textTertiary} style={styles.editNameIcon} />
            </View>
            {familyName ? (
              <View style={styles.subtitleRow}>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{familyName}</Text>
                {userRole === 'dependente' && isSyncingPermissions ? (
                  <View style={styles.syncPill} accessibilityLabel="Sincronizando permissões">
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.syncPillText}>Sincronizando permissões…</Text>
                  </View>
                ) : null}
                {syncStatus?.isSyncing || (syncStatus?.pendingOperations ?? 0) > 0 ? (
                  <View 
                    style={[styles.syncPill, { backgroundColor: syncStatus?.isSyncing ? THEME.primary : '#f59e0b' }]} 
                    accessibilityLabel={syncStatus?.isSyncing ? "Sincronizando alterações" : `${syncStatus?.pendingOperations} alterações pendentes`}
                  >
                    {syncStatus?.isSyncing ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.syncPillText}>Sincronizando…</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.syncPillText}>{syncStatus?.pendingOperations} pendente{(syncStatus?.pendingOperations ?? 0) !== 1 ? 's' : ''}</Text>
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Família não configurada</Text>
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
            <Pressable 
              ref={menuButtonRef}
              onPress={() => {
                if (!menuVisible) {
                  // Calcular posição do botão antes de abrir
                  menuButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                    setMenuButtonLayout({
                      top: pageY + height + 4, // 4px de espaçamento abaixo do botão
                      right: Dimensions.get('window').width - (pageX + width)
                    });
                  });
                }
                setMenuVisible(true);
              }} 
              style={styles.iconButton}
            >
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
              <View 
                style={[
                  styles.dropdownMenuModal,
                  menuButtonLayout && {
                    top: menuButtonLayout.top,
                    right: menuButtonLayout.right
                  }
                ]}
              >
                <ScrollView 
                  style={styles.menuScrollView}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {userRole === 'admin' && onManageFamily && (
                    <Pressable onPress={() => { setMenuVisible(false); onManageFamily(); }} style={styles.menuItem}>
                      <Ionicons name="people-outline" size={18} color={THEME.accent} />
                      <Text style={styles.menuText}>Gerenciar Família</Text>
                    </Pressable>
                  )}
                  {onJoinFamilyByCode && (
                    <Pressable onPress={openJoinFamily} style={styles.menuItem}>
                      <Ionicons name="key-outline" size={18} color={THEME.highlight} />
                      <Text style={styles.menuText}>Entrar em outra família</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => { setMenuVisible(false); onHistory(); }} style={styles.menuItem}>
                    <Ionicons name="time-outline" size={18} color={THEME.extra} />
                    <Text style={styles.menuText}>Histórico</Text>
                  </Pressable>
                  <Pressable onPress={() => { setMenuVisible(false); onInfo(); }} style={styles.menuItem}>
                    <Ionicons name="information-circle-outline" size={18} color={THEME.success} />
                    <Text style={styles.menuText}>Manual e Informações</Text>
                  </Pressable>
                  {/* Atualizar dados */}
                  {onRefresh && (
                    <Pressable onPress={() => { setMenuVisible(false); onRefresh(); }} style={styles.menuItem}>
                      <Ionicons name="refresh" size={18} color="#4CAF50" />
                      <Text style={styles.menuText}>Atualizar Dados</Text>
                    </Pressable>
                  )}
                  
                  {/* Tema - chave seletora de 3 posições */}
                  <View style={styles.menuItem}>
                    <View style={styles.segmentedControl}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setThemeMode('light')}
                        style={[
                          styles.segment,
                          themeMode === 'light' && styles.segmentActive
                        ]}
                      >
                        <Text numberOfLines={1} style={[styles.segmentText, themeMode === 'light' && styles.segmentTextActive]}>Claro</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setThemeMode('auto')}
                        style={[
                          styles.segment,
                          themeMode === 'auto' && styles.segmentActive
                        ]}
                      >
                        <Text numberOfLines={1} style={[styles.segmentText, themeMode === 'auto' && styles.segmentTextActive]}>Auto</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setThemeMode('dark')}
                        style={[
                          styles.segment,
                          themeMode === 'dark' && styles.segmentActive
                        ]}
                      >
                        <Text numberOfLines={1} style={[styles.segmentText, themeMode === 'dark' && styles.segmentTextActive]}>Escuro</Text>
                      </Pressable>
                    </View>
                  </View>
                  
                  {/* Logout no final do menu */}
                  <Pressable onPress={() => { setMenuVisible(false); handleLogout(); }} style={styles.menuItem}>
                    <Ionicons name="log-out-outline" size={18} color={THEME.danger} />
                    <Text style={[styles.menuText, { color: THEME.danger }]}>Sair</Text>
                  </Pressable>
                </ScrollView>
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
              markingType={'custom'}
              enableSwipeMonths={true}
              theme={{
                backgroundColor: colors.surface,
                calendarBackground: colors.surface,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: THEME.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: THEME.primary,
                dayTextColor: colors.textPrimary,
                textDisabledColor: themeMode === 'dark' ? '#555' : '#C0C0C0',
                monthTextColor: colors.textPrimary,
                indicatorColor: THEME.primary,
                arrowColor: THEME.primary,
                textDayFontWeight: '400',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
              }}
            />
            <ScrollView 
              style={styles.eventsScrollContainer}
              contentContainerStyle={{ padding: 12 }}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.holidayListContainer}>
                {/* Legenda de cores */}
                <View style={styles.legendContainer}>
                  <Text style={styles.legendTitle}>Legenda:</Text>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.legendText}>Tarefa futura ou completada no prazo</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.legendText}>Tarefa completada com atraso</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: THEME.danger }]} />
                    <Text style={styles.legendText}>Tarefa vencida não completada</Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
                    <Text style={styles.legendText}>Feriado</Text>
                  </View>
                </View>
                
                {monthHolidays.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.sectionTitle}>🎉 Feriados</Text>
                    {monthHolidays.map(h => {
                      const [y, m, d] = h.date.split('-');
                      const ddmm = `${d}/${m}`;
                      return (
                        <View key={h.date} style={styles.eventCard}>
                          <View style={[styles.eventIndicator, { backgroundColor: '#2196F3' }]} />
                          <View style={styles.eventContent}>
                            <Text style={styles.eventDate}>{ddmm}</Text>
                            <Text style={styles.eventTitle}>{h.name}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
                {monthTasks.length > 0 && (
                  <View>
                    <Text style={styles.sectionTitle}>📋 Tarefas</Text>
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
                        const ddmm = `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}`;
                        const taskColor = '#4CAF50'; // Verde para tarefas futuras
                        return (
                          <View key={task.id} style={styles.eventCard}>
                            <View style={[styles.eventIndicator, { backgroundColor: taskColor }]} />
                            <View style={styles.eventContent}>
                              <Text style={styles.eventDate}>{ddmm}</Text>
                              <Text style={styles.eventTitle}>{task.title}</Text>
                            </View>
                          </View>
                        );
                      }
                      return null;
                    })}
                  </View>
                )}
                {monthHolidays.length === 0 && monthTasks.length === 0 && (
                  <Text style={styles.holidayListEmpty}>Nenhum feriado ou tarefa neste mês.</Text>
                )}
              </View>
            </ScrollView>
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
              placeholderTextColor={colors.textTertiary}
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

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
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
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
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
    borderColor: colors.border,
  },
  // Dropdown usado dentro do Modal (posicionamento dinâmico calculado via measure())
  dropdownMenuModal: {
    position: 'absolute',
    // top e right são calculados dinamicamente
    width: 240,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    maxHeight: 400,
    zIndex: 1001,
    overflow: 'hidden',
  },
  menuScrollView: {
    maxHeight: 400,
  },
  calendarDropdownModal: {
    position: 'absolute',
    top: 60,
    right: 64,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarCenterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 8,
    width: '95%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  holidayListContainer: {
    marginTop: 6,
    gap: 4,
  },
  eventsScrollContainer: {
    maxHeight: 300,
    flexGrow: 0,
  },
  tasksScrollView: {
    maxHeight: 200,
    flexGrow: 0,
  },
  holidayListItem: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  holidayListEmpty: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
    minHeight: 52,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  // Segmented control for theme mode
  segmentedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    width: '100%',
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: THEME.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: '#fff',
  },
  menuSeparator: {
    height: 1,
    backgroundColor: colors.border,
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
    backgroundColor: colors.surface,
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
    color: colors.textPrimary,
  },
  nameInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 4,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 10,
  },
  eventContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDate: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    minWidth: 45,
  },
  eventTitle: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  overdueText: {
    color: THEME.danger,
    fontWeight: '500',
  },
  legendContainer: {
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
});