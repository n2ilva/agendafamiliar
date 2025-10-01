import { Platform } from 'react-native';

// Importações condicionais baseadas na plataforma
let AsyncStorage = null;

if (Platform.OS !== 'web') {
  // No mobile, usamos AsyncStorage
  try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch (e) {
    console.warn('AsyncStorage não disponível:', e);
  }
}

const TASKS_KEY = '@AgendaFamiliar:tasks';
const HISTORY_KEY = '@AgendaFamiliar:history';
const USER_KEY = '@AgendaFamiliar:user';
const USER_TYPE_KEY = '@AgendaFamiliar:userType';
const FAMILY_KEY = '@AgendaFamiliar:family';
const CUSTOM_CATEGORIES_KEY = '@AgendaFamiliar:customCategories';
const FAMILY_TASKS_KEY = '@AgendaFamiliar:familyTasks';
const FAMILY_HISTORY_KEY = '@AgendaFamiliar:familyHistory';
const GOOGLE_CREDENTIAL_KEY = '@AgendaFamiliar:googleCredential';

// Função auxiliar para salvar no storage correto
const setItem = async (key, value) => {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
  } else {
    if (AsyncStorage) {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (e) {
        console.error('Erro ao salvar no AsyncStorage:', e);
      }
    }
  }
};

// Função auxiliar para buscar do storage correto
const getItem = async (key) => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Erro ao buscar do localStorage:', e);
      return null;
    }
  } else {
    if (AsyncStorage) {
      try {
        return await AsyncStorage.getItem(key);
      } catch (e) {
        console.error('Erro ao buscar do AsyncStorage:', e);
        return null;
      }
    }
    return null;
  }
};

// Função auxiliar para remover do storage correto
const removeItem = async (key) => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Erro ao remover do localStorage:', e);
    }
  } else {
    if (AsyncStorage) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.error('Erro ao remover do AsyncStorage:', e);
      }
    }
  }
};

export const saveData = async (tasks, history, user = null, userType = null) => {
  try {
    const jsonTasks = JSON.stringify(tasks);
    const jsonHistory = JSON.stringify(history);
    await setItem(TASKS_KEY, jsonTasks);
    await setItem(HISTORY_KEY, jsonHistory);

    // Salva dados do usuário se fornecidos
    if (user !== null) {
      const jsonUser = JSON.stringify(user);
      await setItem(USER_KEY, jsonUser);
    }
    if (userType !== null) {
      await setItem(USER_TYPE_KEY, userType);
    }
  } catch (e) {
    console.error("Failed to save data.", e);
  }
};

export const loadData = async () => {
  try {
    const jsonTasks = await getItem(TASKS_KEY);
    const jsonHistory = await getItem(HISTORY_KEY);
    const jsonUser = await getItem(USER_KEY);
    const userType = await getItem(USER_TYPE_KEY);

    const tasks = jsonTasks != null ? JSON.parse(jsonTasks) : [];
    const history = jsonHistory != null ? JSON.parse(jsonHistory) : [];
    const user = jsonUser != null ? JSON.parse(jsonUser) : null;

    return { tasks, history, user, userType };
  } catch (e) {
    console.error("Failed to load data.", e);
    return { tasks: [], history: [], user: null, userType: null };
  }
};

// Funções para dados da família
export const saveFamilyData = async (familyData) => {
  try {
    const jsonFamily = JSON.stringify(familyData);
    await setItem(FAMILY_KEY, jsonFamily);
  } catch (e) {
    console.error("Failed to save family data.", e);
  }
};

export const loadFamilyData = async () => {
  try {
    const jsonFamily = await getItem(FAMILY_KEY);
    return jsonFamily != null ? JSON.parse(jsonFamily) : null;
  } catch (e) {
    console.error("Failed to load family data.", e);
    return null;
  }
};

// Funções para categorias personalizadas
export const saveCustomCategories = async (categories) => {
  try {
    const jsonCategories = JSON.stringify(categories);
    await setItem(CUSTOM_CATEGORIES_KEY, jsonCategories);
  } catch (e) {
    console.error("Failed to save custom categories.", e);
  }
};

export const loadCustomCategories = async () => {
  try {
    const jsonCategories = await getItem(CUSTOM_CATEGORIES_KEY);
    return jsonCategories != null ? JSON.parse(jsonCategories) : [];
  } catch (e) {
    console.error("Failed to load custom categories.", e);
    return [];
  }
};

// Funções para tarefas da família
export const saveFamilyTasks = async (tasks, familyId) => {
  try {
    const key = `${FAMILY_TASKS_KEY}_${familyId}`;
    const jsonTasks = JSON.stringify(tasks);
    await setItem(key, jsonTasks);
  } catch (e) {
    console.error("Failed to save family tasks.", e);
  }
};

export const loadFamilyTasks = async (familyId) => {
  try {
    const key = `${FAMILY_TASKS_KEY}_${familyId}`;
    const jsonTasks = await getItem(key);
    return jsonTasks != null ? JSON.parse(jsonTasks) : [];
  } catch (e) {
    console.error("Failed to load family tasks.", e);
    return [];
  }
};

export const saveFamilyHistory = async (history, familyId) => {
  try {
    const key = `${FAMILY_HISTORY_KEY}_${familyId}`;
    const jsonHistory = JSON.stringify(history);
    await setItem(key, jsonHistory);
  } catch (e) {
    console.error("Failed to save family history.", e);
  }
};

export const loadFamilyHistory = async (familyId) => {
  try {
    const key = `${FAMILY_HISTORY_KEY}_${familyId}`;
    const jsonHistory = await getItem(key);
    return jsonHistory != null ? JSON.parse(jsonHistory) : [];
  } catch (e) {
    console.error("Failed to load family history.", e);
    return [];
  }
};

// Funções para salvar/recuperar credencial do Google (para reautenticação silenciosa)
export const saveGoogleCredential = async (credential) => {
  try {
    if (!credential) return;
    const json = JSON.stringify(credential);
    await setItem(GOOGLE_CREDENTIAL_KEY, json);
  } catch (e) {
    console.error('Failed to save google credential.', e);
  }
};

export const loadGoogleCredential = async () => {
  try {
    const json = await getItem(GOOGLE_CREDENTIAL_KEY);
    return json != null ? JSON.parse(json) : null;
  } catch (e) {
    console.error('Failed to load google credential.', e);
    return null;
  }
};

export const removeGoogleCredential = async () => {
  try {
    await removeItem(GOOGLE_CREDENTIAL_KEY);
  } catch (e) {
    console.error('Failed to remove google credential.', e);
  }
};