import AsyncStorage from '@react-native-async-storage/async-storage';
import { FamilyUser, UserRole } from '../types/FamilyTypes';

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
    // Simple implementation: call with current user
    (async () => {
      const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (raw) callback(JSON.parse(raw)); else callback(null);
    })();

    // Return unsubscribe noop
    return () => {};
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
