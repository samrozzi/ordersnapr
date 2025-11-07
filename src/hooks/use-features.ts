import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrgFeature {
  id: string;
  org_id: string;
  module: string;
  enabled: boolean;
  config: Record<string, any>;
}

export type FeatureModule = 
  | "work_orders"
  | "calendar"
  | "properties"
  | "forms"
  | "reports"
  | "appointments"
  | "invoicing"
  | "inventory"
  | "customer_portal"
  | "pos"
  | "files";

export const useOrgFeatures = (orgId: string | null) => {
  return useQuery({
    queryKey: ["org-features", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from("org_features")
        .select("*")
        .eq("org_id", orgId);

      if (error) throw error;
      return data as OrgFeature[];
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000, // 10 min - features don't change often
    gcTime: 30 * 60 * 1000, // 30 min
  });
};

export const hasFeature = (
  features: OrgFeature[] | undefined,
  module: FeatureModule
): boolean => {
  if (!features) return false;
  const feature = features.find((f) => f.module === module);
  return feature?.enabled || false;
};

export const getFeatureConfig = (
  features: OrgFeature[] | undefined,
  module: FeatureModule
): Record<string, any> => {
  if (!features) return {};
  const feature = features.find((f) => f.module === module);
  return feature?.config || {};
};
