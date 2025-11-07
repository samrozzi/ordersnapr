import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { supabase } from '@/integrations/supabase/client';

interface SyncQueueSchema extends DBSchema {
  syncQueue: {
    key: string;
    value: {
      id: string;
      type: 'save' | 'submit';
      data: any;
      timestamp: number;
      retryCount: number;
      maxRetries: number;
    };
  };
}

let queueDBPromise: Promise<IDBPDatabase<SyncQueueSchema>> | null = null;

function getQueueDB() {
  if (!queueDBPromise) {
    queueDBPromise = openDB<SyncQueueSchema>('ordersnapr-sync-queue', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
      },
    });
  }
  return queueDBPromise;
}

export async function addToSyncQueue(operation: {
  id: string;
  type: 'save' | 'submit';
  data: any;
}) {
  try {
    const db = await getQueueDB();
    await db.put('syncQueue', {
      ...operation,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    });
  } catch (error) {
    console.error('Failed to add to sync queue:', error);
  }
}

export async function processSyncQueue() {
  try {
    const db = await getQueueDB();
    const pending = await db.getAll('syncQueue');
    
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: any }>,
    };

    for (const operation of pending) {
      try {
        if (operation.type === 'save') {
          await supabase
            .from('form_submissions')
            .update({
              answers: operation.data.answers,
              signature: operation.data.signature,
              metadata: operation.data.metadata,
              updated_at: new Date().toISOString(),
            })
            .eq('id', operation.data.submissionId);
        } else if (operation.type === 'submit') {
          await supabase
            .from('form_submissions')
            .insert([operation.data]);
        }

        await db.delete('syncQueue', operation.id);
        results.successful++;
      } catch (error) {
        operation.retryCount++;
        
        if (operation.retryCount >= operation.maxRetries) {
          await db.delete('syncQueue', operation.id);
          results.failed++;
          results.errors.push({ id: operation.id, error });
        } else {
          await db.put('syncQueue', operation);
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Failed to process sync queue:', error);
    return { successful: 0, failed: 0, errors: [] };
  }
}

export async function getPendingSyncCount() {
  try {
    const db = await getQueueDB();
    const pending = await db.getAll('syncQueue');
    return pending.length;
  } catch (error) {
    console.error('Failed to get pending sync count:', error);
    return 0;
  }
}

export async function clearSyncQueue() {
  try {
    const db = await getQueueDB();
    await db.clear('syncQueue');
  } catch (error) {
    console.error('Failed to clear sync queue:', error);
  }
}
