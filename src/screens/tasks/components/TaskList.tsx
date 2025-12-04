import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, RefreshControl, ListRenderItemInfo } from 'react-native';
import { Task } from '../../../types/family.types';
import { EmptyState } from '../../../components/common/EmptyState';

interface TaskListProps {
  tasks: Task[];
  isRefreshing: boolean;
  onRefresh: () => void;
  renderItem: (info: ListRenderItemInfo<Task>) => React.ReactElement | null;
  colors: any;
  activeTab: 'today' | 'upcoming';
  ListHeaderComponent?: React.ReactElement;
}

const keyExtractor = (item: Task) => item.id;

export const TaskList = memo(function TaskList({
  tasks,
  isRefreshing,
  onRefresh,
  renderItem,
  colors,
  activeTab,
  ListHeaderComponent,
}: TaskListProps) {
  const ListEmptyComponent = useCallback(() => (
    <EmptyState activeTab={activeTab} />
  ), [activeTab]);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      colors={[colors.primary]}
      tintColor={colors.primary}
    />
  ), [isRefreshing, onRefresh, colors.primary]);

  return (
    <FlatList
      data={tasks}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      refreshControl={refreshControl}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={10}
      updateCellsBatchingPeriod={50}
      contentContainerStyle={tasks.length === 0 ? styles.emptyContainer : styles.listContent}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison para evitar re-renders desnecessários
  return (
    prevProps.tasks === nextProps.tasks &&
    prevProps.isRefreshing === nextProps.isRefreshing &&
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.colors === nextProps.colors
  );
});

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
