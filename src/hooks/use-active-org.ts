import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  logo_url?: string | null;
}

export interface OrgMembership {
  id: string;
  org_id: string;
  role: string;
  organization: Organization;
}

export const useActiveOrg = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's profile with active org
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("active_org_id, organization_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user's org memberships
  const { data: memberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ["org-memberships", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("org_memberships")
        .select(`
          id,
          org_id,
          role,
          organization:organizations(id, name, slug)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      
      return (data || []).map((m: any) => ({
        id: m.id,
        org_id: m.org_id,
        role: m.role,
        organization: m.organization,
      })) as OrgMembership[];
    },
    enabled: !!user,
  });

  // Fetch organization settings for logo
  const { data: orgSettings } = useQuery({
    queryKey: ["org-settings", profile?.active_org_id],
    queryFn: async () => {
      if (!profile?.active_org_id) return null;

      const { data, error } = await supabase
        .from("organization_settings")
        .select("logo_url")
        .eq("organization_id", profile.active_org_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.active_org_id,
  });

  // Switch organization context
  const switchOrg = useMutation({
    mutationFn: async (orgId: string | null) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ active_org_id: orgId })
        .eq("id", user.id);

      if (error) throw error;
      return orgId;
    },
    onSuccess: (orgId) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["org-settings"] });
      queryClient.invalidateQueries({ queryKey: ["org-features"] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });

      if (orgId === null) {
        toast.success("Switched to Personal Workspace - Refreshing...");
      } else {
        const org = memberships?.find((m) => m.org_id === orgId);
        toast.success(`Switched to ${org?.organization.name || "organization"} - Refreshing...`);
      }

      // Reload page after brief delay to show toast
      setTimeout(() => {
        window.location.reload();
      }, 800);
    },
    onError: (error) => {
      console.error("Error switching organization:", error);
      toast.error("Failed to switch organization");
    },
  });

  const activeOrgId = profile?.active_org_id || null;
  const activeOrg = memberships?.find((m) => m.org_id === activeOrgId)?.organization || null;
  
  // Check if user is in personal workspace (no active org)
  const isPersonalWorkspace = activeOrgId === null;

  return {
    activeOrgId,
    activeOrg,
    orgLogoUrl: orgSettings?.logo_url || null,
    memberships: memberships || [],
    isPersonalWorkspace,
    isLoading: profileLoading || membershipsLoading,
    switchOrg: (orgId: string | null) => switchOrg.mutate(orgId),
    isSwitching: switchOrg.isPending,
  };
};
