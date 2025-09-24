import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
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
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { firebaseConfig } from '../config/firebase';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

class FirebaseService {
  constructor() {
    this.app = initializeApp(firebaseConfig);
    // Inicializa o Auth para React Native com persistência usando AsyncStorage
    try {
      this.auth = initializeAuth(this.app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
      });
    } catch (e) {
      // Caso initializeAuth falhe por algum motivo, fallback para getAuth (persistência não garantida)
      console.warn('initializeAuth falhou, fazendo fallback para getAuth:', e);
      try {
        this.auth = getAuth(this.app);
      } catch (err) {
        console.error('Falha ao inicializar getAuth como fallback:', err);
        this.auth = null;
      }
    }
    this.db = getFirestore(this.app);
    this.currentUser = null;

    // Monitora mudanças no estado de autenticação
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
    });
  }

  // Aguarda o estado de autenticação ser conhecido (ou até timeout)
  // Retorna o usuário atual (pode ser null) quando resolvido
  waitForCurrentUser(timeoutMs = 3000) {
    // Se já temos um usuário conhecido, retorna imediatamente
    if (this.currentUser) return Promise.resolve(this.currentUser);

    return new Promise((resolve) => {
      let resolved = false;

      const unsub = onAuthStateChanged(this.auth, (user) => {
        if (!resolved) {
          resolved = true;
          try { unsub(); } catch (e) {}
          this.currentUser = user;
          resolve(user);
        }
      });

      // Fallback por timeout: resolve com o estado atual (possivelmente null)
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { unsub(); } catch (e) {}
          resolve(this.currentUser);
        }
      }, timeoutMs);
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

  // Sincronização de tarefas - Estratégia melhorada
  async syncTasks(userId, tasks) {
    try {
      if (!Array.isArray(tasks)) {
        throw new Error('Tasks deve ser um array');
      }
      const tasksCollectionRef = collection(this.db, 'users', userId, 'tasks');

      // Cria um mapa das tarefas locais para comparação (coerciona IDs para string)
      const localTasksMap = new Map(tasks.map(task => [String(task.id), { ...task, id: String(task.id) }]));

      // Busca tarefas existentes no Firebase
      const existingTasks = await getDocs(tasksCollectionRef);
      const existingTasksMap = new Map();

      existingTasks.docs.forEach(docSnap => {
        existingTasksMap.set(String(docSnap.id), { id: String(docSnap.id), ...docSnap.data() });
      });

      // Identifica tarefas para adicionar/atualizar/deletar
      const toAdd = [];
      const toUpdate = [];
      const toDelete = [];

      // Tarefas locais que não existem no Firebase
      localTasksMap.forEach((task, taskId) => {
        if (!existingTasksMap.has(taskId)) {
          toAdd.push(task);
        } else {
          // Verifica se precisa atualizar
          const existing = existingTasksMap.get(taskId);
          if (this.hasTaskChanged(task, existing)) {
            toUpdate.push(task);
          }
        }
      });

      // Tarefas que existem no Firebase mas não localmente
      existingTasksMap.forEach((task, taskId) => {
        if (!localTasksMap.has(taskId)) {
          toDelete.push(taskId);
        }
      });

      // Executa operações em lote
      const operations = [];

      toAdd.forEach(task => {
        operations.push(setDoc(doc(tasksCollectionRef, String(task.id)), {
          ...task,
          syncedAt: new Date().toISOString()
        }));
      });

      toUpdate.forEach(task => {
        operations.push(updateDoc(doc(tasksCollectionRef, String(task.id)), {
          ...task,
          syncedAt: new Date().toISOString()
        }));
      });

      toDelete.forEach(taskId => {
        operations.push(deleteDoc(doc(tasksCollectionRef, String(taskId))));
      });

      await Promise.all(operations);

        // sincronização de tarefas realizada
    } catch (error) {
      console.error('Erro ao sincronizar tarefas:', error);
      throw error;
    }
  }

  // Método auxiliar para verificar se tarefa mudou
  hasTaskChanged(localTask, remoteTask) {
    const fieldsToCompare = ['title', 'description', 'completed', 'priority', 'dueDate', 'category'];
    return fieldsToCompare.some(field => localTask[field] !== remoteTask[field]);
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

  // Sincronização de histórico - Estratégia melhorada
  async syncHistory(userId, history) {
    try {
      if (!Array.isArray(history)) {
        throw new Error('History deve ser um array');
      }
      const historyCollectionRef = collection(this.db, 'users', userId, 'history');

      // Cria um mapa do histórico local para comparação (coerciona IDs para string)
      const localHistoryMap = new Map(history.map(item => [String(item.id), { ...item, id: String(item.id) }]));

      // Busca histórico existente no Firebase
      const existingHistory = await getDocs(historyCollectionRef);
      const existingHistoryMap = new Map();

      existingHistory.docs.forEach(docSnap => {
        existingHistoryMap.set(String(docSnap.id), { id: String(docSnap.id), ...docSnap.data() });
      });

      // Identifica itens para adicionar/atualizar/deletar
      const toAdd = [];
      const toUpdate = [];
      const toDelete = [];

      // Itens locais que não existem no Firebase
      localHistoryMap.forEach((item, itemId) => {
        if (!existingHistoryMap.has(itemId)) {
          toAdd.push(item);
        } else {
          // Verifica se precisa atualizar
          const existing = existingHistoryMap.get(itemId);
          if (this.hasHistoryChanged(item, existing)) {
            toUpdate.push(item);
          }
        }
      });

      // Itens que existem no Firebase mas não localmente
      existingHistoryMap.forEach((item, itemId) => {
        if (!localHistoryMap.has(itemId)) {
          toDelete.push(itemId);
        }
      });

      // Executa operações em lote
      const operations = [];

      toAdd.forEach(item => {
        operations.push(setDoc(doc(historyCollectionRef, String(item.id)), {
          ...item,
          syncedAt: new Date().toISOString()
        }));
      });

      toUpdate.forEach(item => {
        operations.push(updateDoc(doc(historyCollectionRef, String(item.id)), {
          ...item,
          syncedAt: new Date().toISOString()
        }));
      });

      toDelete.forEach(itemId => {
        operations.push(deleteDoc(doc(historyCollectionRef, String(itemId))));
      });

      await Promise.all(operations);

        // sincronização de histórico realizada
    } catch (error) {
      console.error('Erro ao sincronizar histórico:', error);
      throw error;
    }
  }

  // Método auxiliar para verificar se item do histórico mudou
  hasHistoryChanged(localItem, remoteItem) {
    const fieldsToCompare = ['action', 'taskId', 'timestamp', 'details'];
    return fieldsToCompare.some(field => localItem[field] !== remoteItem[field]);
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
      // iniciando upload de dados para Firebase

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

      // upload concluído com sucesso
    } catch (error) {
      console.error('Erro durante upload:', error);
      throw error;
    }
  }

  // Método para sincronização completa (download)
  async downloadAllData(userId) {
    try {
      // iniciando download de dados do Firebase

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

      // download concluído com sucesso
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

  // Validação de dados de entrada
  validateTaskData(task) {
    if (!task || typeof task !== 'object') {
      throw new Error('Task deve ser um objeto válido');
    }
    if (!task.id || (typeof task.id !== 'string' && typeof task.id !== 'number')) {
      throw new Error('Task deve ter um ID válido');
    }
    if (!task.title || typeof task.title !== 'string') {
      throw new Error('Task deve ter um título válido');
    }
    return true;
  }

  validateHistoryData(historyItem) {
    if (!historyItem || typeof historyItem !== 'object') {
      throw new Error('History item deve ser um objeto válido');
    }
    if (!historyItem.id || typeof historyItem.id !== 'string') {
      throw new Error('History item deve ter um ID válido');
    }
    if (!historyItem.action || typeof historyItem.action !== 'string') {
      throw new Error('History item deve ter uma ação válida');
    }
    return true;
  }

  // Método melhorado para salvar tarefa
  async saveTask(userId, task) {
    try {
      this.validateTaskData(task);
      const taskRef = doc(this.db, 'users', userId, 'tasks', String(task.id));
      await setDoc(taskRef, {
        ...task,
        syncedAt: new Date().toISOString()
      });
        // tarefa salva com sucesso
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      throw error;
    }
  }

  // Método melhorado para salvar item do histórico
  async saveHistoryItem(userId, historyItem) {
    try {
      this.validateHistoryData(historyItem);
      const historyRef = doc(this.db, 'users', userId, 'history', String(historyItem.id));
      await setDoc(historyRef, {
        ...historyItem,
        syncedAt: new Date().toISOString()
      });
        // item do histórico salvo com sucesso
    } catch (error) {
      console.error('Erro ao salvar item do histórico:', error);
      throw error;
    }
  }
}

// Exporta uma instância singleton
export const firebaseService = new FirebaseService();
export default firebaseService;