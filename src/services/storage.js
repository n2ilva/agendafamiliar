import AsyncStorage from '@react-native-async-storage/async-storage';

const TASKS_KEY = '@AgendaFamiliar:tasks';
const HISTORY_KEY = '@AgendaFamiliar:history';
const USER_KEY = '@AgendaFamiliar:user';
const USER_TYPE_KEY = '@AgendaFamiliar:userType';
const FAMILY_KEY = '@AgendaFamiliar:family';
const CUSTOM_CATEGORIES_KEY = '@AgendaFamiliar:customCategories';
const FAMILY_TASKS_KEY = '@AgendaFamiliar:familyTasks';
const FAMILY_HISTORY_KEY = '@AgendaFamiliar:familyHistory';
const GOOGLE_CREDENTIAL_KEY = '@AgendaFamiliar:googleCredential';

export const saveData = async (tasks, history, user = null, userType = null) => {
  try {
    const jsonTasks = JSON.stringify(tasks);
    const jsonHistory = JSON.stringify(history);
    await AsyncStorage.setItem(TASKS_KEY, jsonTasks);
    await AsyncStorage.setItem(HISTORY_KEY, jsonHistory);
    
    // Salva dados do usuário se fornecidos
    if (user !== null) {
      const jsonUser = JSON.stringify(user);
      await AsyncStorage.setItem(USER_KEY, jsonUser);
    }
    if (userType !== null) {
      await AsyncStorage.setItem(USER_TYPE_KEY, userType);
    }
  } catch (e) {
    console.error("Failed to save data.", e);
  }
};

export const loadData = async () => {
  try {
    const jsonTasks = await AsyncStorage.getItem(TASKS_KEY);
    const jsonHistory = await AsyncStorage.getItem(HISTORY_KEY);
    const jsonUser = await AsyncStorage.getItem(USER_KEY);
    const userType = await AsyncStorage.getItem(USER_TYPE_KEY);
    
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
    await AsyncStorage.setItem(FAMILY_KEY, jsonFamily);
  } catch (e) {
    console.error("Failed to save family data.", e);
  }
};

export const loadFamilyData = async () => {
  try {
    const jsonFamily = await AsyncStorage.getItem(FAMILY_KEY);
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
    await AsyncStorage.setItem(CUSTOM_CATEGORIES_KEY, jsonCategories);
  } catch (e) {
    console.error("Failed to save custom categories.", e);
  }
};

export const loadCustomCategories = async () => {
  try {
    const jsonCategories = await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY);
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
    await AsyncStorage.setItem(key, jsonTasks);
  } catch (e) {
    console.error("Failed to save family tasks.", e);
  }
};

export const loadFamilyTasks = async (familyId) => {
  try {
    const key = `${FAMILY_TASKS_KEY}_${familyId}`;
    const jsonTasks = await AsyncStorage.getItem(key);
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
    await AsyncStorage.setItem(key, jsonHistory);
  } catch (e) {
    console.error("Failed to save family history.", e);
  }
};

export const loadFamilyHistory = async (familyId) => {
  try {
    const key = `${FAMILY_HISTORY_KEY}_${familyId}`;
    const jsonHistory = await AsyncStorage.getItem(key);
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
    await AsyncStorage.setItem(GOOGLE_CREDENTIAL_KEY, json);
  } catch (e) {
    console.error('Failed to save google credential.', e);
  }
};

export const loadGoogleCredential = async () => {
  try {
    const json = await AsyncStorage.getItem(GOOGLE_CREDENTIAL_KEY);
    return json != null ? JSON.parse(json) : null;
  } catch (e) {
    console.error('Failed to load google credential.', e);
    return null;
  }
};

export const removeGoogleCredential = async () => {
  try {
    await AsyncStorage.removeItem(GOOGLE_CREDENTIAL_KEY);
  } catch (e) {
    console.error('Failed to remove google credential.', e);
  }
};