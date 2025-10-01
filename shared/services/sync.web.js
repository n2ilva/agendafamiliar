// Web version of sync service
import firebaseService from '../services/firebase';
import { loadGoogleCredential, removeGoogleCredential } from '../services/storage.web';

// Platform detection for web
const isWeb = typeof window !== 'undefined';

export const syncUserData = async (userId) => {
  try {
    if (!userId) return { success: false, error: 'User ID is required' };

    // Sync user preferences from Firestore to localStorage
    const service = await firebaseService();
    const userDoc = await service.readDocument('users', userId);
    if (userDoc.error) {
      return { success: false, error: userDoc.error };
    }

    if (userDoc.data) {
      const userData = userDoc.data;
      // Save to localStorage
      if (isWeb && window.localStorage) {
        localStorage.setItem('userType', userData.userType || 'member');
        localStorage.setItem('familyId', userData.familyId || '');
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const syncFamilyData = async (familyId) => {
  try {
    if (!familyId) return { success: false, error: 'Family ID is required' };

    // Sync family data from Firestore to localStorage
    const service = await firebaseService();
    const familyDoc = await service.readDocument('families', familyId);
    if (familyDoc.error) {
      return { success: false, error: familyDoc.error };
    }

    if (familyDoc.data) {
      const familyData = familyDoc.data;
      // Save to localStorage
      if (isWeb && window.localStorage) {
        localStorage.setItem(`family_${familyId}`, JSON.stringify(familyData));
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const syncTasks = async (familyId) => {
  try {
    if (!familyId) return { success: false, error: 'Family ID is required' };

    // Get all tasks for the family from Firestore
    const service = await firebaseService();
    const tasksQuery = await service.queryDocuments('tasks', 'familyId', '==', familyId);
    if (tasksQuery.error) {
      return { success: false, error: tasksQuery.error };
    }

    // Save tasks to localStorage
    if (isWeb && window.localStorage) {
      localStorage.setItem(`tasks_${familyId}`, JSON.stringify(tasksQuery.documents));
    }

    return { success: true, tasks: tasksQuery.documents };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const uploadLocalChanges = async (userId, familyId) => {
  try {
    if (!userId || !familyId) {
      return { success: false, error: 'User ID and Family ID are required' };
    }

    // Upload any pending local changes to Firestore
    // This is a simplified version - in a real app you'd track pending changes

    // For now, just sync user preferences
    const userType = isWeb && window.localStorage ? localStorage.getItem('userType') : null;
    if (userType) {
      const service = await firebaseService();
      await service.updateDocument('users', userId, {
        userType,
        familyId,
        lastSync: new Date().toISOString()
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const performFullSync = async (userId, familyId) => {
  try {
    if (!userId) return { success: false, error: 'User ID is required' };

    // Sync user data
    const userSync = await syncUserData(userId);
    if (!userSync.success) {
      return userSync;
    }

    // Sync family data if familyId exists
    if (familyId) {
      const familySync = await syncFamilyData(familyId);
      if (!familySync.success) {
        return familySync;
      }

      // Sync tasks
      const tasksSync = await syncTasks(familyId);
      if (!tasksSync.success) {
        return tasksSync;
      }
    }

    // Upload any local changes
    const uploadSync = await uploadLocalChanges(userId, familyId);
    if (!uploadSync.success) {
      return uploadSync;
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const clearLocalData = async () => {
  try {
    if (isWeb && window.localStorage) {
      // Clear all app-related data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('family_') || key.startsWith('tasks_') || key.startsWith('user_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};