import { useState, useEffect, useMemo } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";
import { useUserPreferences, useUpdateUserPreferences } from "@/hooks/use-user-preferences";

interface SidebarStateResult {
  enabledToggles: string[];
  storageKey: string | null;
  featureToggleVersion: number;
  updateToggles: (features: string[]) => Promise<void>;
}

const FREE_DEFAULTS = ["work_orders", "properties", "forms", "calendar"];
const ALL_FEATURES = ["work_orders", "properties", "forms", "calendar", "invoicing", "customers", "inventory", "reports", "files", "pos"];

/**
 * Optimized hook for managing sidebar state with database persistence
 * Reads from user_preferences table and updates in real-time
 */
export function useSidebarState(userId: string | null): SidebarStateResult {
  const { activeOrg } = useActiveOrg();
  const [featureToggleVersion, setFeatureToggleVersion] = useState(0);
  const [cachedToggles, setCachedToggles] = useState<string[]>(FREE_DEFAULTS);
  
  const workspaceId = activeOrg?.id ?? null;

  // Use user preferences hook to get sidebar state from database (workspace-aware)
  const { data: userPreferences } = useUserPreferences(userId, workspaceId);
  const updatePreferences = useUpdateUserPreferences();

  const storageKey = useMemo(() => {
    if (!userId) return null;
    return workspaceId === null
      ? `user_features_${userId}_personal`
      : `user_features_${userId}_org_${workspaceId}`;
  }, [userId, workspaceId]);

  // Load toggles from database when preferences or workspace changes
  useEffect(() => {
    if (!userId || !userPreferences) {
      setCachedToggles(FREE_DEFAULTS);
      return;
    }

    if (userPreferences.sidebar_enabled_features && userPreferences.sidebar_enabled_features.length > 0) {
      setCachedToggles(userPreferences.sidebar_enabled_features);
    } else {
      // Use smart defaults based on workspace
      const defaults = workspaceId ? ALL_FEATURES : FREE_DEFAULTS;
      setCachedToggles(defaults);
      
      // Save defaults to database
      updatePreferences.mutate({
        userId: userId,
        sidebarEnabledFeatures: defaults,
        workspaceId: workspaceId,
      });
    }
  }, [userId, userPreferences, workspaceId, updatePreferences]);

  // Listen for feature toggle updates
  useEffect(() => {
    const handler = () => {
      setFeatureToggleVersion((v) => v + 1);
    };
    
    window.addEventListener('userFeaturesUpdated', handler);
    return () => window.removeEventListener('userFeaturesUpdated', handler);
  }, []);

  const updateToggles = async (features: string[]) => {
    if (!userId) return;
    setCachedToggles(features);
    await updatePreferences.mutateAsync({
      userId: userId,
      sidebarEnabledFeatures: features,
      workspaceId: workspaceId,
    });
    window.dispatchEvent(new Event('userFeaturesUpdated'));
  };

  return {
    enabledToggles: cachedToggles,
    storageKey,
    featureToggleVersion,
    updateToggles,
  };
}
