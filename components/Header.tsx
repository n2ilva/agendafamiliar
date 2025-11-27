import React from 'react';
import { View, Pressable, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getHeaderStyles } from './header/HeaderStyles';
import { useHeaderLogic } from '../hooks/useHeaderLogic';
import { HeaderAvatar } from './header/HeaderAvatar';
import { HeaderUserInfo } from './header/HeaderUserInfo';
import { HeaderMenu } from './header/HeaderMenu';
import { EditNameModal } from './header/modals/EditNameModal';
import { JoinFamilyModal } from './header/modals/JoinFamilyModal';
import { ProfileSettingsModal } from './header/modals/ProfileSettingsModal';
import { AvatarPickerModal } from './header/modals/AvatarPickerModal';
import { AvatarActionsModal } from './header/modals/AvatarActionsModal';
import { CalendarModal } from './header/modals/CalendarModal';
import { UserRole } from '../types/FamilyTypes';
import { APP_COLORS } from '../utils/colors';

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
  onCalendarDaySelect?: (date: Date) => void;
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
  const { colors } = useTheme();
  const styles = getHeaderStyles(colors);
  
  const {
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
    handleMenuPress,
    handleNameSave,
    handleJoinFamily,
    handleRoleChange,
    handleImagePicker,
    handleSelectIcon,
  } = useHeaderLogic({
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
  });

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
              <HeaderAvatar userProfileIcon={userProfileIcon} userImage={userImageLocal || undefined} />
              {imageLoading ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={APP_COLORS.text.white} />
                </View>
              ) : (
                <View style={styles.editIconContainer}>
                  <Ionicons name="create" size={12} color={APP_COLORS.text.white} />
                </View>
              )}
            </Pressable>
            
            <HeaderUserInfo 
              userName={userName}
              familyName={familyName}
              userRole={userRole}
              isSyncingPermissions={isSyncingPermissions}
              syncStatus={syncStatus}
              onPress={() => setNameModalVisible(true)}
            />
          </View>

          <View style={styles.rightSection}>
            {/* Botão de Desfazer */}
            {showUndoButton && onUndo && (
              <Pressable 
                onPress={() => { setMenuVisible(false); onUndo(); }} 
                style={styles.iconButton} 
                accessibilityLabel="Desfazer última ação"
              >
                <Ionicons name="arrow-undo" size={24} color={APP_COLORS.primary.main} />
              </Pressable>
            )}
            
            {/* Botão de Notificações */}
            {onNotifications && (
              <Pressable onPress={() => { setMenuVisible(false); onNotifications(); }} style={styles.iconButton} accessibilityLabel="Notificações">
                <View style={styles.notificationIconContainer}>
                  <Ionicons
                    name="notifications-outline"
                    size={24}
                    color={notificationCount > 0 ? APP_COLORS.status.info : APP_COLORS.primary.main}
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
              <Ionicons name="calendar-outline" size={24} color={APP_COLORS.secondary.main} />
            </Pressable>

            <View style={styles.menuContainer}>
              <Pressable 
                ref={menuButtonRef}
                onPress={handleMenuPress} 
                style={styles.iconButton}
              >
                <Ionicons name="settings-outline" size={24} color={APP_COLORS.secondary.main} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Modals */}
      <HeaderMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        menuButtonLayout={menuButtonLayout}
        userRole={userRole}
        onManageFamily={onManageFamily}
        onJoinFamily={() => { setMenuVisible(false); setJoinModalVisible(true); }}
        onHistory={onHistory}
        onInfo={onInfo}
        onRefresh={onRefresh}
        onLogout={onLogout}
      />

      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        tasks={tasks}
        onDaySelect={onCalendarDaySelect}
      />

      <EditNameModal
        visible={nameModalVisible}
        onClose={() => setNameModalVisible(false)}
        currentName={userName}
        onSave={handleNameSave}
      />

      <JoinFamilyModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        onJoin={handleJoinFamily}
      />
      
      <ProfileSettingsModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        currentRole={userRole || 'admin'}
        onRoleChange={handleRoleChange}
      />

      <AvatarActionsModal
        visible={avatarActionsVisible}
        onClose={() => setAvatarActionsVisible(false)}
        onChooseEmoji={() => setIconPickerVisible(true)}
        userProfileIcon={userProfileIcon}
      />

      <AvatarPickerModal
        visible={iconPickerVisible}
        onClose={() => setIconPickerVisible(false)}
        currentIcon={userProfileIcon}
        onSelectIcon={async (icon) => {
          await handleSelectIcon(icon);
          setIconPickerVisible(false);
        }}
      />
    </>
  );
};