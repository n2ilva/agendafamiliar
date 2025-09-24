import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase';

class FirebaseService {
  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    this.currentUser = null;

    // Monitora mudanças no estado de autenticação
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
    });
  }

  // Autenticação
  async signInWithGoogle(googleCredential) {
    try {
      const credential = GoogleAuthProvider.credential(googleCredential.idToken);
      const result = await signInWithCredential(this.auth, credential);
      return result.user;
    } catch (error) {
      console.error('Erro ao fazer login com Google:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      await firebaseSignOut(this.auth);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  // Sincronização de dados do usuário
  async syncUserData(userId, data) {
    try {
      const userDocRef = doc(this.db, 'users', userId);
      await setDoc(userDocRef, {
        ...data,
        lastSync: new Date().toISOString(),
        userId: userId
      }, { merge: true });
    } catch (error) {
      console.error('Erro ao sincronizar dados do usuário:', error);
      throw error;
    }
  }

  async getUserData(userId) {
    try {
      const userDocRef = doc(this.db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      throw error;
    }
  }

  // Sincronização de tarefas
  async syncTasks(userId, tasks) {
    try {
      const tasksCollectionRef = collection(this.db, 'users', userId, 'tasks');
      // Primeiro, limpa as tarefas antigas
      const existingTasks = await getDocs(tasksCollectionRef);
      const deletePromises = existingTasks.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);

      // Adiciona as novas tarefas
      const addPromises = tasks.map(task =>
        setDoc(doc(tasksCollectionRef, task.id), {
          ...task,
          syncedAt: new Date().toISOString()
        })
      );
      await Promise.all(addPromises);
    } catch (error) {
      console.error('Erro ao sincronizar tarefas:', error);
      throw error;
    }
  }

  async getTasks(userId) {
    try {
      const tasksCollectionRef = collection(this.db, 'users', userId, 'tasks');
      const tasksSnapshot = await getDocs(tasksCollectionRef);
      return tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      throw error;
    }
  }

  // Sincronização de histórico
  async syncHistory(userId, history) {
    try {
      const historyCollectionRef = collection(this.db, 'users', userId, 'history');
      // Primeiro, limpa o histórico antigo
      const existingHistory = await getDocs(historyCollectionRef);
      const deletePromises = existingHistory.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);

      // Adiciona o novo histórico
      const addPromises = history.map(item =>
        setDoc(doc(historyCollectionRef, item.id), {
          ...item,
          syncedAt: new Date().toISOString()
        })
      );
      await Promise.all(addPromises);
    } catch (error) {
      console.error('Erro ao sincronizar histórico:', error);
      throw error;
    }
  }

  async getHistory(userId) {
    try {
      const historyCollectionRef = collection(this.db, 'users', userId, 'history');
      const historySnapshot = await getDocs(historyCollectionRef);
      return historySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      throw error;
    }
  }

  // Sincronização de família
  async syncFamily(familyId, familyData) {
    try {
      const familyDocRef = doc(this.db, 'families', familyId);
      await setDoc(familyDocRef, {
        ...familyData,
        lastSync: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Erro ao sincronizar família:', error);
      throw error;
    }
  }

  async getFamily(familyId) {
    try {
      const familyDocRef = doc(this.db, 'families', familyId);
      const familyDoc = await getDoc(familyDocRef);
      return familyDoc.exists() ? familyDoc.data() : null;
    } catch (error) {
      console.error('Erro ao buscar família:', error);
      throw error;
    }
  }

  // Sincronização de tarefas da família
  async syncFamilyTasks(familyId, tasks) {
    try {
      const tasksCollectionRef = collection(this.db, 'families', familyId, 'tasks');
      // Primeiro, limpa as tarefas antigas
      const existingTasks = await getDocs(tasksCollectionRef);
      const deletePromises = existingTasks.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);

      // Adiciona as novas tarefas
      const addPromises = tasks.map(task =>
        setDoc(doc(tasksCollectionRef, task.id), {
          ...task,
          syncedAt: new Date().toISOString()
        })
      );
      await Promise.all(addPromises);
    } catch (error) {
      console.error('Erro ao sincronizar tarefas da família:', error);
      throw error;
    }
  }

  async getFamilyTasks(familyId) {
    try {
      const tasksCollectionRef = collection(this.db, 'families', familyId, 'tasks');
      const tasksSnapshot = await getDocs(tasksCollectionRef);
      return tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao buscar tarefas da família:', error);
      throw error;
    }
  }

  // Sincronização de histórico da família
  async syncFamilyHistory(familyId, history) {
    try {
      const historyCollectionRef = collection(this.db, 'families', familyId, 'history');
      // Primeiro, limpa o histórico antigo
      const existingHistory = await getDocs(historyCollectionRef);
      const deletePromises = existingHistory.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);

      // Adiciona o novo histórico
      const addPromises = history.map(item =>
        setDoc(doc(historyCollectionRef, item.id), {
          ...item,
          syncedAt: new Date().toISOString()
        })
      );
      await Promise.all(addPromises);
    } catch (error) {
      console.error('Erro ao sincronizar histórico da família:', error);
      throw error;
    }
  }

  async getFamilyHistory(familyId) {
    try {
      const historyCollectionRef = collection(this.db, 'families', familyId, 'history');
      const historySnapshot = await getDocs(historyCollectionRef);
      return historySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao buscar histórico da família:', error);
      throw error;
    }
  }

  // Método para sincronização completa (upload)
  async uploadAllData(userId, localData, familyData = null) {
    try {
      console.log('Iniciando upload de dados para Firebase...');

      // Sincroniza dados do usuário
      if (localData.user) {
        await this.syncUserData(userId, {
          user: localData.user,
          userType: localData.userType
        });
      }

      // Sincroniza tarefas pessoais
      if (localData.tasks) {
        await this.syncTasks(userId, localData.tasks);
      }

      // Sincroniza histórico pessoal
      if (localData.history) {
        await this.syncHistory(userId, localData.history);
      }

      // Sincroniza dados da família
      if (familyData) {
        await this.syncFamily(familyData.id, familyData);

        // Sincroniza tarefas da família
        if (familyData.tasks) {
          await this.syncFamilyTasks(familyData.id, familyData.tasks);
        }

        // Sincroniza histórico da família
        if (familyData.history) {
          await this.syncFamilyHistory(familyData.id, familyData.history);
        }
      }

      console.log('Upload concluído com sucesso!');
    } catch (error) {
      console.error('Erro durante upload:', error);
      throw error;
    }
  }

  // Método para sincronização completa (download)
  async downloadAllData(userId) {
    try {
      console.log('Iniciando download de dados do Firebase...');

      const userData = await this.getUserData(userId);
      const tasks = await this.getTasks(userId);
      const history = await this.getHistory(userId);

      let familyData = null;
      if (userData?.familyId) {
        const family = await this.getFamily(userData.familyId);
        if (family) {
          const familyTasks = await this.getFamilyTasks(userData.familyId);
          const familyHistory = await this.getFamilyHistory(userData.familyId);
          familyData = {
            ...family,
            tasks: familyTasks,
            history: familyHistory
          };
        }
      }

      console.log('Download concluído com sucesso!');
      return {
        user: userData?.user || null,
        userType: userData?.userType || null,
        tasks,
        history,
        family: familyData
      };
    } catch (error) {
      console.error('Erro durante download:', error);
      throw error;
    }
  }
}

// Exporta uma instância singleton
export const firebaseService = new FirebaseService();
export default firebaseService;