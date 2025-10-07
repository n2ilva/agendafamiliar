import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import { FamilyUser, Family, UserRole } from '../types/FamilyTypes';
import { Platform } from 'react-native';
import LocalStorageService from './LocalStorageService';
import SyncService from './SyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_STORAGE_KEY = 'familyApp_currentUser';

export class FirebaseAuthService {
  // Salvar usuário no AsyncStorage
  static async saveUserToLocalStorage(user: FamilyUser): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      console.log('💾 Usuário salvo no AsyncStorage');
    } catch (error) {
      console.error('Erro ao salvar usuário no AsyncStorage:', error);
    }
  }

  // Remover usuário do AsyncStorage
  static async removeUserFromLocalStorage(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      console.log('🗑️ Usuário removido do AsyncStorage');
    } catch (error) {
      console.error('Erro ao remover usuário do AsyncStorage:', error);
    }
  }

  // Obter usuário do AsyncStorage
  static async getUserFromLocalStorage(): Promise<FamilyUser | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error('Erro ao carregar usuário do AsyncStorage:', error);
      return null;
    }
  }

  // Traduzir códigos de erro do Firebase para mensagens amigáveis
  private static translateFirebaseError(errorCode: string, errorMessage: string): string {
    const errorTranslations: { [key: string]: string } = {
      // Erros de autenticação
      'auth/user-not-found': 'Usuário não encontrado. Verifique o email digitado ou crie uma nova conta.',
      'auth/wrong-password': 'Senha incorreta. Tente novamente ou use "Esqueci minha senha".',
      'auth/invalid-email': 'Email inválido. Verifique se digitou corretamente.',
      'auth/user-disabled': 'Esta conta foi desabilitada. Entre em contato com o suporte.',
      'auth/too-many-requests': 'Muitas tentativas de login. Tente novamente em alguns minutos.',
      'auth/network-request-failed': 'Erro de conexão. Verifique sua internet e tente novamente.',
      
      // Erros de cadastro
      'auth/email-already-in-use': 'Este email já está sendo usado por outra conta. Tente fazer login ou use outro email.',
      'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres com letras e números.',
      'auth/operation-not-allowed': 'Método de login não habilitado. Entre em contato com o suporte.',
      
      // Erros de validação
      'auth/invalid-credential': 'Credenciais inválidas. Verifique seu email e senha.',
      'auth/credential-already-in-use': 'Esta conta já está vinculada a outro usuário.',
      'auth/account-exists-with-different-credential': 'Já existe uma conta com este email usando outro método de login.',
      
      // Erros do Google
      'auth/popup-closed-by-user': 'Login cancelado. Tente novamente se desejar continuar.',
      'auth/popup-blocked': 'Pop-up bloqueado pelo navegador. Permita pop-ups e tente novamente.',
      'auth/cancelled-popup-request': 'Login cancelado. Tente novamente.',
      
      // Outros erros
      'auth/internal-error': 'Erro interno do sistema. Tente novamente em alguns minutos.',
      'auth/timeout': 'Tempo esgotado. Verifique sua conexão e tente novamente.',
    };
    
    // Tentar traduzir pelo código específico
    if (errorTranslations[errorCode]) {
      return errorTranslations[errorCode];
    }
    
    // Buscar por palavras-chave na mensagem original
    const message = errorMessage.toLowerCase();
    if (message.includes('network')) {
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    }
    if (message.includes('password')) {
      return 'Problema com a senha. Verifique se está correta.';
    }
    if (message.includes('email')) {
      return 'Problema com o email. Verifique se está correto.';
    }
    if (message.includes('permission') || message.includes('denied')) {
      return 'Permissão negada. Verifique as configurações da conta.';
    }
    
    // Retornar mensagem genérica mais amigável
    return 'Ops! Algo deu errado. Tente novamente ou entre em contato com o suporte.';
  }
  // Registrar novo usuário
  static async registerUser(email: string, password: string, name: string, role: UserRole = 'dependente') {
    try {
      console.log('📝 Registrando novo usuário:', email, 'como', role);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('✅ Usuário criado no Auth:', user.uid);

      // Atualizar perfil do usuário
      await updateProfile(user, { displayName: name });
      console.log('👤 Perfil atualizado com nome:', name);

      // Criar documento do usuário no Firestore
      const familyUser: Omit<FamilyUser, 'id'> = {
        name,
        email,
        role,
        isGuest: false,
        familyId: '', // Será definido quando entrar em uma família
        joinedAt: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), familyUser);
      console.log('📊 Documento criado no Firestore');

      const fullUser = { id: user.uid, ...familyUser };
      
      // Salvar no AsyncStorage para persistência
      await this.saveUserToLocalStorage(fullUser);

      return { success: true, user: fullUser };
    } catch (error: any) {
      console.error('❌ Erro no registro:', error.message);
      const friendlyError = this.translateFirebaseError(error.code || '', error.message || '');
      return { success: false, error: friendlyError };
    }
  }

  // Login com email e senha
  static async loginUser(email: string, password: string) {
    try {
      console.log('🔐 Tentando login com email:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('✅ Login realizado com sucesso:', user.uid);

      // Buscar dados completos do usuário
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userData;
      
      if (userDoc.exists()) {
        userData = userDoc.data();
        console.log('📊 Dados do usuário carregados:', userData.name);
      } else {
        // Se o usuário não existe na coleção users, criar com dados básicos
        console.log('👤 Criando documento do usuário na coleção users...');
        userData = {
          name: user.displayName || user.email?.split('@')[0] || 'Usuário',
          email: user.email,
          role: 'dependente',
          isGuest: false,
          familyId: null
        };
        
        // Salvar o usuário na coleção users
        await setDoc(doc(db, 'users', user.uid), userData);
        console.log('✅ Usuário criado na coleção users');
      }
      
      const fullUser = { 
        id: user.uid, 
        ...userData,
        picture: user.photoURL 
      } as FamilyUser;
        
      // Salvar no AsyncStorage para persistência
      await this.saveUserToLocalStorage(fullUser);
      
      return { success: true, user: fullUser };
    } catch (error: any) {
      console.error('❌ Erro no login:', error.message);
      const friendlyError = this.translateFirebaseError(error.code || '', error.message || '');
      return { success: false, error: friendlyError };
    }
  }

  // Login com Google
  static async loginWithGoogle(accessToken?: string, role: UserRole = 'dependente') {
    try {
      let userCredential;
      
      if (Platform.OS === 'web') {
        // Para web, usar signInWithPopup
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        userCredential = await signInWithPopup(auth, provider);
      } else {
        // Para mobile (React Native), usar signInWithCredential
        if (!accessToken) {
          throw new Error('Token de acesso necessário para autenticação mobile. Verifique se o OAuth está configurado corretamente.');
        }
        
        console.log('Usando access token para mobile:', accessToken.substring(0, 20) + '...');
        
        // Criar credencial com access token
        const credential = GoogleAuthProvider.credential(null, accessToken);
        userCredential = await signInWithCredential(auth, credential);
      }
      
      const user = userCredential.user;
      console.log('Usuário autenticado:', user.uid, user.email);

      // Verificar se o usuário já existe
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      let familyUser: FamilyUser;
      
      if (userDoc.exists()) {
        // Usuário existente - atualizar foto se necessário
        const existingData = userDoc.data();
        familyUser = { id: user.uid, ...existingData } as FamilyUser;
        
        // Atualizar foto se mudou
        if (user.photoURL && user.photoURL !== existingData.picture) {
          await updateDoc(doc(db, 'users', user.uid), {
            picture: user.photoURL
          });
          familyUser.picture = user.photoURL;
        }
      } else {
        // Novo usuário
        const newUser: Omit<FamilyUser, 'id'> = {
          name: user.displayName || 'Usuário',
          email: user.email || '',
          picture: user.photoURL || undefined,
          role,
          isGuest: false,
          familyId: '',
          joinedAt: new Date()
        };
        
        console.log('Criando novo usuário:', newUser);
        await setDoc(doc(db, 'users', user.uid), newUser);
        familyUser = { id: user.uid, ...newUser };
      }

      // Salvar no AsyncStorage para persistência
      await this.saveUserToLocalStorage(familyUser);

      return { success: true, user: familyUser };
    } catch (error: any) {
      console.error('Erro detalhado no login com Google:', error);
      const friendlyError = this.translateFirebaseError(error.code || '', error.message || '');
      return { success: false, error: friendlyError };
    }
  }

  // Logout
  static async logout() {
    try {
      await signOut(auth);
      // Remover dados do AsyncStorage
      await this.removeUserFromLocalStorage();
      return { success: true };
    } catch (error: any) {
      const friendlyError = this.translateFirebaseError(error.code || '', error.message || '');
      return { success: false, error: friendlyError };
    }
  }

  // Observar mudanças de autenticação
  static onAuthStateChange(callback: (user: FamilyUser | null) => void) {
    console.log('👂 Iniciando observador de autenticação...');
    return onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 Estado de autenticação mudou:', firebaseUser ? firebaseUser.uid : 'null');
      
      if (firebaseUser) {
        // Buscar dados completos do usuário
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const familyUser: FamilyUser = {
            id: firebaseUser.uid,
            ...userData,
            picture: firebaseUser.photoURL || userData.picture
          } as FamilyUser;
          console.log('👤 Usuário autenticado:', familyUser.name, familyUser.role);
          callback(familyUser);
        } else {
          console.log('❌ Documento do usuário não encontrado');
          callback(null);
        }
      } else {
        console.log('🚪 Usuário deslogado');
        callback(null);
      }
    });
  }

  // Atualizar role do usuário
  static async updateUserRole(userId: string, newRole: UserRole) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Criar família
  static async createFamily(name: string, adminId: string) {
    try {
      const family = {
        name,
        adminId,
        createdAt: new Date(),
        memberIds: [adminId] // Array de IDs em vez de objetos completos
      };

      const familyRef = await addDoc(collection(db, 'families'), family);
      
      // Atualizar usuário para ser admin da família
      await updateDoc(doc(db, 'users', adminId), {
        familyId: familyRef.id,
        role: 'admin'
      });

      return { success: true, familyId: familyRef.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Entrar em família com código
  static async joinFamilyWithCode(userId: string, inviteCode: string) {
    try {
      // Em uma implementação real, você buscaria o código na coleção de convites
      // Por agora, vamos simular
      const validCodes = ['ABC123', 'DEF456', 'GHI789', 'XYZ789', 'QWE123'];
      
      if (!validCodes.includes(inviteCode.toUpperCase())) {
        throw new Error('Código de convite inválido ou expirado');
      }

      // Simular familyId baseado no código
      const familyId = 'family_001'; // Em produção, isso viria do convite
      
      // Atualizar usuário
      await updateDoc(doc(db, 'users', userId), {
        familyId,
        role: 'dependente'
      });

      return { success: true, familyId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Obter usuário atual
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Salvar usuário no cache local
  static async saveUserToCache(user: FamilyUser): Promise<void> {
    await LocalStorageService.saveUser(user);
  }

  // Obter usuário do cache local
  static async getUserFromCache(userId: string): Promise<FamilyUser | null> {
    return await LocalStorageService.getUser(userId);
  }

  // Inicializar sistema offline
  static async initializeOfflineSupport(): Promise<void> {
    try {
      // Inicializar SyncService
      await SyncService.initialize();
      console.log('Sistema offline inicializado');
    } catch (error) {
      console.error('Erro ao inicializar sistema offline:', error);
    }
  }

  // Verificar se deve usar cache (offline)
  static async shouldUseCache(): Promise<boolean> {
    // Importar ConnectivityService dinamicamente para evitar dependência circular
    const { default: ConnectivityService } = await import('./ConnectivityService');
    return !ConnectivityService.isConnected();
  }

  // Login com fallback para cache
  static async loginUserWithCache(email: string, password: string) {
    try {
      // Tentar login online primeiro
      const result = await this.loginUser(email, password);
      
      if (result.success && result.user) {
        // Salvar no cache para uso offline
        await this.saveUserToCache(result.user);
        
        // Inicializar sistema offline
        await this.initializeOfflineSupport();
      }
      
      return result;
    } catch (error: any) {
      // Se falhar, tentar buscar do cache
      console.log('Login online falhou, tentando cache local');
      
      try {
        const offlineData = await LocalStorageService.getOfflineData();
        const cachedUser = Object.values(offlineData.users).find(user => user.email === email);
        
        if (cachedUser) {
          console.log('Usuário encontrado no cache, modo offline ativado');
          return { success: true, user: cachedUser, isOffline: true };
        }
      } catch (cacheError) {
        console.error('Erro ao acessar cache:', cacheError);
      }
      
      return { success: false, error: error.message };
    }
  }

  // Register com cache
  static async registerUserWithCache(email: string, password: string, name: string, role: UserRole = 'dependente') {
    try {
      // Tentar registro online
      const result = await this.registerUser(email, password, name, role);
      
      if (result.success && result.user) {
        // Salvar no cache
        await this.saveUserToCache(result.user);
        
        // Inicializar sistema offline
        await this.initializeOfflineSupport();
      }
      
      return result;
    } catch (error: any) {
      // Em caso de erro, ainda podemos salvar localmente para sincronizar depois
      const tempUser: FamilyUser = {
        id: `temp_${Date.now()}`,
        name,
        email,
        role,
        isGuest: false,
        familyId: '',
        joinedAt: new Date()
      };
      
      // Salvar no cache
      await this.saveUserToCache(tempUser);
      
      // Adicionar à fila de sincronização
      await SyncService.addOfflineOperation('create', 'users', tempUser);
      
      return { success: true, user: tempUser, isOffline: true };
    }
  }

  // Logout com limpeza de cache
  static async logoutWithCache(): Promise<void> {
    try {
      // Logout do Firebase
      await this.logout();
      
      // Limpar cache local (opcional - usuário pode querer manter dados offline)
      // await LocalStorageService.clearCache();
      
      // Limpar sync service
      SyncService.cleanup();
      
      console.log('Logout realizado com limpeza de cache');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  }

  // Atualizar nome do usuário
  static async updateUserName(newName: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!auth.currentUser) {
        return { success: false, error: 'Usuário não está logado' };
      }

      // Atualizar no Firebase Auth
      await updateProfile(auth.currentUser, {
        displayName: newName
      });

      // Atualizar no Firestore
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, {
        name: newName,
        updatedAt: new Date()
      });

      // Atualizar cache local
      const currentUser = await this.getUserFromLocalStorage();
      if (currentUser) {
        const updatedUser = { ...currentUser, name: newName };
        await this.saveUserToLocalStorage(updatedUser);
      }

      console.log('✅ Nome do usuário atualizado com sucesso');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro ao atualizar nome:', error);
      return { 
        success: false, 
        error: this.translateFirebaseError(error.code, error.message) 
      };
    }
  }

  // Reset de senha
  static async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!email.trim()) {
        return { success: false, error: 'Email é obrigatório' };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return { success: false, error: 'Email inválido' };
      }

      await sendPasswordResetEmail(auth, email.trim());
      
      console.log('✅ Email de reset enviado para:', email);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro ao enviar reset de senha:', error);
      return { 
        success: false, 
        error: this.translateFirebaseError(error.code, error.message) 
      };
    }
  }

  // Upload de foto de perfil
  static async uploadProfileImage(imageUri: string): Promise<{ success: boolean; photoURL?: string; error?: string }> {
    try {
      if (!auth.currentUser) {
        return { success: false, error: 'Usuário não está logado' };
      }

      console.log('📸 Iniciando upload da foto de perfil...');

      // Converter URI para blob para upload
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Criar referência única para a imagem
      const userId = auth.currentUser.uid;
      const timestamp = Date.now();
      const fileName = `profile_${userId}_${timestamp}.jpg`;
      const imageRef = ref(storage, `profile-images/${fileName}`);

      // Upload da imagem
      console.log('📤 Fazendo upload da imagem...');
      const uploadResult = await uploadBytes(imageRef, blob);
      
      // Obter URL de download
      const photoURL = await getDownloadURL(uploadResult.ref);
      console.log('✅ Upload concluído. URL:', photoURL);

      // Atualizar Firebase Auth
      await updateProfile(auth.currentUser, {
        photoURL: photoURL
      });

      // Atualizar no Firestore
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        picture: photoURL,
        updatedAt: new Date()
      });

      // Atualizar cache local
      const currentUser = await this.getUserFromLocalStorage();
      if (currentUser) {
        const updatedUser = { ...currentUser, picture: photoURL };
        await this.saveUserToLocalStorage(updatedUser);
      }

      console.log('✅ Foto de perfil atualizada com sucesso');
      return { success: true, photoURL };
    } catch (error: any) {
      console.error('❌ Erro ao fazer upload da foto:', error);
      return { 
        success: false, 
        error: 'Erro ao fazer upload da foto. Tente novamente.' 
      };
    }
  }

  // Remover foto de perfil anterior (para evitar acúmulo de imagens)
  static async deleteOldProfileImage(photoURL: string): Promise<void> {
    try {
      if (photoURL && photoURL.includes('firebase')) {
        const imageRef = ref(storage, photoURL);
        await deleteObject(imageRef);
        console.log('🗑️ Foto anterior removida');
      }
    } catch (error) {
      console.log('ℹ️ Não foi possível remover foto anterior (pode não existir)');
    }
  }
}

export default FirebaseAuthService;