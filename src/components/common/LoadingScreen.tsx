import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { APP_COLORS } from '../../constants/colors';

interface LoadingScreenProps {
  colors: any;
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ colors, message = 'Carregando...' }) => (
  <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={{ marginTop: 10, color: colors.textSecondary }}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: APP_COLORS.background.lightGray,
  },
});
