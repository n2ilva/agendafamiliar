import AsyncStorage from '@react-native-async-storage/async-storage';
import { isFuture, parseISO } from 'date-fns';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import CategoryBar from '../../components/CategoryBar';
import Task, { TaskData } from '../../components/Task';
import { useAuth } from '../../context/AuthContext';
import { useCategories } from '../../context/CategoryContext';
import { useTasks } from '../../context/TaskContext';

export default function UpcomingTasksScreen() {
  const { tasks, loading, toggleComplete } = useTasks();
  const { user } = useAuth();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortAsc, setSortAsc] = useState(true);
  const { categories } = useCategories();
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('prefs_upcoming');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.sortAsc === 'boolean') setSortAsc(parsed.sortAsc);
          if (Array.isArray(parsed.selectedCategories)) setSelectedCategories(parsed.selectedCategories);
          else if (parsed.selectedCategory) setSelectedCategories([parsed.selectedCategory]);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const h = setTimeout(() => {
      AsyncStorage.setItem('prefs_upcoming', JSON.stringify({ selectedCategories, sortAsc })).catch(()=>{});
    }, 250);
    return () => clearTimeout(h);
  }, [selectedCategories, sortAsc]);
  const [recentApprovedIds, setRecentApprovedIds] = useState<string[]>([]);

  const prevStatusesRef = React.useRef<Record<string,string | undefined>>({});
  useEffect(() => {
    const newlyApproved: string[] = [];
    tasks.forEach(t => {
      const prev = prevStatusesRef.current[t.id];
      if (prev === 'pending' && t.status === 'approved') newlyApproved.push(t.id);
    });
    if (newlyApproved.length) {
      setRecentApprovedIds(ids => [...ids, ...newlyApproved]);
      setTimeout(() => {
        setRecentApprovedIds(ids => ids.filter(id => !newlyApproved.includes(id)));
      }, 4000);
    }
    const next: Record<string,string | undefined> = {};
    tasks.forEach(t => { next[t.id] = t.status; });
    prevStatusesRef.current = next;
  }, [tasks]);

  // categories from context

  const upcomingTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      if (!task.date) return false;
      const allowed = task.status === 'approved' || (task.status === 'pending' && task.createdBy === user?.uid);
      if (!allowed) return false;
      try { if (!isFuture(parseISO(task.date))) return false; } catch { return false; }
      if (selectedCategories.length) {
        if (!task.categoryId || !selectedCategories.includes(task.categoryId)) return false;
      }
      return true;
    });
    filtered.sort((a,b) => {
      const da = new Date(a.date!).getTime();
      const db = new Date(b.date!).getTime();
      return sortAsc ? da - db : db - da;
    });
    return filtered;
  }, [tasks, user, selectedCategories, sortAsc]);

  const handleToggleCompletion = (id: string) => {
    toggleComplete(id);
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.loader} />;
  }

  const renderItem = ({ item }: { item: TaskData }) => {
    const highlight = recentApprovedIds.includes(item.id);
    return (
      <View style={highlight ? styles.highlightWrapper : undefined}>
        <Task task={item} onToggleCompletion={handleToggleCompletion} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Próximas Tarefas</Text>
      <View style={styles.controls}>
        <Pressable onPress={() => setSortAsc(s => !s)} style={styles.sortButton}>
          <Text style={styles.sortButtonText}>{sortAsc ? 'Data ↑' : 'Data ↓'}</Text>
        </Pressable>
      </View>
  <CategoryBar selectedIds={selectedCategories} onChange={setSelectedCategories} />
      <FlatList
        data={upcomingTasks}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma tarefa futura!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: 'gray',
  },
  controls: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    alignItems: 'center'
  },
  search: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1976d2',
    borderRadius: 6,
  },
  sortButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  chipsRow: {
    marginBottom: 10,
  },
  chip: {
    backgroundColor: '#eee',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#1976d2',
  },
  chipText: {
    color: '#000',
    fontWeight: '600'
  },
  highlightWrapper: {
    borderWidth: 2,
    borderColor: '#ffb300',
    borderRadius: 8,
  }
});
