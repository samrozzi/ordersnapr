/**
 * React hook for background sync functionality
 * Automatically syncs pending operations when coming back online
 */

import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
  queueSync,
  processAllPendingSyncs,
  getPendingSyncCount,
  setupPeriodicSyncCheck,
  isBackgroundSyncSupported,
  SyncEntity,
  SyncOperation,
} from '@/lib/background-sync';

interface UseBackgroundSyncReturn {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncTime: number | null;
  isSupported: boolean;
  queueOperation: (entity: SyncEntity, operation: SyncOperation, data: any) => Promise<string>;
  syncNow: () => Promise<void>;
}

/**
 * Hook for managing background sync
 *
 * Usage:
 * ```tsx
 * const { queueOperation, pendingCount, isSyncing } = useBackgroundSync();
 *
 * // Queue an offline operation
 * await queueOperation('work_orders', 'insert', newWorkOrder);
 * ```
 */
export function useBackgroundSync(): UseBackgroundSyncReturn {
  const { isOnline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isSupported] = useState(isBackgroundSyncSupported());

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const count = await getPendingSyncCount();
    setPendingCount(count);
  }, []);

  // Queue an operation for sync
  const queueOperation = useCallback(
    async (entity: SyncEntity, operation: SyncOperation, data: any): Promise<string> => {
      const syncId = await queueSync(entity, operation, data);
      await updatePendingCount();
      return syncId;
    },
    [updatePendingCount]
  );

  // Manually trigger sync
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const results = await processAllPendingSyncs();
      console.log('Sync results:', results);

      if (results.successful > 0) {
        console.log(`Successfully synced ${results.successful} operation(s)`);
      }

      if (results.failed > 0) {
        console.warn(`Failed to sync ${results.failed} operation(s):`, results.errors);
      }

      setLastSyncTime(Date.now());
      await updatePendingCount();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, updatePendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      console.log('Device is online with pending syncs, syncing now...');
      syncNow();
    }
  }, [isOnline, pendingCount, isSyncing, syncNow]);

  // Setup periodic sync check
  useEffect(() => {
    const cleanup = setupPeriodicSyncCheck(30000); // Check every 30 seconds
    return cleanup;
  }, []);

  // Initial pending count check
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  return {
    pendingCount,
    isSyncing,
    lastSyncTime,
    isSupported,
    queueOperation,
    syncNow,
  };
}

/**
 * Hook variant that provides a wrapper for Supabase mutations
 * Automatically queues operations when offline
 */
export function useOfflineMutation<T = any>(
  entity: SyncEntity,
  operation: SyncOperation
) {
  const { isOnline } = useOnlineStatus();
  const { queueOperation } = useBackgroundSync();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (data: T, onlineFn: () => Promise<void>) => {
      setIsPending(true);
      setError(null);

      try {
        if (isOnline) {
          // Execute immediately if online
          await onlineFn();
        } else {
          // Queue for later if offline
          await queueOperation(entity, operation, data);
          console.log(`Operation queued for offline sync: ${entity} ${operation}`);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [isOnline, entity, operation, queueOperation]
  );

  return {
    mutate,
    isPending,
    error,
  };
}
