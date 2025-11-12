import { useState, useEffect, useMemo } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";

interface SidebarStateResult {
  enabledToggles: string[];
  storageKey: string | null;
  featureToggleVersion: number;
}

const FREE_DEFAULTS = ["work_orders", "properties", "forms", "calendar"];

/**
 * Optimized hook for managing sidebar state with minimal re-renders
 * Caches localStorage reads and only updates when necessary
 */
export function useSidebarState(userId: string | null): SidebarStateResult {
  const { activeOrg } = useActiveOrg();
  const [featureToggleVersion, setFeatureToggleVersion] = useState(0);
  const [cachedToggles, setCachedToggles] = useState<string[]>(FREE_DEFAULTS);

  const storageKey = useMemo(() => {
    if (!userId) return null;
    const orgId = activeOrg?.id ?? null;
    return orgId === null 
      ? `user_features_${userId}_personal` 
      : `user_features_${userId}_org_${orgId}`;
  }, [userId, activeOrg?.id]);

  // Load toggles from localStorage only when storage key changes
  useEffect(() => {
    if (!storageKey) {
      setCachedToggles(FREE_DEFAULTS);
      return;
    }

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setCachedToggles(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to parse saved sidebar toggles, using defaults.", e);
        setCachedToggles(FREE_DEFAULTS);
      }
    } else {
      setCachedToggles(FREE_DEFAULTS);
    }
  }, [storageKey]);

  // Listen for feature toggle updates
  useEffect(() => {
    const handler = () => {
      setFeatureToggleVersion((v) => v + 1);
      // Reload toggles when features are updated
      if (storageKey) {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            setCachedToggles(JSON.parse(saved));
          } catch (e) {
            console.warn("Failed to parse sidebar toggles after update", e);
          }
        }
      }
    };
    
    window.addEventListener('userFeaturesUpdated', handler);
    return () => window.removeEventListener('userFeaturesUpdated', handler);
  }, [storageKey]);

  return {
    enabledToggles: cachedToggles,
    storageKey,
    featureToggleVersion,
  };
}
