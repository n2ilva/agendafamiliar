'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { createTask, getTasks, updateTask, deleteTask } from '@/services/firebase';
import TaskModal from '@/components/TaskModal';
import CreateFamilyModal from '@/components/CreateFamilyModal';
import JoinFamilyModal from '@/components/JoinFamilyModal';
import ManageFamilyModal from '@/components/ManageFamilyModal';
import TaskApprovals from '@/components/TaskApprovals';
import { Family, UserRole, hasPermission, USER_ROLE_LABELS, USER_ROLE_COLORS } from '@/types/family';

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  dueTime?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  familyId?: string;
  createdAt?: Date | { toDate: () => Date };
  updatedAt?: Date | { toDate: () => Date };
}

export default function DashboardPage() {
  // Adiciona valor padrão para evitar erro de 'families undefined'
  const { user, logout, families = [], currentFamily, currentUserRole, setCurrentFamily, addFamily, updateFamily } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Family modal states
  const [isCreateFamilyModalOpen, setIsCreateFamilyModalOpen] = useState(false);
  const [isJoinFamilyModalOpen, setIsJoinFamilyModalOpen] = useState(false);
  const [isManageFamilyModalOpen, setIsManageFamilyModalOpen] = useState(false);
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    category: '',
    status: 'all', // all, pending, completed, overdue
    priority: '',
    search: ''
  });

  // Função para calcular status de vencimento
  const getTaskStatus = (task: Task) => {
    if (task.completed) return { status: 'completed', color: 'text-green-600', label: 'Concluída' };
    
    if (!task.dueDate) return { status: 'no-due', color: 'text-gray-500', label: 'Sem prazo' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Criar data sem problemas de timezone
    const dueDateParts = task.dueDate.split('-');
    if (dueDateParts.length === 3) {
      const year = parseInt(dueDateParts[0], 10);
      const month = parseInt(dueDateParts[1], 10) - 1; // Mês é 0-indexado
      const day = parseInt(dueDateParts[2], 10);
      const dueDate = new Date(year, month, day);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return { status: 'overdue', color: 'text-red-600', label: 'Atrasada' };
      if (diffDays === 0) return { status: 'today', color: 'text-orange-600', label: 'Hoje' };
      if (diffDays === 1) return { status: 'tomorrow', color: 'text-yellow-600', label: 'Amanhã' };
      if (diffDays <= 7) return { status: 'week', color: 'text-blue-600', label: `${diffDays} dias` };
      
      return { status: 'future', color: 'text-gray-600', label: `${diffDays} dias` };
    }
    
    // Fallback para formato de data não esperado
    return { status: 'no-due', color: 'text-gray-500', label: 'Sem prazo' };
  };

  // Função para formatar data e hora
  const formatDateTime = (date?: string, time?: string) => {
    if (!date) return '';
    
    // Se a data está no formato YYYY-MM-DD, criar data local sem problemas de timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const dateParts = date.split('-');
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // Mês é 0-indexado
      const day = parseInt(dateParts[2], 10);
      const localDate = new Date(year, month, day);
      
      const dateFormatted = localDate.toLocaleDateString('pt-BR');
      if (time) {
        return `${dateFormatted} às ${time}`;
      }
      return dateFormatted;
    }
    
    // Fallback para outros formatos
    const dateFormatted = new Date(date).toLocaleDateString('pt-BR');
    if (time) {
      return `${dateFormatted} às ${time}`;
    }
    return dateFormatted;
  };

  // Função para formatar data do Firebase
  const formatFirebaseDate = (date?: Date | { toDate: () => Date }): string => {
    if (!date) return '';
    
    if (typeof date === 'object' && 'toDate' in date) {
      return date.toDate().toLocaleDateString('pt-BR');
    }
    
    if (date instanceof Date) {
      return date.toLocaleDateString('pt-BR');
    }
    
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Função para filtrar tarefas
  const filteredTasks = tasks.filter(task => {
    // Filtro por categoria
    if (filters.category && task.category !== filters.category) return false;
    
    // Filtro por prioridade
    if (filters.priority && task.priority !== filters.priority) return false;
    
    // Filtro por busca
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !task.description?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    
    // Filtro por status
    if (filters.status === 'completed' && !task.completed) return false;
    if (filters.status === 'pending' && task.completed) return false;
    if (filters.status === 'overdue') {
      if (task.completed) return false;
      const status = getTaskStatus(task);
      if (status.status !== 'overdue') return false;
    }
    
    return true;
  });

  // Categorias disponíveis
  const categories = ['Compras', 'Escola', 'Trabalho', 'Casa', 'Saúde', 'Lazer', 'Outros'];

  const loadTasks = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const { tasks, error } = await getTasks(user.uid);
      if (error) {
        console.error('Error loading tasks:', error);
        setTasks([]);
      } else {
        // Filtrar tarefas com IDs válidos
        const validTasks = tasks.filter(task => task.id && task.id.trim() !== '');
        setTasks(validTasks);
        
        // Log se encontrou tarefas inválidas (opcional para debug)
        const invalidTasks = tasks.filter(task => !task.id || task.id.trim() === '');
        if (invalidTasks.length > 0) {
          console.warn(`Found ${invalidTasks.length} tasks with invalid IDs that were filtered out`);
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadTasks();
  }, [user, router, loadTasks]);

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask = { ...task, completed: !task.completed };
    const { success, error } = await updateTask(taskId, updatedTask);
    if (success) {
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
    } else {
      console.error('Error toggling task:', error);
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!taskId) {
      console.error('No taskId provided to handleDeleteTask');
      return;
    }
    
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      const { success, error } = await deleteTask(taskId);
      if (success) {
        setTasks(tasks.filter(task => task.id !== taskId));
      } else {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleSaveTask = async (taskData: Task) => {
    if (!user?.uid) return;

    if (editingTask) {
      // Edit existing task
      const { success, error } = await updateTask(editingTask.id, taskData);
      if (success) {
        setTasks(tasks.map(task =>
          task.id === editingTask.id ? { ...taskData, id: editingTask.id } : task
        ));
      } else {
        console.error('Error updating task:', error);
      }
    } else {
      // Create new task
      const taskWithCreator = {
        ...taskData,
        createdBy: user.displayName || user.email || 'Usuário'
      };
      const result = await createTask(user.uid, taskWithCreator);
      
      const { success, taskId, error } = result;
      if (success && taskId) {
        const newTask: Task = {
          ...taskWithCreator,
          id: taskId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setTasks([...tasks, newTask]);
      } else {
        console.error('Error creating task:', error);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-gray-50">
      {/* Header */}
  <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-600 p-3 rounded-lg shadow-sm">
                <span className="text-white text-xl">👨‍👩‍👧‍👦</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Agenda Familiar</h1>
                <p className="text-sm text-gray-600">
                  {currentFamily ? `Família: ${currentFamily.name}` : 'Organize sua família com facilidade'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Family Selection */}
              {Array.isArray(families) && families.length > 1 && (
                <select
                  value={currentFamily?.id || ''}
                  onChange={(e) => {
                    const selectedFamily = families.find((f: Family) => f.id === e.target.value);
                    setCurrentFamily(selectedFamily || null);
                  }}
                  className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {families.map((family: Family) => (
                    <option key={family.id} value={family.id}>
                      {family.name}
                    </option>
                  ))}
                </select>
              )}
              
              {/* Family Actions */}
              <button
                onClick={() => setIsCreateFamilyModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <span className="mr-1">➕</span>
                Criar Família
              </button>
              <button
                onClick={() => setIsJoinFamilyModalOpen(true)}
                className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <span className="mr-1">🚪</span>
                Entrar
              </button>
              <button
                onClick={handleCreateTask}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <span className="mr-1">📝</span>
                Nova Tarefa
              </button>
              {currentFamily && currentUserRole && hasPermission(currentUserRole, 'canManageMembers') && (
                <button
                  onClick={() => setIsManageFamilyModalOpen(true)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <span className="mr-1">⚙️</span>
                  Gerenciar
                </button>
              )}

              <div className="bg-white rounded-md px-4 py-2 border border-gray-200">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 font-medium">
                    {user?.email?.split('@')[0]}
                  </span>
                  {currentUserRole && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${USER_ROLE_COLORS[currentUserRole as keyof typeof USER_ROLE_COLORS]}`}>
                      {USER_ROLE_LABELS[currentUserRole as keyof typeof USER_ROLE_LABELS]}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <span className="mr-2">🚪</span>
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Welcome section for users without families */}
          {(!currentFamily && (families?.length ?? 0) === 0 && currentUserRole === UserRole.ADMIN) && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
              <div className="text-center">
                <div className="bg-indigo-600 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white text-3xl">👨‍👩‍👧‍👦</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Bem-vindo à Agenda Familiar! 🎉
                </h2>
                <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                  Você ainda não faz parte de nenhuma família. Como você é um administrador, pode criar uma nova família 
                  ou entrar em uma família existente usando um código de convite.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setIsCreateFamilyModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <span className="text-xl">✨</span>
                    <span>Criar Nova Família</span>
                  </button>
                  <button
                    onClick={() => setIsJoinFamilyModalOpen(true)}
                    className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-6 py-3 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <span className="text-xl">🚪</span>
                    <span>Entrar em Família</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-indigo-600 p-3 rounded-md">
                    <span className="text-white text-xl">📝</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Minhas Tarefas
                    </h2>
                    <p className="text-gray-600">
                      {filteredTasks.length} {filteredTasks.length === 1 ? 'tarefa encontrada' : 'tarefas encontradas'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCreateTask}
                  className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
                >
                  <span className="text-lg">➕</span>
                  <span>Nova Tarefa</span>
                </button>
              </div>

          {/* Filters Section */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 mb-8">
            <div className="flex items-center mb-4 space-x-2">
              <div className="bg-indigo-600 text-white w-8 h-8 rounded-md flex items-center justify-center text-sm">🔍</div>
              <h3 className="text-base font-semibold text-gray-900">Filtros</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Buscar tarefas
                </label>
                <input
                  type="text"
                  placeholder="Digite para buscar..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Status das tarefas
                </label>
                   <select
                     value={filters.status}
                     onChange={(e) => setFilters({...filters, status: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                   >
                     <option value="all">📋 Todas</option>
                     <option value="pending">⏳ Pendentes</option>
                     <option value="completed">✅ Concluídas</option>
                     <option value="overdue">⚠️ Atrasadas</option>
                   </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Categoria
                </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                  <option value="">📁 Todas</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Prioridade
                </label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({...filters, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                  <option value="">⭐ Todas</option>
                  <option value="high">🔴 Alta</option>
                  <option value="medium">🟡 Média</option>
                  <option value="low">🟢 Baixa</option>
                </select>
              </div>

              {/* Clear Filters */}
                 <div className="flex items-end">
                   <button
                     onClick={() => setFilters({ category: '', status: 'all', priority: '', search: '' })}
                     className="w-full px-3 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-md text-sm font-medium transition-colors"
                   >
                     Limpar
                   </button>
                 </div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="bg-white/70 backdrop-blur-sm shadow-xl overflow-hidden rounded-2xl border border-gray-200/50">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">{tasks.length === 0 ? '📝' : '🔍'}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {tasks.length === 0 ? 'Nenhuma tarefa criada ainda' : 'Nenhuma tarefa encontrada'}
                </h3>
                <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                  {tasks.length === 0 
                    ? 'Comece criando sua primeira tarefa para organizar sua agenda familiar'
                    : 'Tente ajustar os filtros acima para encontrar suas tarefas'
                  }
                </p>
                {tasks.length === 0 && (
                  <button
                    onClick={handleCreateTask}
                    className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    ➕ Criar Primeira Tarefa
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200/50">
                {filteredTasks.map((task) => {
                const status = getTaskStatus(task);
                const isOverdue = status.status === 'overdue';
                return (
                  <div
                    key={task.id}
                    className={`group p-5 rounded-lg border border-gray-200/70 bg-white transition-colors duration-200 border-l-4 ${
                      isOverdue
                        ? 'border-red-500 bg-red-50'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex items-center mt-1">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTask(task.id)}
                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-md transition-colors duration-150"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Header da tarefa */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'} shadow-sm`}></div>
                              <h3 className={`text-lg font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'} transition-colors duration-200`}>
                                {task.title}
                              </h3>
                              {task.category && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                  {task.category}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Descrição */}
                          {task.description && (
                            <p className="text-gray-700 mt-2 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-200">
                              {task.description}
                            </p>
                          )}
                          
                          {/* Informações da tarefa */}
                          <div className="flex flex-wrap items-center gap-4 mt-4">
                            {task.dueDate && (
                              <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-gray-600">📅</span>
                                <span className={`text-sm font-medium ${status.color}`}>
                                  {formatDateTime(task.dueDate, task.dueTime)}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                  status.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                  status.status === 'today' ? 'bg-orange-100 text-orange-700' :
                                  status.status === 'tomorrow' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {status.label}
                                </span>
                              </div>
                            )}
                            
                            {/* Informações do usuário criador */}
                            {(task.createdByName || task.createdBy) && (
                              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                                <span className="text-gray-500">👤</span>
                                <span className="text-xs text-gray-600 font-medium">Criado por:</span>
                                <span className="text-sm text-gray-800 font-semibold">{task.createdByName || task.createdBy}</span>
                              </div>
                            )}
                            
                            {/* Informações do usuário que modificou */}
                            {(task.updatedByName || task.updatedBy) && (task.updatedBy !== task.createdBy) && (
                              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                                <span className="text-gray-500">✏️</span>
                                <span className="text-xs text-gray-600 font-medium">Editado por:</span>
                                <span className="text-sm text-gray-800 font-semibold">{task.updatedByName || task.updatedBy}</span>
                              </div>
                            )}
                            
                            {task.createdAt && (
                              <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-gray-600">🕒</span>
                                <span className="text-sm text-gray-600">
                                  Criada em {formatFirebaseDate(task.createdAt)}
                                </span>
                              </div>
                            )}
                            
                            {task.updatedAt && task.updatedAt !== task.createdAt && (
                              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-gray-600">📝</span>
                                <span className="text-sm text-gray-600">
                                  Atualizada em {formatFirebaseDate(task.updatedAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Botões de ação */}
                      <div className="flex items-center space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-gray-200 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-colors"
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Carregando tarefas...</p>
            </div>
          )}
          </div>
        </div>
      </main>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        task={editingTask}
      />

      {/* Family Modals */}
      <CreateFamilyModal
        isOpen={isCreateFamilyModalOpen}
        onClose={() => setIsCreateFamilyModalOpen(false)}
        onFamilyCreated={(family) => {
          addFamily(family);
          setCurrentFamily(family);
        }}
        userId={user?.uid || ''}
        userEmail={user?.email || ''}
      />

      <JoinFamilyModal
        isOpen={isJoinFamilyModalOpen}
        onClose={() => setIsJoinFamilyModalOpen(false)}
        onFamilyJoined={(family) => {
          addFamily(family);
          setCurrentFamily(family);
        }}
        userId={user?.uid || ''}
        userEmail={user?.email || ''}
      />

      {currentFamily && (
        <ManageFamilyModal
          isOpen={isManageFamilyModalOpen}
          onClose={() => setIsManageFamilyModalOpen(false)}
          family={currentFamily}
          onFamilyUpdated={(updatedFamily) => {
            updateFamily(updatedFamily);
            setCurrentFamily(updatedFamily);
          }}
          currentUserId={user?.uid || ''}
        />
      )}

      {/* Task Approvals for Kids */}
      {currentFamily && currentUserRole === UserRole.KIDS && (
        <TaskApprovals 
          family={currentFamily} 
          currentUserId={user?.uid || ''}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}