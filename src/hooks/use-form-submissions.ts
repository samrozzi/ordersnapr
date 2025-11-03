import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FormSubmission {
  id: string;
  org_id: string;
  form_template_id: string;
  created_by: string;
  job_id: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
  answers: Record<string, any>;
  attachments: any[];
  signature: any | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  form_templates?: {
    name: string;
    schema: any;
  };
}

export const useFormSubmissions = (orgId: string | null, filter?: {
  status?: string;
  createdBy?: string;
}) => {
  return useQuery({
    queryKey: ["form-submissions", orgId, filter],
    queryFn: async () => {
      if (!orgId) return [];
      
      let query = supabase
        .from("form_submissions")
        .select(`
          *,
          form_templates (name, schema)
        `)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (filter?.status) {
        query = query.eq("status", filter.status);
      }

      if (filter?.createdBy) {
        query = query.eq("created_by", filter.createdBy);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as FormSubmission[];
    },
    enabled: !!orgId,
  });
};

export const useCreateSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submission: {
      org_id: string;
      form_template_id: string;
      created_by: string;
      answers?: Record<string, any>;
      status?: string;
      job_id?: string | null;
      attachments?: any[];
      signature?: any | null;
    }) => {
      const { data, error } = await supabase
        .from("form_submissions")
        .insert([submission as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
      toast.success("Submission created");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create submission");
    },
  });
};

export const useUpdateSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FormSubmission> & { id: string }) => {
      const { data, error } = await supabase
        .from("form_submissions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update submission");
    },
  });
};

export const useDeleteSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // TODO: Delete associated files from storage
      const { error } = await supabase
        .from("form_submissions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-submissions"] });
      toast.success("Submission deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete submission");
    },
  });
};
