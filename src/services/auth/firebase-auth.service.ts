/**
 * @deprecated Use os Use Cases em /core/usecases/auth em vez deste serviço:
 * - RegisterUseCase para registerUser
 * - LoginUseCase para loginUser  
 * - ResetPasswordUseCase para resetPassword
 * 
 * Ver: src/services/MIGRATION_GUIDE.md
 */
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseFirestore } from '../../config/firebase.config';

type AuthResult = { success: boolean; user?: any; error?: string };

const FirebaseAuthService = {
  async registerUser(email: string, password: string, name: string): Promise<AuthResult> {
    try {
      const auth = firebaseAuth() as any;
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // Criar documento do usuário no Firestore
      try {
        const db = firebaseFirestore() as any;
        const usersCol = collection(db, 'users');
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          id: user.uid,
          email: email,
          name: name,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Falha ao criar documento de usuário no Firestore após registro:', e);
      }

      console.log('[FirebaseAuthService] registerUser: success, uid=', user.uid);

      return { success: true, user: { id: user.uid, uid: user.uid, email, name } };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  },

  async loginUser(email: string, password: string): Promise<AuthResult> {
    try {
      const auth = firebaseAuth() as any;
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      return { success: true, user: { id: user.uid, uid: user.uid, email: user.email } };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  },

  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const auth = firebaseAuth() as any;
      await sendPasswordResetEmail(auth, email);
      console.log('[FirebaseAuthService] resetPassword: email enviado para', email);
      return { success: true };
    } catch (error: any) {
      console.error('[FirebaseAuthService] resetPassword: erro ao enviar email', error);
      
      // Mensagens de erro mais amigáveis
      let errorMessage = error?.message || String(error);
      if (error?.code === 'auth/user-not-found') {
        errorMessage = 'Não encontramos uma conta com este email.';
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      } else if (error?.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
      }
      
      return { success: false, error: errorMessage };
    }
  }
};

export default FirebaseAuthService;