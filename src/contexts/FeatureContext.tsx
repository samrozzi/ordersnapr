import React, { createContext, useContext, useEffect, useState } from "react";
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
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchOrgId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, active_org_id")
        .eq("id", session.user.id)
        .single();

      // Use active_org_id first (multi-org support), fallback to organization_id
      setOrgId(profile?.active_org_id || profile?.organization_id || null);
    };

    fetchOrgId();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchOrgId();
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: features = [], isLoading } = useOrgFeatures(orgId);

  const hasFeature = (module: FeatureModule): boolean => {
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
  };

  const canAccessFeature = (module: FeatureModule): boolean => {
    // Check if user has actual access (for locked/unlocked status)
    
    // Org users: check org_features
    if (features && features.length > 0 && orgId) {
      const feature = features.find((f) => f.module === module);
      return feature?.enabled || false;
    }
    
    // Free tier users: check if it's a free feature
    const FREE_TIER_FEATURES = ["work_orders", "properties", "forms", "calendar"];
    return FREE_TIER_FEATURES.includes(module);
  };

  const getFeatureConfig = (module: FeatureModule): Record<string, any> => {
    if (!features) return {};
    const feature = features.find((f) => f.module === module);
    return feature?.config || {};
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["org-features", orgId] });
  };

  return (
    <FeatureContext.Provider
      value={{
        features,
        isLoading,
        hasFeature,
        canAccessFeature,
        getFeatureConfig,
        refresh,
        orgId,
      }}
    >
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
