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
import { Platform, AppState } from 'react-native';
import LocalStorageService from './LocalStorageService';
// Evitar import estático de SyncService para quebrar dependência circular.
// Importaremos dinamicamente quando for necessário.
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_STORAGE_KEY = 'familyApp_currentUser';

export class FirebaseAuthService {
  // Interval ID para keep-alive do token
  private static keepAliveIntervalId: any = null;
  private static keepAliveIntervalMinutes = 30; // intervalo padrão para refresh de token
  private static appStateListener: any = null;

  /**
   * Inicia o mecanismo de keep-alive: faz refresh do token a cada N minutos
   * e faz refresh imediato quando o app volta ao foreground.
   */
  static startAuthKeepAlive(intervalMinutes?: number) {
    try {
      if (intervalMinutes && typeof intervalMinutes === 'number') {
        this.keepAliveIntervalMinutes = intervalMinutes;
      }

      // Se já existe, limpar antes
      if (this.keepAliveIntervalId) {
        clearInterval(this.keepAliveIntervalId);
      }

      // Função para forçar refresh do token
      const refreshToken = async () => {
        try {
          const current = auth.currentUser;
          if (current && typeof current.getIdToken === 'function') {
            console.log('🔄 Keep-alive: atualizando token de autenticação...');
            await current.getIdToken(true);
            console.log('✅ Keep-alive: token atualizado com sucesso');
          } else {
            console.log('🔒 Keep-alive: usuário não autenticado - interrompendo keep-alive');
            this.stopAuthKeepAlive();
          }
        } catch (err) {
          console.warn('⚠️ Keep-alive: erro ao atualizar token:', err);
        }
      };

      // Intervalo periódico
      this.keepAliveIntervalId = setInterval(() => {
        refreshToken();
      }, this.keepAliveIntervalMinutes * 60 * 1000);

      // Atualiza imediatamente ao iniciar
      refreshToken();

      // Listener para trazer ao foreground
      if (!this.appStateListener) {
        this.appStateListener = AppState.addEventListener('change', (nextAppState: any) => {
          if (nextAppState === 'active') {
            // App voltou ao foreground, forçar refresh imediato
            (async () => {
              try {
                const current = auth.currentUser;
                if (current && typeof current.getIdToken === 'function') {
                  console.log('🔄 Keep-alive (foreground): atualizando token...');
                  await current.getIdToken(true);
                  console.log('✅ Keep-alive (foreground): token atualizado');
                }
              } catch (e) {
                console.warn('⚠️ Keep-alive (foreground) erro:', e);
              }
            })();
          }
        });
      }
    } catch (error) {
      console.warn('Erro ao iniciar keep-alive de autenticação:', error);
    }
  }

  static stopAuthKeepAlive() {
    try {
      if (this.keepAliveIntervalId) {
        clearInterval(this.keepAliveIntervalId);
        this.keepAliveIntervalId = null;
      }
      if (this.appStateListener) {
        // subscription returned by addEventListener has remove()
        try {
          if (typeof this.appStateListener.remove === 'function') {
            this.appStateListener.remove();
          }
        } catch (e) {
          console.warn('Erro ao remover listener AppState:', e);
        }
        this.appStateListener = null;
      }
      console.log('🛑 Keep-alive de autenticação parado');
    } catch (error) {
      console.warn('Erro ao parar keep-alive:', error);
    }
  }

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

      // Garantir que o keep-alive de autenticação esteja rodando
      try {
        FirebaseAuthService.startAuthKeepAlive();
      } catch (e) {
        console.warn('Erro ao iniciar keep-alive após registro:', e);
      }

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
      
      // Garantir que o keep-alive de autenticação esteja rodando
      try {
        FirebaseAuthService.startAuthKeepAlive();
      } catch (e) {
        console.warn('Erro ao iniciar keep-alive após login:', e);
      }

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

