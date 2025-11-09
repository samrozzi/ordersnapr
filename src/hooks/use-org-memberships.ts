import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrgMembership {
  id: string;
  user_id: string;
  org_id: string;
  role: string;
  created_at: string;
  organization?: {
    id: string;
    name: string;
  };
}

export const useUserOrgMemberships = (userId: string | null) => {
  return useQuery({
    queryKey: ["user-org-memberships", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("org_memberships")
        .select(`
          *,
          organization:organizations(id, name)
        `)
        .eq("user_id", userId);

      if (error) throw error;
      return (data || []) as OrgMembership[];
    },
    enabled: !!userId,
  });
};

export const useOrgMembersWithMemberships = (orgId: string | null) => {
  return useQuery({
    queryKey: ["org-members-with-memberships", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("org_memberships")
        .select(`
          *,
          profiles(id, email, full_name, is_super_admin)
        `)
        .eq("org_id", orgId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });
};

export const useAddOrgMembership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      orgId,
      role = "staff",
    }: {
      userId: string;
      orgId: string;
      role?: string;
    }) => {
      const { data, error } = await supabase
        .from("org_memberships")
        .insert({
          user_id: userId,
          org_id: orgId,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-org-memberships", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["org-members-with-memberships"] });
    },
  });
};

export const useRemoveOrgMembership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from("org_memberships")
        .delete()
        .eq("id", membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-org-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["org-members-with-memberships"] });
    },
  });
};

export const useUpdateOrgMembershipRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      membershipId,
      role,
    }: {
      membershipId: string;
      role: string;
    }) => {
      const { error } = await supabase
        .from("org_memberships")
        .update({ role })
        .eq("id", membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-org-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["org-members-with-memberships"] });
    },
  });
};
