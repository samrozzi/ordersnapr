import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgFeatures, OrgFeature, FeatureModule } from "@/hooks/use-features";

interface FeatureContextType {
  features: OrgFeature[];
  isLoading: boolean;
  hasFeature: (module: FeatureModule) => boolean;
  getFeatureConfig: (module: FeatureModule) => Record<string, any>;
  refresh: () => void;
  orgId: string | null;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orgId, setOrgId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchOrgId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", session.user.id)
        .single();

      setOrgId(profile?.organization_id || null);
    };

    fetchOrgId();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchOrgId();
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: features = [], isLoading } = useOrgFeatures(orgId);

  const hasFeature = (module: FeatureModule): boolean => {
    if (!features || features.length === 0) return false;
    const feature = features.find((f) => f.module === module);
    return feature?.enabled || false;
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
