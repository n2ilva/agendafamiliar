/**
 * Small Node script intended to be used as a Cloud Function (Firebase Functions)
 * or run as a standalone script that reads pending notifications from Firestore
 * and calls Expo Push API to deliver push notifications to Expo clients.
 *
 * NOTE: This file is a starting point — to run as Firebase Function, wrap the
 * logic with the Functions SDK (exports.sendPushes = functions.pubsub.schedule(...).onRun(...))
 * and deploy with `firebase deploy --only functions`.
 */

const fetch = require('node-fetch');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

async function sendBatch(messages) {
  const resp = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages)
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error('Erro no envio de push para Expo:', resp.status, text);
    throw new Error(`Expo push failed: ${resp.status}`);
  }

  return await resp.json();
}

async function run() {
  // Query users with push tokens
  const usersSnap = await db.collection('users').where('pushTokens', '!=', null).get();

  const messages = [];

  usersSnap.forEach(userDoc => {
    const user = userDoc.data();
    const tokens = user.pushTokens || [];
    tokens.forEach(token => {
      messages.push({
        to: token,
        title: 'Notificação Agenda Familiar',
        body: 'Você tem novas atualizações na Agenda Familiar',
        data: { userId: user.userId }
      });
    });
  });

  if (messages.length === 0) {
    console.log('Nenhuma mensagem para enviar');
    return;
  }

  // Expo recomenda enviar em lotes
  const chunkSize = 100; // Expo max 100 mensagens por request
  for (let i = 0; i < messages.length; i += chunkSize) {
    const batch = messages.slice(i, i + chunkSize);
    await sendBatch(batch);
  }

  console.log('Pushes enviados com sucesso');
}

if (require.main === module) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
