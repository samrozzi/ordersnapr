import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FormSubmission } from "./use-form-submissions";

export const useToggleFormPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("form_submissions")
        .update({ 
          is_pinned: !isPinned,
          pinned_at: !isPinned ? new Date().toISOString() : null
        } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["pinned-forms"] });
      toast.success(variables.isPinned ? "Form unpinned" : "Form pinned");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to toggle pin");
    },
  });
};

export const usePinnedForms = (orgId: string | null) => {
  return useQuery<FormSubmission[]>({
    queryKey: ["pinned-forms", orgId],
    queryFn: async (): Promise<FormSubmission[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from("form_submissions")
        .select(`
          *,
          form_templates (name, schema)
        `) as any;
      
      query = query
        .eq("is_pinned", true)
        .order("pinned_at", { ascending: false })
        .limit(7);

      if (orgId) {
        query = query.eq("org_id", orgId);
      } else {
        query = query.eq("created_by", user.id).is("org_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as FormSubmission[];
    },
  });
};
