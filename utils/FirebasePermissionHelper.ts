import { firebaseFirestore } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

/**
 * Utilitário para diagnosticar e corrigir problemas de permissões do Firebase
 */
export class FirebasePermissionHelper {
  
  /**
   * Diagnóstica permissões de um usuário em uma família específica
   */
  static async diagnoseUserPermissions(userId: string, familyId: string) {
    console.log('🔍 Diagnosticando permissões do usuário:', { userId, familyId });
    
    try {
      // Verificar se a família existe
      const familyRef = doc(firebaseFirestore() as any, 'families', familyId);
      const familySnap = await getDoc(familyRef);
      
      if (!familySnap.exists()) {
        console.error('❌ Família não encontrada:', familyId);
        return { success: false, error: 'Família não encontrada' };
      }
      
      const familyData = familySnap.data();
      console.log('👨‍👩‍👧‍👦 Dados da família:', {
        adminId: familyData?.adminId,
        name: familyData?.name
      });
      
      // Verificar se o usuário é membro
      const memberRef = doc(firebaseFirestore() as any, 'families', familyId, 'members', userId);
      const memberSnap = await getDoc(memberRef);
      
      if (!memberSnap.exists()) {
        console.error('❌ Usuário não é membro da família');
        return { success: false, error: 'Usuário não é membro da família' };
      }
      
      const memberData = memberSnap.data();
      console.log('👤 Dados do membro:', {
        role: memberData?.role,
        permissions: memberData?.permissions,
        joinedAt: memberData?.joinedAt
      });
      
      const diagnosis = {
        isLegacyAdmin: familyData?.adminId === userId,
        isRoleAdmin: memberData?.role === 'admin',
        hasCreatePermission: memberData?.permissions?.create === true,
        hasEditPermission: memberData?.permissions?.edit === true,
        hasDeletePermission: memberData?.permissions?.delete === true,
        canDelete: false
      };
      
      diagnosis.canDelete = diagnosis.isLegacyAdmin || diagnosis.isRoleAdmin || diagnosis.hasDeletePermission;
      
      console.log('📊 Diagnóstico das permissões:', diagnosis);
      
      return {
        success: true,
        diagnosis,
        familyData,
        memberData
      };
      
    } catch (error) {
      console.error('💥 Erro ao diagnosticar permissões:', error);
      return { success: false, error: error };
    }
  }
  
  /**
   * Garante que um usuário tenha permissões administrativas em uma família
   */
  static async ensureAdminPermissions(userId: string, familyId: string) {
    console.log('🔧 Garantindo permissões de admin para usuário:', { userId, familyId });
    
    try {
      const diagnosis = await this.diagnoseUserPermissions(userId, familyId);
      
      if (!diagnosis.success) {
        return diagnosis;
      }
      
      // Se já tem permissões adequadas, não precisa fazer nada
      if (diagnosis.diagnosis?.canDelete) {
        console.log('✅ Usuário já tem permissões adequadas');
        return { success: true, message: 'Usuário já tem permissões adequadas' };
      }
      
      // Atualizar o membro para ter role de admin e todas as permissões
      const memberRef = doc(firebaseFirestore() as any, 'families', familyId, 'members', userId);
      
      const updates = {
        role: 'admin',
        permissions: {
          create: true,
          edit: true,
          delete: true
        },
        updatedAt: new Date()
      };
      
      await updateDoc(memberRef, updates);
      
      console.log('✅ Permissões de admin concedidas ao usuário');
      return { success: true, message: 'Permissões de admin concedidas' };
      
    } catch (error) {
      console.error('💥 Erro ao garantir permissões de admin:', error);
      return { success: false, error: error };
    }
  }
  
  /**
   * Lista todas as famílias do usuário e suas permissões
   */
  static async listUserFamilies(userId: string) {
    console.log('📋 Listando famílias do usuário:', userId);
    
    try {
      // Buscar todas as famílias onde o usuário é membro
      // Não podemos fazer query collection group aqui, então vamos buscar no cache local
      const offlineData = await import('../services/LocalStorageService').then(service => 
        service.default.getOfflineData()
      );
      
      const familyIds = new Set<string>();
      
      // Buscar IDs de família dos dados em cache
      Object.values(offlineData.tasks).forEach((task: any) => {
        if (task.familyId && (task.userId === userId || task.createdBy === userId)) {
          familyIds.add(task.familyId);
        }
      });
      
      console.log('🔍 IDs de família encontrados:', Array.from(familyIds));
      
      const familiesInfo = [];
      
      for (const familyId of familyIds) {
        const diagnosis = await this.diagnoseUserPermissions(userId, familyId);
        if (diagnosis.success) {
          familiesInfo.push({
            familyId,
            familyName: diagnosis.familyData?.name || 'Sem nome',
            ...diagnosis.diagnosis
          });
        }
      }
      
      console.log('👨‍👩‍👧‍👦 Informações das famílias:', familiesInfo);
      
      return { success: true, families: familiesInfo };
      
    } catch (error) {
      console.error('💥 Erro ao listar famílias do usuário:', error);
      return { success: false, error: error };
    }
  }
}