      // Garantir que o keep-alive de autenticação esteja rodando
      try {
        FirebaseAuthService.startAuthKeepAlive();
      } catch (e) {
        console.warn('Erro ao iniciar keep-alive após login com Google:', e);
      }

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
  // Garantir que o keep-alive esteja parado
  try { FirebaseAuthService.stopAuthKeepAlive(); } catch (e) { /* ignore */ }
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
            // Iniciar keep-alive de autenticação quando houver usuário
            try {
              FirebaseAuthService.startAuthKeepAlive();
            } catch (e) {
              console.warn('Erro ao iniciar keep-alive após auth state change:', e);
            }
        } else {
          console.log('❌ Documento do usuário não encontrado');
            callback(null);
            // Nenhum usuário autenticado - garantir que keep-alive esteja parado
            try { FirebaseAuthService.stopAuthKeepAlive(); } catch (e) { /* ignore */ }
        }
      } else {
        console.log('🚪 Usuário deslogado');
          callback(null);
          try { FirebaseAuthService.stopAuthKeepAlive(); } catch (e) { /* ignore */ }
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
      // Inicializar SyncService (import dinâmico para evitar ciclo de dependências)
      const { default: SyncService } = await import('./SyncService');
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
        // Iniciar keep-alive quando login online bem-sucedido
        try {
          FirebaseAuthService.startAuthKeepAlive();
        } catch (e) {
          console.warn('Erro ao iniciar keep-alive após login com cache:', e);
        }
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
        // Iniciar keep-alive quando registro online bem-sucedido
        try {
          FirebaseAuthService.startAuthKeepAlive();
        } catch (e) {
          console.warn('Erro ao iniciar keep-alive após registro com cache:', e);
        }
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
      
      // Adicionar à fila de sincronização (import dinâmico para evitar ciclo)
      try {
        const { default: SyncService } = await import('./SyncService');
        await SyncService.addOfflineOperation('create', 'users', tempUser);
      } catch (e) {
        console.warn('Não foi possível adicionar operação ao SyncService (import dinâmico falhou):', e);
      }
      
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
      try {
        const { default: SyncService } = await import('./SyncService');
        SyncService.cleanup();
      } catch (e) {
        console.warn('Não foi possível chamar SyncService.cleanup() via import dinâmico:', e);
      }
      
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
      console.log('🔐 Verificando estado de autenticação...');
      
      // Aguardar um pouco para garantir que o estado de auth esteja atualizado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('🔐 auth.currentUser:', auth.currentUser ? 'Logado' : 'Não logado');
      console.log('🔐 UID do usuário:', auth.currentUser?.uid);
      
      if (!auth.currentUser) {
        console.error('❌ Usuário não está logado no Firebase Auth');
        
        // Tentar buscar usuário do cache local como fallback
        const cachedUser = await this.getUserFromLocalStorage();
        if (cachedUser) {
          console.log('🔄 Tentando usar usuário do cache local:', cachedUser.name);
          // Se temos usuário no cache, o problema pode ser timing
          // Vamos tentar novamente após um delay maior
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (auth.currentUser) {
            console.log('✅ Auth recuperado após delay');
          } else {
            return { success: false, error: 'Usuário não está logado. Faça login novamente.' };
          }
        } else {
          return { success: false, error: 'Usuário não está logado. Faça login novamente.' };
        }
      }

      console.log('📸 Iniciando upload da foto de perfil...');
      console.log('📸 URI recebida:', imageUri);

      // Verificar se a URI é válida
      if (!imageUri) {
        return { success: false, error: 'URI da imagem não fornecida' };
      }

      // Verificar diferentes tipos de URI suportados
      const isValidUri = imageUri.startsWith('file://') || 
                        imageUri.startsWith('http') || 
                        imageUri.startsWith('https') ||
                        imageUri.startsWith('ph://') ||
                        imageUri.startsWith('content://');

      if (!isValidUri) {
        console.error('❌ URI inválida:', imageUri);
        return { success: false, error: 'Formato de URI não suportado' };
      }

      console.log('📸 Tipo de URI detectado:', imageUri.split('://')[0]);

      // Para URIs do tipo ph:// (iOS Photos) ou content:// (Android), 
      // precisamos converter para base64 primeiro
      let blob: Blob;
      
      try {
        if (imageUri.startsWith('ph://') || imageUri.startsWith('content://')) {
          console.log('📤 Convertendo URI do sistema para blob...');
          
          // Para iOS/Android, usar expo-file-system para converter
          const FileSystem = require('expo-file-system');
          
          // Primeiro, copiar para cache se necessário
          let localUri = imageUri;
          
          if (Platform.OS === 'ios' && imageUri.startsWith('ph://')) {
            // Para iOS Photos, precisamos de manipulação especial
            const fileInfo = await FileSystem.getInfoAsync(imageUri);
            if (!fileInfo.exists) {
              return { success: false, error: 'Imagem não encontrada no dispositivo' };
            }
            localUri = imageUri;
          }
          
          // Ler como base64
          const base64 = await FileSystem.readAsStringAsync(localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Converter base64 para blob
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          blob = new Blob([byteArray], { type: 'image/jpeg' });
          
          console.log('📤 Blob criado via FileSystem, tamanho:', blob.size, 'bytes');
        } else {
          // Para file:// ou http(s)://, usar fetch normal
          console.log('📤 Convertendo URI para blob via fetch...');
          const response = await fetch(imageUri);
          
          if (!response.ok) {
            console.error('❌ Erro na resposta fetch:', response.status, response.statusText);
            return { success: false, error: 'Não foi possível acessar a imagem' };
          }

          blob = await response.blob();
          console.log('📤 Blob criado via fetch, tamanho:', blob.size, 'bytes');
        }

        if (blob.size === 0) {
          return { success: false, error: 'Imagem vazia ou corrompida' };
        }
      } catch (conversionError: any) {
        console.error('❌ Erro ao converter URI para blob:', conversionError);
        return { success: false, error: 'Erro ao processar a imagem selecionada' };
      }

      // Criar referência única para a imagem
      const userId = auth.currentUser.uid;
      const timestamp = Date.now();
      const fileName = `profile_${userId}_${timestamp}.jpg`;
      const imageRef = ref(storage, `profile-images/${fileName}`);

      console.log('📤 Fazendo upload para Firebase Storage...');
      console.log('📤 Caminho:', `profile-images/${fileName}`);

      // Upload da imagem
      const uploadResult = await uploadBytes(imageRef, blob);
      console.log('📤 Upload concluído, bytes transferidos:', uploadResult.metadata.size);

      // Obter URL de download
      const photoURL = await getDownloadURL(uploadResult.ref);
      console.log('✅ URL de download obtida:', photoURL);

      // Atualizar Firebase Auth
      console.log('👤 Atualizando perfil no Firebase Auth...');
      await updateProfile(auth.currentUser, {
        photoURL: photoURL
      });

      // Atualizar no Firestore
      console.log('📊 Atualizando documento no Firestore...');
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
      console.error('❌ Erro detalhado no upload da foto:', error);
      console.error('❌ Código do erro:', error.code);
      console.error('❌ Mensagem do erro:', error.message);

      // Traduzir erros comuns do Firebase Storage
      let friendlyError = 'Erro ao fazer upload da foto. Tente novamente.';

      if (error.code === 'storage/unauthorized') {
        friendlyError = 'Permissão negada. Verifique as regras de segurança do Firebase Storage.';
      } else if (error.code === 'storage/canceled') {
        friendlyError = 'Upload cancelado.';
      } else if (error.code === 'storage/quota-exceeded') {
        friendlyError = 'Limite de armazenamento excedido.';
      } else if (error.code === 'storage/invalid-format') {
        friendlyError = 'Formato de imagem inválido.';
      } else if (error.message && error.message.includes('network')) {
        friendlyError = 'Erro de conexão. Verifique sua internet.';
      }

      return {
        success: false,
        error: friendlyError
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