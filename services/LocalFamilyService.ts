import { Family, FamilyUser, Task } from '../types/FamilyTypes';
import { firebaseFirestore } from '../config/firebase';
import { 
  collection, 
  collectionGroup,
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  Timestamp,
  updateDoc,
  deleteDoc 
} from 'firebase/firestore';

class LocalFamilyService {
  // Helper para obter a instância do Firestore
  private getFirestore() {
    return firebaseFirestore();
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // evitar ambiguidade
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createFamily(name: string, adminUser: FamilyUser): Promise<Family> {
    console.log('🏠 [LocalFamilyService] Criando família no Firebase...');
    
    try {
      const db = this.getFirestore();
      
      // Gerar ID único para a família
      const familyRef = doc(collection(db, 'families'));
      const familyId = familyRef.id;
      
      const inviteCode = this.generateInviteCode();
      const now = new Date();
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
      
      const family: Family = {
        id: familyId,
        name: name.trim(),
        adminId: adminUser.id,
        members: [],
        createdAt: now,
        inviteCode: inviteCode,
        inviteCodeExpiry: expiry
      };

      // Salvar família no Firestore
      await setDoc(familyRef, {
        name: family.name,
        adminId: family.adminId,
        createdAt: Timestamp.fromDate(now),
        inviteCode: inviteCode,
        inviteCodeExpiry: Timestamp.fromDate(expiry)
      });

      console.log('✅ Família criada no Firestore:', familyId);

      // Adicionar admin como membro
      const memberRef = doc(db, `families/${familyId}/members`, adminUser.id);
      await setDoc(memberRef, {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: 'admin',
        familyId: familyId,
        joinedAt: Timestamp.fromDate(now),
        isGuest: false
      });

      console.log('✅ Admin adicionado como membro da família');

      family.members = [{
        ...adminUser,
        role: 'admin',
        familyId: familyId,
        joinedAt: now
      }];

      return family;
    } catch (error) {
      console.error('❌ Erro ao criar família no Firebase:', error);
      throw new Error('Não foi possível criar a família. Verifique sua conexão com a internet.');
    }
  }

  async getFamilyById(familyId: string): Promise<Family | null> {
    try {
      console.log('🔍 Buscando família no Firebase:', familyId);
      const db = this.getFirestore();
      const familyRef = doc(db, 'families', familyId);
      const familySnap = await getDoc(familyRef);
      
      if (!familySnap.exists()) {
        console.log('❌ Família não encontrada');
        return null;
      }

      const familyData = familySnap.data();
      
      // Buscar membros da subcoleção
      const membersRef = collection(db, 'families', familyId, 'members');
      const membersSnap = await getDocs(membersRef);
      const members = membersSnap.docs.map(doc => ({
        ...doc.data(),
        joinedAt: doc.data().joinedAt?.toDate?.() || new Date(doc.data().joinedAt)
      }));

      const family: Family = {
        id: familySnap.id,
        name: familyData.name,
        adminId: familyData.adminId,
        inviteCode: familyData.inviteCode,
        inviteCodeExpiry: familyData.inviteCodeExpiry?.toDate?.() || new Date(familyData.inviteCodeExpiry),
        createdAt: familyData.createdAt?.toDate?.() || new Date(familyData.createdAt),
        members: members as FamilyUser[]
      };

      console.log('✅ Família encontrada:', family.name);
      return family;
    } catch (error) {
      console.error('❌ Erro ao buscar família:', error);
      throw new Error('Não foi possível buscar a família. Verifique sua conexão.');
    }
  }

  async getUserFamily(userId: string): Promise<Family | null> {
    try {
      console.log('🔍 Buscando família do usuário:', userId);
      const db = this.getFirestore();
      
      // Usar collectionGroup para buscar em todas as subcoleções "members"
      console.log('📊 Executando Collection Group Query...');
      const membersQuery = query(
        collectionGroup(db, 'members'),
        where('id', '==', userId)
      );
      
      const memberSnap = await getDocs(membersQuery);
      console.log(`📋 Documentos encontrados: ${memberSnap.size}`);
      
      if (memberSnap.empty) {
        console.log('❌ Usuário não pertence a nenhuma família');
        return null;
      }
      
      // Pegar o ID da família do primeiro resultado
      const memberDoc = memberSnap.docs[0];
      const memberData = memberDoc.data() as { familyId: string };
      console.log('👤 Dados do membro:', memberData);
      const familyId = memberData.familyId;
      
      console.log('✅ Família do usuário encontrada:', familyId);
      return this.getFamilyById(familyId);
    } catch (error) {
      console.error('❌ Erro ao buscar família do usuário:', error);
      throw new Error('Não foi possível buscar a família do usuário.');
    }
  }

  async joinFamily(inviteCode: string, user: FamilyUser): Promise<Family> {
    try {
      console.log('🔍 Buscando família com código:', inviteCode);
      console.log('👤 Usuário tentando entrar:', user.id, user.name);
      
      const db = this.getFirestore();
      const familiesRef = collection(db, 'families');
      const searchCode = inviteCode.trim().toUpperCase();
      console.log('🔎 Código de busca (normalizado):', searchCode);
      
      const q = query(familiesRef, where('inviteCode', '==', searchCode));
      
      console.log('📡 Executando query no Firestore...');
      const querySnap = await getDocs(q);
      console.log(`📊 Resultados encontrados: ${querySnap.size}`);

      if (querySnap.empty) {
        console.error('❌ Nenhuma família encontrada com o código:', searchCode);
        throw new Error('Código de convite inválido ou família não encontrada');
      }

      const familyDoc = querySnap.docs[0];
      const familyData = familyDoc.data();
      console.log('✅ Família encontrada:', familyDoc.id, familyData.name);

      // Verificar expiração
      if (familyData.inviteCodeExpiry) {
        const expiry = familyData.inviteCodeExpiry.toDate?.() || new Date(familyData.inviteCodeExpiry);
        console.log('📅 Verificando expiração. Expira em:', expiry);
        if (Date.now() > expiry.getTime()) {
          console.error('⏰ Código expirado!');
          throw new Error('Código de convite expirado');
        }
      }

      // Verificar se o usuário já é membro
      const existingMemberRef = doc(db, 'families', familyDoc.id, 'members', user.id);
      const existingMemberSnap = await getDoc(existingMemberRef);
      
      if (existingMemberSnap.exists()) {
        console.log('ℹ️ Usuário já é membro desta família');
        return this.getFamilyById(familyDoc.id) as Promise<Family>;
      }

      // Adicionar membro na subcoleção
      console.log('➕ Adicionando usuário como membro...');
      const memberRef = doc(db, 'families', familyDoc.id, 'members', user.id);
      await setDoc(memberRef, {
        ...user,
        role: 'dependente',
        familyId: familyDoc.id,
        joinedAt: Timestamp.now()
      });

      console.log('✅ Usuário adicionado à família:', familyDoc.id);
      return this.getFamilyById(familyDoc.id) as Promise<Family>;
    } catch (error) {
      console.error('❌ Erro ao entrar na família:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao entrar na família. Verifique sua conexão.');
    }
  }

  async saveFamilyTask(task: Task, familyId: string): Promise<Task> {
    try {
      console.log('💾 Salvando tarefa no Firebase:', task.title);
      const db = this.getFirestore();
      const tasksRef = collection(db, 'tasks');
      
      let taskId = task.id;
      if (!taskId || taskId.startsWith('temp')) {
        taskId = doc(tasksRef).id;
      }

      const taskRef = doc(db, 'tasks', taskId);
      const taskData = {
        ...task,
        id: taskId,
        familyId,
        createdAt: task.createdAt ? Timestamp.fromDate(new Date(task.createdAt)) : Timestamp.now(),
        updatedAt: Timestamp.now(),
        editedAt: task.editedAt ? Timestamp.fromDate(new Date(task.editedAt)) : null,
        completedAt: task.completedAt ? Timestamp.fromDate(new Date(task.completedAt)) : null
      };

      await setDoc(taskRef, taskData);
      console.log('✅ Tarefa salva com sucesso:', taskId);

      return {
        ...taskData,
        createdAt: taskData.createdAt.toDate(),
        updatedAt: taskData.updatedAt.toDate(),
        editedAt: taskData.editedAt?.toDate?.() || null,
        completedAt: taskData.completedAt?.toDate?.() || null
      } as Task;
    } catch (error) {
      console.error('❌ Erro ao salvar tarefa:', error);
      throw new Error('Não foi possível salvar a tarefa.');
    }
  }

  async getFamilyTasks(familyId: string, userId?: string): Promise<Task[]> {
    try {
      console.log('🔍 Buscando tarefas da família:', familyId);
      const db = this.getFirestore();
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('familyId', '==', familyId));
      const querySnap = await getDocs(q);

      let tasks = querySnap.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
          editedAt: data.editedAt?.toDate?.() || null,
          completedAt: data.completedAt?.toDate?.() || null
        } as Task;
      });

      // Filtrar tarefas privadas
      if (userId) {
        tasks = tasks.filter(t => !t.private || t.createdBy === userId);
      } else {
        tasks = tasks.filter(t => !t.private);
      }

      // Ordenar por data de edição/criação
      tasks.sort((a, b) => {
        const getTime = (date: Date | string | null | undefined) => {
          if (!date) return 0;
          return date instanceof Date ? date.getTime() : new Date(date).getTime();
        };
        const dateA = getTime(a.editedAt || a.createdAt);
        const dateB = getTime(b.editedAt || b.createdAt);
        return dateB - dateA;
      });

      console.log('✅ Tarefas encontradas:', tasks.length);
      return tasks;
    } catch (error) {
      console.error('❌ Erro ao buscar tarefas:', error);
      return [];
    }
  }

  subscribeToFamilyTasks(familyId: string, callback: (tasks: Task[]) => void, userId?: string) {
    // Simular realtime fazendo uma busca imediata
    (async () => {
      const tasks = await this.getFamilyTasks(familyId, userId);
      callback(tasks);
    })();
    return () => {};
  }

  async getFamilyHistory(familyId: string, limit?: number): Promise<any[]> {
    try {
      console.log('🔍 Buscando histórico da família:', familyId);
      const db = this.getFirestore();
      const historyRef = collection(db, 'history');
      const q = query(historyRef, where('familyId', '==', familyId));
      const querySnap = await getDocs(q);

      let items = querySnap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));

      // Ordenar por createdAt desc
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      if (typeof limit === 'number') {
        items = items.slice(0, limit);
      }

      console.log('✅ Itens de histórico encontrados:', items.length);
      return items;
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      return [];
    }
  }

  subscribeToFamilyHistory(familyId: string, callback: (history: any[]) => void, limit?: number) {
    (async () => {
      const history = await this.getFamilyHistory(familyId, limit);
      callback(history);
    })();
    return () => {};
  }

  async addFamilyHistoryItem(familyId: string, item: any): Promise<any> {
    try {
      console.log('💾 Adicionando item ao histórico:', item.type);
      const db = this.getFirestore();
      const historyRef = collection(db, 'history');
      const docRef = doc(historyRef);
      
      const historyItem = {
        id: docRef.id,
        familyId,
        ...item,
        createdAt: item.createdAt ? Timestamp.fromDate(new Date(item.createdAt)) : Timestamp.now()
      };

      await setDoc(docRef, historyItem);
      console.log('✅ Item adicionado ao histórico');

      return {
        ...historyItem,
        createdAt: historyItem.createdAt.toDate()
      };
    } catch (error) {
      console.error('❌ Erro ao adicionar item ao histórico:', error);
      throw new Error('Não foi possível adicionar item ao histórico.');
    }
  }

  async updateMemberRole(familyId: string, memberId: string, newRole: string): Promise<void> {
    try {
      console.log('🔄 Atualizando role do membro:', memberId);
      const db = this.getFirestore();
      const memberRef = doc(db, 'families', familyId, 'members', memberId);
      await updateDoc(memberRef, { role: newRole });
      console.log('✅ Role atualizada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar role:', error);
      throw new Error('Não foi possível atualizar o papel do membro.');
    }
  }

  async updateFamilyName(familyId: string, newName: string): Promise<void> {
    try {
      console.log('🔄 Atualizando nome da família:', newName);
      const db = this.getFirestore();
      const familyRef = doc(db, 'families', familyId);
      await updateDoc(familyRef, { name: newName });
      console.log('✅ Nome da família atualizado');
    } catch (error) {
      console.error('❌ Erro ao atualizar nome da família:', error);
      throw new Error('Não foi possível atualizar o nome da família.');
    }
  }

  async deleteFamilyTask(taskId: string): Promise<void> {
    try {
      console.log('🗑️ Deletando tarefa:', taskId);
      const db = this.getFirestore();
      const taskRef = doc(db, 'tasks', taskId);
      await deleteDoc(taskRef);
      console.log('✅ Tarefa deletada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao deletar tarefa:', error);
      throw new Error('Não foi possível deletar a tarefa.');
    }
  }

  async saveApproval(approval: any): Promise<any> {
    try {
      console.log('💾 Salvando aprovação no Firebase');
      const db = this.getFirestore();
      const approvalsRef = collection(db, 'approvals');
      
      let approvalId = approval.id;
      if (!approvalId) {
        approvalId = doc(approvalsRef).id;
      }

      const approvalRef = doc(db, 'approvals', approvalId);
      const approvalData = {
        ...approval,
        id: approvalId,
        createdAt: approval.createdAt ? Timestamp.fromDate(new Date(approval.createdAt)) : Timestamp.now()
      };

      await setDoc(approvalRef, approvalData);
      console.log('✅ Aprovação salva com sucesso');

      return {
        ...approvalData,
        createdAt: approvalData.createdAt.toDate()
      };
    } catch (error) {
      console.error('❌ Erro ao salvar aprovação:', error);
      throw new Error('Não foi possível salvar a aprovação.');
    }
  }

  async getApprovalsForFamily(familyId: string): Promise<any[]> {
    try {
      console.log('🔍 Buscando aprovações da família:', familyId);
      const db = this.getFirestore();
      const approvalsRef = collection(db, 'approvals');
      const q = query(approvalsRef, where('familyId', '==', familyId));
      const querySnap = await getDocs(q);

      const approvals = querySnap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));

      console.log('✅ Aprovações encontradas:', approvals.length);
      return approvals;
    } catch (error) {
      console.error('❌ Erro ao buscar aprovações:', error);
      return [];
    }
  }
}

export const familyService = new LocalFamilyService();
export default familyService;
