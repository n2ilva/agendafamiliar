/**
 * Hook para gerenciar estados de UI do TaskScreen
 * 
 * Este hook consolida estados relacionados à interface do usuário,
 * reduzindo a complexidade do TaskScreen.
 */

import { useState, useCallback, useMemo } from 'react';

// ============ Estados de Loading ============
export interface LoadingStates {
  isBootstrapping: boolean;
  isRefreshing: boolean;
  isGlobalLoading: boolean;
  isAddingTask: boolean;
  isSyncing: boolean;
  syncMessage: string;
}

export function useLoadingStates() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGlobalLoading, setGlobalLoading] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const startSync = useCallback((message: string = 'Sincronizando...') => {
    setIsSyncing(true);
    setSyncMessage(message);
  }, []);

  const endSync = useCallback(() => {
    setIsSyncing(false);
    setSyncMessage('');
  }, []);

  return {
    // Estados
    isBootstrapping,
    isRefreshing,
    isGlobalLoading,
    isAddingTask,
    isSyncing,
    syncMessage,
    // Setters
    setIsBootstrapping,
    setIsRefreshing,
    setGlobalLoading,
    setIsAddingTask,
    // Actions
    startSync,
    endSync,
  };
}

// ============ Estados de Modal ============
export interface ModalStates {
  modalVisible: boolean;
  categoryModalVisible: boolean;
  familyModalVisible: boolean;
  editMemberModalVisible: boolean;
  historyModalVisible: boolean;
  historyDetailModalVisible: boolean;
  notificationModalVisible: boolean;
  settingsModalVisible: boolean;
  approvalModalVisible: boolean;
  postponeModalVisible: boolean;
  repeatModalVisible: boolean;
  filterDropdownVisible: boolean;
}

export function useModalStates() {
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [familyModalVisible, setFamilyModalVisible] = useState(false);
  const [editMemberModalVisible, setEditMemberModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyDetailModalVisible, setHistoryDetailModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [postponeModalVisible, setPostponeModalVisible] = useState(false);
  const [repeatModalVisible, setRepeatModalVisible] = useState(false);
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);

  // Fecha todos os modais
  const closeAllModals = useCallback(() => {
    setModalVisible(false);
    setCategoryModalVisible(false);
    setFamilyModalVisible(false);
    setEditMemberModalVisible(false);
    setHistoryModalVisible(false);
    setHistoryDetailModalVisible(false);
    setNotificationModalVisible(false);
    setSettingsModalVisible(false);
    setApprovalModalVisible(false);
    setPostponeModalVisible(false);
    setRepeatModalVisible(false);
    setFilterDropdownVisible(false);
  }, []);

  // Abre um modal específico, fechando os outros
  const openModal = useCallback((modal: keyof ModalStates) => {
    closeAllModals();
    switch (modal) {
      case 'modalVisible': setModalVisible(true); break;
      case 'categoryModalVisible': setCategoryModalVisible(true); break;
      case 'familyModalVisible': setFamilyModalVisible(true); break;
      case 'editMemberModalVisible': setEditMemberModalVisible(true); break;
      case 'historyModalVisible': setHistoryModalVisible(true); break;
      case 'historyDetailModalVisible': setHistoryDetailModalVisible(true); break;
      case 'notificationModalVisible': setNotificationModalVisible(true); break;
      case 'settingsModalVisible': setSettingsModalVisible(true); break;
      case 'approvalModalVisible': setApprovalModalVisible(true); break;
      case 'postponeModalVisible': setPostponeModalVisible(true); break;
      case 'repeatModalVisible': setRepeatModalVisible(true); break;
      case 'filterDropdownVisible': setFilterDropdownVisible(true); break;
    }
  }, [closeAllModals]);

  return {
    // Estados
    modalVisible,
    categoryModalVisible,
    familyModalVisible,
    editMemberModalVisible,
    historyModalVisible,
    historyDetailModalVisible,
    notificationModalVisible,
    settingsModalVisible,
    approvalModalVisible,
    postponeModalVisible,
    repeatModalVisible,
    filterDropdownVisible,
    // Setters individuais
    setModalVisible,
    setCategoryModalVisible,
    setFamilyModalVisible,
    setEditMemberModalVisible,
    setHistoryModalVisible,
    setHistoryDetailModalVisible,
    setNotificationModalVisible,
    setSettingsModalVisible,
    setApprovalModalVisible,
    setPostponeModalVisible,
    setRepeatModalVisible,
    setFilterDropdownVisible,
    // Actions
    closeAllModals,
    openModal,
  };
}

