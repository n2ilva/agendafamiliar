/**
 * Script de migração: normaliza campos de data em `family_tasks` para Firestore Timestamp.
 * Campos alvo: createdAt, updatedAt, completedAt, editedAt, dueDate, dueTime
 *
 * Uso:
 *  - Coloque `scripts/serviceAccountKey.json` com credenciais (já existe no repo).
 *  - Dry-run: npx ts-node ./scripts/migrate-normalize-timestamps.ts --dry-run
 *  - Execução real: npx ts-node ./scripts/migrate-normalize-timestamps.ts
 */

import admin from 'firebase-admin';
import { getFirestore, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const TASKS_COLLECTION = 'family_tasks';
const BATCH_SIZE = 500;

function parseToTimestamp(value: any): Timestamp | null {
  if (value == null) return null;
  // Already a Firestore Timestamp-like
  if (value && typeof value.toDate === 'function') {
    try {
      const d = value.toDate();
      return Timestamp.fromDate(d);
    } catch {
      return null;
    }
  }

  // Native Date
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }

  // Number (seconds or millis)
  if (typeof value === 'number') {
    // Heuristic: if > 1e12 treat as millis, else seconds
    if (value > 1e12) return Timestamp.fromMillis(value);
    return Timestamp.fromMillis(value * 1000);
  }

  // String parse
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!isNaN(parsed)) return Timestamp.fromMillis(parsed);
    return null;
  }

  // Object with seconds/nanoseconds
  if (typeof value === 'object' && value !== null && ('seconds' in value)) {
    try {
      const seconds = Number((value as any).seconds);
      const nanos = Number((value as any).nanoseconds || 0);
      return Timestamp.fromMillis(seconds * 1000 + Math.floor(nanos / 1_000_000));
    } catch {
      return null;
    }
  }

  return null;
}

async function main() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('serviceAccountKey.json nao encontrado em scripts/.');
    process.exit(1);
  }

  const raw = fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8');
  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = getFirestore();

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-n');
  if (dryRun) console.log('Rodando em dry-run (nenhuma escrita sera efetuada)');

  let processed = 0;
  let updated = 0;
  let lastDoc: QueryDocumentSnapshot | null = null;
  const updatedIds: string[] = [];

  while (true) {
    let q: any = db.collection(TASKS_COLLECTION).orderBy('createdAt').limit(BATCH_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    const batchWrites: Array<{ ref: any; data: any }> = [];

    for (const doc of snap.docs) {
      processed += 1;
      const data = doc.data();
      const updateData: any = {};

      const fields = ['createdAt', 'updatedAt', 'completedAt', 'editedAt', 'dueDate', 'dueTime'];
      for (const f of fields) {
        const v = (data as any)[f];
        const parsed = parseToTimestamp(v);
        if (v != null && parsed == null) {
          // campo presente mas não parseavel → marcar para revisao (não sobrescrever)
          // registrar para relatório
        }
        if (v != null && parsed != null) {
          // Se já é Timestamp do Admin, parsed será Timestamp também; porém
          // queremos detectar se há diferença de tipo
          // Converter apenas se tipo não for Timestamp
          if (!(v && typeof v.toDate === 'function')) {
            updateData[f] = parsed;
          }
        }
      }

      if (Object.keys(updateData).length > 0) {
        updated += 1;
        updatedIds.push(doc.id);
        if (!dryRun) {
          batchWrites.push({ ref: doc.ref, data: updateData });
        }
      }
    }

    if (!dryRun && batchWrites.length > 0) {
      const batch = db.batch();
      for (const op of batchWrites) batch.update(op.ref, op.data);
      await batch.commit();
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    // micro delay
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('Migração timestamps concluida (dryRun=' + dryRun + ')');
  console.log('Documents processed:', processed);
  console.log('Documents needing updates:', updated);
  if (updatedIds.length > 0) {
    console.log('Sample IDs (up to 100):');
    console.log(updatedIds.slice(0, 100).join('\n'));
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
