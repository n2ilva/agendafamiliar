/**
 * Skeleton Loader Components
 * 
 * Componentes de placeholder animados para exibir durante carregamento.
 * Melhora a percepção de performance e UX.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../../contexts/theme.context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ Base Skeleton ============
interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
}) => {
  const { colors, activeTheme } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const bgColor = activeTheme === 'dark' ? '#374151' : '#E5E7EB';
  const shimmerColor = activeTheme === 'dark' ? '#4B5563' : '#F3F4F6';

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: bgColor,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: shimmerColor,
            opacity,
          },
        ]}
      />
    </View>
  );
};

// ============ Task Item Skeleton ============
export const TaskItemSkeleton: React.FC = () => {
  const { colors, activeTheme } = useTheme();
  const cardBg = activeTheme === 'dark' ? '#1F2937' : '#FFFFFF';

  return (
    <View style={[styles.taskItem, { backgroundColor: cardBg }]}>
      <View style={styles.taskItemLeft}>
        <Skeleton width={24} height={24} borderRadius={12} />
      </View>
      <View style={styles.taskItemContent}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
      </View>
      <View style={styles.taskItemRight}>
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>
    </View>
  );
};

// ============ Task List Skeleton ============
interface TaskListSkeletonProps {
  count?: number;
}

export const TaskListSkeleton: React.FC<TaskListSkeletonProps> = ({ count = 5 }) => {
  return (
    <View style={styles.taskList}>
      {/* Header skeleton */}
      <View style={styles.headerSkeleton}>
        <Skeleton width={150} height={24} />
        <Skeleton width={80} height={32} borderRadius={16} />
      </View>

      {/* Category tabs skeleton */}
      <View style={styles.categoryTabs}>
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} width={70} height={32} borderRadius={16} style={{ marginRight: 8 }} />
        ))}
      </View>

      {/* Task items skeleton */}
      {Array.from({ length: count }).map((_, index) => (
        <TaskItemSkeleton key={index} />
      ))}
    </View>
  );
};

// ============ Header Skeleton ============
export const HeaderSkeleton: React.FC = () => {
  const { activeTheme } = useTheme();
  const bgColor = activeTheme === 'dark' ? '#1F2937' : '#FFFFFF';

  return (
    <View style={[styles.header, { backgroundColor: bgColor }]}>
      <View style={styles.headerLeft}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.headerText}>
          <Skeleton width={100} height={14} />
          <Skeleton width={140} height={18} style={{ marginTop: 4 }} />
        </View>
      </View>
      <View style={styles.headerRight}>
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>
    </View>
  );
};

// ============ Card Skeleton ============
interface CardSkeletonProps {
  lines?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ lines = 3 }) => {
  const { activeTheme } = useTheme();
  const cardBg = activeTheme === 'dark' ? '#1F2937' : '#FFFFFF';

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <Skeleton width="60%" height={20} />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '40%' : '100%'}
          height={14}
          style={{ marginTop: 12 }}
        />
      ))}
    </View>
  );
};

// ============ Avatar Skeleton ============
interface AvatarSkeletonProps {
  size?: number;
}

export const AvatarSkeleton: React.FC<AvatarSkeletonProps> = ({ size = 48 }) => {
  return <Skeleton width={size} height={size} borderRadius={size / 2} />;
};

// ============ Button Skeleton ============
interface ButtonSkeletonProps {
  width?: DimensionValue;
  height?: number;
}

export const ButtonSkeleton: React.FC<ButtonSkeletonProps> = ({ 
  width = 120, 
  height = 44 
}) => {
  return <Skeleton width={width} height={height} borderRadius={8} />;
};

// ============ Text Line Skeleton ============
interface TextLineSkeletonProps {
  width?: DimensionValue;
  height?: number;
}

export const TextLineSkeleton: React.FC<TextLineSkeletonProps> = ({
  width = '100%',
  height = 14,
}) => {
  return <Skeleton width={width} height={height} />;
};

// ============ Full Screen Skeleton ============
export const FullScreenSkeleton: React.FC = () => {
  return (
    <View style={styles.fullScreen}>
      <HeaderSkeleton />
      <TaskListSkeleton />
    </View>
  );
};

// ============ Styles ============
const styles = StyleSheet.create({
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskItemLeft: {
    marginRight: 12,
  },
  taskItemContent: {
    flex: 1,
  },
  taskItemRight: {
    marginLeft: 12,
  },
  taskList: {
    flex: 1,
    paddingTop: 16,
  },
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  headerRight: {},
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fullScreen: {
    flex: 1,
  },
});

export default Skeleton;
