import { useState, useEffect, useMemo } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";

interface SidebarStateResult {
  enabledToggles: string[];
  storageKey: string | null;
  featureToggleVersion: number;
}

const FREE_DEFAULTS = ["work_orders", "properties", "forms", "calendar"];
const ALL_FEATURES = ["work_orders", "properties", "forms", "calendar", "invoicing", "customers", "inventory", "reports", "files", "pos"];

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
        // Use org-aware defaults on error
        const defaults = activeOrg?.id ? ALL_FEATURES : FREE_DEFAULTS;
        setCachedToggles(defaults);
      }
    } else {
      // No saved preferences - use smart defaults based on workspace
      // For org users: show all features (FeatureContext will handle access control)
      // For personal workspace: only show free features
      const defaults = activeOrg?.id ? ALL_FEATURES : FREE_DEFAULTS;
      setCachedToggles(defaults);
    }
  }, [storageKey, activeOrg?.id]);

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
