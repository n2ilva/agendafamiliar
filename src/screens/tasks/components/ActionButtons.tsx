import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLORS } from '../../../constants/colors';

interface FloatingAddButtonProps {
  onPress: () => void;
  isDisabled?: boolean;
}

export const FloatingAddButton = memo(function FloatingAddButton({
  onPress,
  isDisabled = false,
}: FloatingAddButtonProps) {
  return (
    <Pressable
      style={[styles.button, isDisabled && styles.disabled]}
      onPress={onPress}
      disabled={isDisabled}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </Pressable>
  );
});

interface UndoButtonProps {
  visible: boolean;
  onPress: () => void;
  message?: string;
}

export const UndoButton = memo(function UndoButton({
  visible,
  onPress,
  message = 'Desfazer',
}: UndoButtonProps) {
  if (!visible) return null;

  return (
    <Pressable style={styles.undoButton} onPress={onPress}>
      <Ionicons name="arrow-undo" size={18} color="#fff" />
      <Text style={styles.undoText}>{message}</Text>
    </Pressable>
  );
});

interface SyncIndicatorProps {
  isSyncing: boolean;
  message?: string;
  colors: any;
}

export const SyncIndicator = memo(function SyncIndicator({
  isSyncing,
  message,
  colors,
}: SyncIndicatorProps) {
  if (!isSyncing) return null;

  return (
    <View style={[styles.syncContainer, { backgroundColor: colors.cardBackground }]}>
      <Ionicons name="sync" size={16} color={APP_COLORS.primary.main} />
      <Text style={[styles.syncText, { color: colors.textSecondary }]}>
        {message || 'Sincronizando...'}
      </Text>
    </View>
  );
});

interface OfflineBannerProps {
  isOffline: boolean;
  colors: any;
}

export const OfflineBanner = memo(function OfflineBanner({
  isOffline,
  colors,
}: OfflineBannerProps) {
  if (!isOffline) return null;

  return (
    <View style={styles.offlineBanner}>
      <Ionicons name="cloud-offline" size={16} color="#fff" />
      <Text style={styles.offlineText}>Modo offline</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  // Floating Add Button
  button: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: APP_COLORS.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  disabled: {
    opacity: 0.5,
  },

  // Undo Button
  undoButton: {
    position: 'absolute',
    bottom: 90,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  undoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Sync Indicator
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 8,
  },
  syncText: {
    fontSize: 13,
  },

  // Offline Banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ff6b6b',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});
