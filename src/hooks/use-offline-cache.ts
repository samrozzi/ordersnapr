/**
 * React hook for managing offline-first data caching
 * Integrates with existing data fetching to provide offline support
 */

import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
  EntityType,
  cacheEntities,
  getAllCachedEntities,
  isCacheStale,
  getCacheMetadata,
  clearEntityCache,
} from '@/lib/offline-cache';

interface UseOfflineCacheOptions<T> {
  entityType: EntityType;
  fetchFn: () => Promise<T[]>;
  enabled?: boolean;
  cacheMaxAge?: number; // milliseconds
  refetchOnReconnect?: boolean;
}

interface UseOfflineCacheReturn<T> {
  data: T[];
  isLoading: boolean;
  isFromCache: boolean;
  isCacheStale: boolean;
  lastSync: number | null;
  refetch: () => Promise<void>;
  clearCache: () => Promise<void>;
}

/**
 * Hook for offline-first data caching
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, isFromCache } = useOfflineCache({
 *   entityType: 'work_orders',
 *   fetchFn: async () => {
 *     const { data } = await supabase.from('work_orders').select('*');
 *     return data || [];
 *   },
 * });
 * ```
 */
export function useOfflineCache<T = any>({
  entityType,
  fetchFn,
  enabled = true,
  cacheMaxAge = 5 * 60 * 1000, // 5 minutes
  refetchOnReconnect = true,
}: UseOfflineCacheOptions<T>): UseOfflineCacheReturn<T> {
  const { isOnline } = useOnlineStatus();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheStale, setCacheStale] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Load data from cache first (optimistic)
  const loadFromCache = useCallback(async () => {
    const cachedData = await getAllCachedEntities(entityType);
    if (cachedData.length > 0) {
      setData(cachedData as T[]);
      setIsFromCache(true);

      const metadata = await getCacheMetadata(entityType);
      if (metadata) {
        setLastSync(metadata.lastSync);
      }
    }

    const stale = await isCacheStale(entityType, cacheMaxAge);
    setCacheStale(stale);
  }, [entityType, cacheMaxAge]);

  // Fetch fresh data and update cache
  const fetchAndCache = useCallback(async () => {
    if (!enabled || !isOnline) return;

    try {
      setIsLoading(true);
      const freshData = await fetchFn();

      // Cache the fresh data
      const entitiesToCache = freshData.map((item: any) => ({
        id: item.id,
        data: item,
        lastModified: item.updated_at || item.created_at || new Date().toISOString(),
      }));

      await cacheEntities(entityType, entitiesToCache);

      setData(freshData);
      setIsFromCache(false);
      setCacheStale(false);
      setLastSync(Date.now());
    } catch (error) {
      console.error(`Failed to fetch ${entityType}:`, error);
      // If fetch fails, keep showing cached data
    } finally {
      setIsLoading(false);
    }
  }, [entityType, fetchFn, enabled, isOnline]);

  // Refetch function
  const refetch = useCallback(async () => {
    await fetchAndCache();
  }, [fetchAndCache]);

  // Clear cache function
  const clearCache = useCallback(async () => {
    await clearEntityCache(entityType);
    setData([]);
    setIsFromCache(false);
    setLastSync(null);
  }, [entityType]);

  // Initial load: try cache first, then fetch if online
  useEffect(() => {
    if (!enabled) return;

    const initialize = async () => {
      setIsLoading(true);

      // Load from cache immediately
      await loadFromCache();

      // Then fetch fresh data if online
      if (isOnline) {
        await fetchAndCache();
      } else {
        setIsLoading(false);
      }
    };

    initialize();
  }, [enabled, loadFromCache, fetchAndCache, isOnline]);

  // Refetch when coming back online
  useEffect(() => {
    if (refetchOnReconnect && isOnline && enabled && cacheStale) {
      fetchAndCache();
    }
  }, [isOnline, refetchOnReconnect, enabled, cacheStale, fetchAndCache]);

  return {
    data,
    isLoading,
    isFromCache,
    isCacheStale: cacheStale,
    lastSync,
    refetch,
    clearCache,
  };
}

/**
 * Hook variant that works alongside existing React Query hooks
 * Provides cache layer without replacing the main data source
 */
export function useOfflineCacheLayer<T = any>(
  entityType: EntityType,
  data: T[] | undefined,
  isLoading: boolean
) {
  const { isOnline } = useOnlineStatus();
  const [cachedData, setCachedData] = useState<T[]>([]);
  const [hasCachedData, setHasCachedData] = useState(false);

  // Load cached data on mount
  useEffect(() => {
    const loadCache = async () => {
      const cached = await getAllCachedEntities(entityType);
      if (cached.length > 0) {
        setCachedData(cached as T[]);
        setHasCachedData(true);
      }
    };
    loadCache();
  }, [entityType]);

  // Update cache when fresh data arrives
  useEffect(() => {
    if (data && data.length > 0 && isOnline) {
      const entitiesToCache = data.map((item: any) => ({
        id: item.id,
        data: item,
        lastModified: item.updated_at || item.created_at || new Date().toISOString(),
      }));

      cacheEntities(entityType, entitiesToCache).then(() => {
        setCachedData(data);
        setHasCachedData(true);
      });
    }
  }, [data, entityType, isOnline]);

  // Return cached data if offline and no fresh data
  const effectiveData = data || (hasCachedData ? cachedData : []);
  const isShowingCache = !data && hasCachedData;

  return {
    data: effectiveData,
    isLoading: isLoading && !isShowingCache,
    isFromCache: isShowingCache,
  };
}
