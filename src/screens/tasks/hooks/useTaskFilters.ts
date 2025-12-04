import { useState, useMemo, useCallback } from 'react';
import { Task, CategoryConfig } from '../../../types/family.types';
import { DEFAULT_CATEGORIES } from '../../../constants/task.constants';
import { safeToDate, isToday, isUpcoming, isTaskOverdue } from '../../../utils/date/date.utils';

export type FilterType = 'all' | 'pending' | 'completed' | 'overdue' | 'recurring';
export type TabType = 'today' | 'upcoming';

export interface UseTaskFiltersReturn {
  // Estados
  filterCategory: string;
  filterType: FilterType;
  activeTab: TabType;
  categories: CategoryConfig[];
  searchQuery: string;
  
  // Ações
  setFilterCategory: (category: string) => void;
  setFilterType: (type: FilterType) => void;
  setActiveTab: (tab: TabType) => void;
  setCategories: React.Dispatch<React.SetStateAction<CategoryConfig[]>>;
  setSearchQuery: (query: string) => void;
  
  // Dados computados
  filteredTasks: Task[];
  todayTasks: Task[];
  upcomingTasks: Task[];
  overdueTasks: Task[];
  taskCounts: {
    today: number;
    upcoming: number;
    overdue: number;
    completed: number;
  };
}

export function useTaskFilters(tasks: Task[]): UseTaskFiltersReturn {
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar por categoria
  const categoryFilteredTasks = useMemo(() => {
    if (filterCategory === 'all') return tasks;
    return tasks.filter(task => task.category === filterCategory);
  }, [tasks, filterCategory]);

  // Filtrar por busca
  const searchFilteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return categoryFilteredTasks;
    const query = searchQuery.toLowerCase().trim();
    return categoryFilteredTasks.filter(task => 
      task.title.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query))
    );
  }, [categoryFilteredTasks, searchQuery]);

  // Tarefas de hoje
  const todayTasks = useMemo(() => {
    return searchFilteredTasks.filter(task => {
      const dueDate = safeToDate(task.dueDate);
      return dueDate && isToday(dueDate) && !task.completed;
    });
  }, [searchFilteredTasks]);

  // Tarefas próximas (futuras)
  const upcomingTasks = useMemo(() => {
    return searchFilteredTasks.filter(task => {
      const dueDate = safeToDate(task.dueDate);
      return dueDate && isUpcoming(dueDate) && !task.completed;
    });
  }, [searchFilteredTasks]);

  // Tarefas atrasadas
  const overdueTasks = useMemo(() => {
    return searchFilteredTasks.filter(task => {
      return isTaskOverdue(task) && !task.completed;
    });
  }, [searchFilteredTasks]);

  // Tarefas concluídas
  const completedTasks = useMemo(() => {
    return searchFilteredTasks.filter(task => task.completed);
  }, [searchFilteredTasks]);

  // Aplicar filtro de tipo
  const filteredTasks = useMemo(() => {
    let result = searchFilteredTasks;
    
    switch (filterType) {
      case 'pending':
        result = result.filter(t => !t.completed);
        break;
      case 'completed':
        result = completedTasks;
        break;
      case 'overdue':
        result = overdueTasks;
        break;
      case 'recurring':
        result = result.filter(t => t.repeatOption && t.repeatOption !== 'nenhum');
        break;
    }

    // Aplicar filtro de tab (today/upcoming)
    if (activeTab === 'today') {
      return result.filter(task => {
        const dueDate = safeToDate(task.dueDate);
        return (dueDate && isToday(dueDate)) || isTaskOverdue(task);
      });
    } else {
      return result.filter(task => {
        const dueDate = safeToDate(task.dueDate);
        return dueDate && isUpcoming(dueDate);
      });
    }
  }, [searchFilteredTasks, filterType, activeTab, completedTasks, overdueTasks]);

  // Contagens
  const taskCounts = useMemo(() => ({
    today: todayTasks.length + overdueTasks.length,
    upcoming: upcomingTasks.length,
    overdue: overdueTasks.length,
    completed: completedTasks.length,
  }), [todayTasks.length, upcomingTasks.length, overdueTasks.length, completedTasks.length]);

  return {
    filterCategory,
    filterType,
    activeTab,
    categories,
    searchQuery,
    setFilterCategory,
    setFilterType,
    setActiveTab,
    setCategories,
    setSearchQuery,
    filteredTasks,
    todayTasks,
    upcomingTasks,
    overdueTasks,
    taskCounts,
  };
}
