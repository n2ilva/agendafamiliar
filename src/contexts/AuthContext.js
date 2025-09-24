import React, { createContext, useContext, useState, useEffect } from 'react';
import { USER_TYPES, hasPermission, canEditTask } from '../constants/userTypes';
import { saveData, loadData, saveFamilyData, loadFamilyData } from '../services/storage';
import { createFamily, addMemberToFamily, isFamilyMember, isFamilyAdmin } from '../constants/family';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [family, setFamily] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega dados do usuário ao inicializar
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { user: savedUser, userType: savedUserType } = await loadData();
      if (savedUser && savedUserType) {
        setUser(savedUser);
        setUserType(savedUserType);
        
        // Carrega dados da família se existir
        const familyData = await loadFamilyData();
        if (familyData && isFamilyMember(familyData, savedUser.id)) {
          setFamily(familyData);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData, selectedUserType = USER_TYPES.CONVIDADO) => {
    try {
      setUser(userData);
      setUserType(selectedUserType);
      
      // Salva os dados do usuário
      const currentData = await loadData();
      await saveData(
        currentData.tasks || [], 
        currentData.history || [], 
        userData, 
        selectedUserType
      );
      
      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Se for convidado, limpa todos os dados
      if (userType === USER_TYPES.CONVIDADO) {
        await saveData([], [], null, null);
      } else {
        // Para outros tipos, mantém as tarefas mas remove dados do usuário
        const currentData = await loadData();
        await saveData(currentData.tasks || [], currentData.history || [], null, null);
      }
      
      setUser(null);
      setUserType(null);
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  const updateUserType = async (newUserType) => {
    try {
      setUserType(newUserType);
      const currentData = await loadData();
      await saveData(
        currentData.tasks || [], 
        currentData.history || [], 
        user, 
        newUserType
      );
    } catch (error) {
      console.error('Erro ao atualizar tipo do usuário:', error);
    }
  };

  // Funções de verificação de permissões
  const checkPermission = (permission) => {
    return hasPermission(userType, permission);
  };

  const canUserEditTask = (taskCreatorId) => {
    return canEditTask(userType, user?.email || user?.name, taskCreatorId);
  };

  const isAdmin = () => userType === USER_TYPES.ADMIN;
  const isDependente = () => userType === USER_TYPES.DEPENDENTE;
  const isConvidado = () => userType === USER_TYPES.CONVIDADO;

  // Funções do sistema de família
  const createUserFamily = async () => {
    if (!user) throw new Error('Usuário não logado');
    
    try {
      const newFamily = createFamily(user);
      await saveFamilyData(newFamily);
      setFamily(newFamily);
      return newFamily;
    } catch (error) {
      console.error('Erro ao criar família:', error);
      throw error;
    }
  };

  const joinFamily = async (familyKey) => {
    if (!user) throw new Error('Usuário não logado');
    
    try {
      const familyData = await loadFamilyData();
      if (!familyData || familyData.key !== familyKey.toUpperCase()) {
        throw new Error('Chave de família inválida');
      }
      
      const updatedFamily = addMemberToFamily(familyData, user);
      await saveFamilyData(updatedFamily);
      setFamily(updatedFamily);
      return updatedFamily;
    } catch (error) {
      console.error('Erro ao entrar na família:', error);
      throw error;
    }
  };

  const leaveFamily = async () => {
    if (!user || !family) return;
    
    try {
      // Se for admin, não pode sair (deve transferir admin ou deletar família)
      if (isFamilyAdmin(family, user.id)) {
        throw new Error('Administrador deve transferir a administração antes de sair');
      }
      
      const updatedFamily = {
        ...family,
        members: family.members.filter(member => member.id !== user.id)
      };
      
      await saveFamilyData(updatedFamily);
      setFamily(null);
    } catch (error) {
      console.error('Erro ao sair da família:', error);
      throw error;
    }
  };

  const updateFamily = async (updatedFamily) => {
    try {
      await saveFamilyData(updatedFamily);
      setFamily(updatedFamily);
    } catch (error) {
      console.error('Erro ao atualizar família:', error);
      throw error;
    }
  };

  const isFamilyMemberUser = () => {
    return family && isFamilyMember(family, user?.id);
  };

  const isFamilyAdminUser = () => {
    return family && isFamilyAdmin(family, user?.id);
  };

  const value = {
    user,
    userType,
    family,
    isLoading,
    login,
    logout,
    updateUserType,
    checkPermission,
    canUserEditTask,
    isAdmin,
    isDependente,
    isConvidado,
    createUserFamily,
    joinFamily,
    leaveFamily,
    updateFamily,
    isFamilyMemberUser,
    isFamilyAdminUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};