// ============ Estados de Form de Tarefa ============
export interface TaskFormStates {
  newTaskTitle: string;
  newTaskDescription: string;
  newTaskPrivate: boolean;
  selectedCategory: string;
  isEditing: boolean;
}

export function useTaskFormStates() {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPrivate, setNewTaskPrivate] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('work');
  const [isEditing, setIsEditing] = useState(false);

  const resetForm = useCallback(() => {
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPrivate(false);
    setSelectedCategory('work');
    setIsEditing(false);
  }, []);

  const initEditForm = useCallback((task: { title: string; description?: string; isPrivate?: boolean; category?: string }) => {
    setNewTaskTitle(task.title);
    setNewTaskDescription(task.description || '');
    setNewTaskPrivate(task.isPrivate || false);
    setSelectedCategory(task.category || 'work');
    setIsEditing(true);
  }, []);

  return {
    // Estados
    newTaskTitle,
    newTaskDescription,
    newTaskPrivate,
    selectedCategory,
    isEditing,
    // Setters
    setNewTaskTitle,
    setNewTaskDescription,
    setNewTaskPrivate,
    setSelectedCategory,
    setIsEditing,
    // Actions
    resetForm,
    initEditForm,
  };
}

// ============ Estados de Family ============
export interface FamilyFormStates {
  familyName: string;
  inviteCode: string;
  codeCountdown: string;
  isCreatingFamily: boolean;
  isCreatingFamilyMode: boolean;
  newFamilyNameInput: string;
  isSavingFamilyName: boolean;
  editingFamilyName: boolean;
  newFamilyName: string;
  isSyncingFamily: boolean;
}

export function useFamilyFormStates() {
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [codeCountdown, setCodeCountdown] = useState('');
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [isCreatingFamilyMode, setIsCreatingFamilyMode] = useState(false);
  const [newFamilyNameInput, setNewFamilyNameInput] = useState('');
  const [isSavingFamilyName, setIsSavingFamilyName] = useState(false);
  const [editingFamilyName, setEditingFamilyName] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [isSyncingFamily, setIsSyncingFamily] = useState(false);

  const resetFamilyForm = useCallback(() => {
    setFamilyName('');
    setInviteCode('');
    setCodeCountdown('');
    setIsCreatingFamily(false);
    setIsCreatingFamilyMode(false);
    setNewFamilyNameInput('');
    setIsSavingFamilyName(false);
    setEditingFamilyName(false);
    setNewFamilyName('');
    setIsSyncingFamily(false);
  }, []);

  return {
    // Estados
    familyName,
    inviteCode,
    codeCountdown,
    isCreatingFamily,
    isCreatingFamilyMode,
    newFamilyNameInput,
    isSavingFamilyName,
    editingFamilyName,
    newFamilyName,
    isSyncingFamily,
    // Setters
    setFamilyName,
    setInviteCode,
    setCodeCountdown,
    setIsCreatingFamily,
    setIsCreatingFamilyMode,
    setNewFamilyNameInput,
    setIsSavingFamilyName,
    setEditingFamilyName,
    setNewFamilyName,
    setIsSyncingFamily,
    // Actions
    resetFamilyForm,
  };
}

// ============ Estados de Category ============
export interface CategoryFormStates {
  newCategoryName: string;
  selectedIcon: string;
  selectedColorIndex: number;
  newCategoryTitle: string;
  isAddingCategory: boolean;
}

