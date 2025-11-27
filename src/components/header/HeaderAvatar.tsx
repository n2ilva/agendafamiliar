import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme.context';
import { getHeaderStyles } from './header.styles';
import { getEmojiForIcon } from '../../utils/validators/task.utils';

interface HeaderAvatarProps {
  userProfileIcon?: string;
  userImage?: string; // Kept for backward compatibility if we decide to use images again
}

export const HeaderAvatar: React.FC<HeaderAvatarProps> = ({
  userProfileIcon,
  userImage,
}) => {
  const { colors } = useTheme();
  const styles = getHeaderStyles(colors);

  if (userProfileIcon) {
    return (
      <View style={styles.avatarContainer}>
        <View style={[styles.defaultAvatar, styles.iconAvatar]}> 
          <Text style={styles.avatarEmoji}>{getEmojiForIcon(userProfileIcon)}</Text>
        </View>
        <Image 
          source={require('../../../assets/chapeu_natal.png')} 
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
        source={require('../../../assets/chapeu_natal.png')} 
        style={styles.christmasHat}
      />
    </View>
  );
};
