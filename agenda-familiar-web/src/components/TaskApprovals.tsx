import React, { useState, useEffect } from 'react';
import { TaskApproval, Family, UserRole } from '../types/family';
import firebaseService from '../services/firebase';

interface TaskApprovalsProps {
  family: Family;
  currentUserId: string;
  currentUserRole: UserRole;
}

interface TaskWithApproval extends TaskApproval {
  taskTitle?: string;
  requesterName?: string;
}

export default function TaskApprovals({ family, currentUserId, currentUserRole }: TaskApprovalsProps) {
  const [approvals, setApprovals] = useState<TaskWithApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const canApprove = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.USER;

  const loadApprovals = async () => {
    try {
      setIsLoading(true);
      const result = await firebaseService.getPendingApprovals(family.id);
      
      if (result.error) {
        setError(result.error);
        return;
      }

      // Enriquecer aprovações com informações de tarefas e usuários
      const enrichedApprovals: TaskWithApproval[] = [];
      
      for (const approval of result.approvals) {
        const enriched: TaskWithApproval = { ...approval };
        
        // Buscar informações da tarefa
        try {
          const tasksResult = await firebaseService.getTasks(currentUserId);
          if (tasksResult.tasks) {
            const task = tasksResult.tasks.find((t: any) => t.id === approval.taskId);
            if (task) {
              enriched.taskTitle = task.title;
            }
          }
        } catch (error) {
          console.error('Error fetching task info:', error);
        }

        // Buscar informações do solicitante
        const requester = family.members.find(member => member.id === approval.requestedBy);
        if (requester) {
          enriched.requesterName = requester.displayName || requester.email.split('@')[0];
        }

        enrichedApprovals.push(enriched);
      }

      setApprovals(enrichedApprovals);
      setError('');
    } catch (error) {
      console.error('Error loading approvals:', error);
      setError('Erro ao carregar aprovações');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [family.id, currentUserId]);

  const handleApproval = async (approvalId: string, action: 'approved' | 'rejected', rejectionReason?: string) => {
    setProcessingId(approvalId);
    
    try {
      const result = await firebaseService.processTaskApproval(approvalId, action, currentUserId, rejectionReason);
      
      if (result.success) {
        // Remover aprovação da lista
        setApprovals(prev => prev.filter(approval => approval.id !== approvalId));
      } else {
        setError(result.error || `Erro ao ${action === 'approved' ? 'aprovar' : 'rejeitar'} tarefa`);
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      setError('Erro inesperado ao processar aprovação');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (approvalId: string) => {
    const reason = window.prompt('Motivo da rejeição (opcional):');
    if (reason !== null) { // null means user cancelled
      handleApproval(approvalId, 'rejected', reason || undefined);
    }
  };

  if (!canApprove) {
    return null; // Não mostrar para usuários que não podem aprovar
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <span className="ml-2 text-gray-600">Carregando aprovações...</span>
        </div>
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <span className="text-green-600 text-lg">✅</span>
          <div className="text-sm text-green-800">
            <p className="font-medium">Nenhuma aprovação pendente</p>
            <p>Todas as solicitações foram processadas!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 rounded-t-xl">
        <div className="flex items-center space-x-3">
          <span className="text-white text-xl">⏳</span>
          <div>
            <h3 className="text-lg font-semibold text-white">Aprovações Pendentes</h3>
            <p className="text-orange-100 text-sm">
              {approvals.length} solicitaç{approvals.length === 1 ? 'ão' : 'ões'} aguardando sua aprovação
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm flex items-center space-x-2">
              <span>⚠️</span>
              <span>{error}</span>
            </p>
          </div>
        )}

        <div className="space-y-4">
          {approvals.map((approval) => (
            <div key={approval.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">📝</span>
                    <h4 className="font-medium text-gray-900">
                      {approval.taskTitle || 'Tarefa sem título'}
                    </h4>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-1">
                      <span>👤</span>
                      <span>Solicitado por: <strong>{approval.requesterName || 'Usuário desconhecido'}</strong></span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>🕒</span>
                      <span>{approval.requestedAt.toLocaleDateString('pt-BR')} às {approval.requestedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700">
                    Uma criança está solicitando permissão para marcar esta tarefa como concluída.
                  </p>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleApproval(approval.id, 'approved')}
                    disabled={processingId === approval.id}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 focus:outline-none focus:ring-3 focus:ring-green-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {processingId === approval.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <span>✅</span>
                        <span>Aprovar</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleReject(approval.id)}
                    disabled={processingId === approval.id}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 focus:outline-none focus:ring-3 focus:ring-red-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <span>❌</span>
                    <span>Rejeitar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 text-sm">💡</span>
            <div className="text-xs text-blue-800">
              <p className="font-medium">Sobre as aprovações:</p>
              <p>Crianças precisam de aprovação para marcar tarefas como concluídas. Isso ajuda a supervisionar o progresso e ensinar responsabilidade.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}