const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();
const db = admin.firestore();

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

// Processa a fila `pushQueue` no Firestore. Cada documento da fila deve ter:
// { to: <expoToken>, title, body, data, attempts: number }
// A função tenta enviar mensagens em lotes e atualiza o documento com status.

async function sendBatch(messages) {
  const resp = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages)
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Expo push failed: ${resp.status} ${text}`);
  }

  const jsonResponse = await resp.json();
  return jsonResponse;
}

exports.processPushQueue = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  console.log('processPushQueue: started');

  // Query documentos pendentes (status missing or status == 'pending')
  const batchLimit = 100; // process up to 100 messages per run
  const snapshot = await db.collection('pushQueue')
    .where('status', 'in', ['pending', null])
    .orderBy('createdAt')
    .limit(batchLimit)
    .get();

  if (snapshot.empty) {
    console.log('No pending messages');
    return null;
  }

  // Agrupa mensagens por token para enviar em lotes
  const messages = [];
  const docs = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    docs.push({ id: doc.id, ref: doc.ref, data });
    messages.push({
      to: data.to,
      title: data.title,
      body: data.body,
      data: data.data || {}
    });
  });

  try {
    // Envia mensagens em lotes (Expo aceita até 100 de cada vez)
    const responses = await sendBatch(messages);

    // Marca documentos como enviados
    for (let i = 0; i < docs.length; i++) {
      const docInfo = docs[i];
      const resp = responses[i] || null;
      // Se resposta indicar erro com token inválido, removemos token do usuário
      try {
        if (resp && resp.status === 'error' && resp.details && resp.details.error) {
          const err = String(resp.details.error || '').toLowerCase();
          // Erros que indicam token inválido/not registered
          if (err.includes('device') || err.includes('notregistered') || err.includes('devicenotregistered') || err.includes('invalidcredentials')) {
            const token = docInfo.data.to;
            console.log('Removing invalid token:', token);
            await removePushTokenFromUsers(token);
            await docInfo.ref.update({ status: 'failed', sentAt: admin.firestore.FieldValue.serverTimestamp(), expoResponse: resp });
            continue;
          }
        }
      } catch (e) {
        console.warn('Error handling expo response for doc', docInfo.id, e);
      }

      await docInfo.ref.update({ status: 'sent', sentAt: admin.firestore.FieldValue.serverTimestamp(), expoResponse: resp });
    }

    console.log(`Sent ${docs.length} messages`);
  } catch (error) {
    console.error('Error sending pushes:', error);

    // Em caso de erro de rede ou de API, incrementa attempts e mantém como pending para retry
    for (const docInfo of docs) {
      const prevAttempts = (docInfo.data.attempts || 0);
      const nextAttempts = prevAttempts + 1;
      const updateData = {
        attempts: nextAttempts,
        lastError: String(error),
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Se passou de 5 tentativas, marca como failed
      if (nextAttempts >= 5) {
        updateData.status = 'failed';
      } else {
        updateData.status = 'pending';
      }

      try { await docInfo.ref.update(updateData); } catch (e) { console.warn('Failed updating queue doc after send error:', e); }
    }
  }

  return null;
});

// Detecta tarefas vencidas em qualquer subcoleção 'tasks' e enfileira notificações
exports.detectOverdueTasks = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  console.log('detectOverdueTasks: started');
  const now = new Date();

  // Query todos os documentos na collectionGroup 'tasks' com status PENDING
  // Limit para evitar leitura massiva
  const snapshot = await db.collectionGroup('tasks')
    .where('status', '==', 'PENDING')
    .orderBy('dueDate')
    .limit(1000)
    .get();

  if (snapshot.empty) {
    console.log('No pending tasks found');
    return null;
  }

  const batchWrites = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const dueDateRaw = data.dueDate;
    if (!dueDateRaw) continue;

    const dueDate = new Date(dueDateRaw);
    if (isNaN(dueDate.getTime())) continue;

    // Skip if not yet due
    if (dueDate > now) continue;

    // Skip if already notified
    if (data.notifiedOverdue === true) continue;

    // Determine recipients: if task path contains /users/{userId}/tasks/{taskId}
    // or /families/{familyId}/tasks/{taskId}
    const pathParts = doc.ref.path.split('/');
    // pathParts example: ['users','<userId>','tasks','<taskId>']
    let recipientUserIds = [];

    try {
      if (pathParts[0] === 'users' && pathParts[2] === 'tasks') {
        const userId = pathParts[1];
        recipientUserIds.push(userId);
      } else if (pathParts[0] === 'families' && pathParts[2] === 'tasks') {
        const familyId = pathParts[1];
        // load family members
        const familySnap = await db.collection('families').doc(familyId).get();
        const familyData = familySnap.exists ? familySnap.data() : null;
        if (familyData && Array.isArray(familyData.members)) {
          familyData.members.forEach(m => { if (m && m.id) recipientUserIds.push(m.id); });
        }
      }
    } catch (e) {
      console.warn('Error determining recipients for task', doc.ref.path, e);
    }

    if (recipientUserIds.length === 0) {
      // nothing to notify
      // mark as notified to avoid repeated work
      try { await doc.ref.update({ notifiedOverdue: true, notifiedOverdueAt: admin.firestore.FieldValue.serverTimestamp() }); } catch (e) { /* ignore */ }
      continue;
    }

    // For each recipient, read their pushTokens and create pushQueue entries
    for (const uid of recipientUserIds) {
      try {
        const userSnap = await db.collection('users').doc(uid).get();
        if (!userSnap.exists) continue;
        const userData = userSnap.data();
        const tokens = Array.isArray(userData.pushTokens) ? userData.pushTokens : [];
        for (const token of tokens) {
          const qRef = db.collection('pushQueue').doc();
          batchWrites.push(qRef.set({
            to: token,
            title: `Tarefa vencida: ${data.title || 'Sem título'}`,
            body: `${data.title || 'Uma tarefa'} venceu em ${dueDate.toLocaleString()}`,
            data: { taskPath: doc.ref.path, taskId: doc.id },
            status: 'pending',
            attempts: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          }));
        }
      } catch (e) {
        console.warn('Error enqueuing push for user', uid, e);
      }
    }

    // mark task as notified to avoid duplicate notifications
    try {
      batchWrites.push(doc.ref.update({ notifiedOverdue: true, notifiedOverdueAt: admin.firestore.FieldValue.serverTimestamp() }));
    } catch (e) {
      console.warn('Failed to push notify flag for task', doc.ref.path, e);
    }
  }

  // Commit batch writes in chunks to avoid exceeding limits
  const chunkSize = 500; // Firestore batch limit
  for (let i = 0; i < batchWrites.length; i += chunkSize) {
    const chunk = batchWrites.slice(i, i + chunkSize);
    try {
      await Promise.all(chunk);
    } catch (e) {
      console.warn('Error committing batch chunk', e);
    }
  }

  console.log('detectOverdueTasks: finished');
  return null;
});

// Serviço auxiliar para enfileirar uma mensagem (pode ser chamado via HTTP ou diretamente do backend)
exports.enqueuePush = functions.https.onCall(async (data, context) => {
  const { to, title, body, payload } = data;
  if (!to || !title || !body) throw new functions.https.HttpsError('invalid-argument', 'Missing fields');

  const docRef = await db.collection('pushQueue').add({
    to,
    title,
    body,
    data: payload || {},
    status: 'pending',
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { id: docRef.id };
});

// HTTP endpoint para enfileirar mensagens (POST JSON { to, title, body, payload })
exports.enqueuePushHttp = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { to, title, body, payload } = req.body || {};
    if (!to || !title || !body) return res.status(400).json({ error: 'Missing fields' });

    const docRef = await db.collection('pushQueue').add({
      to,
      title,
      body,
      data: payload || {},
      status: 'pending',
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ id: docRef.id });
  } catch (error) {
    console.error('enqueuePushHttp error:', error);
    return res.status(500).json({ error: String(error) });
  }
});

// Helper para remover token de todos os usuários que o possuírem
async function removePushTokenFromUsers(token) {
  try {
    const usersSnap = await db.collection('users').where('pushTokens', 'array-contains', token).get();
    const batch = db.batch();
    usersSnap.forEach(u => {
      batch.update(u.ref, { pushTokens: admin.firestore.FieldValue.arrayRemove(token) });
    });
    await batch.commit();
    console.log('Removed token from users:', token);
  } catch (e) {
    console.warn('Failed to remove push token from users:', e);
  }
}
