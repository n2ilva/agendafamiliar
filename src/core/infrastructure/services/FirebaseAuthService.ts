/**
 * Implementação Firebase do Serviço de Autenticação
 * 
 * Princípios SOLID aplicados:
 * - Single Responsibility: Responsável apenas pela autenticação
 * - Dependency Inversion: Implementa a interface IAuthService
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  deleteUser,
  sendEmailVerification,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseFirestore } from '../../../config/firebase.config';
import {
  IAuthService,
  AuthUser,
  LoginResult,
  RegisterResult,
  AuthProvider,
} from '../../interfaces/services/IAuthService';
import { User } from '../../domain/entities/User';

export class FirebaseAuthService implements IAuthService {
  private auth: any;
  private db: any;

  constructor() {
    // Obter instâncias reais do Firebase
    const authProxy = firebaseAuth();
    this.auth = typeof authProxy === 'function' ? authProxy() : authProxy;
    
    const dbProxy = firebaseFirestore();
    this.db = typeof dbProxy === 'function' ? dbProxy() : dbProxy;
  }

  private mapFirebaseUserToAuthUser(firebaseUser: FirebaseUser): AuthUser {
    return {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || undefined,
      email: firebaseUser.email || undefined,
      picture: firebaseUser.photoURL || undefined,
    };
  }

  private async mapToUser(authUser: AuthUser): Promise<User> {
    // Buscar dados adicionais do Firestore
    const userRef = doc(this.db, 'users', authUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      return User.fromPersistence({
        id: authUser.uid,
        name: authUser.name || userData.name || 'Usuário',
        email: authUser.email || userData.email,
        picture: authUser.picture || userData.picture,
        familyId: userData.familyId,
        role: userData.role || 'adulto',
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
      });
    }

    // Se não existe no Firestore, criar objeto User básico
    return User.create({
      id: authUser.uid,
      name: authUser.name || 'Usuário',
      email: authUser.email,
      picture: authUser.picture,
      role: 'adulto',
    });
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;

    return this.mapFirebaseUserToAuthUser(currentUser);
  }

  async signInWithEmail(email: string, password: string): Promise<LoginResult> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const authUser = this.mapFirebaseUserToAuthUser(userCredential.user);
      const token = await userCredential.user.getIdToken();

      return {
        success: true,
        user: authUser,
        token,
      };
    } catch (error: any) {
      console.error('Error signing in with email:', error);
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  async signInWithGoogle(token?: string): Promise<LoginResult> {
    // Implementação simplificada - necessita configuração adicional
    return {
      success: false,
      error: 'Google Sign In não implementado nesta versão',
    };
  }

  async signInWithApple(token?: string): Promise<LoginResult> {
    // Implementação simplificada - necessita configuração adicional
    return {
      success: false,
      error: 'Apple Sign In não implementado nesta versão',
    };
  }

  async signInAnonymously(): Promise<LoginResult> {
    try {
      const userCredential = await firebaseSignInAnonymously(this.auth);
      const authUser = this.mapFirebaseUserToAuthUser(userCredential.user);
      const token = await userCredential.user.getIdToken();

      return {
        success: true,
        user: authUser,
        token,
      };
    } catch (error: any) {
      console.error('Error signing in anonymously:', error);
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  async register(email: string, password: string, name: string): Promise<RegisterResult> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const firebaseUser = userCredential.user;

      // Atualizar perfil do Firebase
      await firebaseUpdateProfile(firebaseUser, { displayName: name });

      // Criar documento no Firestore
      const userRef = doc(this.db, 'users', firebaseUser.uid);
      await setDoc(userRef, {
        id: firebaseUser.uid,
        name,
        email,
        role: 'adulto',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const authUser = this.mapFirebaseUserToAuthUser(firebaseUser);
      const token = await firebaseUser.getIdToken();

      return {
        success: true,
        user: authUser,
        token,
      };
    } catch (error: any) {
      console.error('Error registering user:', error);
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(this.auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Falha ao fazer logout');
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await firebaseSendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async isAuthenticated(): Promise<boolean> {
    return this.auth.currentUser !== null;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('Nenhum usuário autenticado');
    }

    // Atualizar no Firebase Auth
    if (data.name) {
      await firebaseUpdateProfile(currentUser, { displayName: data.name });
    }

    // Atualizar no Firestore
    const userRef = doc(this.db, 'users', currentUser.uid);
    const updateData: any = { updatedAt: new Date() };
    
    if (data.name) updateData.name = data.name;
    if (data.picture) updateData.picture = data.picture;
    if (data.familyId) updateData.familyId = data.familyId;
    if (data.role) updateData.role = data.role;

    await updateDoc(userRef, updateData);

    // Retornar usuário atualizado
    const authUser = this.mapFirebaseUserToAuthUser(currentUser);
    return this.mapToUser(authUser);
  }

  async getAuthToken(): Promise<string | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;

    try {
      return await currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async refreshToken(): Promise<string | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;

    try {
      return await currentUser.getIdToken(true);
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return firebaseOnAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const authUser = this.mapFirebaseUserToAuthUser(firebaseUser);
        const user = await this.mapToUser(authUser);
        callback(user);
      } else {
        callback(null);
      }
    });
  }

  async isProviderAvailable(provider: AuthProvider): Promise<boolean> {
    // Simplificado - apenas email e anônimo disponíveis
    return provider === 'email' || provider === 'anonymous';
  }

  async deleteAccount(): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('Nenhum usuário autenticado');
    }

    try {
      // Deletar documento do Firestore
      const userRef = doc(this.db, 'users', currentUser.uid);
      await setDoc(userRef, { deleted: true, deletedAt: new Date() }, { merge: true });

      // Deletar usuário do Firebase Auth
      await deleteUser(currentUser);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw new Error('Falha ao deletar conta');
    }
  }

  async sendVerificationEmail(): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('Nenhum usuário autenticado');
    }

    try {
      await sendEmailVerification(currentUser);
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Falha ao enviar email de verificação');
    }
  }

  private getErrorMessage(error: any): string {
    const errorCode = error?.code || '';
    
    const errorMessages: Record<string, string> = {
      'auth/user-not-found': 'Usuário não encontrado',
      'auth/wrong-password': 'Senha incorreta',
      'auth/email-already-in-use': 'Email já está em uso',
      'auth/invalid-email': 'Email inválido',
      'auth/weak-password': 'Senha muito fraca',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
      'auth/network-request-failed': 'Erro de conexão. Verifique sua internet',
    };

    return errorMessages[errorCode] || error?.message || 'Erro desconhecido';
  }
}
