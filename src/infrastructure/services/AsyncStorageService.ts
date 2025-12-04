/**
 * Implementação do Serviço de Armazenamento usando AsyncStorage
 * 
 * Princípios SOLID aplicados:
 * - Single Responsibility: Responsável apenas por armazenamento local
 * - Dependency Inversion: Implementa a interface IStorageService
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  IStorageService,
  StorageOptions,
  CacheInfo,
} from '../../core/interfaces/services/IStorageService';

interface StorageItem<T> {
  value: T;
  createdAt: number;
  expiresAt?: number;
}

export class AsyncStorageService implements IStorageService {
  private readonly PREFIX = '@agendafamiliar:';
  private readonly SECURE_PREFIX = 'secure:';

  private getKey(key: string): string {
    return `${this.PREFIX}${key}`;
  }

  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    try {
      const item: StorageItem<T> = {
        value,
        createdAt: Date.now(),
        expiresAt: options?.expiresIn ? Date.now() + options.expiresIn : undefined,
      };

      const storageKey = this.getKey(key);
      const serialized = JSON.stringify(item);

      if (options?.encrypted) {
        await this.setSecure(key, serialized);
      } else {
        await AsyncStorage.setItem(storageKey, serialized);
      }
    } catch (error) {
      console.error('Error setting storage item:', error);
      throw new Error(`Failed to set item: ${key}`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const storageKey = this.getKey(key);
      const serialized = await AsyncStorage.getItem(storageKey);

      if (!serialized) return null;

      const item: StorageItem<T> = JSON.parse(serialized);

      // Verificar expiração
      if (item.expiresAt && Date.now() > item.expiresAt) {
        await this.remove(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('Error getting storage item:', error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const storageKey = this.getKey(key);
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error removing storage item:', error);
      throw new Error(`Failed to remove item: ${key}`);
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async keys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys
        .filter(key => key.startsWith(this.PREFIX))
        .map(key => key.replace(this.PREFIX, ''));
    } catch (error) {
      console.error('Error getting storage keys:', error);
      return [];
    }
  }

  async keysWithPrefix(prefix: string): Promise<string[]> {
    const allKeys = await this.keys();
    return allKeys.filter(key => key.startsWith(prefix));
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.keys();
      const storageKeys = keys.map(key => this.getKey(key));
      await AsyncStorage.multiRemove(storageKeys);
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw new Error('Failed to clear storage');
    }
  }

  async clearWithPrefix(prefix: string): Promise<void> {
    try {
      const keys = await this.keysWithPrefix(prefix);
      const storageKeys = keys.map(key => this.getKey(key));
      await AsyncStorage.multiRemove(storageKeys);
    } catch (error) {
      console.error('Error clearing storage with prefix:', error);
      throw new Error(`Failed to clear storage with prefix: ${prefix}`);
    }
  }

  async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const storageKeys = keys.map(key => this.getKey(key));
      const pairs = await AsyncStorage.multiGet(storageKeys);

      const result: Record<string, T | null> = {};

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const serialized = pairs[i][1];

        if (serialized) {
          try {
            const item: StorageItem<T> = JSON.parse(serialized);
            
            // Verificar expiração
            if (item.expiresAt && Date.now() > item.expiresAt) {
              result[key] = null;
              await this.remove(key);
            } else {
              result[key] = item.value;
            }
          } catch {
            result[key] = null;
          }
        } else {
          result[key] = null;
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting multiple items:', error);
      return keys.reduce((acc, key) => ({ ...acc, [key]: null }), {});
    }
  }

  async setMultiple<T>(items: Record<string, T>, options?: StorageOptions): Promise<void> {
    try {
      const pairs: [string, string][] = [];

      for (const [key, value] of Object.entries(items)) {
        const item: StorageItem<T> = {
          value,
          createdAt: Date.now(),
          expiresAt: options?.expiresIn ? Date.now() + options.expiresIn : undefined,
        };

        const storageKey = this.getKey(key);
        const serialized = JSON.stringify(item);
        pairs.push([storageKey, serialized]);
      }

      await AsyncStorage.multiSet(pairs);
    } catch (error) {
      console.error('Error setting multiple items:', error);
      throw new Error('Failed to set multiple items');
    }
  }

  async removeMultiple(keys: string[]): Promise<void> {
    try {
      const storageKeys = keys.map(key => this.getKey(key));
      await AsyncStorage.multiRemove(storageKeys);
    } catch (error) {
      console.error('Error removing multiple items:', error);
      throw new Error('Failed to remove multiple items');
    }
  }

  async setSecure(key: string, value: string): Promise<void> {
    try {
      const secureKey = `${this.SECURE_PREFIX}${key}`;
      await SecureStore.setItemAsync(secureKey, value);
    } catch (error) {
      console.error('Error setting secure item:', error);
      throw new Error(`Failed to set secure item: ${key}`);
    }
  }

  async getSecure(key: string): Promise<string | null> {
    try {
      const secureKey = `${this.SECURE_PREFIX}${key}`;
      return await SecureStore.getItemAsync(secureKey);
    } catch (error) {
      console.error('Error getting secure item:', error);
      return null;
    }
  }

  async removeSecure(key: string): Promise<void> {
    try {
      const secureKey = `${this.SECURE_PREFIX}${key}`;
      await SecureStore.deleteItemAsync(secureKey);
    } catch (error) {
      console.error('Error removing secure item:', error);
      throw new Error(`Failed to remove secure item: ${key}`);
    }
  }

  async getCacheInfo(): Promise<CacheInfo[]> {
    try {
      const keys = await this.keys();
      const cacheInfo: CacheInfo[] = [];

      for (const key of keys) {
        const storageKey = this.getKey(key);
        const serialized = await AsyncStorage.getItem(storageKey);

        if (serialized) {
          try {
            const item = JSON.parse(serialized);
            const size = new Blob([serialized]).size;

            cacheInfo.push({
              key,
              size,
              createdAt: item.createdAt,
              expiresAt: item.expiresAt,
            });
          } catch {
            // Ignorar itens corrompidos
          }
        }
      }

      return cacheInfo;
    } catch (error) {
      console.error('Error getting cache info:', error);
      return [];
    }
  }

  async getTotalSize(): Promise<number> {
    const cacheInfo = await this.getCacheInfo();
    return cacheInfo.reduce((total, info) => total + info.size, 0);
  }

  async clearExpired(): Promise<number> {
    try {
      const cacheInfo = await this.getCacheInfo();
      const now = Date.now();
      const expired = cacheInfo.filter(info => info.expiresAt && now > info.expiresAt);

      if (expired.length > 0) {
        await this.removeMultiple(expired.map(info => info.key));
      }

      return expired.length;
    } catch (error) {
      console.error('Error clearing expired items:', error);
      return 0;
    }
  }

  async migrate(fromVersion: number, toVersion: number): Promise<void> {
    console.log(`Migration from v${fromVersion} to v${toVersion} - not implemented`);
    // Implementar migrações conforme necessário
  }

  async exportAll(): Promise<Record<string, any>> {
    try {
      const keys = await this.keys();
      const data: Record<string, any> = {};

      for (const key of keys) {
        const value = await this.get(key);
        if (value !== null) {
          data[key] = value;
        }
      }

      return data;
    } catch (error) {
      console.error('Error exporting data:', error);
      return {};
    }
  }

  async importAll(data: Record<string, any>): Promise<void> {
    try {
      await this.setMultiple(data);
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Failed to import data');
    }
  }
}
