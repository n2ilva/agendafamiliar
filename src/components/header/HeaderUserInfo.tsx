import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
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

interface HeaderUserInfoProps {
  userName: string;
  familyName?: string;
  userRole?: UserRole;
  isSyncingPermissions?: boolean;
  syncStatus?: {
    hasError?: boolean;
    isOnline?: boolean;
    pendingOperations?: number;
    isSyncing?: boolean;
  };
  onPress: () => void;
}

export const HeaderUserInfo: React.FC<HeaderUserInfoProps> = ({
  userName,
  familyName,
  userRole,
  isSyncingPermissions,
  syncStatus,
  onPress,
}) => {
  const { colors } = useTheme();
  const styles = getHeaderStyles(colors);

  return (
    <Pressable onPress={onPress} style={styles.userInfo}>
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
              style={[styles.syncPill, { backgroundColor: syncStatus?.isSyncing ? APP_COLORS.primary.main : '#f59e0b' }]} 
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
  );
};

