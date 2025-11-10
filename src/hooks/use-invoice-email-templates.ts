import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface InvoiceEmailTemplate {
  id: string;
  org_id: string;
  name: string;
  subject: string;
  body: string;
  is_default: boolean;
  include_pdf: boolean;
  cc_sender: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceEmailTemplateCreate = Omit<InvoiceEmailTemplate, "id" | "org_id" | "created_by" | "created_at" | "updated_at">;
export type InvoiceEmailTemplateUpdate = Partial<InvoiceEmailTemplateCreate>;

export function useInvoiceEmailTemplates() {
  const { user, organization } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all email templates for the organization
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["invoice-email-templates", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("invoice_email_templates")
        .select("*")
        .eq("org_id", organization.id)
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as InvoiceEmailTemplate[];
    },
    enabled: !!organization?.id,
  });

  // Get default template
  const defaultTemplate = templates.find((t) => t.is_default);

  // Create new template
  const createTemplate = useMutation({
    mutationFn: async (templateData: InvoiceEmailTemplateCreate) => {
      if (!organization?.id || !user?.id) {
        throw new Error("Organization or user not found");
      }

      const { data, error } = await supabase
        .from("invoice_email_templates")
        .insert([
          {
            ...templateData,
            org_id: organization.id,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data as InvoiceEmailTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-email-templates"] });
      toast.success("Email template created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  // Update template
  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: InvoiceEmailTemplateUpdate }) => {
      const { data, error } = await supabase
        .from("invoice_email_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as InvoiceEmailTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-email-templates"] });
      toast.success("Email template updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });

  // Delete template
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invoice_email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-email-templates"] });
      toast.success("Email template deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });

  // Set default template
  const setDefaultTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("invoice_email_templates")
        .update({ is_default: true })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as InvoiceEmailTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-email-templates"] });
      toast.success("Default template updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to set default template: ${error.message}`);
    },
  });

  // Render template with invoice data
  const renderTemplate = useMutation({
    mutationFn: async ({ templateText, invoiceId }: { templateText: string; invoiceId: string }) => {
      const { data, error } = await supabase.rpc("render_invoice_email_template", {
        template_text: templateText,
        invoice_id_param: invoiceId,
      });

      if (error) throw error;
      return data as string;
    },
  });

  return {
    templates,
    defaultTemplate,
    isLoading,
    createTemplate: createTemplate.mutateAsync,
    updateTemplate: updateTemplate.mutateAsync,
    deleteTemplate: deleteTemplate.mutateAsync,
    setDefaultTemplate: setDefaultTemplate.mutateAsync,
    renderTemplate: renderTemplate.mutateAsync,
    isCreating: createTemplate.isPending,
    isUpdating: updateTemplate.isPending,
    isDeleting: deleteTemplate.isPending,
  };
}
