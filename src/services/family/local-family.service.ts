import { Family, FamilyUser, Task } from '../../types/family.types';
import { firebaseFirestore, firebaseAuth } from '../../config/firebase.config';
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

  async requestAdminRole(familyId: string, requester: FamilyUser): Promise<string> {
    const db = this.getFirestore();
    const approvalsRef = collection(db, 'approvals');
    const docRef = doc(approvalsRef);
    const approval = {
      id: docRef.id,
      type: 'admin_role_request',
      familyId,
      requesterId: requester.id,
      requesterName: requester.name,
      status: 'pendente',
      requestedAt: Timestamp.now(),
    } as any;
    await setDoc(docRef, approval);
    return docRef.id;
  }

  async resolveAdminRoleRequest(familyId: string, approvalId: string, approve: boolean, adminId: string, adminComment?: string): Promise<void> {
    const db = this.getFirestore();
    const approvalRef = doc(db, 'approvals', approvalId);
    const approvalSnap = await getDoc(approvalRef);
    if (!approvalSnap.exists()) throw new Error('Solicitação não encontrada');
    const data = approvalSnap.data() as any;
    if (data.type !== 'admin_role_request' || data.familyId !== familyId) throw new Error('Solicitação inválida');

    const updates: any = {
      status: approve ? 'aprovada' : 'rejeitada',
      resolvedAt: Timestamp.now(),
      adminId,
      adminComment: adminComment || null,
    };
    await updateDoc(approvalRef, updates);

    if (approve) {
      // Promover requester a admin
      const memberRef = doc(db, 'families', familyId, 'members', data.requesterId);
      await updateDoc(memberRef, { role: 'admin' });
    }
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

      // Criar mapeamento público inviteCodes -> família para lookup sem listar families
      const inviteMapRef = doc(db, 'inviteCodes', inviteCode);
      await setDoc(inviteMapRef, {
        code: inviteCode,
        familyId: familyId,
        createdAt: Timestamp.fromDate(now),
        expiry: Timestamp.fromDate(expiry)
      });

      // Adicionar admin como membro
      const memberRef = doc(db, `families/${familyId}/members`, adminUser.id);
      await setDoc(memberRef, {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: 'admin',
        familyId: familyId,
        joinedAt: Timestamp.fromDate(now),

      });

      console.log('✅ Admin adicionado como membro da família');

      family.members = [{
        ...adminUser,
        role: 'admin',
        familyId: familyId,
        joinedAt: now
      }];

      // Garantir publicação do código no índice público
      try { await this.ensureInviteCodeMapping(familyId); } catch { /* noop */ }
      return family;
    } catch (error) {
      console.error('❌ Erro ao criar família no Firebase:', error);
      throw new Error('Não foi possível criar a família. Verifique sua conexão com a internet.');
    }
  }

  async getFamilyById(familyId: string): Promise<Family | null> {
    try {

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
      // Tentar repopular mapping se admin abrir a família (maior chance de possuir permissão)
      try { await this.ensureInviteCodeMapping(familyId); } catch { /* noop */ }
      return family;
    } catch (error) {
      console.error('❌ Erro ao buscar família:', error);
      throw new Error('Não foi possível buscar a família. Verifique sua conexão.');
    }
  }

  /**
   * Assina as mudanças dos membros da família em tempo real e retorna um unsubscribe.
   * Os dados dos membros já estão completos na subcoleção /families/{familyId}/members.
   */
  subscribeToFamilyMembers(
    familyId: string,
    callback: (members: FamilyUser[]) => void
  ): () => void {
    const db = this.getFirestore();
    const membersRef = collection(db, 'families', familyId, 'members');
    // Usar onSnapshot para atualizações em tempo real
    // @ts-ignore - import onSnapshot dinamicamente para evitar conflitos de bundling quando não disponível
    const { onSnapshot } = require('firebase/firestore');
    const unsub = onSnapshot(membersRef, async (snap: any) => {
      try {
        const members = snap.docs.map((d: any) => ({
          ...d.data(),
          joinedAt: d.data().joinedAt?.toDate?.() || new Date(d.data().joinedAt),
        }));
        callback(members as FamilyUser[]);
      } catch (e) {
        console.warn('[subscribeToFamilyMembers] Falha ao processar membros:', e);
      }
    }, (err: any) => {
      // Erros de permissão são esperados se o usuário ainda não é membro ou perdeu acesso
      if (err?.code === 'permission-denied') {
        console.log('[subscribeToFamilyMembers] Permissão negada - usuário não é membro ou acesso revogado (esperado)');
        callback([]); // Retorna lista vazia em vez de deixar o listener quebrado
      } else {
        console.warn('[subscribeToFamilyMembers] onSnapshot error:', err);
      }
    });
    return unsub;
  }

  // Cache para getUserFamily (evita múltiplas chamadas duplicadas)
  private userFamilyCache: Map<string, { family: Family | null; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 segundos

  async getUserFamily(userId: string): Promise<Family | null> {
    try {
      const cached = this.userFamilyCache.get(userId);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        console.log('📦 Retornando família do cache para:', userId);
        return cached.family;
      }

      const auth = firebaseAuth() as any;
      if (!auth || !auth.currentUser) {
        console.log('⚠️ getUserFamily: sem usuário autenticado no Firebase, retornando null');
        return null;
      }

      const db = this.getFirestore();

      const membersQuery = query(
        collectionGroup(db, 'members'),
        where('id', '==', userId)
      );

      const memberSnap = await getDocs(membersQuery);

      if (memberSnap.empty) {
        console.log('⚠️ Nenhuma família encontrada por userId, tentando buscar por email...');
        
        const userEmail = auth.currentUser.email;
        if (userEmail) {
          const emailQuery = query(
            collectionGroup(db, 'members'),
            where('email', '==', userEmail)
          );
          
          const emailSnap = await getDocs(emailQuery);
          
          if (!emailSnap.empty) {
            console.log('✅ Família encontrada pelo email:', userEmail);
            const memberDoc = emailSnap.docs[0];
            const memberData = memberDoc.data() as { familyId: string };
            const familyId = memberData.familyId;
            const family = await this.getFamilyById(familyId);
            
            this.userFamilyCache.set(userId, { family, timestamp: Date.now() });
            return family;
          }
        }
        
        console.log('❌ Usuário não pertence a nenhuma família');
        this.userFamilyCache.set(userId, { family: null, timestamp: Date.now() });
        return null;
      }

      const memberDoc = memberSnap.docs[0];
      const memberData = memberDoc.data() as { familyId: string };

      const familyId = memberData.familyId;

      console.log('✅ Família do usuário encontrada:', familyId);
      const family = await this.getFamilyById(familyId);
      
      this.userFamilyCache.set(userId, { family, timestamp: Date.now() });
      
      return family;
    } catch (error) {
      console.error('❌ Erro ao buscar família do usuário:', error);
      throw new Error('Não foi possível buscar a família do usuário.');
    }
  }

  // Método para limpar cache quando necessário
  clearUserFamilyCache(userId?: string) {
    if (userId) {
      this.userFamilyCache.delete(userId);
    } else {
      this.userFamilyCache.clear();
    }
  }

  /**
   * Garante que exista um documento em /inviteCodes/{code} apontando para a família.
   * Útil para famílias criadas antes do índice público ou quando o documento foi removido.
   */
  async ensureInviteCodeMapping(familyId: string): Promise<void> {
    try {
      const db = this.getFirestore();
      const familyRef = doc(db, 'families', familyId);
      const familySnap = await getDoc(familyRef);
      if (!familySnap.exists()) {
        console.warn('[ensureInviteCodeMapping] Família não encontrada:', familyId);
        return;
      }

      const familyData = familySnap.data() as any;
      let code: string | undefined = familyData?.inviteCode;
      let expiry: Date | undefined = familyData?.inviteCodeExpiry?.toDate?.() || (familyData?.inviteCodeExpiry ? new Date(familyData.inviteCodeExpiry) : undefined);

      // Se não houver código, gerar e atualizar na família
      if (!code) {
        code = this.generateInviteCode();
        expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await updateDoc(familyRef, {
          inviteCode: code,
          inviteCodeExpiry: Timestamp.fromDate(expiry)
        });
      }

      const inviteMapRef = doc(db, 'inviteCodes', (code as string).trim().toUpperCase());
      const inviteMapSnap = await getDoc(inviteMapRef);

      const now = new Date();
      // Se o expiry da família estiver ausente ou expirado, estender para +24h
      let finalExpiry = expiry;
      if (!finalExpiry || finalExpiry < now) {
        finalExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        await updateDoc(familyRef, { inviteCodeExpiry: Timestamp.fromDate(finalExpiry) });
      }

      if (!inviteMapSnap.exists()) {
        await setDoc(inviteMapRef, {
          code: code,
          familyId: familyId,
          createdAt: Timestamp.fromDate(now),
          expiry: Timestamp.fromDate(finalExpiry)
        });
        console.log('✅ [ensureInviteCodeMapping] Mapeamento criado para código:', code);
      } else {
        const data = inviteMapSnap.data() as any;
        // Corrigir inconsistências (familyId diferente ou expirado): atualizar
        const mapExpiry = data?.expiry?.toDate?.() || (data?.expiry ? new Date(data.expiry) : undefined);
        if (data.familyId !== familyId || (mapExpiry && mapExpiry < now)) {
          await setDoc(inviteMapRef, {
            code: code,
            familyId: familyId,
            createdAt: Timestamp.fromDate(now),
            expiry: Timestamp.fromDate(finalExpiry)
          });
          console.log('🔄 [ensureInviteCodeMapping] Mapeamento atualizado para código:', code);
        }
      }
    } catch (error) {
      console.warn('⚠️ [ensureInviteCodeMapping] Falha ao garantir mapeamento:', error);
    }
  }

  async joinFamily(inviteCode: string, user: FamilyUser): Promise<Family> {
    try {



      const db = this.getFirestore();
      const searchCode = inviteCode.trim().toUpperCase();


      // Buscar mapeamento do código em inviteCodes/{code}
      const inviteMapRef = doc(db, 'inviteCodes', searchCode);
      const inviteSnap = await getDoc(inviteMapRef);
      if (!inviteSnap.exists()) {
        console.error('❌ Código não encontrado no índice público');
        throw new Error('Código de convite inválido ou família não encontrada');
      }
      const inviteData = inviteSnap.data() as { familyId: string; expiry?: any };
      const familyId = inviteData.familyId;
      console.log('✅ Código aponta para família:', familyId);

      // Verificar expiração no mapeamento
      if (inviteData.expiry) {
        const expiry = inviteData.expiry.toDate?.() || new Date(inviteData.expiry);

        if (Date.now() > expiry.getTime()) {
          console.error('⏰ Código expirado!');
          throw new Error('Código de convite expirado');
        }
      }

      // Verificar se o usuário já é membro
      const existingMemberRef = doc(db, 'families', familyId, 'members', user.id);
      const existingMemberSnap = await getDoc(existingMemberRef);

      if (existingMemberSnap.exists()) {
        console.log('ℹ️ Usuário já é membro desta família');
        return this.getFamilyById(familyId) as Promise<Family>;
      }

      // Adicionar membro na subcoleção
      console.log('➕ Adicionando usuário como membro...');
      const memberRef = doc(db, 'families', familyId, 'members', user.id);
      await setDoc(memberRef, {
        ...user,
        role: 'dependente',
        familyId: familyId,
        joinedAt: Timestamp.now(),
        // incluir inviteCode para atender a validação nas regras
        inviteCode: searchCode
      });

      console.log('✅ Usuário adicionado à família:', familyId);
      return this.getFamilyById(familyId) as Promise<Family>;
    } catch (error) {
      console.error('❌ Erro ao entrar na família:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao entrar na família. Verifique sua conexão.');
    }
  }

  // Helper para remover undefined recursivamente (Firebase não aceita undefined)
  private deepSanitize(obj: any): any {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (typeof obj !== 'object') return obj;
    if (obj instanceof Date) return obj;
    if (obj instanceof Timestamp) return obj;

    if (Array.isArray(obj)) {
      return obj.map(v => this.deepSanitize(v)).filter(v => v !== undefined);
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        sanitized[key] = this.deepSanitize(value);
      }
    }
    return sanitized;
  }

  async saveFamilyTask(task: Task, familyId: string): Promise<Task> {
    try {

      const db = this.getFirestore();
      const tasksRef = collection(db, 'tasks');

      let taskId = task.id;
      if (!taskId || taskId.startsWith('temp')) {
        taskId = doc(tasksRef).id;
      }

      const taskRef = doc(db, 'tasks', taskId);

      // Preparar dados com timestamps convertidos
      const rawData = {
        ...task,
        id: taskId,
        familyId,
        createdAt: task.createdAt ? Timestamp.fromDate(new Date(task.createdAt)) : Timestamp.now(),
        updatedAt: Timestamp.now(),
        editedAt: task.editedAt ? Timestamp.fromDate(new Date(task.editedAt)) : null,
        completedAt: task.completedAt ? Timestamp.fromDate(new Date(task.completedAt)) : null
      };

      // Garantir userId (crítico para regras de segurança)
      if (!rawData.userId) {
        const auth = firebaseAuth();
        if (auth.currentUser) {
          console.warn('⚠️ [saveFamilyTask] userId ausente no payload, usando usuário atual:', auth.currentUser.uid);
          rawData.userId = auth.currentUser.uid;
        } else {
          console.error('❌ [saveFamilyTask] ERRO CRÍTICO: userId ausente e usuário não autenticado');
          throw new Error('userId é obrigatório para salvar tarefa');
        }
      }

      if (!rawData.title) {
        console.error('❌ [saveFamilyTask] ERRO CRÍTICO: title ausente ou vazio');
        throw new Error('Título é obrigatório');
      }

      // Sanitizar dados para remover undefined
      const taskData = this.deepSanitize(rawData);

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

      const db = this.getFirestore();
      const tasksRef = collection(db, 'tasks');

      // Consulta para tarefas públicas da família
      const publicTasksQuery = query(
        tasksRef,
        where('familyId', '==', familyId),
        where('private', '==', false)
      );

      // Executar consulta de tarefas públicas
      const publicTasksSnap = await getDocs(publicTasksQuery);

      const snapshots = [publicTasksSnap];

      if (userId) {
        // Consulta para tarefas privadas do usuário criadas por ele (familyId null)
        const privateTasksQuery = query(
          tasksRef,
          where('familyId', '==', null),
          where('private', '==', true),
          where('createdBy', '==', userId)
        );

        const privateTasksSnap = await getDocs(privateTasksQuery);
        snapshots.push(privateTasksSnap);
      } else {
        console.warn('⚠️ [getFamilyTasks] userId não fornecido. Buscando apenas tarefas públicas da família.');
      }

      const processSnap = (snap: any) => snap.docs.map((doc: any) => {
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

      let tasks = snapshots.flatMap(processSnap);

      // Remover duplicatas caso uma tarefa seja acidentalmente marcada de forma inconsistente
      const uniqueTasks = Array.from(new Map(tasks.map(t => [t.id, t])).values());

      // Ordenar por data de edição/criação
      uniqueTasks.sort((a, b) => {
        const getTime = (date: Date | string | null | undefined) => {
          if (!date) return 0;
          return date instanceof Date ? date.getTime() : new Date(date).getTime();
        };
        const dateA = getTime(a.editedAt || a.createdAt);
        const dateB = getTime(b.editedAt || b.createdAt);
        return dateB - dateA;
      });

      console.log('✅ Tarefas encontradas:', uniqueTasks.length);
      return uniqueTasks;
    } catch (error) {
      console.error('❌ Erro ao buscar tarefas:', error);
      throw new Error('Não foi possível buscar as tarefas da família.');
    }
  }

  subscribeToFamilyTasks(familyId: string, callback: (tasks: Task[]) => void, userId?: string) {
    // Simular realtime fazendo uma busca imediata
    (async () => {
      const tasks = await this.getFamilyTasks(familyId, userId);
      callback(tasks);
    })();
    return () => { };
  }

  async getFamilyHistory(familyId: string, limit?: number): Promise<any[]> {
    try {

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
    return () => { };
  }

  async addFamilyHistoryItem(familyId: string, item: any): Promise<any> {
    try {

      const db = this.getFirestore();
      const historyRef = collection(db, 'history');
      const docRef = doc(historyRef);

      // Remover chaves com valor undefined (Firestore não aceita undefined)
      const sanitize = (obj: Record<string, any>) =>
        Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));

      const base = sanitize({
        id: docRef.id,
        familyId,
        ...item,
      });

      const historyItem = {
        ...base,
        createdAt: item.createdAt ? Timestamp.fromDate(new Date(item.createdAt)) : Timestamp.now()
      } as any;

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

  async updateMemberRole(familyId: string, memberId: string, newRole: string): Promise<Family> {
    try {

      const db = this.getFirestore();
      const memberRef = doc(db, 'families', familyId, 'members', memberId);

      // Preparar payload de atualização
      const updatePayload: any = { role: newRole };

      // Quando promovido a admin: conceder automaticamente todas as permissões
      if (newRole === 'admin') {
        updatePayload.permissions = {
          create: true,
          edit: true,
          delete: true
        };
        console.log('✅ Concedendo todas as permissões ao novo admin:', memberId);
      } else if (newRole === 'dependente') {
        // Quando rebaixado a dependente: limpar permissões (admin vai conceder explicitamente se quiser)
        updatePayload.permissions = {};
        console.log('✅ Limpando permissões ao rebaixar para dependente:', memberId);
      }

      await updateDoc(memberRef, updatePayload);

      // Para múltiplos administradores: não sobrescrever adminId existente (mantém como owner original)
      if (newRole === 'admin') {
        try {
          const familyRef = doc(db, 'families', familyId);
          const famSnap = await getDoc(familyRef);
          if (famSnap.exists()) {
            const currentAdminId = (famSnap.data() as any).adminId;
            if (!currentAdminId) {
              await updateDoc(familyRef, { adminId: memberId });
              console.log('👑 adminId principal definido para:', memberId);
            } else {
              console.log('ℹ️ Mantendo adminId principal existente:', currentAdminId);
            }
          }
        } catch (e) {
          console.warn('⚠️ Falha ao verificar/definir adminId principal (ignorado):', e);
        }
      }

      console.log('✅ Role atualizada com sucesso');
      const updated = await this.getFamilyById(familyId);
      if (!updated) throw new Error('Família não encontrada após atualizar role');
      return updated;
    } catch (error) {
      console.error('❌ Erro ao atualizar role:', error);
      throw new Error('Não foi possível atualizar o papel do membro.');
    }
  }

  async updateMemberPermissions(familyId: string, memberId: string, permissions: { create?: boolean; edit?: boolean; delete?: boolean; }): Promise<void> {
    try {

      const db = this.getFirestore();
      const memberRef = doc(db, 'families', familyId, 'members', memberId);
      // Apenas chaves definidas; remover undefined para não sobrescrever com undefined
      const payload: any = { permissions: {} };
      ['create', 'edit', 'delete'].forEach(k => {
        const val = (permissions as any)[k];
        if (val === true) payload.permissions[k] = true; // só persistimos true; ausência significa false
      });
      // Se nenhum true, salvar objeto vazio (limpa permissões)
      if (Object.keys(payload.permissions).length === 0) {
        payload.permissions = {}; // representará sem permissões
      }
      await updateDoc(memberRef, payload);
      console.log('✅ Permissões atualizadas');
    } catch (error) {
      console.error('❌ Erro ao atualizar permissões:', error);
      throw new Error('Não foi possível atualizar as permissões do membro.');
    }
  }

  /**
   * Atualiza dados básicos de perfil de um membro (nome e/ou picture).
   * Regras Firestore permitem que somente admin atualize qualquer membro;
   * o próprio membro pode atualizar o próprio nome/picture (já que não toca em role/permissions).
   */
  async updateMemberProfile(familyId: string, memberId: string, data: { name?: string; picture?: string }): Promise<void> {
    try {

      const db = this.getFirestore();
      const memberRef = doc(db, 'families', familyId, 'members', memberId);
      const payload: any = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.picture !== undefined) payload.picture = data.picture;
      if (Object.keys(payload).length === 0) {
        console.log('ℹ️ Nada para atualizar no perfil do membro.');
        return;
      }
      await updateDoc(memberRef, payload);
      console.log('✅ Perfil do membro atualizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil do membro:', error);
      throw new Error('Não foi possível atualizar o perfil do membro.');
    }
  }

  async updateFamilyName(familyId: string, newName: string): Promise<void> {
    try {

      const db = this.getFirestore();
      const familyRef = doc(db, 'families', familyId);
      await updateDoc(familyRef, { name: newName });
      console.log('✅ Nome da família atualizado');
    } catch (error) {
      console.error('❌ Erro ao atualizar nome da família:', error);
      throw new Error('Não foi possível atualizar o nome da família.');
    }
  }

  /**
   * Remove um membro da família (delete em families/{familyId}/members/{memberId}).
   * Regras do Firestore permitem admin remover qualquer membro ou o próprio membro se remover.
   */
  async removeMember(familyId: string, memberId: string): Promise<void> {
    try {

      const db = this.getFirestore();
      const memberRef = doc(db, 'families', familyId, 'members', memberId);
      await deleteDoc(memberRef);
      console.log('✅ Membro removido com sucesso');
    } catch (error) {
      console.error('❌ Erro ao remover membro:', error);
      throw new Error('Não foi possível remover o membro da família.');
    }
  }

  /**
   * Regenera o código de convite de uma família (apenas para administradores via regras).
   * - Gera novo código e define validade para +24h
   * - Atualiza o doc da família
   * - Cria/atualiza o mapping em inviteCodes/{newCode}
   * - Remove o mapping antigo inviteCodes/{oldCode} (se existir)
   * Retorna o objeto Family atualizado.
   */
  async regenerateInviteCode(familyId: string): Promise<Family> {
    const db = this.getFirestore();
    const familyRef = doc(db, 'families', familyId);
    const familySnap = await getDoc(familyRef);
    if (!familySnap.exists()) {
      throw new Error('Família não encontrada');
    }

    const current = familySnap.data() as any;
    const oldCode: string | undefined = current?.inviteCode;
    const newCode = this.generateInviteCode();
    const now = new Date();
    const newExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Atualiza doc da família (regras garantem apenas admin pode)
    await updateDoc(familyRef, {
      inviteCode: newCode,
      inviteCodeExpiry: Timestamp.fromDate(newExpiry)
    });

    // Cria/atualiza mapping do novo código
    const newMapRef = doc(db, 'inviteCodes', newCode);
    await setDoc(newMapRef, {
      code: newCode,
      familyId: familyId,
      createdAt: Timestamp.fromDate(now),
      expiry: Timestamp.fromDate(newExpiry)
    });

    // Remove mapping antigo (se existia)
    if (oldCode) {
      try {
        const oldMapRef = doc(db, 'inviteCodes', oldCode);
        const oldSnap = await getDoc(oldMapRef);
        if (oldSnap.exists()) {
          await deleteDoc(oldMapRef);
        }
      } catch (e) {
        console.warn('[regenerateInviteCode] Falha ao remover mapping antigo:', e);
      }
    }

    // Retornar família atualizada via getFamilyById (para resolver datas)
    const updated = await this.getFamilyById(familyId);
    if (!updated) throw new Error('Falha ao carregar família atualizada');
    return updated;
  }

  async deleteFamilyTask(taskId: string): Promise<void> {
    try {

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

  // ===== MÉTODOS PARA GERENCIAR CATEGORIAS DA FAMÍLIA =====

  async saveFamilyCategories(familyId: string, categories: any[]): Promise<void> {
    try {
      console.log('💾 Salvando categorias da família:', familyId);
      const db = this.getFirestore();
      const familyRef = doc(db, 'families', familyId);

      // Converter datas para Timestamp
      const categoriesToSave = categories.map(cat => ({
        ...cat,
        createdAt: cat.createdAt ? Timestamp.fromDate(new Date(cat.createdAt)) : Timestamp.now()
      }));

      await updateDoc(familyRef, {
        categories: categoriesToSave
      });

      console.log('✅ Categorias salvas com sucesso');
    } catch (error) {
      console.error('❌ Erro ao salvar categorias:', error);
      throw new Error('Não foi possível salvar as categorias.');
    }
  }

  async getFamilyCategories(familyId: string): Promise<any[]> {
    try {
      console.log('🔍 Buscando categorias da família:', familyId);
      const db = this.getFirestore();
      const familyRef = doc(db, 'families', familyId);
      const familySnap = await getDoc(familyRef);

      if (!familySnap.exists()) {
        console.log('⚠️ Família não encontrada');
        return [];
      }

      const familyData = familySnap.data();
      const categories = familyData.categories || [];

      // Converter Timestamps para Date
      const convertedCategories = categories.map((cat: any) => ({
        ...cat,
        createdAt: cat.createdAt?.toDate?.() || new Date(cat.createdAt || Date.now())
      }));

      console.log('✅ Categorias encontradas:', convertedCategories.length);
      return convertedCategories;
    } catch (error) {
      console.error('❌ Erro ao buscar categorias:', error);
      return [];
    }
  }

  subscribeToFamilyCategories(familyId: string, callback: (categories: any[]) => void) {
    try {
      console.log('👂 Inscrevendo-se em atualizações de categorias da família:', familyId);
      const db = this.getFirestore();
      const familyRef = doc(db, 'families', familyId);

      const { onSnapshot } = require('firebase/firestore');

      const unsubscribe = onSnapshot(familyRef, (snapshot: any) => {
        if (snapshot.exists()) {
          const familyData = snapshot.data();
          const categories = familyData.categories || [];

          // Converter Timestamps para Date
          const convertedCategories = categories.map((cat: any) => ({
            ...cat,
            createdAt: cat.createdAt?.toDate?.() || new Date(cat.createdAt || Date.now())
          }));

          console.log('🔔 Categorias atualizadas:', convertedCategories.length);
          callback(convertedCategories);
        } else {
          callback([]);
        }
      }, (error: any) => {
        console.error('❌ Erro na inscrição de categorias:', error);
        callback([]);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Erro ao inscrever-se em categorias:', error);
      return () => { }; // noop unsubscribe
    }
  }
}

export const familyService = new LocalFamilyService();
export default familyService;
