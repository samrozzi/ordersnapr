/**
 * Enhanced Background Sync System
 * Uses Background Sync API when available, falls back to manual sync
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { supabase } from '@/integrations/supabase/client';

export type SyncOperation = 'insert' | 'update' | 'delete';
export type SyncEntity = 'work_orders' | 'customers' | 'properties' | 'invoices' | 'form_submissions';

interface PendingSync {
  id: string;
  entity: SyncEntity;
  operation: SyncOperation;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
}

interface BackgroundSyncSchema extends DBSchema {
  pending_syncs: {
    key: string;
    value: PendingSync;
    indexes: { 'by-timestamp': number; 'by-entity': SyncEntity };
  };
}

let syncDBPromise: Promise<IDBPDatabase<BackgroundSyncSchema>> | null = null;

function getSyncDB() {
  if (!syncDBPromise) {
    syncDBPromise = openDB<BackgroundSyncSchema>('ordersnapr-background-sync', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending_syncs')) {
          const store = db.createObjectStore('pending_syncs', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-entity', 'entity');
        }
      },
    });
  }
  return syncDBPromise;
}

/**
 * Queue an operation for background sync
 */
export async function queueSync(
  entity: SyncEntity,
  operation: SyncOperation,
  data: any,
  id?: string
): Promise<string> {
  try {
    const db = await getSyncDB();
    const syncId = id || `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const pendingSync: PendingSync = {
      id: syncId,
      entity,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 5,
    };

    await db.put('pending_syncs', pendingSync);

    // Register background sync if available
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      try {
        await (registration as any).sync.register(`sync-${entity}`);
        console.log(`Background sync registered for ${entity}`);
      } catch (error) {
        console.warn('Background sync registration failed, will use manual sync:', error);
      }
    }

    return syncId;
  } catch (error) {
    console.error('Failed to queue sync:', error);
    throw error;
  }
}

/**
 * Process a single pending sync
 */
async function processSingleSync(sync: PendingSync): Promise<boolean> {
  try {
    const { entity, operation, data } = sync;

    switch (operation) {
      case 'insert':
        await supabase.from(entity).insert([data]);
        break;

      case 'update':
        if (!data.id) throw new Error('Update operation requires an id');
        const { id, ...updateData } = data;
        await supabase.from(entity).update(updateData).eq('id', id);
        break;

      case 'delete':
        if (!data.id) throw new Error('Delete operation requires an id');
        await supabase.from(entity).delete().eq('id', data.id);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return true;
  } catch (error: any) {
    console.error('Sync operation failed:', error);
    sync.lastError = error.message || 'Unknown error';
    return false;
  }
}

/**
 * Process all pending syncs
 */
export async function processAllPendingSyncs(): Promise<{
  successful: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}> {
  try {
    const db = await getSyncDB();
    const pending = await db.getAll('pending_syncs');

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    for (const sync of pending) {
      const success = await processSingleSync(sync);

      if (success) {
        // Remove from queue on success
        await db.delete('pending_syncs', sync.id);
        results.successful++;
      } else {
        // Increment retry count
        sync.retryCount++;

        if (sync.retryCount >= sync.maxRetries) {
          // Max retries reached, remove and report failure
          await db.delete('pending_syncs', sync.id);
          results.failed++;
          results.errors.push({
            id: sync.id,
            error: sync.lastError || 'Max retries exceeded',
          });
        } else {
          // Update with new retry count
          await db.put('pending_syncs', sync);
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Failed to process pending syncs:', error);
    return { successful: 0, failed: 0, errors: [] };
  }
}

/**
 * Get count of pending syncs
 */
export async function getPendingSyncCount(): Promise<number> {
  try {
    const db = await getSyncDB();
    return await db.count('pending_syncs');
  } catch (error) {
    console.error('Failed to get pending sync count:', error);
    return 0;
  }
}

/**
 * Get pending syncs for a specific entity
 */
export async function getPendingSyncsForEntity(entity: SyncEntity): Promise<PendingSync[]> {
  try {
    const db = await getSyncDB();
    const index = db.transaction('pending_syncs').store.index('by-entity');
    return await index.getAll(entity);
  } catch (error) {
    console.error(`Failed to get pending syncs for ${entity}:`, error);
    return [];
  }
}

/**
 * Clear all pending syncs (use with caution)
 */
export async function clearAllPendingSyncs(): Promise<void> {
  try {
    const db = await getSyncDB();
    await db.clear('pending_syncs');
  } catch (error) {
    console.error('Failed to clear pending syncs:', error);
  }
}

/**
 * Remove a specific pending sync
 */
export async function removePendingSync(id: string): Promise<void> {
  try {
    const db = await getSyncDB();
    await db.delete('pending_syncs', id);
  } catch (error) {
    console.error(`Failed to remove pending sync ${id}:`, error);
  }
}

/**
 * Check if Background Sync API is supported
 */
export function isBackgroundSyncSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'sync' in ServiceWorkerRegistration.prototype
  );
}

/**
 * Setup periodic sync check (fallback for browsers without Background Sync API)
 */
export function setupPeriodicSyncCheck(intervalMs: number = 30000): () => void {
  const checkAndSync = async () => {
    const count = await getPendingSyncCount();
    if (count > 0 && navigator.onLine) {
      console.log(`Found ${count} pending syncs, processing...`);
      await processAllPendingSyncs();
    }
  };

  // Check immediately
  checkAndSync();

  // Then check periodically
  const intervalId = setInterval(checkAndSync, intervalMs);

  // Return cleanup function
  return () => clearInterval(intervalId);
}
