import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { FamilyUser, Family, UserRole } from '../types/FamilyTypes';

export class FirebaseAuthService {
  // Registrar novo usuário
  static async registerUser(email: string, password: string, name: string, role: UserRole = 'dependente') {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Atualizar perfil do usuário
      await updateProfile(user, { displayName: name });

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

      return { success: true, user: { id: user.uid, ...familyUser } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Login com email e senha
  static async loginUser(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Buscar dados completos do usuário
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return { 
          success: true, 
          user: { 
            id: user.uid, 
            ...userData,
            picture: user.photoURL 
          } as FamilyUser 
        };
      } else {
        throw new Error('Dados do usuário não encontrados');
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Login com Google
  static async loginWithGoogle(googleToken: string, role: UserRole = 'dependente') {
    try {
      const credential = GoogleAuthProvider.credential(googleToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      // Verificar se o usuário já existe
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      let familyUser: FamilyUser;
      
      if (userDoc.exists()) {
        // Usuário existente
        familyUser = { id: user.uid, ...userDoc.data() } as FamilyUser;
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
        
        await setDoc(doc(db, 'users', user.uid), newUser);
        familyUser = { id: user.uid, ...newUser };
      }

      return { success: true, user: familyUser };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Logout
  static async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Observar mudanças de autenticação
  static onAuthStateChange(callback: (user: FamilyUser | null) => void) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
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
          callback(familyUser);
        } else {
          callback(null);
        }
      } else {
        callback(null);
      }
    });
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
}

export default FirebaseAuthService;