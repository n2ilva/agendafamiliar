import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseFirestore } from '../config/firebase';

type AuthResult = { success: boolean; user?: any; error?: string };

const FirebaseAuthService = {
  async registerUser(email: string, password: string, name: string): Promise<AuthResult> {
    try {
      const auth = firebaseAuth() as any;
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // Create a users doc in Firestore (id = uid)
      try {
        const db = firebaseFirestore() as any;
        const usersCol = collection(db, 'users');
        // Use setDoc with uid to ensure predictable id
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
  }
};

export default FirebaseAuthService;
// file ends here