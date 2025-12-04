import { useState, useCallback, useRef } from 'react';
import { Keyboard } from 'react-native';

export type ModalKey = 'task' | 'repeat' | 'category' | 'settings' | 'picker' | 'subtaskPicker' | 'family' | 'editMember' | 'history' | 'approval' | 'postpone' | 'notification';

export interface UseModalStackReturn {
  modalStack: ModalKey[];
  isTopModal: (key: ModalKey) => boolean;
  openModal: (key: ModalKey) => void;
  closeModal: (key: ModalKey) => void;
  closeAllModals: () => void;
  isAnyModalOpen: boolean;
}

export function useModalStack(): UseModalStackReturn {
  const [modalStack, setModalStack] = useState<ModalKey[]>([]);
  
  const isTopModal = useCallback((key: ModalKey) => {
    return modalStack[modalStack.length - 1] === key;
  }, [modalStack]);

  const openModal = useCallback((key: ModalKey) => {
    try { Keyboard.dismiss(); } catch {}
    setModalStack(prev => {
      const next = prev.filter(k => k !== key);
      next.push(key);
      return next;
    });
  }, []);

  const closeModal = useCallback((key: ModalKey) => {
    setModalStack(prev => prev.filter(k => k !== key));
  }, []);

  const closeAllModals = useCallback(() => {
    setModalStack([]);
  }, []);

  const isAnyModalOpen = modalStack.length > 0;

  return {
    modalStack,
    isTopModal,
    openModal,
    closeModal,
    closeAllModals,
    isAnyModalOpen,
  };
}
