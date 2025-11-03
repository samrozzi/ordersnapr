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
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from("form_templates")
        .select("*")
        .or(`is_global.eq.true,org_id.eq.${orgId}`)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as FormTemplate[];
    },
    enabled: !!orgId,
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
