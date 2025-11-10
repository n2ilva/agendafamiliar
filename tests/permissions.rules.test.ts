import fs from 'fs';
import path from 'path';

// Testes focados em permissões de members (role/permissions) e tasks básicas
// Usa o emulador de regras via @firebase/rules-unit-testing

const rulesPath = path.join(process.cwd(), 'firestore.rules');

if (!fs.existsSync(rulesPath)) {
  test.skip('Regras ausentes - pulando suite de permissões', () => {});
} else {
  const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
  let testEnv: any;
  let adminCtx: any;
  let depCtx: any;

  const familyId = 'fam-test';
  const adminId = 'admin-uid';
  const depId = 'dep-uid';

  beforeAll(async () => {
    const rules = fs.readFileSync(rulesPath, 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-permissions',
      firestore: { rules }
    });

    // Criar base: family doc + members (com segurança desabilitada)
    await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
      const db = ctx.firestore();
      await db.collection('families').doc(familyId).set({
        name: 'Fam Test',
        adminId: adminId,
        createdAt: new Date(),
        inviteCode: 'ABC123',
        inviteCodeExpiry: new Date(Date.now() + 3600_000)
      });
      await db.collection('families').doc(familyId).collection('members').doc(adminId).set({
        id: adminId,
        familyId,
        role: 'admin',
        name: 'Admin User',
        joinedAt: new Date()
      });
      await db.collection('families').doc(familyId).collection('members').doc(depId).set({
        id: depId,
        familyId,
        role: 'dependente',
        name: 'Dep User',
        joinedAt: new Date()
      });
    });

    adminCtx = testEnv.authenticatedContext(adminId);
    depCtx = testEnv.authenticatedContext(depId);
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  describe('Atualização de members (role/permissions)', () => {
    test('Admin pode adicionar permissions em dependente', async () => {
      const db = adminCtx.firestore();
      const ref = db.collection('families').doc(familyId).collection('members').doc(depId);
      await expect(assertSucceeds(ref.update({ permissions: { create: true } }))).resolves.toBeUndefined();
    });

    test('Dependente NÃO pode se promover a admin', async () => {
      const db = depCtx.firestore();
      const ref = db.collection('families').doc(familyId).collection('members').doc(depId);
      await expect(assertFails(ref.update({ role: 'admin' }))).resolves.toBeTruthy();
    });

    test('Dependente NÃO pode definir permissions para si', async () => {
      const db = depCtx.firestore();
      const ref = db.collection('families').doc(familyId).collection('members').doc(depId);
      // Tentar alterar uma permissão existente (de true para false)
      await expect(assertFails(ref.update({ permissions: { create: false } }))).resolves.toBeTruthy();
    });

    test('Dependente pode atualizar campo não privilegiado (name)', async () => {
      const db = depCtx.firestore();
      const ref = db.collection('families').doc(familyId).collection('members').doc(depId);
      await expect(assertSucceeds(ref.update({ name: 'Novo Nome' }))).resolves.toBeUndefined();
    });
  });

  describe('Tasks públicas da família', () => {
    const taskId = 'task-123';

    beforeAll(async () => {
      // Garantir que o dependente começa sem permissões explícitas
      await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
        const db = ctx.firestore();
        await db.collection('families').doc(familyId).collection('members').doc(depId).set({
          permissions: {}
        }, { merge: true });
      });
      await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
        const db = ctx.firestore();
        await db.collection('tasks').doc(taskId).set({
          id: taskId,
          title: 'Tarefa Pública',
          userId: adminId,
          createdBy: adminId,
          familyId,
          private: false,
          createdAt: new Date()
        });
      });
    });

    test('Dependente pode ler tarefa pública', async () => {
      const db = depCtx.firestore();
      const ref = db.collection('tasks').doc(taskId);
      await expect(ref.get()).resolves.toBeDefined();
    });

    test('Dependente NÃO pode atualizar tarefa pública', async () => {
      const db = depCtx.firestore();
      const ref = db.collection('tasks').doc(taskId);
      await expect(assertFails(ref.update({ title: 'Editada' }))).resolves.toBeTruthy();
    });

    test('Dependente NÃO pode criar tarefa pública sem permissão create', async () => {
      const db = depCtx.firestore();
      const ref = db.collection('tasks').doc('task-no-perm');
      await expect(assertFails(ref.set({
        id: 'task-no-perm',
        title: 'Sem Permissão',
        userId: depId,
        createdBy: depId,
        createdByName: 'Dep',
        familyId,
        private: false,
        createdAt: new Date()
      }))).resolves.toBeTruthy();
    });

    test('Admin pode atualizar tarefa pública', async () => {
      const db = adminCtx.firestore();
      const ref = db.collection('tasks').doc(taskId);
      await expect(assertSucceeds(ref.update({ title: 'Nova Título Admin' }))).resolves.toBeUndefined();
    });

    test('Dependente COM permissão create pode criar tarefa pública', async () => {
      // Conceder permissão create ao dependente
      await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
        const db = ctx.firestore();
        await db.collection('families').doc(familyId).collection('members').doc(depId).set({
          permissions: { create: true }
        }, { merge: true });
      });
      const db = depCtx.firestore();
      const ref = db.collection('tasks').doc('task-new');
      await expect(assertSucceeds(ref.set({
        id: 'task-new',
        title: 'Nova Pública',
        userId: depId,
        createdBy: depId,
        createdByName: 'Dep',
        familyId,
        private: false,
        createdAt: new Date()
      }))).resolves.toBeUndefined();
    });

    test('Dependente COM permissão edit pode atualizar tarefa pública', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
        const db = ctx.firestore();
        await db.collection('families').doc(familyId).collection('members').doc(depId).set({
          permissions: { create: true, edit: true }
        }, { merge: true });
      });
      const db = depCtx.firestore();
      const ref = db.collection('tasks').doc(taskId);
      await expect(assertSucceeds(ref.update({ title: 'Edit Dep' }))).resolves.toBeUndefined();
    });

    test('Dependente COM permissão delete pode deletar tarefa pública', async () => {
      // Garantir permissão delete
      await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
        const db = ctx.firestore();
        await db.collection('families').doc(familyId).collection('members').doc(depId).set({
          permissions: { create: true, edit: true, delete: true }
        }, { merge: true });
      });
      const db = depCtx.firestore();
      const ref = db.collection('tasks').doc(taskId);
      await expect(assertSucceeds(ref.delete())).resolves.toBeUndefined();
    });

    test('Dependente NÃO pode deletar tarefa pública sem permissão delete', async () => {
      // Reset permissões para retirar delete
      await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
        const db = ctx.firestore();
        await db.collection('families').doc(familyId).collection('members').doc(depId).set({
          permissions: { create: true, edit: true, delete: false } // remove delete explicitamente
        }, { merge: true });
      });
      const db = depCtx.firestore();
      // Recriar tarefa se foi deletada
      await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
        const db2 = ctx.firestore();
        await db2.collection('tasks').doc(taskId).set({
          id: taskId,
          title: 'Tarefa Pública',
          userId: adminId,
          createdBy: adminId,
          createdByName: 'Adm',
          familyId,
          private: false,
          createdAt: new Date()
        });
      });
      const ref = db.collection('tasks').doc(taskId);
      await expect(assertFails(ref.delete())).resolves.toBeTruthy();
    });
  });
}
