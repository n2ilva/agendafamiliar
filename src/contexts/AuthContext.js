import React, { createContext, useContext, useState, useEffect } from 'react';
import { USER_TYPES, hasPermission, canEditTask } from '../constants/userTypes';
import { saveData, loadData, saveFamilyData, loadFamilyData, saveGoogleCredential, loadGoogleCredential, removeGoogleCredential } from '../services/storage';
import { createFamily, addMemberToFamily, isFamilyMember, isFamilyAdmin } from '../constants/family';
import firebaseService from '../services/firebase';
import syncService from '../services/sync';
import * as Notifications from 'expo-notifications';

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
      // Tentar reautenticação silenciosa se houver credencial do Google armazenada
      try {
        const storedCredential = await loadGoogleCredential();
        if (storedCredential) {
          // tentamos reautenticar no Firebase, mas não falharemos caso dê erro
          try {
            await firebaseService.signInWithGoogle(storedCredential);
            console.log('Reautenticação silenciosa bem-sucedida');
          } catch (reauthErr) {
            console.warn('Falha na reautenticação silenciosa:', reauthErr);
            // Se falhar, removemos a credencial para evitar loops
            await removeGoogleCredential();
          }
        }
      } catch (e) {
        console.warn('Erro ao tentar reautenticação silenciosa:', e);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData, selectedUserType = USER_TYPES.CONVIDADO, googleCredential = null) => {
    try {
      // Validação de entrada
      if (!userData || typeof userData !== 'object') {
        throw new Error('Dados do usuário são obrigatórios');
      }
      if (!userData.id || !userData.email) {
        throw new Error('ID e email do usuário são obrigatórios');
      }
      if (!Object.values(USER_TYPES).includes(selectedUserType)) {
        throw new Error('Tipo de usuário inválido');
      }

      setUser(userData);
      setUserType(selectedUserType);

      // Se tiver credenciais do Google, faz login no Firebase
      // Permitir migração automática mesmo para convidados que entram via Google
      if (googleCredential) {
        try {
          await firebaseService.signInWithGoogle(googleCredential);
          console.log('Login no Firebase realizado com sucesso');

          // Salva credencial para reautenticação silenciosa futura
          try { await saveGoogleCredential(googleCredential); } catch (e) { console.warn('Não foi possível salvar googleCredential:', e); }

          // Carrega dados locais atuais
          const currentData = await loadData();
          const familyData = await loadFamilyData();

          // Faz sincronização automática após login
          // Nota: atualmente o backend de sync espera um userId válido. Garantimos
          // que o ID e email existam no `userData` previamente.
          await syncService.autoSyncAfterLogin(userData.id, {
            user: userData,
            userType: selectedUserType,
            tasks: currentData.tasks || [],
            history: currentData.history || []
          }, familyData);

          // Tenta registrar token de push Expo (se permitido)
          try {
            const expoPushToken = await Notifications.getExpoPushTokenAsync();
            if (expoPushToken && expoPushToken.data) {
              await firebaseService.addPushTokenToUser(userData.id, expoPushToken.data);
            }
          } catch (e) {
            console.warn('Não foi possível obter/registrar token de push Expo:', e);
          }
        } catch (firebaseError) {
          console.warn('Erro no login do Firebase, continuando com dados locais:', firebaseError);
          // Não falha o login se o Firebase der erro
        }
      }

      // Salva os dados do usuário localmente
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
      // Limpa estado em caso de erro
      setUser(null);
      setUserType(null);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Faz logout do Firebase se estiver logado
      if (firebaseService.getCurrentUser()) {
        await firebaseService.signOut();
        console.log('Logout do Firebase realizado');
      }

      // Remove credencial do Google armazenada
      try { await removeGoogleCredential(); } catch (e) { console.warn('Erro ao remover google credential:', e); }

      // Limpa todos os dados do usuário
      await saveData([], [], null, null);

      // Limpa estado da família
      setFamily(null);
      setUser(null);
      setUserType(null);

      console.log('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro no logout:', error);
      // Mesmo com erro, limpa o estado local
      setUser(null);
      setUserType(null);
      setFamily(null);
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

  // Métodos de sincronização
  const syncToCloud = async () => {
    if (!user) throw new Error('Usuário não logado');

    try {
      const currentData = await loadData();
      const familyData = await loadFamilyData();

      await syncService.syncToCloud(user.id, {
        user,
        userType,
        tasks: currentData.tasks || [],
        history: currentData.history || []
      }, familyData);

      return true;
    } catch (error) {
      console.error('Erro na sincronização para nuvem:', error);
      throw error;
    }
  };

  const syncFromCloud = async () => {
    if (!user) throw new Error('Usuário não logado');

    try {
      const cloudData = await syncService.syncFromCloud(user.id);

      // Atualiza dados locais com dados da nuvem
      if (cloudData.user) setUser(cloudData.user);
      if (cloudData.userType) setUserType(cloudData.userType);
      if (cloudData.family) setFamily(cloudData.family);

      // Salva dados localmente
      await saveData(cloudData.tasks || [], cloudData.history || [], cloudData.user, cloudData.userType);
      if (cloudData.family) {
        await saveFamilyData(cloudData.family);
      }

      return cloudData;
    } catch (error) {
      console.error('Erro na sincronização da nuvem:', error);
      throw error;
    }
  };

  const getSyncStatus = async () => {
    return await syncService.getSyncStatus();
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
    isFamilyAdminUser,
    syncToCloud,
    syncFromCloud,
    getSyncStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};