import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FormTemplate {
  id: string;
  name: string;
  slug: string;
  schema: any;
  category?: string | null;
  is_active?: boolean | null;
  is_global?: boolean | null;
  org_id?: string | null;
  scope?: string | null;
  version?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
}

export interface FormSubmission {
  id: string;
  org_id: string;
  form_template_id: string;
  created_by: string;
  job_id: string | null;
  status: "draft" | "submitted" | "approved" | "rejected" | "logged";
  answers: Record<string, any>;
  attachments: any[];
  signature: any | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  pinned_at?: string | null;
  metadata?: {
    entryLabelPreferences?: Record<string, boolean>;
  };
  form_templates?: {
    name: string;
    schema: any;
  };
  creator_profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export const useFormSubmissions = (orgId: string | null, filter?: {
  status?: string;
  createdBy?: string;
}) => {
  return useQuery({
    queryKey: ["form-submissions", orgId, filter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      let query = supabase
        .from("form_submissions")
        .select(`
          *,
          form_templates (name, schema)
        `)
        .order("created_at", { ascending: false });

      // Handle org vs free tier users
      if (orgId) {
        query = query.eq("org_id", orgId);
      } else {
        // Free tier user - get their personal submissions
        query = query.eq("created_by", user.id).is("org_id", null);
      }

      if (filter?.status) {
        query = query.eq("status", filter.status);
      }

      if (filter?.createdBy) {
        query = query.eq("created_by", filter.createdBy);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch creator profiles separately
      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map(s => s.created_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", creatorIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        return data.map(submission => ({
          ...submission,
          creator_profile: profileMap.get(submission.created_by) || null
        })) as FormSubmission[];
      }
      
      return data as FormSubmission[];
    },
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
      metadata?: {
        entryLabelPreferences?: Record<string, boolean>;
      };
    }) => {
      const { data, error } = await supabase
        .from("form_submissions")
        .insert([submission as any])
        .select()
        .maybeSingle();

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
        .maybeSingle();

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
      // First, fetch the submission to get attachments
      const { data: submission, error: fetchError } = await supabase
        .from("form_submissions")
        .select("answers")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Delete associated files from storage
      if (submission?.answers) {
        const filesToDelete: string[] = [];

        // Extract file IDs from all fields in answers
        Object.values(submission.answers).forEach((answer: any) => {
          if (answer && typeof answer === 'object' && Array.isArray(answer)) {
            // Handle array of file objects
            answer.forEach((item: any) => {
              if (item && typeof item === 'object' && item.id) {
                filesToDelete.push(item.id);
              }
            });
          }
        });

        // Delete files from storage if any found
        if (filesToDelete.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('form-attachments')
            .remove(filesToDelete);

          if (storageError) {
            console.error('Failed to delete submission files from storage:', storageError);
          }
        }
      }

      // Now delete the submission
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
