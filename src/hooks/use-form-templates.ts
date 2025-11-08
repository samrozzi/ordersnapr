import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FormTemplate {
  id: string;
  org_id: string | null;
  is_global: boolean;
  name: string;
  slug: string;
  category: string | null;
  schema: any;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export const useFormTemplates = (orgId: string | null) => {
  return useQuery({
    queryKey: ["form-templates", orgId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      let query = supabase
        .from("form_templates")
        .select("*")
        .eq("is_active", true);

      if (orgId) {
        // Org user: show org + global templates
        query = query.or(`scope.eq.global,and(scope.eq.organization,org_id.eq.${orgId})`);
      } else {
        // Free tier user: ONLY user-scoped templates they created
        query = query
          .eq("created_by", user.id)
          .is("org_id", null)
          .eq("scope", "user");
      }
      
      const { data, error } = await query.order("name");

      if (error) throw error;
      return data as FormTemplate[];
    },
  });
};

export const useFormTemplate = (templateId: string | null) => {
  return useQuery({
    queryKey: ["form-template", templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const { data, error } = await supabase
        .from("form_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;
      return data as FormTemplate;
    },
    enabled: !!templateId,
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: {
      org_id: string;
      name: string;
      slug: string;
      category?: string | null;
      schema: any;
      is_global?: boolean;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("form_templates")
        .insert([template])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast.success("Template created");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create template");
    },
  });
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FormTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("form_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast.success("Template updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update template");
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("form_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast.success("Template deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete template");
    },
  });
};
