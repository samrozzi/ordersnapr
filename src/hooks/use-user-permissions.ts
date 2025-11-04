import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useUserPermissions = () => {
  return useQuery({
    queryKey: ["user-permissions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_super_admin, is_org_admin, organization_id")
        .eq("id", user.id)
        .single();

      if (!profile) return null;

      return {
        userId: user.id,
        isSuperAdmin: profile.is_super_admin || false,
        isOrgAdmin: profile.is_org_admin || false,
        organizationId: profile.organization_id,
      };
    },
  });
};
