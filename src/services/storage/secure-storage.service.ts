import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

class SecureStorageService {
    private static readonly KEY_ALIAS = 'family_app_master_key';
    private static encryptionKey: string | null = null;
    private static isInitialized = false;

    /**
     * Initialize the secure storage service
     * Ensures an encryption key exists
     */
    static async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Web doesn't support SecureStore the same way, so we fallback or use a different strategy
            // For this implementation, we'll focus on mobile security. 
            // On web, we might store the key in localStorage but that's not secure.
            // Ideally web would use a different auth flow (cookie based).
            if (Platform.OS === 'web') {
                this.encryptionKey = 'web-dev-key-do-not-use-in-production';
                this.isInitialized = true;
                return;
            }

            // Try to get existing key
            let key = await SecureStore.getItemAsync(this.KEY_ALIAS);

            if (!key) {
                // Generate new key if none exists
                console.log('🔐 [SecureStorage] No existing key found. Generating new encryption key...');
                key = uuidv4() + '-' + uuidv4(); // Simple high-entropy string
                await SecureStore.setItemAsync(this.KEY_ALIAS, key);
                console.log('🔐 [SecureStorage] New key generated and saved.');
            } else {
                console.log('🔐 [SecureStorage] Existing key found and loaded.');
            }

            this.encryptionKey = key;
            this.isInitialized = true;
        } catch (error) {
            console.error('❌ Error initializing SecureStorageService:', error);
            // Fallback to a hardcoded key in worst case to allow app to function (but log error)
            // In production this should probably block app start or prompt user
            this.encryptionKey = 'fallback-emergency-key';
            this.isInitialized = true;
        }
    }

    /**
     * Encrypt data using AES
     */
    private static encrypt(data: string): string {
        if (!this.encryptionKey) throw new Error('SecureStorageService not initialized');
        return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
    }

    /**
     * Decrypt data using AES
     */
    private static decrypt(ciphertext: string): string {
        if (!this.encryptionKey) throw new Error('SecureStorageService not initialized');
        const bytes = CryptoJS.AES.decrypt(ciphertext, this.encryptionKey);
        return bytes.toString(CryptoJS.enc.Utf8);
    }

    /**
     * Save item securely (encrypts before saving to AsyncStorage)
     */
    static async setItem(key: string, value: any): Promise<void> {
        await this.initialize();
        try {
            const stringValue = JSON.stringify(value);
            const encrypted = this.encrypt(stringValue);
            // We prefix with 'enc:' to identify encrypted data easily during migration/debugging
            await AsyncStorage.setItem(key, 'enc:' + encrypted);
        } catch (error) {
            console.error(`❌ Error saving secure item [${key}]:`, error);
            throw error;
        }
    }

    /**
     * Get item securely (decrypts after reading from AsyncStorage)
     */
    static async getItem<T>(key: string): Promise<T | null> {
        await this.initialize();
        try {
            const raw = await AsyncStorage.getItem(key);
            if (!raw) return null;

            // Check if data is encrypted
            if (raw.startsWith('enc:')) {
                const ciphertext = raw.substring(4); // Remove 'enc:' prefix
                try {
                    const decrypted = this.decrypt(ciphertext);
                    if (!decrypted) return null; // Decryption failed (empty string)
                    return JSON.parse(decrypted);
                } catch (e) {
                    console.error(`❌ Decryption failed for [${key}]:`, e);
                    return null;
                }
            } else {
                // Legacy support: read plain text data (and maybe migrate it later)
                try {
                    return JSON.parse(raw);
                } catch {
                    return raw as unknown as T;
                }
            }
        } catch (error) {
            console.error(`❌ Error getting secure item [${key}]:`, error);
            return null;
        }
    }

    /**
     * Remove item
     */
    static async removeItem(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error(`❌ Error removing item [${key}]:`, error);
        }
    }

    /**
     * Clear all keys (use with caution)
     */
    static async clear(): Promise<void> {
        try {
            await AsyncStorage.clear();
        } catch (error) {
            console.error('❌ Error clearing storage:', error);
        }
    }
}

export default SecureStorageService;
