/**
 * Script de auditoria para `family_tasks`.
 * Verifica os campos: familyId, createdBy, private, repeatDays, createdAt
 * Uso: env -u FIRESTORE_EMULATOR_HOST npx ts-node ./scripts/audit-family-tasks.ts
 */

import admin from 'firebase-admin';
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const TASKS_COLLECTION = 'family_tasks';
const BATCH_SIZE = 500;

function isValidRepeatDays(v: any): boolean {
  if (v == null) return true; // absent is allowed
  if (!Array.isArray(v)) return false;
  for (const x of v) {
    if (typeof x !== 'number') return false;
    if (!Number.isInteger(x)) return false;
    if (x < 0 || x > 6) return false;
  }
  return true;
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

  let processed = 0;
  let lastDoc: QueryDocumentSnapshot | null = null;

  const issues: Record<string, { count: number; ids: string[] }> = {
    missingFamilyId: { count: 0, ids: [] },
    missingCreatedBy: { count: 0, ids: [] },
    missingCreatedAt: { count: 0, ids: [] },
    privateMissingOrNotBoolean: { count: 0, ids: [] },
    invalidRepeatDays: { count: 0, ids: [] },
  };

  // group by familyId for context (only for docs with familyId)
  const familyProblemCounts: Record<string, number> = {};

  while (true) {
    let q: any = db.collection(TASKS_COLLECTION).orderBy('createdAt').limit(BATCH_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      processed += 1;
      const data = doc.data();
      const id = doc.id;

      const familyId = data.familyId;
      const createdBy = data.createdBy;
      const createdAt = data.createdAt;
      const privateField = data.private;
      const repeatDays = data.repeatDays;

      let docHasIssue = false;

      if (!familyId || typeof familyId !== 'string' || familyId.trim() === '') {
        issues.missingFamilyId.count += 1;
        if (issues.missingFamilyId.ids.length < 100) issues.missingFamilyId.ids.push(id);
        docHasIssue = true;
      }

      if (!createdBy || typeof createdBy !== 'string' || createdBy.trim() === '') {
        issues.missingCreatedBy.count += 1;
        if (issues.missingCreatedBy.ids.length < 100) issues.missingCreatedBy.ids.push(id);
        docHasIssue = true;
      }

      if (!createdAt) {
        issues.missingCreatedAt.count += 1;
        if (issues.missingCreatedAt.ids.length < 100) issues.missingCreatedAt.ids.push(id);
        docHasIssue = true;
      }

      if (typeof privateField === 'undefined' || typeof privateField !== 'boolean') {
        issues.privateMissingOrNotBoolean.count += 1;
        if (issues.privateMissingOrNotBoolean.ids.length < 100) issues.privateMissingOrNotBoolean.ids.push(id);
        docHasIssue = true;
      }

      if (!isValidRepeatDays(repeatDays)) {
        issues.invalidRepeatDays.count += 1;
        if (issues.invalidRepeatDays.ids.length < 100) issues.invalidRepeatDays.ids.push(id);
        docHasIssue = true;
      }

      if (docHasIssue && familyId && typeof familyId === 'string') {
        familyProblemCounts[familyId] = (familyProblemCounts[familyId] || 0) + 1;
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n=== AUDIT family_tasks ===');
  console.log('Documents processed:', processed);
  console.log('');

  for (const [k, v] of Object.entries(issues)) {
    console.log(`${k}: ${v.count}`);
    if (v.ids.length > 0) {
      console.log('Sample IDs:');
      console.log(v.ids.join('\n'));
    }
    console.log('');
  }

  console.log('Families with problems (top 20):');
  const sortedFamilies = Object.entries(familyProblemCounts).sort((a,b) => b[1]-a[1]).slice(0,20);
  for (const [fam, cnt] of sortedFamilies) console.log(fam, cnt);

  process.exit(0);
}

main().catch(err => { console.error('Erro:', err); process.exit(1); });
