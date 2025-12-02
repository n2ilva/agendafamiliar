import React from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme.context';
import { getHeaderStyles } from './header.styles';
import { UserRole } from '../../types/family.types';
import { APP_COLORS } from '../../constants/colors';

const THEME = {
  primary: APP_COLORS.primary.main,
  danger: APP_COLORS.status.error,
  success: APP_COLORS.status.success,
  warning: APP_COLORS.status.warning,
  textPrimary: APP_COLORS.text.primary,
  textSecondary: APP_COLORS.text.secondary,
};

interface HeaderMenuProps {
  visible: boolean;
  onClose: () => void;
  menuButtonLayout: { top: number; right: number };
  userRole?: UserRole;
  onManageFamily?: () => void;
  onJoinFamily?: () => void;
  onHistory: () => void;
  onInfo: () => void;
  onRefresh?: () => void;
  onCleanupTasks?: () => void;
  onLogout: () => void;
}

export const HeaderMenu: React.FC<HeaderMenuProps> = ({
  visible,
  onClose,
  menuButtonLayout,
  userRole,
  onManageFamily,
  onJoinFamily,
  onHistory,
  onInfo,
  onRefresh,
  onCleanupTasks,
  onLogout,
}) => {
  const { colors, themeMode, setThemeMode } = useTheme();
  const styles = getHeaderStyles(colors);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* Overlay para fechar ao clicar fora */}
        <Pressable style={styles.fullscreenOverlay} onPress={onClose} />

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
              <Pressable onPress={() => { onClose(); onManageFamily(); }} style={styles.menuItem}>
                <Ionicons name="people-outline" size={18} color={APP_COLORS.secondary.dark} />
                <Text style={styles.menuText}>Gerenciar Família</Text>
              </Pressable>
            )}
            {onJoinFamily && (
              <Pressable onPress={() => { onClose(); onJoinFamily(); }} style={styles.menuItem}>
                <Ionicons name="key-outline" size={18} color={APP_COLORS.primary.dark} />
                <Text style={styles.menuText}>Entrar em outra família</Text>
              </Pressable>
            )}
            <Pressable onPress={() => { onClose(); onHistory(); }} style={styles.menuItem}>
              <Ionicons name="time-outline" size={18} color={APP_COLORS.primary.light} />
              <Text style={styles.menuText}>Histórico</Text>
            </Pressable>
            <Pressable onPress={() => { onClose(); onInfo(); }} style={styles.menuItem}>
              <Ionicons name="information-circle-outline" size={18} color={APP_COLORS.status.success} />
              <Text style={styles.menuText}>Manual e Informações</Text>
            </Pressable>
            {onCleanupTasks && (
              <Pressable onPress={() => { onClose(); onCleanupTasks(); }} style={styles.menuItem}>
                <Ionicons name="trash-bin-outline" size={18} color={APP_COLORS.status.warning} />
                <Text style={styles.menuText}>Limpar Tarefas Antigas</Text>
              </Pressable>
            )}
            {/* Atualizar dados */}
            {onRefresh && (
              <Pressable onPress={() => { onClose(); onRefresh(); }} style={styles.menuItem}>
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
            <Pressable onPress={() => { onClose(); onLogout(); }} style={styles.menuItem}>
              <Ionicons name="log-out-outline" size={18} color={APP_COLORS.status.error} />
              <Text style={[styles.menuText, { color: APP_COLORS.status.error }]}>Sair</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

