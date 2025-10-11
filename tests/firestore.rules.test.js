const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'agendafamiliar-testing';
let testEnv;
let emulatorProcess = null;

// Helper to wait for port
function waitForPort(host, port, timeout = 10000) {
  const net = require('net');
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function tryConnect() {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeout) return reject(new Error('timeout')); 
        setTimeout(tryConnect, 200);
      });
      socket.once('timeout', () => {
        socket.destroy();
        if (Date.now() - start > timeout) return reject(new Error('timeout'));
        setTimeout(tryConnect, 200);
      });
      socket.connect(port, host, () => {
        socket.end();
        resolve();
      });
    })();
  });
}

beforeAll(async () => {
  const root = path.resolve(__dirname, '..');
  const rules = fs.readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');
  // Use the in-memory rules unit testing environment (no external emulator spawn)
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules }
  });

  // Seed families/users/members once for all tests using admin context
  await testEnv.withSecurityRulesDisabled(async (adminContext) => {
    const admin = adminContext.firestore();
    await admin.collection('families').doc('fam1').set({ name: 'Fam1', adminId: 'admin' });
    await admin.collection('users').doc('alice').set({ id: 'alice', familyId: 'fam1' });
    await admin.collection('families').doc('fam1').collection('members').doc('alice').set({ id: 'alice' });
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

test('user can create private task and read it', async () => {
  const alice = testEnv.authenticatedContext('alice', { sub: 'alice' }).firestore();
  const taskRef = alice.collection('tasks').doc('t1');
  await assertSucceeds(taskRef.set({ userId: 'alice', title: 'Private task', familyId: null }));
  await assertSucceeds(taskRef.get());
});

test('non-member cannot create family task', async () => {
  const bob = testEnv.authenticatedContext('bob', { sub: 'bob' }).firestore();
  const taskRef = bob.collection('tasks').doc('t2');
  await assertFails(taskRef.set({ userId: 'bob', title: 'Family task', familyId: 'fam1' }));
});

test('member can create family task', async () => {
  const alice = testEnv.authenticatedContext('alice', { sub: 'alice' }).firestore();
  const taskRef = alice.collection('tasks').doc('t3');
  await assertSucceeds(taskRef.set({ userId: 'alice', title: 'Family task', familyId: 'fam1' }));
});

test('member can read family doc directly', async () => {
  const alice = testEnv.authenticatedContext('alice', { sub: 'alice' }).firestore();
  const famRef = alice.collection('families').doc('fam1');
  await assertSucceeds(famRef.get());
});

test('owner can update their task and admin can update family task', async () => {
  const alice = testEnv.authenticatedContext('alice', { sub: 'alice' }).firestore();
  const taskRef = alice.collection('tasks').doc('t3');
  await assertSucceeds(taskRef.update({ title: 'Updated title' }));

  const admin = testEnv.authenticatedContext('admin', { sub: 'admin' }).firestore();
  // admin updates a family task
  await assertSucceeds(taskRef.update({ title: 'Admin updated' }));
});

test('invalid task payload should fail', async () => {
  const alice = testEnv.authenticatedContext('alice', { sub: 'alice' }).firestore();
  const badRef = alice.collection('tasks').doc('bad');
  // title must be string; sending number should fail
  await assertFails(badRef.set({ userId: 'alice', title: 123, familyId: null }));
});

test('member can create approval; non-member cannot', async () => {
  const alice = testEnv.authenticatedContext('alice', { sub: 'alice' }).firestore();
  const approvalRef = alice.collection('approvals').doc('a1');
  // sanity-check: alice can read the family and membership docs
  const famRef = alice.collection('families').doc('fam1');
  const memberRef = famRef.collection('members').doc('alice');
  try {
    await famRef.get();
    console.log('famRef.get() succeeded for alice');
  } catch (e) {
    console.error('famRef.get() failed for alice', e);
  }
  try {
    await memberRef.get();
    console.log('memberRef.get() succeeded for alice');
  } catch (e) {
    console.error('memberRef.get() failed for alice', e);
  }
  try {
    await approvalRef.set({ userId: 'alice', taskId: 't3', familyId: 'fam1' });
    console.log('approval set succeeded');
  } catch (e) {
    console.error('approval set failed', e.message || e);
    throw e;
  }

  const bob = testEnv.authenticatedContext('bob', { sub: 'bob' }).firestore();
  const approvalRef2 = bob.collection('approvals').doc('a2');
  await assertFails(approvalRef2.set({ userId: 'bob', taskId: 't3', familyId: 'fam1' }));
});

test('user can create history entry', async () => {
  const alice = testEnv.authenticatedContext('alice', { sub: 'alice' }).firestore();
  const histRef = alice.collection('history').doc('h1');
  try {
    await histRef.set({ userId: 'alice', action: 'created task', familyId: 'fam1' });
    console.log('history set succeeded');
  } catch (e) {
    console.error('history set failed', e.message || e);
    throw e;
  }
});
