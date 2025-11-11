/**
 * Enhanced offline caching system for multiple entity types
 * Provides IndexedDB-based caching for work orders, customers, properties, and invoices
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type EntityType = 'work_orders' | 'customers' | 'properties' | 'invoices';

interface CachedEntity {
  id: string;
  data: any;
  timestamp: number;
  lastModified: string;
}

interface OfflineCacheSchema extends DBSchema {
  work_orders: {
    key: string;
    value: CachedEntity;
    indexes: { 'by-timestamp': number };
  };
  customers: {
    key: string;
    value: CachedEntity;
    indexes: { 'by-timestamp': number };
  };
  properties: {
    key: string;
    value: CachedEntity;
    indexes: { 'by-timestamp': number };
  };
  invoices: {
    key: string;
    value: CachedEntity;
    indexes: { 'by-timestamp': number };
  };
  metadata: {
    key: string;
    value: {
      entityType: EntityType;
      lastSync: number;
      count: number;
    };
  };
}

let cacheDBPromise: Promise<IDBPDatabase<OfflineCacheSchema>> | null = null;

function getCacheDB() {
  if (!cacheDBPromise) {
    cacheDBPromise = openDB<OfflineCacheSchema>('ordersnapr-cache', 2, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create object stores for each entity type
        const entityTypes: EntityType[] = ['work_orders', 'customers', 'properties', 'invoices'];

        entityTypes.forEach(entityType => {
          if (!db.objectStoreNames.contains(entityType)) {
            const store = db.createObjectStore(entityType, { keyPath: 'id' });
            store.createIndex('by-timestamp', 'timestamp');
          }
        });

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'entityType' });
        }
      },
    });
  }
  return cacheDBPromise;
}

/**
 * Cache a single entity
 */
export async function cacheEntity(
  entityType: EntityType,
  id: string,
  data: any,
  lastModified?: string
): Promise<boolean> {
  try {
    const db = await getCacheDB();
    await db.put(entityType, {
      id,
      data,
      timestamp: Date.now(),
      lastModified: lastModified || new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error(`Failed to cache ${entityType}:`, error);
    return false;
  }
}

/**
 * Cache multiple entities at once
 */
export async function cacheEntities(
  entityType: EntityType,
  entities: Array<{ id: string; data: any; lastModified?: string }>
): Promise<number> {
  try {
    const db = await getCacheDB();
    const tx = db.transaction(entityType, 'readwrite');
    const store = tx.objectStore(entityType);

    let cached = 0;
    for (const entity of entities) {
      try {
        await store.put({
          id: entity.id,
          data: entity.data,
          timestamp: Date.now(),
          lastModified: entity.lastModified || new Date().toISOString(),
        });
        cached++;
      } catch (error) {
        console.error(`Failed to cache entity ${entity.id}:`, error);
      }
    }

    await tx.done;

    // Update metadata
    await updateSyncMetadata(entityType, cached);

    return cached;
  } catch (error) {
    console.error(`Failed to cache ${entityType} entities:`, error);
    return 0;
  }
}

/**
 * Get a single cached entity
 */
export async function getCachedEntity(
  entityType: EntityType,
  id: string
): Promise<any | null> {
  try {
    const db = await getCacheDB();
    const cached = await db.get(entityType, id);
    return cached?.data || null;
  } catch (error) {
    console.error(`Failed to get cached ${entityType}:`, error);
    return null;
  }
}

/**
 * Get all cached entities of a type
 */
export async function getAllCachedEntities(entityType: EntityType): Promise<any[]> {
  try {
    const db = await getCacheDB();
    const allCached = await db.getAll(entityType);
    return allCached.map(item => item.data);
  } catch (error) {
    console.error(`Failed to get all cached ${entityType}:`, error);
    return [];
  }
}

/**
 * Get cache metadata for an entity type
 */
export async function getCacheMetadata(entityType: EntityType) {
  try {
    const db = await getCacheDB();
    return await db.get('metadata', entityType);
  } catch (error) {
    console.error(`Failed to get cache metadata for ${entityType}:`, error);
    return null;
  }
}

/**
 * Update sync metadata
 */
async function updateSyncMetadata(entityType: EntityType, count: number): Promise<void> {
  try {
    const db = await getCacheDB();
    await db.put('metadata', {
      entityType,
      lastSync: Date.now(),
      count,
    });
  } catch (error) {
    console.error(`Failed to update sync metadata for ${entityType}:`, error);
  }
}

/**
 * Check if cache is stale (older than maxAge in milliseconds)
 */
export async function isCacheStale(
  entityType: EntityType,
  maxAge: number = 5 * 60 * 1000 // 5 minutes default
): Promise<boolean> {
  const metadata = await getCacheMetadata(entityType);
  if (!metadata) return true;
  return Date.now() - metadata.lastSync > maxAge;
}

/**
 * Clear all cached entities of a type
 */
export async function clearEntityCache(entityType: EntityType): Promise<void> {
  try {
    const db = await getCacheDB();
    await db.clear(entityType);
    await db.delete('metadata', entityType);
  } catch (error) {
    console.error(`Failed to clear cache for ${entityType}:`, error);
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  try {
    const db = await getCacheDB();
    const entityTypes: EntityType[] = ['work_orders', 'customers', 'properties', 'invoices'];

    for (const entityType of entityTypes) {
      await db.clear(entityType);
    }
    await db.clear('metadata');
  } catch (error) {
    console.error('Failed to clear all caches:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    const db = await getCacheDB();
    const entityTypes: EntityType[] = ['work_orders', 'customers', 'properties', 'invoices'];

    const stats: Record<EntityType, { count: number; lastSync: number | null }> = {
      work_orders: { count: 0, lastSync: null },
      customers: { count: 0, lastSync: null },
      properties: { count: 0, lastSync: null },
      invoices: { count: 0, lastSync: null },
    };

    for (const entityType of entityTypes) {
      const count = await db.count(entityType);
      const metadata = await db.get('metadata', entityType);
      stats[entityType] = {
        count,
        lastSync: metadata?.lastSync || null,
      };
    }

    return stats;
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return null;
  }
}

/**
 * Prune old cache entries (older than maxAge)
 */
export async function pruneOldCacheEntries(
  entityType: EntityType,
  maxAge: number = 24 * 60 * 60 * 1000 // 24 hours default
): Promise<number> {
  try {
    const db = await getCacheDB();
    const allEntries = await db.getAll(entityType);
    const cutoffTime = Date.now() - maxAge;

    let pruned = 0;
    const tx = db.transaction(entityType, 'readwrite');
    const store = tx.objectStore(entityType);

    for (const entry of allEntries) {
      if (entry.timestamp < cutoffTime) {
        await store.delete(entry.id);
        pruned++;
      }
    }

    await tx.done;
    return pruned;
  } catch (error) {
    console.error(`Failed to prune old cache entries for ${entityType}:`, error);
    return 0;
  }
}
