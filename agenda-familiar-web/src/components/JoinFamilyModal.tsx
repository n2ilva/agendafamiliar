import React, { useState } from 'react';
import { joinFamily } from '../services/firebase';
import { Family } from '../types/family';

interface JoinFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFamilyJoined: (family: Family) => void;
  userId: string;
  userEmail: string;
  userDisplayName?: string;
}

export default function JoinFamilyModal({ 
  isOpen, 
  onClose, 
  onFamilyJoined, 
  userId, 
  userEmail, 
  userDisplayName 
}: JoinFamilyModalProps) {
  const [familyCode, setFamilyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyCode.trim()) {
      setError('Código da família é obrigatório');
      return;
    }
    if (familyCode.trim().length !== 6) {
      setError('O código deve ter 6 caracteres');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await joinFamily(userId, familyCode.trim(), userEmail, userDisplayName);
      if (result.success && result.family) {
        onFamilyJoined(result.family);
        setFamilyCode('');
        onClose();
      } else {
        setError(result.error || 'Erro ao entrar na família');
      }
    } catch (error) {
      console.error('Error joining family:', error);
      setError('Erro inesperado ao entrar na família');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFamilyCode('');
    setError('');
    onClose();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setFamilyCode(value);
    if (error) setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-md mx-auto">
        {/* Header */}
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-md text-white text-xl">🚪</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Entrar em Família</h3>
                <p className="text-gray-500 text-sm">Use o código para se juntar a uma família existente</p>
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
            {/* Family Code Input */}
            <div>
              <label htmlFor="familyCode" className="block text-sm font-semibold text-gray-700 mb-2">
                <span className="flex items-center space-x-2">
                  <span>🔑</span>
                  <span>Código da Família *</span>
                </span>
              </label>
              <input
                type="text"
                id="familyCode"
                value={familyCode}
                onChange={handleCodeChange}
                className={`w-full px-4 py-2 border ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400 text-center text-2xl font-mono tracking-widest`}
                placeholder="ABC123"
                disabled={isLoading}
                maxLength={6}
                style={{ letterSpacing: '0.3em' }}
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Digite o código de 6 caracteres fornecido pelo administrador da família
              </p>
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center justify-center space-x-1">
                  <span>⚠️</span>
                  <span>{error}</span>
                </p>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="flex justify-center space-x-1">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${index < familyCode.length ? 'bg-indigo-600' : 'bg-gray-300'}`}
                />
              ))}
            </div>

            {/* Info Box */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="flex items-start space-x-3">
                <span className="text-gray-600 text-lg">📋</span>
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1 text-gray-800">Como obter o código:</p>
                  <ul className="space-y-1">
                    <li>• Peça para um administrador da família</li>
                    <li>• Você entrará como <strong>usuário normal</strong></li>
                    <li>• O administrador pode alterar seu papel depois</li>
                    <li>• Códigos são únicos para cada família</li>
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
                disabled={isLoading || familyCode.length !== 6}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>🚪</span>
                    <span>Entrar</span>
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