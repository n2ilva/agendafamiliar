import fs from 'fs';

// Este teste dependia do emulador e das regras em `firestore.rules` — atualmente é opcional (local-only).
// O projeto foi migrado para modo local-only — quando o arquivo `firestore.rules`
// não estiver presente, pulamos o teste em vez de falhar.
const rulesPath = 'firestore.rules';

if (!fs.existsSync(rulesPath)) {
  // Jest automatically treats a file with no tests as a success. Export a
  // no-op to make intent explicit.
  test.skip('firestore.rules tests skipped because firestore.rules is missing', () => {});
} else {
  // Se o arquivo existir (ex.: em dev que reinstaurou regras), preservar o teste
  // original que usa @firebase/rules-unit-testing.
  // Import dinamicamente para evitar erro quando a dependência não está instalada.
  const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

  let testEnv: any = null;

  beforeAll(async () => {
    const rules = fs.readFileSync(rulesPath, 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-project',
      firestore: { rules }
    });

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

    const alice = testEnv.authenticatedContext('alice-uid');
    const bob = testEnv.authenticatedContext('bob-uid');

    const aliceDb = alice.firestore();
    const taskRef = aliceDb.collection('family_tasks').doc('task-private');
    await taskRef.set({
      title: 'Segredo',
      familyId: 'fam-1',
      createdBy: 'alice-uid',
      createdAt: new Date(),
      private: true
    });

    const bobDb = bob.firestore();
    const bobDoc = bobDb.collection('family_tasks').doc('task-private');
    await expect(bobDoc.get()).rejects.toThrow();
  });
}
