import React from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet } from 'react-native';

interface LoadingScreenProps {
  colors: any;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ colors }) => (
  <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
    <View style={styles.loadingIconContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Image 
        source={require('../assets/chapeu_natal.png')} 
        style={styles.loadingChristmasHat}
      />
    </View>
    <Text style={{ marginTop: 10, color: colors.textSecondary }}>Carregando...</Text>
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingChristmasHat: {
    position: 'absolute',
    top: -18,
    left: -12,
    width: 55,
    height: 55,
    zIndex: 10,
    resizeMode: 'contain',
  },
});
