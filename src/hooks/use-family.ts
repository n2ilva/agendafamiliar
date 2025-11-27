import { useState, useEffect, useCallback, useRef } from 'react';
import { Family, FamilyUser } from '../types/family.types';
import { familyService } from '../services/family/local-family.service';
import LocalStorageService from '../services/storage/local-storage.service';
import logger from '../utils/helpers/logger';

export function useFamily(user: FamilyUser | null, isOffline: boolean) {
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyUser[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  
  // Refs para controle
  const membersUnsubRef = useRef<(() => void) | null>(null);

  // Carregar família do usuário
  useEffect(() => {
    const loadUserFamily = async () => {
      try {
        if (user?.id) {
          logger.debug('FAMILY_LOAD', {
            userId: user.id,
            familyId: user.familyId,
            isOffline: isOffline
          });
          setIsBootstrapping(true);
          
          // 1. CARREGAR DO CACHE LOCAL PRIMEIRO
          try {
            const offlineData = await LocalStorageService.getOfflineData();
            if (user.familyId && offlineData.families[user.familyId]) {
              setCurrentFamily(offlineData.families[user.familyId]);
              logger.success('CACHE_LOAD', `Família carregada do cache: ${offlineData.families[user.familyId].name}`);
            }
          } catch (cacheError) {
            logger.warn('CACHE_ERROR', 'Erro ao carregar do cache local');
          }
          
          // 2. SINCRONIZAR EM BACKGROUND
          if (!isOffline) {
            const userFamily = await familyService.getUserFamily(user.id);
            
            if (userFamily) {
              setCurrentFamily(userFamily);
              setFamilyMembers(userFamily.members);
              await LocalStorageService.saveFamily(userFamily);
            } else if (user.familyId) {
              // Fallback
              try {
                const fetchedFamily = await familyService.getFamilyById(user.familyId);
                if (fetchedFamily) {
                  setCurrentFamily(fetchedFamily);
                  setFamilyMembers(fetchedFamily.members);
                  await LocalStorageService.saveFamily(fetchedFamily);
                }
              } catch (e) {
                logger.warn('FAMILY_FALLBACK', 'Falha ao carregar família via fallback');
              }
            }
          }
        }
      } catch (error) {
        logger.error('FAMILY_LOAD', 'Erro ao carregar família do usuário', error);
      } finally {
        setIsBootstrapping(false);
      }
    };
    
    loadUserFamily();
  }, [user?.id, isOffline]);

  // Gerenciar assinatura de membros em tempo real
  const subscribeToMembers = useCallback(() => {
    if (currentFamily?.id) {
      if (membersUnsubRef.current) {
        try { membersUnsubRef.current(); } catch {}
      }
      const unsubscribe = (familyService as any).subscribeToFamilyMembers(
        currentFamily.id,
        (members: FamilyUser[]) => {
          setFamilyMembers(members);
        }
      );
      membersUnsubRef.current = unsubscribe;
    }
  }, [currentFamily?.id]);

  const unsubscribeFromMembers = useCallback(() => {
    if (membersUnsubRef.current) {
      try { membersUnsubRef.current(); } catch {}
      membersUnsubRef.current = null;
    }
  }, []);

  return {
    currentFamily,
    setCurrentFamily,
    familyMembers,
    setFamilyMembers,
    isBootstrapping,
    subscribeToMembers,
    unsubscribeFromMembers
  };
}