export function useCategoryFormStates() {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('star');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const resetCategoryForm = useCallback(() => {
    setNewCategoryName('');
    setSelectedIcon('star');
    setSelectedColorIndex(0);
    setNewCategoryTitle('');
    setIsAddingCategory(false);
  }, []);

  return {
    // Estados
    newCategoryName,
    selectedIcon,
    selectedColorIndex,
    newCategoryTitle,
    isAddingCategory,
    // Setters
    setNewCategoryName,
    setSelectedIcon,
    setSelectedColorIndex,
    setNewCategoryTitle,
    setIsAddingCategory,
    // Actions
    resetCategoryForm,
  };
}

// ============ Estados de Subtask ============
export interface SubtaskFormStates {
  newSubtaskTitle: string;
  showSubtaskDatePicker: boolean;
  showSubtaskTimePicker: boolean;
}

export function useSubtaskFormStates() {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showSubtaskDatePicker, setShowSubtaskDatePicker] = useState(false);
  const [showSubtaskTimePicker, setShowSubtaskTimePicker] = useState(false);

  const resetSubtaskForm = useCallback(() => {
    setNewSubtaskTitle('');
    setShowSubtaskDatePicker(false);
    setShowSubtaskTimePicker(false);
  }, []);

  return {
    // Estados
    newSubtaskTitle,
    showSubtaskDatePicker,
    showSubtaskTimePicker,
    // Setters
    setNewSubtaskTitle,
    setShowSubtaskDatePicker,
    setShowSubtaskTimePicker,
    // Actions
    resetSubtaskForm,
  };
}

// ============ Estados de Postpone ============
export interface PostponeFormStates {
  postponeDate: Date;
  postponeTime: Date;
  showPostponeDatePicker: boolean;
  showPostponeTimePicker: boolean;
}

export function usePostponeFormStates() {
  const [postponeDate, setPostponeDate] = useState(new Date());
  const [postponeTime, setPostponeTime] = useState(new Date());
  const [showPostponeDatePicker, setShowPostponeDatePicker] = useState(false);
  const [showPostponeTimePicker, setShowPostponeTimePicker] = useState(false);

  const resetPostponeForm = useCallback(() => {
    setPostponeDate(new Date());
    setPostponeTime(new Date());
    setShowPostponeDatePicker(false);
    setShowPostponeTimePicker(false);
  }, []);

  return {
    // Estados
    postponeDate,
    postponeTime,
    showPostponeDatePicker,
    showPostponeTimePicker,
    // Setters
    setPostponeDate,
    setPostponeTime,
    setShowPostponeDatePicker,
    setShowPostponeTimePicker,
    // Actions
    resetPostponeForm,
  };
}

// ============ Hook Combinado ============
export function useTaskScreenStates() {
  const loading = useLoadingStates();
  const modals = useModalStates();
  const taskForm = useTaskFormStates();
  const familyForm = useFamilyFormStates();
  const categoryForm = useCategoryFormStates();
  const subtaskForm = useSubtaskFormStates();
  const postponeForm = usePostponeFormStates();

  // Estados adicionais que não se encaixam nas categorias acima
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [showUndoButton, setShowUndoButton] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterButtonLayout, setFilterButtonLayout] = useState({ top: 120, right: 16 });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Reset completo
  const resetAllForms = useCallback(() => {
    taskForm.resetForm();
    familyForm.resetFamilyForm();
    categoryForm.resetCategoryForm();
    subtaskForm.resetSubtaskForm();
    postponeForm.resetPostponeForm();
    modals.closeAllModals();
  }, [taskForm, familyForm, categoryForm, subtaskForm, postponeForm, modals]);

  return {
    // Grupos de estados
    loading,
    modals,
    taskForm,
    familyForm,
    categoryForm,
    subtaskForm,
    postponeForm,
    // Estados avulsos
    isOffline,
    setIsOffline,
    lastUpdate,
    setLastUpdate,
    showUndoButton,
    setShowUndoButton,
    filterCategory,
    setFilterCategory,
    filterButtonLayout,
    setFilterButtonLayout,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    // Actions
    resetAllForms,
  };
}
