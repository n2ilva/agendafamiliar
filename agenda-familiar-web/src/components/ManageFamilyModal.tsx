import React, { useState } from 'react';
import { Family, FamilyUser, UserRole, hasPermission, USER_ROLE_LABELS, USER_ROLE_COLORS } from '../types/family';
import { 
  updateFamilyName,
  updateUserRole,
  removeFamilyMember
} from '../services/firebase';

interface ManageFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: Family;
  currentUserId: string;
  onFamilyUpdated: (family: Family) => void;
}

export default function ManageFamilyModal({ 
  isOpen, 
  onClose, 
  family, 
  currentUserId, 
  onFamilyUpdated 
}: ManageFamilyModalProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members');
  const [editingName, setEditingName] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState(family.name);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const currentUser = family.members.find(member => member.id === currentUserId);
  const canManage = currentUser && hasPermission(currentUser.role, 'canManageMembers');

  const handleUpdateName = async () => {
    if (!newFamilyName.trim() || newFamilyName.trim() === family.name) {
      setEditingName(false);
      setNewFamilyName(family.name);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await updateFamilyName(family.id, newFamilyName.trim(), currentUserId);
      
      if (result.success) {
        const updatedFamily = { ...family, name: newFamilyName.trim(), updatedAt: new Date() };
        onFamilyUpdated(updatedFamily);
        setEditingName(false);
      } else {
        setError(result.error || 'Erro ao atualizar nome da família');
        setNewFamilyName(family.name);
      }
    } catch (error) {
      console.error('Error updating family name:', error);
      setError('Erro inesperado ao atualizar nome');
      setNewFamilyName(family.name);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await updateUserRole(family.id, userId, newRole, currentUserId);
      
      if (result.success) {
        const updatedMembers = family.members.map(member => 
          member.id === userId ? { ...member, role: newRole } : member
        );
        const updatedFamily = { ...family, members: updatedMembers, updatedAt: new Date() };
        onFamilyUpdated(updatedFamily);
      } else {
        setError(result.error || 'Erro ao atualizar papel do usuário');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      setError('Erro inesperado ao atualizar papel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (userIdToRemove: string, userName: string) => {
    if (!window.confirm(`Tem certeza que deseja remover ${userName} da família?`)) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await removeFamilyMember(family.id, userIdToRemove, currentUserId);
      
      if (result.success) {
        const updatedMembers = family.members.filter(member => member.id !== userIdToRemove);
        const updatedFamily = { ...family, members: updatedMembers, updatedAt: new Date() };
        onFamilyUpdated(updatedFamily);
      } else {
        setError(result.error || 'Erro ao remover membro');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      setError('Erro inesperado ao remover membro');
    } finally {
      setIsLoading(false);
    }
  };

  const copyFamilyCode = () => {
    navigator.clipboard.writeText(family.code);
    // You could add a toast notification here
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-md text-white text-xl">⚙️</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Gerenciar Família</h3>
                <p className="text-gray-500 text-sm">Configure membros e permissões</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:bg-gray-100 p-2 rounded-md transition-colors"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Content */}
  <div className="p-6">
          {/* Family Info */}
          <div className="mb-6 bg-gray-50 rounded-md p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {editingName ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newFamilyName}
                      onChange={(e) => setNewFamilyName(e.target.value)}
                      className="text-lg font-medium bg-white border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={isLoading}
                      maxLength={50}
                    />
                    <button
                      onClick={handleUpdateName}
                      disabled={isLoading}
                      className="text-green-600 hover:text-green-700 transition-colors"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        setEditingName(false);
                        setNewFamilyName(family.name);
                      }}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <h4 className="text-lg font-semibold text-gray-900">{family.name}</h4>
                    {canManage && (
                      <button
                        onClick={() => setEditingName(true)}
                        className="text-gray-500 hover:text-indigo-600 transition-colors"
                      >
                        ✏️
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Código:</span>
                <code className="bg-white px-3 py-1 rounded-md border font-mono text-sm">{family.code}</code>
                <button
                  onClick={copyFamilyCode}
                  className="text-gray-500 hover:text-indigo-600 transition-colors"
                  title="Copiar código"
                >
                  📋
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {family.members.length} membro{family.members.length !== 1 ? 's' : ''} • 
              Criada em {family.createdAt.toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-800 text-sm flex items-center space-x-2">
                <span>⚠️</span>
                <span>{error}</span>
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'members'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              👥 Membros ({family.members.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              ⚙️ Configurações
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {family.members.map((member) => (
                <div key={member.id} className="bg-white border border-gray-200 rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {(member.displayName || member.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.displayName || member.email.split('@')[0]}
                          {member.id === currentUserId && (
                            <span className="text-sm text-gray-500 ml-2">(você)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        <p className="text-xs text-gray-500">
                          Entrou em {member.joinedAt.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {/* Role Badge */}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${USER_ROLE_COLORS[member.role]}`}>
                        {USER_ROLE_LABELS[member.role]}
                      </span>
                      
                      {/* Actions */}
                      {canManage && member.id !== currentUserId && (
                        <div className="flex items-center space-x-2">
                          {/* Role Selector */}
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value as UserRole)}
                            disabled={isLoading}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value={UserRole.ADMIN}>Administrador</option>
                            <option value={UserRole.USER}>Usuário</option>
                            <option value={UserRole.KIDS}>Criança</option>
                          </select>
                          
                          {/* Remove Button */}
                          <button
                            onClick={() => handleRemoveMember(member.id, member.displayName || member.email)}
                            disabled={isLoading}
                            className="text-red-600 hover:text-red-700 transition-colors p-1"
                            title="Remover membro"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                <h5 className="font-semibold text-gray-900 mb-3">Permissões da Família</h5>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Crianças podem criar tarefas</p>
                      <p className="text-xs text-gray-600">Permite que usuários do tipo "Criança" criem novas tarefas</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={family.settings.allowKidsCreateTasks}
                      disabled={!canManage}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Aprovação obrigatória para crianças</p>
                      <p className="text-xs text-gray-600">Crianças precisam de aprovação para marcar tarefas como concluídas</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={family.settings.requireApprovalForKidsCompletion}
                      disabled={!canManage}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Usuários podem gerenciar outros usuários</p>
                      <p className="text-xs text-gray-600">Permite que usuários normais gerenciem outros usuários (exceto admins)</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={family.settings.allowUserManageMembers}
                      disabled={!canManage}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-100 border border-gray-200 rounded-md p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-gray-600 text-lg">ℹ️</span>
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1 text-gray-800">Configurações em desenvolvimento</p>
                    <p>As permissões avançadas serão implementadas em uma próxima atualização.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}