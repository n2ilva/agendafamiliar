'use client';

import React, { useState, useEffect } from 'react';

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
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  task?: Task | null;
}

const categories = [
  'Compras',
  'Escola',
  'Trabalho',
  'Casa',
  'Saúde',
  'Lazer',
  'Outros'
];

export default function TaskModal({ isOpen, onClose, onSave, task }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [titleError, setTitleError] = useState('');

  // Função para converter data para formato do input
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    try {
      // Se a string já está no formato YYYY-MM-DD, retorna como está
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      
      // Caso contrário, tenta criar uma data e formatar
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // Formatar para YYYY-MM-DD usando timezone local
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setDueDate(formatDateForInput(task.dueDate || ''));
      setDueTime(task.dueTime || '');
      setCategory(task.category || '');
      setPriority(task.priority || 'medium');
    } else {
      setTitle('');
      setDescription('');
      setDueDate('');
      setDueTime('');
      setCategory('');
      setPriority('medium');
    }
    setTitleError('');
  }, [task, isOpen]);

  const validateForm = () => {
    if (!title.trim()) {
      setTitleError('Título é obrigatório');
      return false;
    }
    setTitleError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Criar objeto base da tarefa
    const taskData: any = {
      title: title.trim(),
      description: description.trim(),
      completed: task?.completed || false,
      priority: priority,
    };

    // Adicionar ID apenas se for uma tarefa existente
    if (task?.id) {
      taskData.id = task.id;
    }

    // Adicionar campos opcionais apenas se tiverem valor
    if (dueDate) {
      taskData.dueDate = dueDate;
    }
    
    if (dueTime) {
      taskData.dueTime = dueTime;
    }
    
    if (category) {
      taskData.category = category;
    }
    
    if (task?.createdBy) {
      taskData.createdBy = task.createdBy;
    }
    
    if (task?.familyId) {
      taskData.familyId = task.familyId;
    }

    onSave(taskData as Task);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200/50 w-full max-w-lg mx-auto transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <span className="text-white text-xl">{task ? '✏️' : '➕'}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {task ? 'Editar Tarefa' : 'Nova Tarefa'}
                </h3>
                <p className="text-blue-100 text-sm">
                  {task ? 'Atualize as informações da tarefa' : 'Preencha os detalhes da nova tarefa'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors duration-200"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="flex items-center space-x-2">
                  <span>📝</span>
                  <span>Título da Tarefa *</span>
                </span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError('');
                }}
                className={`w-full px-4 py-2 border ${titleError ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400`}
                placeholder="Ex: Comprar leite no supermercado"
              />
              {titleError && (
                <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                  <span>⚠️</span>
                  <span>{titleError}</span>
                </p>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="flex items-center space-x-2">
                  <span>📄</span>
                  <span>Descrição</span>
                </span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 resize-none"
                placeholder="Adicione detalhes sobre a tarefa (opcional)"
              />
            </div>

            {/* Categoria e Prioridade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="flex items-center space-x-2">
                    <span>📁</span>
                    <span>Categoria</span>
                  </span>
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                >
                  <option value="">Selecione...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="flex items-center space-x-2">
                    <span>⭐</span>
                    <span>Prioridade</span>
                  </span>
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                >
                  <option value="low">🟢 Baixa</option>
                  <option value="medium">🟡 Média</option>
                  <option value="high">🔴 Alta</option>
                </select>
              </div>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dueDate" className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="flex items-center space-x-2">
                    <span>📅</span>
                    <span>Data de Vencimento</span>
                  </span>
                </label>
                <input
                  type="date"
                  id="dueDate"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="dueTime" className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="flex items-center space-x-2">
                    <span>⏰</span>
                    <span>Horário</span>
                  </span>
                </label>
                <input
                  type="time"
                  id="dueTime"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                  disabled={!dueDate}
                />
                {!dueDate && (
                  <p className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
                    <span>💡</span>
                    <span>Selecione uma data primeiro</span>
                  </p>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                <span>✕</span>
                <span>Cancelar</span>
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center space-x-2"
              >
                <span>{task ? '✏️' : '➕'}</span>
                <span>{task ? 'Salvar Alterações' : 'Criar Tarefa'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}