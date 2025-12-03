/**
 * Interface do Serviço de Autenticação
 * Define o contrato para operações de autenticação
 * 
 * Princípio SOLID: Dependency Inversion (D)
 */

import { User } from '../../domain/entities/User';

export type AuthProvider = 'google' | 'apple' | 'email' | 'anonymous';

export interface AuthCredentials {
  email?: string;
  name?: string;
  picture?: string;
  providerId?: string;
}

export interface AuthUser {
  uid: string;
  name?: string;
  email?: string;
  picture?: string;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export interface RegisterResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}

export interface IAuthService {
  /**
   * Obtém o usuário atualmente autenticado
   */
  getCurrentUser(): Promise<AuthUser | null>;

  /**
   * Login com email e senha
   */
  signInWithEmail(email: string, password: string): Promise<LoginResult>;

  /**
   * Login com Google
   */
  signInWithGoogle(token?: string): Promise<LoginResult>;

  /**
   * Login com Apple (iOS)
   */
  signInWithApple(token?: string): Promise<LoginResult>;

  /**
   * Login anônimo
   */
  signInAnonymously(): Promise<LoginResult>;

  /**
   * Registrar nova conta
   */
  register(email: string, password: string, name: string): Promise<RegisterResult>;

  /**
   * Logout
   */
  signOut(): Promise<void>;

  /**
   * Envia email de recuperação de senha
   */
  sendPasswordResetEmail(email: string): Promise<void>;

  /**
   * Verifica se há sessão ativa
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Atualiza o perfil do usuário autenticado
   */
  updateProfile(data: Partial<User>): Promise<User>;

  /**
   * Obtém o token de autenticação (para APIs)
   */
  getAuthToken(): Promise<string | null>;

  /**
   * Atualiza o token de autenticação
   */
  refreshToken(): Promise<string | null>;

  /**
   * Listener para mudanças no estado de autenticação
   * Retorna função de cleanup
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void;

  /**
   * Verifica se o provedor de autenticação está disponível
   */
  isProviderAvailable(provider: AuthProvider): Promise<boolean>;

  /**
   * Deleta a conta do usuário
   */
  deleteAccount(): Promise<void>;

  /**
   * Reenvia email de verificação (se aplicável)
   */
  sendVerificationEmail(): Promise<void>;
}
