import SecureStorageService from '../storage/secure-storage.service';
import { FamilyUser, UserRole } from '../../types/family.types';
import { firebaseAuth, firebaseFirestore, firebaseStorage } from '../../config/firebase.config';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const USER_STORAGE_KEY = 'familyApp_currentUser';

class LocalAuthService {
  static async registerUser(email: string, password: string, name: string, role: UserRole = 'dependente') {
    const id = `local_${Date.now()}`;
    const user: FamilyUser = {
      id,
      name,
      email,
      role,
      familyId: '',
      joinedAt: new Date()
    };

    await SecureStorageService.setItem(USER_STORAGE_KEY, user);
    return { success: true, user, error: undefined };
  }

  static async loginUser(email: string, password: string) {
    const user = await SecureStorageService.getItem(USER_STORAGE_KEY) as FamilyUser | null;
    if (!user) return { success: false, error: 'Nenhum usuário local encontrado' };

    if (user.email === email) return { success: true, user: user as FamilyUser, error: undefined };
    return { success: false, error: 'Credenciais inválidas (local)' };
  }

  static async logout() {
    

    await SecureStorageService.removeItem(USER_STORAGE_KEY);

    // Logout do Firebase se houver usuário autenticado
    try {
      const auth = firebaseAuth() as any;
      if (auth && auth.currentUser) {
        
        await signOut(auth);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao fazer logout do Firebase:', error);
    }

    return { success: true, error: undefined };
  }

  static onAuthStateChange(callback: (user: FamilyUser | null) => void) {
    

    // Verifica usuário local primeiro
    (async () => {
      const user = await SecureStorageService.getItem(USER_STORAGE_KEY);
      if (user) {
        
        callback(user as FamilyUser);
      }
    })();

    // Monitora mudanças no Firebase Auth
    try {
      const auth = firebaseAuth() as any;
      

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        

        if (firebaseUser) {
          const localUser = await SecureStorageService.getItem(USER_STORAGE_KEY);
          let familyUser: FamilyUser;

          if (localUser) {
            familyUser = localUser as FamilyUser;
            familyUser.id = firebaseUser.uid;
            familyUser.email = firebaseUser.email || familyUser.email;
          } else {
            familyUser = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
              email: firebaseUser.email || '',
              role: 'admin',
              familyId: '',
              joinedAt: new Date()
            };
          }

          // Carregar picture e profileIcon do Auth ou Firestore
          try {
            const authPhoto = (firebaseUser as any).photoURL;
            let firestorePhoto: string | undefined;
            let firestoreProfileIcon: string | undefined;
            try {
              const db = firebaseFirestore() as any;
              const userRef = doc(db, 'users', firebaseUser.uid);
              const snap = await getDoc(userRef);
              if (snap.exists()) {
                const data = snap.data();
                firestorePhoto = data?.picture;
                firestoreProfileIcon = data?.profileIcon;
                if (data?.name && !localUser) {
                  // se primeiro login e Firestore tem nome mais atual
                  familyUser.name = data.name;
                }
              }
            } catch (e) {
              console.warn('[LocalAuthService.onAuthStateChange] Falha ao obter user doc Firestore:', e);
            }
            const finalPhoto = firestorePhoto || authPhoto;
            if (finalPhoto) {
              (familyUser as any).picture = finalPhoto;
            }
            // Sincronizar profileIcon do Firestore
            if (firestoreProfileIcon) {
              familyUser.profileIcon = firestoreProfileIcon;
              
            }
          } catch (e) {
            console.warn('[LocalAuthService.onAuthStateChange] Falha ao resolver foto de perfil:', e);
          }

          await SecureStorageService.setItem(USER_STORAGE_KEY, familyUser);
          
          callback(familyUser);
        } else {
          
          await SecureStorageService.removeItem(USER_STORAGE_KEY);
          callback(null);
        }
      });

