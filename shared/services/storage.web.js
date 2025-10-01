// Web version of storage service using localStorage
export const saveData = async (key, value) => {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

export const loadData = async (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error loading data:', error);
    return null;
  }
};

export const saveFamilyData = async (familyId, data) => {
  try {
    const key = `family_${familyId}`;
    await saveData(key, data);
  } catch (error) {
    console.error('Error saving family data:', error);
  }
};

export const loadFamilyData = async (familyId) => {
  try {
    const key = `family_${familyId}`;
    return await loadData(key);
  } catch (error) {
    console.error('Error loading family data:', error);
    return null;
  }
};

export const saveGoogleCredential = async (credential) => {
  try {
    await saveData('googleCredential', credential);
  } catch (error) {
    console.error('Error saving Google credential:', error);
  }
};

export const loadGoogleCredential = async () => {
  try {
    return await loadData('googleCredential');
  } catch (error) {
    console.error('Error loading Google credential:', error);
    return null;
  }
};

export const removeGoogleCredential = async () => {
  try {
    localStorage.removeItem('googleCredential');
  } catch (error) {
    console.error('Error removing Google credential:', error);
  }
};

export const clearAllData = async () => {
  try {
    // Clear all app-related data from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('family_') || key === 'googleCredential' || key.startsWith('user_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};