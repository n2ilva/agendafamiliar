import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorageService from './secure-storage.service';
import { OfflineData } from '../../types/storage.types';
import { FamilyUser } from '../../types/family.types';

const OLD_STORAGE_KEY = 'familyApp_offlineData';
const OLD_USER_KEY = 'familyApp_currentUser';

export class MigrationService {
    static async migrateToSecureStorage(): Promise<void> {
        console.log('🔄 Verificando necessidade de migração de dados...');

        try {
            // 1. Migrar dados offline (OfflineData)
            const oldDataRaw = await AsyncStorage.getItem(OLD_STORAGE_KEY);
            if (oldDataRaw) {
                console.log('📦 Dados antigos encontrados. Iniciando migração...');

                // Verificar se já existe dados no SecureStorage para não sobrescrever
                const secureData = await SecureStorageService.getItem('family_app_offline_data');

                if (!secureData) {
                    try {
                        const parsedData = JSON.parse(oldDataRaw);
                        await SecureStorageService.setItem('family_app_offline_data', parsedData);
                        console.log('✅ Dados offline migrados com sucesso para SecureStorage');

                        // Opcional: Remover dados antigos após sucesso
                        // await AsyncStorage.removeItem(OLD_STORAGE_KEY);
                    } catch (e) {
                        console.error('❌ Erro ao migrar dados offline:', e);
                    }
                } else {
                    console.log('ℹ️ Dados já existem no SecureStorage. Ignorando migração de offline data.');
                }
            }

            // 2. Migrar usuário atual (FamilyUser)
            const oldUserRaw = await AsyncStorage.getItem(OLD_USER_KEY);
            if (oldUserRaw) {
                console.log('👤 Usuário antigo encontrado. Iniciando migração...');

                const secureUser = await SecureStorageService.getItem('familyApp_currentUser');

                if (!secureUser) {
                    try {
                        const parsedUser = JSON.parse(oldUserRaw);
                        await SecureStorageService.setItem('familyApp_currentUser', parsedUser);
                        console.log('✅ Usuário migrado com sucesso para SecureStorage');

                        // Opcional: Remover dados antigos
                        // await AsyncStorage.removeItem(OLD_USER_KEY);
                    } catch (e) {
                        console.error('❌ Erro ao migrar usuário:', e);
                    }
                } else {
                    console.log('ℹ️ Usuário já existe no SecureStorage. Ignorando migração.');
                }
            }

            console.log('🏁 Processo de migração finalizado.');

        } catch (error) {
            console.error('❌ Erro fatal durante migração:', error);
        }
    }
}
