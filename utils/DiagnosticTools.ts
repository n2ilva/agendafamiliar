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

console.log(`
🔧 Utilitários de diagnóstico carregados!

Use no console:
- diagnoseFirebasePermissions() - Diagnóstico completo
- fixFamilyPermissions('familyId') - Corrigir permissões de uma família
- listCacheData() - Listar dados em cache

Exemplo:
> await diagnoseFirebasePermissions()
`);