import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useActiveOrg } from "./use-active-org";
import { toast } from "sonner";
import type { InvoiceLineItem } from "./use-invoices";

export interface InvoiceTemplate {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  line_items: InvoiceLineItem[];
  payment_terms_days: number;
  terms: string | null;
  notes: string | null;
  tax_rate: number;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useInvoiceTemplates() {
  const { user } = useAuth();
  const { activeOrgId } = useActiveOrg();
  const queryClient = useQueryClient();

  // Fetch all templates for the organization
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["invoice-templates", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];

      const { data, error } = await (supabase as any)
        .from("invoice_templates")
        .select("*")
        .eq("org_id", activeOrgId)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as InvoiceTemplate[];
    },
    enabled: !!activeOrgId,
  });

  // Get default template
  const defaultTemplate = templates.find((t) => t.is_default) || null;

  // Create template
  const createTemplate = useMutation({
    mutationFn: async (templateData: Partial<InvoiceTemplate>) => {
      if (!activeOrgId) throw new Error("Organization required");

      const { data, error } = await (supabase as any)
        .from("invoice_templates")
        .insert([
          {
            ...templateData,
            org_id: activeOrgId,
            created_by: user!.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] });
      toast.success("Template created successfully");
    },
    onError: (error: any) => {
      console.error("Error creating template:", error);
      toast.error(error.message || "Failed to create template");
    },
  });

  // Update template
  const updateTemplate = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<InvoiceTemplate>;
    }) => {
      const { data, error } = await (supabase as any)
        .from("invoice_templates")
        .update(updates)
        .eq("id", id)
        .eq("org_id", activeOrgId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] });
      toast.success("Template updated successfully");
    },
    onError: (error: any) => {
      console.error("Error updating template:", error);
      toast.error(error.message || "Failed to update template");
    },
  });

  // Delete template
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("invoice_templates")
        .delete()
        .eq("id", id)
        .eq("org_id", activeOrgId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] });
      toast.success("Template deleted successfully");
    },
    onError: (error: any) => {
      console.error("Error deleting template:", error);
      toast.error(error.message || "Failed to delete template");
    },
  });

  // Set default template
  const setDefaultTemplate = useMutation({
    mutationFn: async (id: string) => {
      if (!activeOrgId) throw new Error("Organization required");

      // First, unset all defaults
      await (supabase as any)
        .from("invoice_templates")
        .update({ is_default: false })
        .eq("org_id", activeOrgId);

      // Then set the new default
      const { data, error } = await (supabase as any)
        .from("invoice_templates")
        .update({ is_default: true })
        .eq("id", id)
        .eq("org_id", activeOrgId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] });
      toast.success("Default template updated");
    },
    onError: (error: any) => {
      console.error("Error setting default template:", error);
      toast.error(error.message || "Failed to set default template");
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
  };
}
