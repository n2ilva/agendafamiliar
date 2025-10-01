import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import CategoryBar from '../../components/CategoryBar';
import Task, { TaskData } from '../../components/Task';
import { useCategories } from '../../context/CategoryContext';
import { useTasks } from '../../context/TaskContext';

export default function HistoryScreen() {
  const { tasks, loading, toggleComplete } = useTasks();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortAsc, setSortAsc] = useState(false); // histórico default desc
  const { categories } = useCategories();
  // load persisted
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('prefs_history');
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
      AsyncStorage.setItem('prefs_history', JSON.stringify({ selectedCategories, sortAsc })).catch(()=>{});
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

  // categories now vem do context

  const sectionData = useMemo(() => {
    let filtered = tasks.filter(task => task.status === 'completed' || task.status === 'rejected');
    if (selectedCategories.length) {
      filtered = filtered.filter(t => t.categoryId && selectedCategories.includes(t.categoryId));
    }
    // sort overall first
    filtered.sort((a,b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return sortAsc ? da - db : db - da;
    });
    // group by year-month
    const groups: Record<string, TaskData[]> = {};
    filtered.forEach(t => {
      const d = t.date ? new Date(t.date) : null;
      const key = d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` : 'Sem data';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    const sections = Object.keys(groups)
      .sort((a,b) => {
        if (a === 'Sem data') return 1;
        if (b === 'Sem data') return -1;
        return sortAsc ? a.localeCompare(b) : b.localeCompare(a);
      })
      .map(key => ({ title: key, data: groups[key] }));
    return sections;
  }, [tasks, selectedCategories, sortAsc]);

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
  const renderSectionHeader = ({ section }: { section: { title: string }}) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico de Tarefas</Text>
      <View style={styles.controls}>
        <Pressable onPress={() => setSortAsc(s => !s)} style={styles.sortButton}>
          <Text style={styles.sortButtonText}>{sortAsc ? 'Data ↑' : 'Data ↓'}</Text>
        </Pressable>
      </View>
  <CategoryBar selectedIds={selectedCategories} onChange={setSelectedCategories} />
      <SectionList
        sections={sectionData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        style={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma tarefa concluída ainda.</Text>}
        contentContainerStyle={sectionData.length === 0 ? undefined : styles.sectionListContent}
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
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
    color: '#333'
  },
  sectionListContent: {
    paddingBottom: 40,
  }
});
