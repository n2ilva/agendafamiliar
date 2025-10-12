import AsyncStorage from '@react-native-async-storage/async-storage';
import { FamilyUser, UserRole } from '../types/FamilyTypes';
import { firebaseAuth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const USER_STORAGE_KEY = 'familyApp_currentUser';

class LocalAuthService {
  static async registerUser(email: string, password: string, name: string, role: UserRole = 'dependente') {
    // Create a local user object and persist in AsyncStorage
    const id = `local_${Date.now()}`;
    const user: FamilyUser = {
      id,
      name,
      email,
      role,
      isGuest: false,
      familyId: '',
      joinedAt: new Date()
    };

    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return { success: true, user, error: undefined };
  }

  static async loginUser(email: string, password: string) {
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return { success: false, error: 'Nenhum usuário local encontrado' };
    const user = JSON.parse(raw) as FamilyUser;
    if (user.email === email) return { success: true, user, error: undefined };
    return { success: false, error: 'Credenciais inválidas (local)'};
  }

  static async logout() {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    return { success: true, error: undefined };
  }

  static onAuthStateChange(callback: (user: FamilyUser | null) => void) {
    console.log('🔔 Configurando listener de autenticação');
    
    // Primeiro, verifica o usuário local
    (async () => {
      const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (raw) {
        console.log('📱 Usuário local encontrado no AsyncStorage');
        callback(JSON.parse(raw));
      }
    })();

    // Também monitora mudanças no Firebase Auth
    try {
      const auth = firebaseAuth() as any;
      console.log('🔥 Configurando onAuthStateChanged do Firebase');
      
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('🔥 Firebase Auth State Changed:', firebaseUser ? `Usuário: ${firebaseUser.email}` : 'Nenhum usuário');
        
        if (firebaseUser) {
          // Usuário logado no Firebase - criar/atualizar objeto FamilyUser
          const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
          let familyUser: FamilyUser;
          
          if (raw) {
            // Atualizar usuário existente
            familyUser = JSON.parse(raw);
            familyUser.id = firebaseUser.uid;
            familyUser.email = firebaseUser.email || familyUser.email;
          } else {
            // Criar novo usuário
            familyUser = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
              email: firebaseUser.email || '',
              role: 'admin', // Usuários do Firebase são admin por padrão
              isGuest: false,
              familyId: '',
              joinedAt: new Date()
            };
          }
          
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(familyUser));
          console.log('✅ FamilyUser salvo no AsyncStorage:', familyUser.name);
          callback(familyUser);
        } else {
          // Logout do Firebase - limpar storage local
          console.log('🚪 Firebase logout detectado - limpando AsyncStorage');
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
          callback(null);
        }
      });
      
      return unsubscribe;
    } catch (error) {
      console.warn('⚠️ Erro ao configurar Firebase Auth listener:', error);
      // Retorna função de unsubscribe vazia em caso de erro
      return () => {};
    }
  }

  static getCurrentUser() {
    // For compatibility with FirebaseAuthService.getCurrentUser returning a User-like object,
    // we'll return null (most code uses our local user objects via other methods)
    return null;
  }

  static async saveUserToLocalStorage(user: FamilyUser): Promise<void> {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  static async getUserFromLocalStorage(): Promise<FamilyUser | null> {
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  static startAuthKeepAlive() {
    // noop for local
  }

  static stopAuthKeepAlive() {
    // noop for local
  }

  static async initializeOfflineSupport(): Promise<void> {
    // Already local storage; nothing to initialize
    return;
  }

  static async saveUserToCache(user: FamilyUser): Promise<void> {
    return this.saveUserToLocalStorage(user);
  }

  static async getUserFromCache(userId: string): Promise<FamilyUser | null> {
    const u = await this.getUserFromLocalStorage();
    if (u && u.id === userId) return u;
    return null;
  }

  static async shouldUseCache(): Promise<boolean> {
    return true;
  }

  static async loginUserWithCache(email: string, password: string) {
    return await this.loginUser(email, password);
  }

  static async registerUserWithCache(email: string, password: string, name: string, role: UserRole = 'dependente') {
    return await this.registerUser(email, password, name, role);
  }

  static async logoutWithCache(): Promise<void> {
    await this.logout();
  }

  static async updateUserName(newName: string): Promise<{ success: boolean; error?: string }> {
    const user = await this.getUserFromLocalStorage();
    if (!user) return { success: false, error: 'Usuário não encontrado' };
    user.name = newName;
    await this.saveUserToLocalStorage(user);
    return { success: true, error: undefined };
  }

  static async resetPassword(email: string) {
    // local mode: pretend success
    return { success: true, error: undefined };
  }

  static async uploadProfileImage(imageUri: string) {
    // local mode: return a data URI placeholder
    return { success: true, photoURL: imageUri, error: undefined };
  }

  static async deleteOldProfileImage(photoURL: string): Promise<void> {
    // noop
  }

  static async updateUserRole(userId: string, newRole: UserRole) {
    const user = await this.getUserFromLocalStorage();
    if (user && user.id === userId) {
      user.role = newRole;
      await this.saveUserToLocalStorage(user);
    }
    return { success: true, error: undefined };
  }
}

export default LocalAuthService;
