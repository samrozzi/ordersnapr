import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgFeatures, OrgFeature, FeatureModule } from "@/hooks/use-features";

interface FeatureContextType {
  features: OrgFeature[];
  isLoading: boolean;
  hasFeature: (module: FeatureModule) => boolean;
  canAccessFeature: (module: FeatureModule) => boolean;
  getFeatureConfig: (module: FeatureModule) => Record<string, any>;
  refresh: () => void;
  orgId: string | null;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchOrgId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, active_org_id, is_super_admin")
        .eq("id", session.user.id)
        .single();

      // Set super admin status
      setIsSuperAdmin(profile?.is_super_admin || false);

      // Use active_org_id first (multi-org support), fallback to organization_id
      setOrgId(profile?.active_org_id || profile?.organization_id || null);
    };

    fetchOrgId();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchOrgId();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen for localStorage changes to refresh features
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('user_features_')) {
        setRefreshKey((prev) => prev + 1);
      }
    };

    // Also listen to custom event for same-page updates
    const handleCustomUpdate = () => {
      setRefreshKey((prev) => prev + 1);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userFeaturesUpdated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userFeaturesUpdated', handleCustomUpdate);
    };
  }, []);

  const { data: features = [], isLoading } = useOrgFeatures(orgId);

  // Memoize hasFeature to ensure it updates when localStorage changes
  const hasFeature = useCallback((module: FeatureModule): boolean => {
    // Super admins have access to ALL features
    if (isSuperAdmin) return true;

    // ALWAYS check user preferences from localStorage FIRST
    if (userId) {
      const userFeaturesJson = localStorage.getItem(`user_features_${userId}`);
      if (userFeaturesJson) {
        try {
          const userFeatures: string[] = JSON.parse(userFeaturesJson);
          // User explicitly chose what to show - respect it
          return userFeatures.includes(module);
        } catch (e) {
          console.error("Error parsing user features:", e);
        }
      }
    }

    // No localStorage - use defaults based on org/free tier
    if (features && features.length > 0 && orgId) {
      // Org user without localStorage - show enabled org features
      const feature = features.find((f) => f.module === module);
      return feature?.enabled || false;
    }

    // Free tier user without localStorage - show defaults
    const FREE_TIER_DEFAULTS = ["work_orders", "properties", "forms", "calendar"];
    return FREE_TIER_DEFAULTS.includes(module);
  }, [isSuperAdmin, userId, features, orgId, refreshKey]); // refreshKey forces updates

  const canAccessFeature = useCallback((module: FeatureModule): boolean => {
    // Super admins have access to ALL features
    if (isSuperAdmin) return true;

    // Check if user has actual access (for locked/unlocked status)

    // Org users: check org_features
    if (features && features.length > 0 && orgId) {
      const feature = features.find((f) => f.module === module);
      return feature?.enabled || false;
    }

    // Free tier users: check if it's a free feature
    const FREE_TIER_FEATURES = ["work_orders", "properties", "forms", "calendar"];
    return FREE_TIER_FEATURES.includes(module);
  }, [isSuperAdmin, features, orgId]);

  const getFeatureConfig = useCallback((module: FeatureModule): Record<string, any> => {
    if (!features) return {};
    const feature = features.find((f) => f.module === module);
    return feature?.config || {};
  }, [features]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["org-features", orgId] });
  }, [queryClient, orgId]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    features,
    isLoading,
    hasFeature,
    canAccessFeature,
    getFeatureConfig,
    refresh,
    orgId,
  }), [features, isLoading, hasFeature, canAccessFeature, getFeatureConfig, refresh, orgId]);

  return (
    <FeatureContext.Provider value={contextValue}>
      {children}
    </FeatureContext.Provider>
  );
};

export const useFeatureContext = () => {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error("useFeatureContext must be used within a FeatureProvider");
  }
  return context;
};
