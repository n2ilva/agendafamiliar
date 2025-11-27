import { firebaseAuth } from '../config/firebase';
import { FirebasePermissionHelper } from '../utils/FirebasePermissionHelper';
import LocalStorageService from '../services/LocalStorageService';

/**
 * Script para diagnosticar e corrigir problemas de permissões do Firebase
 * Para usar no console do navegador/debugger
 */

// Função global para diagnóstico
(global as any).diagnoseFirebasePermissions = async function() {
  console.log('🩺 Iniciando diagnóstico completo de permissões do Firebase...');
  
  try {
    // Verificar autenticação
    const auth = firebaseAuth() as any;
    const currentUser = auth?.currentUser;
    
    if (!currentUser) {
      console.error('❌ Usuário não autenticado');
      return { success: false, error: 'Usuário não autenticado' };
    }
    
    const userId = currentUser.uid || currentUser.id;
    console.log('👤 Usuário atual:', {
      uid: currentUser.uid,
      id: currentUser.id,
      email: currentUser.email,
      finalUserId: userId
    });
    
    // Listar famílias do usuário
    const familiesResult = await FirebasePermissionHelper.listUserFamilies(userId);
    
    if (!familiesResult.success) {
      console.error('❌ Falha ao listar famílias:', familiesResult.error);
      return familiesResult;
    }
    
    console.log('📋 Famílias encontradas:', familiesResult.families);
    
    // Diagnosticar cada família
    const results = [];
    for (const family of familiesResult.families || []) {
      console.log(`\n🔍 Diagnosticando família: ${family.familyName} (${family.familyId})`);
      
      const diagnosis = await FirebasePermissionHelper.diagnoseUserPermissions(userId, family.familyId);
      results.push({
        familyId: family.familyId,
        familyName: family.familyName,
        diagnosis
      });
      
      // Se não tem permissões, tentar corrigir
      if (diagnosis.success && !diagnosis.diagnosis?.canDelete) {
        console.log('🔧 Usuário sem permissões adequadas, tentando corrigir...');
        const fixResult = await FirebasePermissionHelper.ensureAdminPermissions(userId, family.familyId);
        console.log('🛠️ Resultado da correção:', fixResult);
      }
    }
    
    console.log('\n📊 Resumo do diagnóstico:', {
      userId,
      totalFamilies: results.length,
      results
    });
    
    return {
      success: true,
      userId,
      families: results
    };
    
  } catch (error) {
    console.error('💥 Erro durante diagnóstico:', error);
    return { success: false, error };
  }
};

// Função para corrigir permissões de uma família específica
(global as any).fixFamilyPermissions = async function(familyId: string) {
  console.log('🔧 Corrigindo permissões para família:', familyId);
  
  try {
    const auth = firebaseAuth() as any;
    const userId = auth?.currentUser?.uid || auth?.currentUser?.id;
    
    if (!userId) {
      console.error('❌ Usuário não autenticado');
      return { success: false, error: 'Usuário não autenticado' };
    }
    
    return await FirebasePermissionHelper.ensureAdminPermissions(userId, familyId);
    
  } catch (error) {
    console.error('💥 Erro ao corrigir permissões:', error);
    return { success: false, error };
  }
};

// Função para listar dados em cache
(global as any).listCacheData = async function() {
  console.log('📦 Listando dados em cache...');
  
  try {
    const offlineData = await LocalStorageService.getOfflineData();
    
    console.log('📊 Dados em cache:', {
      tasksCount: Object.keys(offlineData.tasks).length,
      usersCount: Object.keys(offlineData.users).length,
      approvalsCount: Object.keys(offlineData.approvals).length,
      pendingOperationsCount: offlineData.pendingOperations.length
    });
    
    // Mostrar algumas tarefas como exemplo
    const taskIds = Object.keys(offlineData.tasks).slice(0, 3);
    console.log('📋 Exemplo de tarefas em cache:', 
      taskIds.map(id => {
        const task = offlineData.tasks[id] as any;
        return {
          id,
          title: task.title,
          familyId: task.familyId,
          userId: task.userId,
          createdBy: task.createdBy
        };
      })
    );
    
    // Mostrar operações pendentes
    if (offlineData.pendingOperations.length > 0) {
      console.log('⏳ Operações pendentes:', offlineData.pendingOperations);
    }
    
    return {
      success: true,
      data: offlineData
    };
    
  } catch (error) {
    console.error('💥 Erro ao listar cache:', error);
    return { success: false, error };
  }
};

// ============ DIAGNÓSTICO DE NOTIFICAÇÕES ============

// Função para verificar status das notificações
(global as any).diagnoseNotifications = async function() {
  console.log('🔔 Iniciando diagnóstico de notificações...');
  
  try {
    const NotificationService = (await import('../services/NotificationService')).default;
    
    const status = await NotificationService.getNotificationStatus();
    console.log('📊 Status das notificações:', status);
    
    const scheduled = await NotificationService.listScheduledNotifications();
    console.log(`📋 ${scheduled.length} notificações agendadas`);
    
    // Verificar se está no Expo Go
    try {
      const Constants = require('expo-constants');
      const isExpoGo = Constants?.appOwnership === 'expo';
      if (isExpoGo) {
        console.warn('⚠️ ATENÇÃO: Você está usando o Expo Go!');
        console.warn('   Notificações agendadas podem NÃO funcionar quando o app está fechado.');
        console.warn('   Para notificações confiáveis, crie um Development Build:');
        console.warn('   npx expo run:android ou npx expo run:ios');
      } else {
        console.log('✅ Você está usando um Development Build/Standalone.');
        console.log('   Notificações agendadas devem funcionar quando o app está fechado.');
      }
    } catch (e) {
      console.log('ℹ️ Não foi possível verificar se está no Expo Go');
    }
    
    return {
      success: true,
      status,
      scheduledCount: scheduled.length,
      scheduled
    };
  } catch (error) {
    console.error('💥 Erro no diagnóstico:', error);
    return { success: false, error };
  }
};

