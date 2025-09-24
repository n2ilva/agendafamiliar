import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import syncService from '../services/sync';
import firebaseService from '../services/firebase';

export const useAutoSync = () => {
  const { user } = useAuth();

  // Função para sincronizar dados automaticamente
  const autoSync = useCallback(async (localData, familyData = null) => {
    if (!user) return;

    try {
      // Aguarda curto período para o Firebase atualizar seu estado de autenticação
      const fbUser = await syncService.ensureFirebaseUserAvailable(3000);
      if (!fbUser) {
        console.warn('Aviso: Firebase não reportou usuário logado após aguardar. Iremos tentar sincronizar usando o user do contexto (fallback).');
        // Mantemos comportamento pragmático: tentar sincronizar com base no contexto do app
      }

      // Faz upload dos dados locais para a nuvem usando o serviço de sync diretamente
      await syncService.syncToCloud(String(user.id), localData, familyData);

      // sincronização concluída
    } catch (error) {
      console.warn('Erro na sincronização automática:', error);
      // Não lança erro para não interromper o fluxo do usuário
    }
  }, [user]);

  // Hook para sincronização automática baseada em intervalo de tempo
  const usePeriodicSync = (localData, familyData = null, intervalMinutes = 30) => {
    useEffect(() => {
      if (!user) return;

      const syncInterval = setInterval(() => {
        autoSync(localData, familyData);
      }, intervalMinutes * 60 * 1000); // Converte minutos para milissegundos

      return () => clearInterval(syncInterval);
    }, [user, localData, familyData, intervalMinutes, autoSync]);
  };

  // Hook para sincronização automática baseada em mudanças nos dados
  const useChangeSync = (localData, familyData = null, debounceMs = 5000) => {
    useEffect(() => {
      if (!user) return;

      const timeoutId = setTimeout(() => {
        autoSync(localData, familyData);
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    }, [user, localData, familyData, debounceMs, autoSync]);
  };

  // Hook para sincronização quando o app volta ao foco
  const useFocusSync = (localData, familyData = null) => {
    useEffect(() => {
      if (!user) return;

      const handleFocus = () => {
        autoSync(localData, familyData);
      };

      // Para React Native, podemos usar AppState
      // Para web, podemos usar window focus events
      if (typeof window !== 'undefined') {
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
      }
    }, [user, localData, familyData, autoSync]);
  };

  return {
    autoSync,
    usePeriodicSync,
    useChangeSync,
    useFocusSync,
  };
};