import React, { useState } from 'react';
import { createFamily } from '../services/firebase';
import { Family } from '../types/family';

interface CreateFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFamilyCreated: (family: Family) => void;
  userId: string;
  userEmail: string;
  userDisplayName?: string;
}

export default function CreateFamilyModal({ 
  isOpen, 
  onClose, 
  onFamilyCreated, 
  userId, 
  userEmail, 
  userDisplayName 
}: CreateFamilyModalProps) {
  const [familyName, setFamilyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!familyName.trim()) {
      setError('Nome da família é obrigatório');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await createFamily(userId, familyName.trim(), userEmail, userDisplayName);
      
      if (result.success && result.family) {
        onFamilyCreated(result.family);
        setFamilyName('');
        onClose();
      } else {
        setError(result.error || 'Erro ao criar família');
      }
    } catch (error) {
      console.error('Error creating family:', error);
      setError('Erro inesperado ao criar família');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFamilyName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-md mx-auto">
        {/* Header */}
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-md text-white text-xl">👥</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Criar Nova Família</h3>
                <p className="text-gray-500 text-sm">Configure sua família para organizar tarefas em conjunto</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:bg-gray-100 p-2 rounded-md transition-colors"
              disabled={isLoading}
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Family Name Input */}
            <div>
              <label htmlFor="familyName" className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="flex items-center space-x-2">
                  <span>🏠</span>
                  <span>Nome da Família *</span>
                </span>
              </label>
              <input
                type="text"
                id="familyName"
                value={familyName}
                onChange={(e) => {
                  setFamilyName(e.target.value);
                  if (error) setError('');
                }}
                className={`w-full px-4 py-2 border ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 text-sm`}
                placeholder="Ex: Família Silva"
                disabled={isLoading}
                maxLength={50}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                  <span>⚠️</span>
                  <span>{error}</span>
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="flex items-start space-x-3">
                <span className="text-gray-600 text-lg">💡</span>
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1 text-gray-800">O que acontece quando você cria uma família:</p>
                  <ul className="space-y-1">
                    <li>• Você se torna o <strong>administrador</strong> da família</li>
                    <li>• Um <strong>código único</strong> será gerado para convidar outros</li>
                    <li>• Você pode gerenciar membros e suas permissões</li>
                    <li>• Pode alterar o nome da família a qualquer momento</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !familyName.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Criando...</span>
                  </>
                ) : (
                  <>
                    <span>👥</span>
                    <span>Criar Família</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}