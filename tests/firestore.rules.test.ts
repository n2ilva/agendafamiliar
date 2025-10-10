import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import fs from 'fs';

let testEnv: any = null;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-project',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') }
  });

  // Seed required user docs so security rules that call get(/users/{uid}) succeed
  await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
    const db = ctx.firestore();
    await db.collection('users').doc('alice-uid').set({ familyId: 'fam-1' });
    await db.collection('users').doc('bob-uid').set({ familyId: 'fam-1' });
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

test('private tasks are not readable by other users', async () => {
  if (!testEnv) throw new Error('Test env not initialized');

  // Criar contexto para user A e user B
  const alice = testEnv.authenticatedContext('alice-uid');
  const bob = testEnv.authenticatedContext('bob-uid');

  // Alice cria uma task privada
  const aliceDb = alice.firestore();
  const taskRef = aliceDb.collection('family_tasks').doc('task-private');
  await taskRef.set({
    title: 'Segredo',
    familyId: 'fam-1',
    createdBy: 'alice-uid',
    createdAt: new Date(),
    private: true
  });

  // Bob tenta ler
  const bobDb = bob.firestore();
  const bobDoc = bobDb.collection('family_tasks').doc('task-private');
  await expect(bobDoc.get()).rejects.toThrow();
});
