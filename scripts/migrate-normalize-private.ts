/**
 * Script de migração: normaliza o campo `private` na collection `family_tasks`.
 * Requisitos:
 * - Chave de serviço do Firebase (serviceAccountKey.json) com permissões de escrita no Firestore.
 * - Node.js instalado.
 * 
 * Uso:
 * 1) Coloque o arquivo JSON da conta de serviço em `./scripts/serviceAccountKey.json`.
 * 2) Rode: `npm run migrate:normalize-private` (ou `npx ts-node ./scripts/migrate-normalize-private.ts`).
 *
 * O script fará batch updates (500 por batch) definindo `private: false` quando o campo
 * não existir. Registra logs e um resumo no final.
 */

import admin from 'firebase-admin';
import { getFirestore, WriteBatch, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const TASKS_COLLECTION = 'family_tasks';
const BATCH_SIZE = 500; // Firestore permite até 500 operações por batch

async function main() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`Arquivo de credencial não encontrado em: ${SERVICE_ACCOUNT_PATH}`);
    console.error('Coloque a chave de serviço do Firebase em scripts/serviceAccountKey.json e tente novamente.');
    process.exit(1);
  }

  const serviceAccount = require(SERVICE_ACCOUNT_PATH);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = getFirestore();

  console.log('🔐 Conectado ao Firestore. Iniciando migração...');

  // Paginar por todos os documentos na collection family_tasks
  let processed = 0;
  let updated = 0;
  let lastDoc: QueryDocumentSnapshot | null = null;

  while (true) {
    let q = db.collection(TASKS_COLLECTION).orderBy('createdAt').limit(BATCH_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    let opsInBatch = 0;

    snap.docs.forEach(doc => {
      processed += 1;
      const data = doc.data();
      // Se o campo `private` for undefined, definimos como false
      if (typeof data.private === 'undefined') {
        batch.update(doc.ref, { private: false });
        opsInBatch += 1;
        updated += 1;
      }
    });

    if (opsInBatch > 0) {
      console.log(`📦 Comitando batch com ${opsInBatch} atualizações...`);
      await batch.commit();
      console.log('✅ Batch commit ok');
    } else {
      console.log('— Nenhuma alteração necessária neste batch');
    }

    lastDoc = snap.docs[snap.docs.length - 1];

    // Micro-delay para reduzir pico de I/O
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n🎯 Migração concluída');
  console.log(`Documentos processados: ${processed}`);
  console.log(`Documentos atualizados (private adicionado): ${updated}`);

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
