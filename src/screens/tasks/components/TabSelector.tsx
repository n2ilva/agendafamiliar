import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLORS } from '../../../constants/colors';

interface TabSelectorProps {
  activeTab: 'today' | 'upcoming';
  onTabChange: (tab: 'today' | 'upcoming') => void;
  todayCount: number;
  upcomingCount: number;
  colors: any;
}

export const TabSelector = memo(function TabSelector({
  activeTab,
  onTabChange,
  todayCount,
  upcomingCount,
  colors,
}: TabSelectorProps) {
  const handleTodayPress = useCallback(() => {
    onTabChange('today');
  }, [onTabChange]);

  const handleUpcomingPress = useCallback(() => {
    onTabChange('upcoming');
  }, [onTabChange]);

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <Pressable
        style={[
          styles.tab,
          activeTab === 'today' && styles.activeTab,
          activeTab === 'today' && { backgroundColor: APP_COLORS.primary.main }
        ]}
        onPress={handleTodayPress}
      >
        <Ionicons
          name="today-outline"
          size={18}
          color={activeTab === 'today' ? '#fff' : colors.textSecondary}
        />
        <Text style={[
          styles.tabText,
          activeTab === 'today' ? styles.activeTabText : { color: colors.textSecondary }
        ]}>
          Hoje
        </Text>
        {todayCount > 0 && (
          <View style={[
            styles.badge,
            activeTab === 'today' ? styles.activeBadge : { backgroundColor: colors.border }
          ]}>
            <Text style={[
              styles.badgeText,
              activeTab === 'today' ? styles.activeBadgeText : { color: colors.textSecondary }
            ]}>
              {todayCount}
            </Text>
          </View>
        )}
      </Pressable>

      <Pressable
        style={[
          styles.tab,
          activeTab === 'upcoming' && styles.activeTab,
          activeTab === 'upcoming' && { backgroundColor: APP_COLORS.primary.main }
        ]}
        onPress={handleUpcomingPress}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={activeTab === 'upcoming' ? '#fff' : colors.textSecondary}
        />
        <Text style={[
          styles.tabText,
          activeTab === 'upcoming' ? styles.activeTabText : { color: colors.textSecondary }
        ]}>
          Próximas
        </Text>
        {upcomingCount > 0 && (
          <View style={[
            styles.badge,
            activeTab === 'upcoming' ? styles.activeBadge : { backgroundColor: colors.border }
          ]}>
            <Text style={[
              styles.badgeText,
              activeTab === 'upcoming' ? styles.activeBadgeText : { color: colors.textSecondary }
            ]}>
              {upcomingCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.todayCount === nextProps.todayCount &&
    prevProps.upcomingCount === nextProps.upcomingCount
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeBadgeText: {
    color: '#fff',
  },
});
