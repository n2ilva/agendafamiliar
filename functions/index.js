const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// ========================================
// TRIGGER: Garantir defaults ao criar tarefa
// Collection: tasks (usada pelo app)
// ========================================
exports.ensureTaskDefaults = functions.firestore
  .document('tasks/{taskId}')
  .onCreate(async (snap, ctx) => {
    const data = snap.data() || {};
    const updates = {};

    // Ensure private is boolean (default false)
    if (typeof data.private === 'undefined') updates.private = false;

    // Ensure createdAt and updatedAt exist
    const now = admin.firestore.FieldValue.serverTimestamp();
    if (!data.createdAt) updates.createdAt = now;
    if (!data.updatedAt) updates.updatedAt = now;

    // Ensure repeatDays is array if present but malformed: if not array, remove it
    if ('repeatDays' in data && !Array.isArray(data.repeatDays)) {
      updates.repeatDays = admin.firestore.FieldValue.delete();
    }

    // Only write if we have updates to apply
    if (Object.keys(updates).length > 0) {
      try {
        await snap.ref.update(updates);
        console.log('ensureTaskDefaults applied to', snap.id, updates);
      } catch (err) {
        console.error('Failed to apply defaults for', snap.id, err);
      }
    }

    return null;
  });

// ========================================
// SCHEDULED: Limpeza automática de tarefas antigas
// Executa diariamente às 03:00 (horário de Brasília)
// Remove tarefas concluídas há mais de 7 dias
// ========================================
exports.cleanupOldCompletedTasks = functions.pubsub
  .schedule('0 3 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    console.log('🧹 Iniciando limpeza de tarefas concluídas antes de:', sevenDaysAgo.toISOString());
    
    try {
      // Buscar tarefas concluídas há mais de 7 dias
      const snapshot = await db.collection('tasks')
        .where('status', '==', 'done')
        .where('completedAt', '<', sevenDaysAgo)
        .limit(500) // Processar em lotes para evitar timeout
        .get();
      
      if (snapshot.empty) {
        console.log('✅ Nenhuma tarefa antiga para remover.');
        return null;
      }
      
      // Deletar em batch
      const batch = db.batch();
      let count = 0;
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });
      
      await batch.commit();
      console.log(`🗑️ ${count} tarefas antigas removidas com sucesso.`);
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao limpar tarefas antigas:', error);
      return null;
    }
  });

// ========================================
// SCHEDULED: Limpeza de approvals antigos
// Executa semanalmente (domingo às 04:00)
// Remove approvals processados há mais de 30 dias
// ========================================
exports.cleanupOldApprovals = functions.pubsub
  .schedule('0 4 * * 0')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log('🧹 Iniciando limpeza de approvals antes de:', thirtyDaysAgo.toISOString());
    
    try {
      const snapshot = await db.collection('approvals')
        .where('status', 'in', ['approved', 'rejected'])
        .where('updatedAt', '<', thirtyDaysAgo)
        .limit(200)
        .get();
      
      if (snapshot.empty) {
        console.log('✅ Nenhum approval antigo para remover.');
        return null;
      }
      
      const batch = db.batch();
      let count = 0;
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });
      
      await batch.commit();
      console.log(`🗑️ ${count} approvals antigos removidos.`);
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao limpar approvals:', error);
      return null;
    }
  });
