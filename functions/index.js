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

  return await resp.json();
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
