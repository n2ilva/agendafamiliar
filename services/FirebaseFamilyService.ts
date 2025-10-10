import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  deleteDoc,
  addDoc,
  orderBy,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Family, FamilyUser, FamilyInvite, Task } from '../types/FamilyTypes';

// Interface para histórico da família
interface FamilyHistoryItem {
  id: string;
  action: 'created' | 'completed' | 'uncompleted' | 'edited' | 'deleted' | 'approval_requested' | 'approved' | 'rejected';
  taskTitle: string;
  taskId: string;
  timestamp: Date;
  details?: string;
  userId: string;
  userName: string;
  userRole?: string;
  familyId: string;
}

class FirebaseFamilyService {
  private familiesCollection = 'families';
  private invitesCollection = 'family_invites';
  private usersCollection = 'users';
  private tasksCollection = 'family_tasks';
  private historyCollection = 'family_history';

  // Remove chaves com valor undefined de objetos/arrays (recursivo)
  private sanitizeForFirestore<T = any>(value: T): T {
    if (value === null || value === undefined) {
      return value as any;
    }
    if (Array.isArray(value)) {
      return (value
        .map((v) => this.sanitizeForFirestore(v))
        .filter((v) => v !== undefined)) as any;
    }
    if (typeof value === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(value as any)) {
        if (v === undefined) continue;
        out[k] = this.sanitizeForFirestore(v as any);
      }
      return out;
    }
    return value;
  }

  // Gerar código único para a família (6 dígitos)
  private generateFamilyCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Converter dados do Firebase para objetos locais
  private convertFirebaseFamily(doc: any): Family {
    const data = doc.data() || {};

    // Defensive defaults
    const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function'
      ? data.createdAt.toDate()
      : (data.createdAt instanceof Date ? data.createdAt : new Date());

    const inviteCodeExpiry = data.inviteCodeExpiry && typeof data.inviteCodeExpiry.toDate === 'function'
      ? data.inviteCodeExpiry.toDate()
      : (data.inviteCodeExpiry instanceof Date ? data.inviteCodeExpiry : undefined);

    const rawMembers = Array.isArray(data.members) ? data.members : [];

    const members = rawMembers.map((member: any) => ({
      ...member,
      joinedAt: member && member.joinedAt && typeof member.joinedAt.toDate === 'function'
        ? member.joinedAt.toDate()
        : (member && member.joinedAt instanceof Date ? member.joinedAt : new Date()),
    }));

    return {
      ...data,
      id: doc.id,
      createdAt,
      inviteCodeExpiry,
      members,
    } as Family;
  }

  // Criar nova família
  async createFamily(familyName: string, adminUser: FamilyUser): Promise<Family> {
    try {
      const familyId = doc(collection(db, this.familiesCollection)).id;
      const inviteCode = this.generateFamilyCode();
      const inviteCodeExpiry = new Date();
      inviteCodeExpiry.setDate(inviteCodeExpiry.getDate() + 30); // Expira em 30 dias

      const newFamily: Family = {
        id: familyId,
        name: familyName,
        adminId: adminUser.id,
        members: [{
          ...adminUser,
          role: 'admin',
          familyId: familyId,
          joinedAt: new Date(),
        }],
        createdAt: new Date(),
        inviteCode,
        inviteCodeExpiry,
      };

      // Converter datas para Timestamp do Firebase
      const familyData = this.sanitizeForFirestore({
        ...newFamily,
        createdAt: Timestamp.fromDate(newFamily.createdAt),
        inviteCodeExpiry: Timestamp.fromDate(inviteCodeExpiry),
        members: newFamily.members.map(member => this.sanitizeForFirestore({
          ...member,
          joinedAt: Timestamp.fromDate(member.joinedAt),
        })),
      });

      await setDoc(doc(db, this.familiesCollection, familyId), familyData);

      // Atualizar o usuário com o familyId
      await this.updateUserFamilyId(adminUser.id, familyId);

      console.log('🏠 Família criada com sucesso:', familyName, 'Código:', inviteCode);
      return newFamily;
    } catch (error) {
      console.error('❌ Erro ao criar família:', error);
      throw new Error('Não foi possível criar a família');
    }
  }

  // Buscar família pelo código de convite
  async getFamilyByInviteCode(inviteCode: string): Promise<Family | null> {
    try {
      const q = query(
        collection(db, this.familiesCollection),
        where('inviteCode', '==', inviteCode.toUpperCase())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const familyDoc = querySnapshot.docs[0];
      const family = this.convertFirebaseFamily(familyDoc);

      // Verificar se o código ainda é válido
      if (family.inviteCodeExpiry && family.inviteCodeExpiry < new Date()) {
        throw new Error('Código de convite expirado');
      }

      return family;
    } catch (error) {
      console.error('❌ Erro ao buscar família por código:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Não foi possível encontrar a família');
    }
  }

  // Buscar família pelo ID
  async getFamilyById(familyId: string): Promise<Family | null> {
    try {
      const familyDoc = await getDoc(doc(db, this.familiesCollection, familyId));
      
      if (!familyDoc.exists()) {
        return null;
      }

      return this.convertFirebaseFamily(familyDoc);
    } catch (error) {
      console.error('❌ Erro ao buscar família por ID:', error);
      throw new Error('Não foi possível carregar a família');
    }
  }

  // Buscar família do usuário
  async getUserFamily(userId: string): Promise<Family | null> {
    try {
      console.log('🔍 Buscando família para userId:', userId);
      
      // Primeira tentativa: buscar através da coleção de usuários
      const userDoc = await getDoc(doc(db, this.usersCollection, userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('👤 Dados do usuário encontrados:', userData);
        
        if (userData.familyId) {
          console.log('🏠 Buscando família pelo ID:', userData.familyId);
          const familyDoc = await getDoc(doc(db, this.familiesCollection, userData.familyId));
          
          if (familyDoc.exists()) {
            const family = this.convertFirebaseFamily(familyDoc);
            console.log('✅ Família encontrada pelo familyId:', family.name);
            return family;
          }
        }
      }
      
      // Segunda tentativa: buscar todas as famílias e verificar membros
      console.log('🔄 Buscando família através dos membros...');
      const familiesSnapshot = await getDocs(collection(db, this.familiesCollection));
      
      for (const familyDoc of familiesSnapshot.docs) {
        const family = this.convertFirebaseFamily(familyDoc);
        const isMember = family.members.some(member => member.id === userId);
        
        if (isMember) {
          console.log('✅ Família encontrada através dos membros:', family.name);
          return family;
        }
      }

      console.log('❌ Nenhuma família encontrada para o usuário');
      return null;
    } catch (error) {
      // Log detalhado do erro original para diagnóstico
      console.error('❌ Erro ao buscar família do usuário:', {
        userId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      // Re-throw com a mensagem original acoplada para manter o rastreio
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Não foi possível carregar sua família: ${msg}`);
    }
  }

  // Adicionar membro à família
  async joinFamily(inviteCode: string, user: FamilyUser): Promise<Family> {
    try {
      const family = await this.getFamilyByInviteCode(inviteCode);
      
      if (!family) {
        throw new Error('Código de família inválido');
      }

      // Verificar se o usuário já é membro
      const isAlreadyMember = family.members.some(member => member.id === user.id);
      if (isAlreadyMember) {
        throw new Error('Você já é membro desta família');
      }

      // Adicionar usuário como dependente
      const newMember: FamilyUser = {
        ...user,
        role: 'dependente',
        familyId: family.id,
        joinedAt: new Date(),
      };

      const memberData = this.sanitizeForFirestore({
        ...newMember,
        joinedAt: Timestamp.fromDate(newMember.joinedAt),
      });

      await updateDoc(doc(db, this.familiesCollection, family.id), {
        members: arrayUnion(memberData)
      });

      // Atualizar o usuário com o familyId
      await this.updateUserFamilyId(user.id, family.id);

      console.log('👥 Usuário adicionado à família:', family.name);
      
      // Retornar família atualizada
      const updatedFamily = await this.getFamilyById(family.id);
      return updatedFamily!;
    } catch (error) {
      console.error('❌ Erro ao entrar na família:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Não foi possível entrar na família');
    }
  }

  // Remover membro da família
  async removeFamilyMember(familyId: string, userId: string): Promise<void> {
    try {
      const family = await this.getFamilyById(familyId);
      if (!family) {
        throw new Error('Família não encontrada');
      }

      const memberToRemove = family.members.find(member => member.id === userId);
      if (!memberToRemove) {
        throw new Error('Usuário não é membro desta família');
      }

      if (memberToRemove.role === 'admin') {
        throw new Error('Não é possível remover o administrador da família');
      }

      const memberData = {
        ...memberToRemove,
        joinedAt: Timestamp.fromDate(memberToRemove.joinedAt),
      };

      await updateDoc(doc(db, this.familiesCollection, familyId), {
        members: arrayRemove(memberData)
      });

      // Remover familyId do usuário
      await this.updateUserFamilyId(userId, null);

      console.log('👋 Usuário removido da família');
    } catch (error) {
      console.error('❌ Erro ao remover membro:', error);
      throw new Error('Não foi possível remover o membro da família');
    }
  }

  // Atualizar familyId do usuário
  private async updateUserFamilyId(userId: string, familyId: string | null): Promise<void> {
    try {
      const userRef = doc(db, this.usersCollection, userId);
      await updateDoc(userRef, {
        familyId: familyId
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar familyId do usuário:', error);
      // Não propagar erro pois é operação secundária
    }
  }

  // Regenerar código de convite
  async regenerateInviteCode(familyId: string): Promise<string> {
    try {
      const newCode = this.generateFamilyCode();
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);

      await updateDoc(doc(db, this.familiesCollection, familyId), {
        inviteCode: newCode,
        inviteCodeExpiry: Timestamp.fromDate(newExpiry),
      });

      console.log('🔄 Código de convite regenerado:', newCode);
      return newCode;
    } catch (error) {
      console.error('❌ Erro ao regenerar código:', error);
      throw new Error('Não foi possível regenerar o código');
    }
  }

  // Atualizar nome da família
  async updateFamilyName(familyId: string, newName: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.familiesCollection, familyId), {
        name: newName
      });
      console.log('✅ Nome da família atualizado:', newName);
    } catch (error) {
      console.error('❌ Erro ao atualizar nome da família:', error);
      throw new Error('Não foi possível atualizar o nome da família');
    }
  }

  // Atualizar função de um membro da família
  async updateMemberRole(familyId: string, memberId: string, newRole: 'admin' | 'dependente'): Promise<void> {
    try {
      // Buscar a família atual
      const familyDoc = await getDoc(doc(db, this.familiesCollection, familyId));
      if (!familyDoc.exists()) {
        throw new Error('Família não encontrada');
      }

      const familyData = familyDoc.data() as any;
      const members = familyData.members || [];

      // Atualizar o role do membro específico
      const updatedMembers = members.map((member: any) => 
        member.id === memberId ? { ...member, role: newRole } : member
      );

      // Atualizar documento da família
      await updateDoc(doc(db, this.familiesCollection, familyId), {
        members: updatedMembers
      });

      // Atualizar também o documento do usuário
      await updateDoc(doc(db, this.usersCollection, memberId), {
        role: newRole
      });

      console.log(`✅ Função do membro ${memberId} atualizada para ${newRole}`);
    } catch (error) {
      console.error('❌ Erro ao atualizar função do membro:', error);
      throw new Error('Não foi possível atualizar a função do membro');
    }
  }

  // Deletar família (apenas admin)
  async deleteFamily(familyId: string, adminId: string): Promise<void> {
    try {
      const family = await this.getFamilyById(familyId);
      if (!family) {
        throw new Error('Família não encontrada');
      }

      if (family.adminId !== adminId) {
        throw new Error('Apenas o administrador pode deletar a família');
      }

      // Remover familyId de todos os membros
      for (const member of family.members) {
        await this.updateUserFamilyId(member.id, null);
      }

      await deleteDoc(doc(db, this.familiesCollection, familyId));
      console.log('🗑️ Família deletada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao deletar família:', error);
      throw new Error('Não foi possível deletar a família');
    }
  }

  // ==================== MÉTODOS PARA TAREFAS DA FAMÍLIA ====================

  // Converter dados do Firebase para objetos locais
  private convertFirebaseTask(doc: any): Task {
    const data = doc.data() || {};
    if (!data) {
      console.warn('⚠️ convertFirebaseTask recebeu documento sem dados:', doc.id);
    }
    console.log('🔍 Dados brutos do Firebase para tarefa:', {
      id: doc.id,
      title: data.title,
      rawDueDate: data.dueDate,
      rawDueTime: data.dueTime,
      dueDateType: typeof data.dueDate,
      dueTimeType: typeof data.dueTime
    });
    
    // Função auxiliar para converter timestamp de forma segura
    const safeTimestampToDate = (timestamp: any): Date | undefined => {
      if (!timestamp) return undefined;
      // Firestore Timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        try {
          return timestamp.toDate();
        } catch (error) {
          console.warn('Erro ao converter Timestamp:', error);
          return undefined;
        }
      }
      // Objeto simples { seconds, nanoseconds }
      if (
        typeof timestamp === 'object' &&
        timestamp !== null &&
        'seconds' in timestamp &&
        typeof (timestamp as any).seconds === 'number'
      ) {
        try {
          const seconds = (timestamp as any).seconds as number;
          const nanos = typeof (timestamp as any).nanoseconds === 'number' ? (timestamp as any).nanoseconds : 0;
          return new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
        } catch (error) {
          console.warn('Erro ao converter objeto seconds/nanoseconds:', error);
          return undefined;
        }
      }
      // Date nativa
      if (timestamp instanceof Date) return isNaN(timestamp.getTime()) ? undefined : timestamp;
      // String/Number
      if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        try {
          const date = new Date(timestamp);
          return isNaN(date.getTime()) ? undefined : date;
        } catch {
          return undefined;
        }
      }
      return undefined;
    };

    const convertedDueDate = safeTimestampToDate(data.dueDate);
    const convertedDueTime = safeTimestampToDate(data.dueTime);
    
    console.log('✅ Datas convertidas do Firebase:', {
      id: doc.id,
      title: data.title,
      convertedDueDate: convertedDueDate,
      convertedDueTime: convertedDueTime
    });

    return {
      ...data,
      id: doc.id,
      createdAt: safeTimestampToDate(data.createdAt) || new Date(),
      updatedAt: safeTimestampToDate(data.updatedAt) || new Date(),
      completedAt: safeTimestampToDate(data.completedAt),
      dueDate: convertedDueDate,
      dueTime: convertedDueTime,
      repeatDays: Array.isArray(data.repeatDays) ? data.repeatDays : undefined,
      editedAt: safeTimestampToDate(data.editedAt),
      // Garantir que a flag 'private' seja retornada como boolean quando presente
      private: data.private === true
    };
  }

  // Salvar tarefa da família
  async saveFamilyTask(task: Task, familyId: string): Promise<Task> {
    try {
        const taskDataRaw: any = {
        ...task,
        familyId,
        createdAt: task.createdAt ? Timestamp.fromDate(task.createdAt) : Timestamp.now(),
        updatedAt: Timestamp.now(),
        completedAt: task.completedAt ? Timestamp.fromDate(task.completedAt) : null,
        dueDate: task.dueDate ? Timestamp.fromDate(task.dueDate) : null,
        dueTime: task.dueTime ? Timestamp.fromDate(task.dueTime) : null,
        repeatDays: Array.isArray((task as any).repeatDays) ? (task as any).repeatDays : undefined,
        // Sempre incluir flag 'private' como booleano (default: false) para normalizar documentos
        private: (task as any).private === true
      };
      const taskData: any = this.sanitizeForFirestore(taskDataRaw);

      // Adicionar campos opcionais apenas se não forem undefined
      if (task.editedAt !== undefined) {
        taskData.editedAt = task.editedAt ? Timestamp.fromDate(task.editedAt) : null;
      }
      
      if (task.approvalId !== undefined) {
        taskData.approvalId = task.approvalId;
      }
      
      if (task.editedBy !== undefined) {
        taskData.editedBy = task.editedBy;
      }
      
      if (task.editedByName !== undefined) {
        taskData.editedByName = task.editedByName;
      }

      // taskData já sanitizado

      if (task.id && task.id !== 'temp' && !task.id.startsWith('temp_')) {
        // Verificar se o documento existe antes de tentar atualizar
        try {
          const docRef = doc(db, this.tasksCollection, task.id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            // Documento existe, pode atualizar
            await updateDoc(docRef, taskData);
            console.log('📝 Tarefa da família atualizada:', task.title);
          } else {
            // Documento não existe, criar novo com o MESMO ID (idempotente)
            console.log('📄 Documento não encontrado, criando nova tarefa com ID fornecido...');
            await setDoc(docRef, taskData);
            console.log('✅ Nova tarefa da família criada (ID preservado):', task.title);
          }
        } catch (updateError) {
          console.log('❌ Erro ao atualizar, tentando criar nova tarefa com ID fornecido...', updateError);
          // Se falhar ao atualizar, criar novo documento com o ID passado
          const docRef = doc(db, this.tasksCollection, task.id);
          await setDoc(docRef, taskData);
          console.log('✅ Nova tarefa da família criada com ID fornecido após erro:', task.title);
        }
      } else {
        // Criar nova tarefa (ID temporário ou inexistente)
        const docRef = await addDoc(collection(db, this.tasksCollection), taskData);
        task.id = docRef.id;
        console.log('✅ Nova tarefa da família criada:', task.title);
      }

      return task;
    } catch (error) {
      console.error('❌ Erro ao salvar tarefa da família:', error);
      throw new Error('Não foi possível salvar a tarefa');
    }
  }

  // Carregar tarefas da família e tarefas privadas do usuário
  // Se userId for informado, retornamos: (tarefas da família que não sejam privadas) + (tarefas privadas criadas pelo usuário)
  async getFamilyTasks(familyId: string, userId?: string): Promise<Task[]> {
    try {
      const tasks: Task[] = [];

      // 1) Buscar tarefas públicas da família (private == false) diretamente no servidor
      // Isso reduz transferência de dados privados de outros membros.
      const familyPublicQ = query(
        collection(db, this.tasksCollection),
        where('familyId', '==', familyId),
        where('private', '==', false),
        orderBy('createdAt', 'desc')
      );

      const familyPublicSnap = await getDocs(familyPublicQ);
      familyPublicSnap.forEach((doc) => {
        tasks.push(this.convertFirebaseTask(doc));
      });

      // Fallback: caso existam documentos antigos sem o campo `private`, eles não
      // serão retornados pela query acima. Para não perder dados, se não houver
      // resultados públicos, tentar buscar todos os documentos da família e logar.
      if (familyPublicSnap.empty) {
        try {
          const familyAllQ = query(
            collection(db, this.tasksCollection),
            where('familyId', '==', familyId),
            orderBy('createdAt', 'desc')
          );
          const familyAllSnap = await getDocs(familyAllQ);
          if (!familyAllSnap.empty) {
            console.warn('⚠️ Fallback: documentos da família sem campo `private` detectados. Considere rodar migração para normalizar `private` as boolean.');
            familyAllSnap.forEach((doc) => {
              const t = this.convertFirebaseTask(doc);
              // Evitar duplicatas
              if (!tasks.some(existing => existing.id === t.id)) tasks.push(t);
            });
          }
        } catch (err) {
          console.error('❌ Fallback ao buscar todos os documentos da família falhou:', err);
        }
      }

      // 2) Se userId informado, buscar tarefas privadas desse usuário (private == true && createdBy == userId)
      if (userId) {
        const privateQ = query(
          collection(db, this.tasksCollection),
          where('createdBy', '==', userId),
          where('private', '==', true)
        );
        const privateSnap = await getDocs(privateQ);
        privateSnap.forEach((doc) => {
          const t = this.convertFirebaseTask(doc);
          // Evitar duplicatas
          if (!tasks.some(existing => existing.id === t.id)) tasks.push(t);
        });
      }

      console.log(`📋 Carregadas ${tasks.length} tarefas (família + privadas do usuário)`);
      // Retornar ordenado por createdAt/editedAt desc
      tasks.sort((a, b) => (b.editedAt || b.createdAt).getTime() - (a.editedAt || a.createdAt).getTime());
      return tasks;
    } catch (error) {
      console.error('❌ Erro ao carregar tarefas da família:', error);
      throw new Error('Não foi possível carregar as tarefas da família');
    }
  }

  // Deletar tarefa da família
  async deleteFamilyTask(taskId: string, familyId: string): Promise<void> {
    try {
      // Verificar se a tarefa pertence à família
      const taskDoc = await getDoc(doc(db, this.tasksCollection, taskId));
      if (!taskDoc.exists()) {
        throw new Error('Tarefa não encontrada');
      }

      const taskData = taskDoc.data();
      if (taskData.familyId !== familyId) {
        throw new Error('Tarefa não pertence a esta família');
      }

      await deleteDoc(doc(db, this.tasksCollection, taskId));
      console.log('🗑️ Tarefa da família deletada');
    } catch (error) {
      console.error('❌ Erro ao deletar tarefa da família:', error);
      throw new Error('Não foi possível deletar a tarefa');
    }
  }

  // Observar mudanças nas tarefas da família em tempo real
  // subscribeToFamilyTasks: escuta tarefas da família e (opcional) tarefas privadas do usuário
  subscribeToFamilyTasks(familyId: string, callback: (tasks: Task[]) => void, userId?: string): () => void {
    const unsubscribes: Array<() => void> = [];

      // Ouvir apenas tarefas públicas da família (server-side filter)
      const familyPublicQ = query(
        collection(db, this.tasksCollection),
        where('familyId', '==', familyId),
        where('private', '==', false),
        orderBy('createdAt', 'desc')
      );

      const familyUnsub = onSnapshot(familyPublicQ, (querySnapshot) => {
      const tasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasks.push(this.convertFirebaseTask(doc));
      });

      // Se não houver userId, apenas retornar as tarefas da família
      if (!userId) {
        console.log(`🔄 Tarefas da família atualizadas em tempo real: ${tasks.length} tarefas`);
        callback(tasks);
        return;
      }

      // Se userId informado, também precisamos agregar as tarefas privadas do usuário
      const privateQ = query(
        collection(db, this.tasksCollection),
        where('createdBy', '==', userId),
        where('private', '==', true)
      );

      getDocs(privateQ).then(privateSnap => {
        privateSnap.forEach((doc) => {
          const t = this.convertFirebaseTask(doc);
          if (!tasks.some(existing => existing.id === t.id)) tasks.push(t);
        });

        console.log(`🔄 Tarefas (família + privadas do usuário) atualizadas: ${tasks.length} tarefas`);
        // ordenar por data
        tasks.sort((a, b) => (b.editedAt || b.createdAt).getTime() - (a.editedAt || a.createdAt).getTime());
        callback(tasks);
      }).catch(err => {
        console.error('❌ Erro ao buscar tarefas privadas do usuário:', err);
        // Mesmo em erro, retornar as tarefas da família
        callback(tasks);
      });
    }, (error) => {
      console.error('❌ Erro ao observar tarefas da família:', error);
    });

    unsubscribes.push(familyUnsub);

    // Se userId informado, criar listener dedicado para tarefas privadas do usuário para atualizações em tempo real
    if (userId) {
      const privateQRealtime = query(
        collection(db, this.tasksCollection),
        where('createdBy', '==', userId),
        where('private', '==', true)
      );

      const privateUnsub = onSnapshot(privateQRealtime, (querySnapshot) => {
        // Quando houver alteração em tarefas privadas do usuário, refazer a leitura da família para agregar
        const tasks: Task[] = [];
        // ler família em paralelo
        // Ler tarefas públicas da família (server-side). Se estiverem faltando
        // resultados (possível presença de documentos antigos sem campo `private`),
        // aplicar fallback semelhante ao do método getFamilyTasks.
        getDocs(familyPublicQ).then(familySnap => {
          familySnap.forEach((doc) => tasks.push(this.convertFirebaseTask(doc)));
          querySnapshot.forEach(doc => {
            const t = this.convertFirebaseTask(doc);
            if (!tasks.some(existing => existing.id === t.id)) tasks.push(t);
          });
          tasks.sort((a, b) => (b.editedAt || b.createdAt).getTime() - (a.editedAt || a.createdAt).getTime());
          callback(tasks);
        }).catch(async err => {
          console.error('❌ Erro ao ler tarefas públicas da família durante atualização de privadas:', err);
          // Fallback: tentar ler todos os documentos da família (compatibilidade com docs antigos)
          try {
            const familyAllQ = query(
              collection(db, this.tasksCollection),
              where('familyId', '==', familyId),
              orderBy('createdAt', 'desc')
            );
            const familyAllSnap = await getDocs(familyAllQ);
            familyAllSnap.forEach((doc) => {
              const t = this.convertFirebaseTask(doc);
              if (!tasks.some(existing => existing.id === t.id)) tasks.push(t);
            });
            // incluir privadas do usuário
            querySnapshot.forEach(doc => {
              const t = this.convertFirebaseTask(doc);
              if (!tasks.some(existing => existing.id === t.id)) tasks.push(t);
            });
            tasks.sort((a, b) => (b.editedAt || b.createdAt).getTime() - (a.editedAt || a.createdAt).getTime());
            callback(tasks);
          } catch (fallbackErr) {
            console.error('❌ Fallback falhou ao ler todos os documentos da família:', fallbackErr);
            // fallback final: retornar apenas privadas do usuário
            const privateTasks: Task[] = [];
            querySnapshot.forEach(doc => privateTasks.push(this.convertFirebaseTask(doc)));
            callback(privateTasks);
          }
        });
      }, (error) => {
        console.error('❌ Erro no listener de tarefas privadas do usuário:', error);
      });

      unsubscribes.push(privateUnsub);
    }

    return () => unsubscribes.forEach(u => u());
  }

  // Sincronizar tarefas locais com tarefas da família
  async syncLocalTasksToFamily(localTasks: Task[], familyId: string): Promise<Task[]> {
    try {
      const batch = writeBatch(db);
      const syncedTasks: Task[] = [];

      for (const task of localTasks) {
          const taskData = this.sanitizeForFirestore({
          ...task,
          familyId,
          createdAt: task.createdAt ? Timestamp.fromDate(task.createdAt) : Timestamp.now(),
          updatedAt: Timestamp.now(),
          completedAt: task.completedAt ? Timestamp.fromDate(task.completedAt) : null,
          dueDate: task.dueDate ? Timestamp.fromDate(task.dueDate) : null,
          dueTime: task.dueTime ? Timestamp.fromDate((task as any).dueTime) : null,
          repeatDays: Array.isArray((task as any).repeatDays) ? (task as any).repeatDays : undefined,
          editedAt: task.editedAt ? Timestamp.fromDate(task.editedAt) : null,
          // Garantir private booleano ao sincronizar
          private: (task as any).private === true
        });

        if (task.id && task.id !== 'temp') {
          // Verificar se a tarefa já existe
          const existingDoc = await getDoc(doc(db, this.tasksCollection, task.id));
          if (existingDoc.exists()) {
            batch.update(doc(db, this.tasksCollection, task.id), taskData);
          } else {
            batch.set(doc(db, this.tasksCollection, task.id), taskData);
          }
        } else {
          // Criar nova tarefa
          const newDocRef = doc(collection(db, this.tasksCollection));
          task.id = newDocRef.id;
          batch.set(newDocRef, taskData);
        }

        syncedTasks.push(task);
      }

      await batch.commit();
      console.log(`🔄 ${syncedTasks.length} tarefas sincronizadas com a família`);
      return syncedTasks;
    } catch (error) {
      console.error('❌ Erro ao sincronizar tarefas com a família:', error);
      throw new Error('Não foi possível sincronizar as tarefas');
    }
  }

  // ==================== MÉTODOS PARA HISTÓRICO DA FAMÍLIA ====================

  // Converter dados do Firebase para objetos locais
  private convertFirebaseHistoryItem(doc: any): FamilyHistoryItem {
    const data = doc.data();
    
    // Verificar se os dados existem
    if (!data) {
      console.warn('⚠️ Documento de histórico sem dados:', doc.id);
      return {
        id: doc.id,
        action: 'created',
        taskTitle: 'Tarefa desconhecida',
        taskId: '',
        timestamp: new Date(),
        details: '',
        userId: '',
        userName: 'Usuário desconhecido',
        userRole: '',
        familyId: ''
      };
    }

    // Converter timestamp de forma segura
    let timestamp: Date;
    try {
      if (data.timestamp && typeof data.timestamp.toDate === 'function') {
        timestamp = data.timestamp.toDate();
      } else if (data.timestamp instanceof Date) {
        timestamp = data.timestamp;
      } else if (typeof data.timestamp === 'number') {
        timestamp = new Date(data.timestamp);
      } else {
        console.warn('⚠️ Timestamp inválido no histórico:', data.timestamp);
        timestamp = new Date();
      }
    } catch (error) {
      console.warn('⚠️ Erro ao converter timestamp:', error);
      timestamp = new Date();
    }

    return {
      id: doc.id,
      action: data.action || 'created',
      taskTitle: data.taskTitle || 'Tarefa desconhecida',
      taskId: data.taskId || '',
      timestamp,
      details: data.details || '',
      userId: data.userId || '',
      userName: data.userName || 'Usuário desconhecido',
      userRole: data.userRole || '',
      familyId: data.familyId || ''
    };
  }

  // Adicionar item ao histórico da família
  async addFamilyHistoryItem(
    familyId: string,
    action: 'created' | 'completed' | 'uncompleted' | 'edited' | 'deleted' | 'approval_requested' | 'approved' | 'rejected',
    taskTitle: string,
    taskId: string,
    userId: string,
    userName: string,
    userRole?: string,
    details?: string
  ): Promise<FamilyHistoryItem> {
    try {
      const historyItem: FamilyHistoryItem = {
        id: '',
        action,
        taskTitle,
        taskId,
        timestamp: new Date(),
        userId,
        userName,
        familyId,
      };

      // Adicionar campos opcionais apenas se não forem undefined
      if (details !== undefined) {
        historyItem.details = details;
      }
      
      if (userRole !== undefined) {
        historyItem.userRole = userRole;
      }

      const historyData = {
        ...historyItem,
        timestamp: Timestamp.fromDate(historyItem.timestamp),
      };

      const docRef = await addDoc(collection(db, this.historyCollection), historyData);
      historyItem.id = docRef.id;

      console.log(`📖 Item adicionado ao histórico da família: ${action} - ${taskTitle}`);
      return historyItem;
    } catch (error) {
      console.error('❌ Erro ao adicionar item ao histórico da família:', error);
      throw new Error('Não foi possível adicionar ao histórico da família');
    }
  }

  // Carregar histórico da família
  async getFamilyHistory(familyId: string, limit: number = 50): Promise<FamilyHistoryItem[]> {
    try {
      // Validar familyId
      if (!familyId || typeof familyId !== 'string' || familyId.trim() === '') {
        console.warn('⚠️ FamilyId inválido para carregar histórico:', familyId);
        return [];
      }

      const q = query(
        collection(db, this.historyCollection),
        where('familyId', '==', familyId),
        orderBy('timestamp', 'desc'),
        ...(limit > 0 ? [] : [])
      );

      const querySnapshot = await getDocs(q);
      const historyItems: FamilyHistoryItem[] = [];

      querySnapshot.forEach((doc) => {
        historyItems.push(this.convertFirebaseHistoryItem(doc));
      });

      // Filtrar apenas os últimos 15 dias
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      
      const filteredHistory = historyItems.filter(item => item.timestamp >= fifteenDaysAgo);

      console.log(`📖 Carregados ${filteredHistory.length} itens do histórico da família`);
      return filteredHistory.slice(0, limit);
    } catch (error) {
      console.error('❌ Erro ao carregar histórico da família:', error);
      // Retornar array vazio ao invés de lançar erro para não quebrar o fluxo
      return [];
    }
  }

  // Observar mudanças no histórico da família em tempo real
  subscribeToFamilyHistory(
    familyId: string, 
    callback: (history: FamilyHistoryItem[]) => void,
    limit: number = 50
  ): () => void {
    // Validar familyId
    if (!familyId || typeof familyId !== 'string' || familyId.trim() === '') {
      console.warn('⚠️ FamilyId inválido para subscribe do histórico:', familyId);
      // Retornar função de cleanup vazia
      return () => {};
    }

    const q = query(
      collection(db, this.historyCollection),
      where('familyId', '==', familyId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const historyItems: FamilyHistoryItem[] = [];
      querySnapshot.forEach((doc) => {
        historyItems.push(this.convertFirebaseHistoryItem(doc));
      });

      // Filtrar apenas os últimos 15 dias
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      
      const filteredHistory = historyItems
        .filter(item => item.timestamp >= fifteenDaysAgo)
        .slice(0, limit);
      
      console.log(`🔄 Histórico da família atualizado em tempo real: ${filteredHistory.length} itens`);
      callback(filteredHistory);
    }, (error) => {
      console.error('❌ Erro ao observar histórico da família:', error);
    });

    return unsubscribe;
  }

  // Limpar histórico antigo da família (automatizado)
  async cleanOldFamilyHistory(familyId: string): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        collection(db, this.historyCollection),
        where('familyId', '==', familyId),
        where('timestamp', '<', Timestamp.fromDate(thirtyDaysAgo))
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      if (!querySnapshot.empty) {
        await batch.commit();
        console.log(`🧹 ${querySnapshot.size} itens antigos removidos do histórico da família`);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar histórico antigo da família:', error);
    }
  }
}

export const familyService = new FirebaseFamilyService();
export default familyService;