// Função para testar notificação imediata
(global as any).testNotification = async function() {
  console.log('🧪 Enviando notificação de teste...');
  
  try {
    const NotificationService = (await import('../services/NotificationService')).default;
    const id = await NotificationService.sendTestNotification();
    
    if (id) {
      console.log('✅ Notificação de teste enviada com sucesso! ID:', id);
    } else {
      console.error('❌ Falha ao enviar notificação de teste');
    }
    
    return { success: !!id, id };
  } catch (error) {
    console.error('💥 Erro ao enviar teste:', error);
    return { success: false, error };
  }
};

// Função para testar notificação agendada (5 segundos)
(global as any).testScheduledNotification = async function(seconds = 5) {
  console.log(`⏰ Agendando notificação de teste para ${seconds} segundos...`);
  console.log('   FECHE O APP AGORA para testar se funciona em background!');
  
  try {
    const NotificationService = (await import('../services/NotificationService')).default;
    const id = await NotificationService.sendDelayedTestNotification(seconds);
    
    if (id) {
      console.log(`✅ Notificação agendada! ID: ${id}`);
      console.log(`   Você deve receber em ${seconds} segundos.`);
    } else {
      console.error('❌ Falha ao agendar notificação de teste');
    }
    
    return { success: !!id, id };
  } catch (error) {
    console.error('💥 Erro ao agendar teste:', error);
    return { success: false, error };
  }
};

// ============ DIAGNÓSTICO DE SINCRONIZAÇÃO ============

// Função para diagnosticar operações pendentes
(global as any).diagnosePendingOperations = async function() {
  console.log('🔄 Diagnosticando operações pendentes...');
  
  try {
    const offlineData = await LocalStorageService.getOfflineData();
    const allOps = offlineData.pendingOperations;
    
    console.log(`📊 Total de operações na fila: ${allOps.length}`);
    
    if (allOps.length === 0) {
      console.log('✅ Nenhuma operação pendente');
      return { success: true, count: 0, operations: [] };
    }
    
    // Categorizar operações
    const byStatus = {
      valid: allOps.filter(op => op.retry < 5),
      exhausted: allOps.filter(op => op.retry >= 5),
      old: allOps.filter(op => Date.now() - op.timestamp > 7 * 24 * 60 * 60 * 1000)
    };
    
    console.log('📋 Detalhes:');
    console.log(`   ✅ Válidas (podem ser processadas): ${byStatus.valid.length}`);
    console.log(`   ❌ Esgotadas (muitos retries): ${byStatus.exhausted.length}`);
    console.log(`   🕐 Antigas (>7 dias): ${byStatus.old.length}`);
    
    allOps.forEach((op, i) => {
      const age = Math.floor((Date.now() - op.timestamp) / (1000 * 60));
      const status = op.retry >= 5 ? '❌' : '✅';
      console.log(`   ${i + 1}. ${status} ${op.type} ${op.collection} - retry: ${op.retry}, idade: ${age}min`);
      if (op.data) {
        console.log(`      ID: ${op.data.id || 'N/A'}, FamilyId: ${op.data.familyId || 'N/A'}`);
      }
    });
    
    return { 
      success: true, 
      count: allOps.length,
      valid: byStatus.valid.length,
      exhausted: byStatus.exhausted.length,
      operations: allOps 
    };
  } catch (error) {
    console.error('💥 Erro no diagnóstico:', error);
    return { success: false, error };
  }
};

// Função para limpar operações pendentes problemáticas
(global as any).clearPendingOperations = async function() {
  console.log('🧹 Limpando todas as operações pendentes...');
  
  try {
    await LocalStorageService.clearAllPendingOperations();
    
    // Forçar atualização do status através de uma sincronização
    const SyncService = (await import('../services/SyncService')).default;
    await SyncService.syncWithRemote();
    
    console.log('✅ Todas as operações pendentes foram removidas');
    return { success: true };
  } catch (error) {
    console.error('💥 Erro ao limpar:', error);
    return { success: false, error };
  }
};

// Função para forçar sincronização
(global as any).forceSync = async function() {
  console.log('🔄 Forçando sincronização...');
  
  try {
    const SyncService = (await import('../services/SyncService')).default;
    await SyncService.syncWithRemote();
    console.log('✅ Sincronização forçada concluída');
    return { success: true };
  } catch (error) {
    console.error('💥 Erro na sincronização:', error);
    return { success: false, error };
  }
};

console.log(`
🔧 Utilitários de diagnóstico carregados!

Use no console:
- diagnoseFirebasePermissions() - Diagnóstico completo de permissões
- fixFamilyPermissions('familyId') - Corrigir permissões de uma família
- listCacheData() - Listar dados em cache

🔔 Diagnóstico de Notificações:
- diagnoseNotifications() - Ver status das notificações
- testNotification() - Enviar notificação imediata
- testScheduledNotification(30) - Agendar notificação em 30 segundos

🔄 Diagnóstico de Sincronização:
- diagnosePendingOperations() - Ver operações pendentes
- clearPendingOperations() - Limpar operações pendentes
- forceSync() - Forçar sincronização

Exemplo:
> await diagnosePendingOperations()
> await clearPendingOperations()
`);