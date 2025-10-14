import AsyncStorage from '@react-native-async-storage/async-storage';
import { FamilyUser, UserRole } from '../types/FamilyTypes';
import { firebaseAuth, firebaseFirestore, firebaseStorage } from '../config/firebase';
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
    console.log('🚪 Executando logout completo');
    
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    
    // Logout do Firebase se houver usuário autenticado
    try {
      const auth = firebaseAuth() as any;
      if (auth && auth.currentUser) {
        console.log('🔥 Fazendo logout do Firebase Auth');
        await signOut(auth);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao fazer logout do Firebase:', error);
    }
    
    return { success: true, error: undefined };
  }

  static onAuthStateChange(callback: (user: FamilyUser | null) => void) {
    console.log('🔔 Configurando listener de autenticação');
    
    // Verifica usuário local primeiro
    (async () => {
      const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (raw) {
        console.log('📱 Usuário local encontrado no AsyncStorage');
        callback(JSON.parse(raw));
      }
    })();

    // Monitora mudanças no Firebase Auth
    try {
      const auth = firebaseAuth() as any;
      console.log('🔥 Configurando onAuthStateChanged do Firebase');
      
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('🔥 Firebase Auth State Changed:', firebaseUser ? `Usuário: ${firebaseUser.email}` : 'Nenhum usuário');
        
        if (firebaseUser) {
          const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
          let familyUser: FamilyUser;
          
          if (raw) {
            familyUser = JSON.parse(raw);
            familyUser.id = firebaseUser.uid;
            familyUser.email = firebaseUser.email || familyUser.email;
          } else {
            familyUser = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
              email: firebaseUser.email || '',
              role: 'admin',
              isGuest: false,
              familyId: '',
              joinedAt: new Date()
            };
          }

          // Carregar picture do Auth ou Firestore
          try {
            const authPhoto = (firebaseUser as any).photoURL;
            let firestorePhoto: string | undefined;
            try {
              const db = firebaseFirestore() as any;
              const userRef = doc(db, 'users', firebaseUser.uid);
              const snap = await getDoc(userRef);
              if (snap.exists()) {
                const data = snap.data();
                firestorePhoto = data?.picture;
                if (data?.name && !raw) {
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
          } catch (e) {
            console.warn('[LocalAuthService.onAuthStateChange] Falha ao resolver foto de perfil:', e);
          }
          
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(familyUser));
          console.log('✅ FamilyUser salvo no AsyncStorage:', familyUser.name);
          callback(familyUser);
        } else {
          console.log('🚪 Firebase logout detectado - limpando AsyncStorage');
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
          callback(null);
        }
      });
      
      return unsubscribe;
    } catch (error) {
      console.warn('⚠️ Erro ao configurar Firebase Auth listener:', error);
      return () => {};
    }
  }

  static getCurrentUser() {
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
    return { success: true, error: undefined };
  }

  static async uploadProfileImage(imageUri: string) {
    const user = await this.getUserFromLocalStorage();
    if (!user) return { success: false, error: 'Usuário não encontrado' } as const;

    try {
      // Se já for URL http(s), usar diretamente sem upload
      let downloadURL = imageUri;
      const isRemote = /^https?:\/\//i.test(imageUri);
      if (!isRemote) {
        // Enviar para Firebase Storage
        const storage = firebaseStorage() as any;
        const picturePath = `profilePictures/${user.id}-${Date.now()}.jpg`;
        const storageRef = ref(storage, picturePath);

        // Converter URI para Blob
        const response = await fetch(imageUri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        downloadURL = await getDownloadURL(storageRef);
      }

      // Atualiza Firebase Auth (photoURL)
      try {
        const auth = firebaseAuth() as any;
        if (auth?.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: downloadURL });
        }
      } catch (e) {
        console.warn('[LocalAuthService.uploadProfileImage] Falha ao atualizar photoURL no Auth:', e);
      }

      // Atualiza Firestore users/{uid}
      try {
        const db = firebaseFirestore() as any;
        const userRef = doc(db, 'users', user.id);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          await updateDoc(userRef, { picture: downloadURL, updatedAt: new Date().toISOString() });
        } else {
          await setDoc(userRef, {
            id: user.id,
            email: user.email,
            name: user.name,
            picture: downloadURL,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (e) {
        console.warn('[LocalAuthService.uploadProfileImage] Falha ao atualizar Firestore users:', e);
      }

      // Atualiza membro da família (se conhecido)
      try {
        if (user.familyId) {
          const db = firebaseFirestore() as any;
          const memberRef = doc(db, 'families', user.familyId, 'members', user.id);
          await updateDoc(memberRef, { picture: downloadURL });
        }
      } catch (e) {
        console.warn('[LocalAuthService.uploadProfileImage] Falha ao atualizar foto no membro da família:', e);
      }

      // Atualiza local
      const updated = { ...user, picture: downloadURL } as FamilyUser;
      await this.saveUserToLocalStorage(updated);

      return { success: true, photoURL: downloadURL } as const;
    } catch (error: any) {
      console.error('[LocalAuthService.uploadProfileImage] Erro no upload:', error);
      return { success: false, error: error?.message || String(error) } as const;
    }
  }

  static async deleteOldProfileImage(photoURL: string): Promise<void> {
    try {
      if (!photoURL) return;
      const storage = firebaseStorage() as any;
      // Apenas deleta se for URL do bucket atual
      if (/firebasestorage.googleapis.com/.test(photoURL)) {
        // Extrair path depois de /o/ e antes de ?
        const match = decodeURIComponent(photoURL).match(/\/o\/([^?]+)/);
        const path = match ? match[1] : null;
        if (path) {
          const fileRef = ref(storage, path);
          await deleteObject(fileRef);
          console.log('🗑️ Foto antiga removida do Storage:', path);
        }
      }
    } catch (e) {
      console.warn('[LocalAuthService.deleteOldProfileImage] Falha ao deletar foto antiga:', e);
    }
  }

  /**
   * Define um ícone de perfil (sem upload de imagem). Remove referência de picture se existir.
   */
  static async setProfileIcon(iconName: string) {
    const user = await this.getUserFromLocalStorage();
    if (!user) return { success: false, error: 'Usuário não encontrado' } as const;
    try {
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
    const old = user.picture;
    try {
      if (old) await this.deleteOldProfileImage(old);
      // Limpa Auth
      try {
        const auth = firebaseAuth() as any;
        if (auth?.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: null });
        }
      } catch (e) {
        console.warn('[LocalAuthService.removeProfilePhoto] Falha ao limpar photoURL Auth:', e);
      }
      // Firestore users
      try {
        const db = firebaseFirestore() as any;
        const userRef = doc(db, 'users', user.id);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          await updateDoc(userRef, { picture: null, updatedAt: new Date().toISOString() });
        }
      } catch (e) {
        console.warn('[LocalAuthService.removeProfilePhoto] Falha ao limpar picture em users:', e);
      }
      // Membro da família
      try {
        if (user.familyId) {
          const db = firebaseFirestore() as any;
          const memberRef = doc(db, 'families', user.familyId, 'members', user.id);
          await updateDoc(memberRef, { picture: null });
        }
      } catch (e) {
        console.warn('[LocalAuthService.removeProfilePhoto] Falha ao limpar picture no membro:', e);
      }
      const updated = { ...user } as FamilyUser;
      delete (updated as any).picture;
      await this.saveUserToLocalStorage(updated);
      return { success: true } as const;
    } catch (error: any) {
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