      return unsubscribe;
    } catch (error) {
      console.warn('⚠️ Erro ao configurar Firebase Auth listener:', error);
      return () => { };
    }
  }

  static getCurrentUser() {
    return null;
  }

  static async saveUserToLocalStorage(user: FamilyUser): Promise<void> {
    await SecureStorageService.setItem(USER_STORAGE_KEY, user);
  }

  static async getUserFromLocalStorage(): Promise<FamilyUser | null> {
    const user = await SecureStorageService.getItem(USER_STORAGE_KEY);
    return user ? (user as FamilyUser) : null;
  }

  static startAuthKeepAlive() {
    // Não utilizado em modo local
  }

  static stopAuthKeepAlive() {
    // Não utilizado em modo local
  }

  static async initializeOfflineSupport(): Promise<void> {
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

    try {
      // Atualiza Firebase Auth (displayName)
      try {
        const auth = firebaseAuth() as any;
        if (auth?.currentUser) {
          await updateProfile(auth.currentUser, { displayName: newName });
        }
      } catch (e) {
        console.warn('[LocalAuthService.updateUserName] Falha ao atualizar displayName no Auth:', e);
      }

      // Atualiza Firestore users/{uid}
      try {
        const db = firebaseFirestore() as any;
        const userRef = doc(db, 'users', user.id);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          await updateDoc(userRef, { name: newName });
        } else {
          await setDoc(userRef, {
            id: user.id,
            email: user.email,
            name: newName,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (e) {
        console.warn('[LocalAuthService.updateUserName] Falha ao atualizar Firestore users:', e);
      }

      // Atualiza membro da família (se conhecido)
      try {
        if (user.familyId) {
          const db = firebaseFirestore() as any;
          const memberRef = doc(db, 'families', user.familyId, 'members', user.id);
          await updateDoc(memberRef, { name: newName });
        }
      } catch (e) {
        console.warn('[LocalAuthService.updateUserName] Falha ao atualizar nome no membro da família:', e);
      }

      // Atualiza local
      user.name = newName;
      await this.saveUserToLocalStorage(user);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  }

  static async resetPassword(email: string) {
    

    try {
      // Tenta usar o Firebase Auth primeiro
      const auth = firebaseAuth() as any;
      if (auth) {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(auth, email);
        
        return { success: true, error: undefined };
      }
    } catch (error: any) {
      console.error('❌ Erro ao enviar email de reset via Firebase:', error);

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

    // Fallback: apenas para modo offline/desenvolvimento
    
    return {
      success: false,
      error: 'Sem conexão. O reset de senha requer internet.'
    };
  }

  static async uploadProfileImage(imageUri: string) {
    const user = await this.getUserFromLocalStorage();
    if (!user) return { success: false, error: 'Usuário não encontrado' } as const;

    const oldPicture = user.picture; // Salva a URL antiga para deletar depois

    try {
      let downloadURL = imageUri;
      const isRemote = /^https?:\/\//i.test(imageUri);

      // 1. FAZ O UPLOAD DA NOVA IMAGEM (se não for remota)
      if (!isRemote) {
        const storage = firebaseStorage() as any;
        const picturePath = `profilePictures/${user.id}-${Date.now()}.jpg`;
        const storageRef = ref(storage, picturePath);

        const response = await fetch(imageUri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        downloadURL = await getDownloadURL(storageRef);
        
      }

      // 2. ATUALIZA TODAS AS REFERÊNCIAS NO FIREBASE E AUTH
      const updatePromises = [];

      // Auth
      const auth = firebaseAuth() as any;
      if (auth?.currentUser) {
        updatePromises.push(updateProfile(auth.currentUser, { photoURL: downloadURL }));
      }

      const db = firebaseFirestore() as any;
      const timestamp = new Date().toISOString();

      // Firestore 'users' collection
      const userRef = doc(db, 'users', user.id);
      updatePromises.push(setDoc(userRef, { picture: downloadURL, updatedAt: timestamp }, { merge: true }));

      // Firestore 'families/members' subcollection
      if (user.familyId) {
        const memberRef = doc(db, 'families', user.familyId, 'members', user.id);
        updatePromises.push(updateDoc(memberRef, { picture: downloadURL }));
      }

      await Promise.all(updatePromises);
      

      // 3. ATUALIZA O ARMAZENAMENTO LOCAL
      const updatedUser = { ...user, picture: downloadURL } as FamilyUser;
      await this.saveUserToLocalStorage(updatedUser);
      

      // 4. DELETA A IMAGEM ANTIGA (se existir)
      if (oldPicture && oldPicture !== downloadURL) {
        try {
          await this.deleteOldProfileImage(oldPicture);
        } catch (e) {
          console.warn('[LocalAuthService.uploadProfileImage] AVISO: Falha ao deletar foto antiga, mas o upload foi bem-sucedido:', e);
        }
      }

      return { success: true, photoURL: downloadURL } as const;
    } catch (error: any) {
      console.error('[LocalAuthService.uploadProfileImage] Erro no processo de upload:', error);
      // Se o upload falhou, a foto antiga não foi deletada.
      return { success: false, error: error?.message || String(error) } as const;
    }
  }

  static async deleteOldProfileImage(photoURL: string): Promise<void> {
    if (!photoURL || !photoURL.includes('firebasestorage.googleapis.com')) {
      // Ignora se a URL for nula ou não for do Firebase Storage (p.ex. um ícone)
      return;
    }

    try {
      const storage = firebaseStorage() as any;

      // Extrair o caminho do arquivo da URL do Firebase Storage
      // Formato esperado: https://firebasestorage.googleapis.com/.../o/profilePictures%2Ffile.jpg?...
      const match = photoURL.match(/\/o\/([^?]+)/);
      if (!match || !match[1]) {
        console.warn('[LocalAuthService.deleteOldProfileImage] Não foi possível extrair o caminho do arquivo da URL:', photoURL);
        return;
      }

      // Decodificar o caminho (transforma %2F em /)
      const filePath = decodeURIComponent(match[1]);

      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      
    } catch (error: any) {
      // Códigos de erro comuns: 'storage/object-not-found', 'storage/unauthorized'
      if (error.code === 'storage/object-not-found') {
        console.warn('[LocalAuthService.deleteOldProfileImage] AVISO: A foto antiga não foi encontrada para exclusão (pode já ter sido removida).');
      } else {
        console.error('[LocalAuthService.deleteOldProfileImage] Erro ao deletar foto antiga:', error);
        // Não lançar o erro - a exclusão da foto antiga não deve impedir o upload da nova
      }
    }
  }

  /**
   * Define um ícone de perfil (sem upload de imagem). Remove referência de picture se existir.
   */
  static async setProfileIcon(iconName: string) {
    const user = await this.getUserFromLocalStorage();
    if (!user) return { success: false, error: 'Usuário não encontrado' } as const;

    // Deleta a foto antiga se existir, antes de definir o ícone
    const oldPicture = user.picture;
    if (oldPicture) {
      try {
        await this.deleteOldProfileImage(oldPicture);
      } catch (e) {
        console.warn('[LocalAuthService.setProfileIcon] Falha ao deletar foto antiga:', e);
      }
    }

    try {
      // Limpa photoURL do Auth
      try {
        const auth = firebaseAuth() as any;
        if (auth?.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: null });
        }
      } catch (e) {
        console.warn('[LocalAuthService.setProfileIcon] Falha ao limpar Auth photoURL:', e);
      }
      // Atualiza Firestore users
      try {
        const db = firebaseFirestore() as any;
        const userRef = doc(db, 'users', user.id);
        const snap = await getDoc(userRef);
        const payload: any = { profileIcon: iconName, updatedAt: new Date().toISOString() };
        // Limpa picture (usaremos ícone)
        payload.picture = null;
        if (snap.exists()) {
          await updateDoc(userRef, payload);
        } else {
          await setDoc(userRef, { id: user.id, email: user.email, name: user.name, ...payload }, { merge: true });
        }
      } catch (e) {
        console.warn('[LocalAuthService.setProfileIcon] Falha ao atualizar Firestore users:', e);
      }
      // Atualiza membro da família
      try {
        if (user.familyId) {
          const db = firebaseFirestore() as any;
          const memberRef = doc(db, 'families', user.familyId, 'members', user.id);
          await updateDoc(memberRef, { profileIcon: iconName, picture: null });
        }
      } catch (e) {
        console.warn('[LocalAuthService.setProfileIcon] Falha ao atualizar membro da família:', e);
      }
      const updated = { ...user, profileIcon: iconName } as FamilyUser;
      delete (updated as any).picture;
      await this.saveUserToLocalStorage(updated);
      return { success: true } as const;
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) } as const;
    }
  }

  /**
   * Remove a foto de perfil atual (se existir) e limpa campos.
   */
  static async removeProfilePhoto() {
    const user = await this.getUserFromLocalStorage();
    if (!user) return { success: false, error: 'Usuário não encontrado' } as const;

    const oldPicture = user.picture;

    try {
      // 1. ATUALIZA TODAS AS REFERÊNCIAS PARA NULO
      const updatePromises = [];

      const auth = firebaseAuth() as any;
      if (auth.currentUser) {
        updatePromises.push(updateProfile(auth.currentUser, { photoURL: null }));
      }

      const db = firebaseFirestore() as any;
      const timestamp = new Date().toISOString();

      const userRef = doc(db, 'users', user.id);
      updatePromises.push(updateDoc(userRef, { picture: null, updatedAt: timestamp }));

      if (user.familyId) {
        const memberRef = doc(db, 'families', user.familyId, 'members', user.id);
        updatePromises.push(updateDoc(memberRef, { picture: null }));
      }

      await Promise.all(updatePromises);
      

      // 2. ATUALIZA O ARMAZENAMENTO LOCAL
      const updatedUser = { ...user } as FamilyUser;
      delete updatedUser.picture;
      delete updatedUser.profileIcon; // Garante que o ícone também seja limpo
      await this.saveUserToLocalStorage(updatedUser);
      

      // 3. DELETA O ARQUIVO ANTIGO DO STORAGE
      if (oldPicture) {
        await this.deleteOldProfileImage(oldPicture);
      }

      return { success: true } as const;
    } catch (error: any) {
      console.error('[LocalAuthService.removeProfilePhoto] Erro no processo de remoção:', error);
      return { success: false, error: error?.message || String(error) } as const;
    }
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
