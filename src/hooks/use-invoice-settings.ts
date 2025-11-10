import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveOrg } from "./use-active-org";
import { toast } from "sonner";

export interface InvoiceSettings {
  id: string;
  org_id: string;
  invoice_prefix: string;
  next_invoice_number: number;
  invoice_number_padding: number;
  default_payment_terms_days: number;
  default_terms: string | null;
  default_notes: string | null;
  default_tax_rate: number;
  tax_label: string;
  logo_url: string | null;
  primary_color: string | null;
  show_logo: boolean;
  send_copy_to_sender: boolean;
  email_subject_template: string;
  email_body_template: string | null;
  auto_send_reminders: boolean;
  reminder_days_before: number[];
  reminder_days_after: number[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useInvoiceSettings() {
  const { activeOrgId } = useActiveOrg();
  const queryClient = useQueryClient();

  // Fetch invoice settings for the organization
  const { data: settings, isLoading } = useQuery({
    queryKey: ["invoice-settings", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return null;

      const { data, error } = await (supabase as any)
        .from("invoice_settings")
        .select("*")
        .eq("org_id", activeOrgId)
        .maybeSingle();

      // If no settings exist, create default settings
      if (!data) {
        const { data: newSettings, error: createError } = await (supabase as any)
          .from("invoice_settings")
          .insert([{ org_id: activeOrgId }])
          .select()
          .single();

        if (createError) throw createError;
        return newSettings as InvoiceSettings;
      }

      if (error) throw error;
      return data as InvoiceSettings;
    },
    enabled: !!activeOrgId,
  });

  // Update settings
  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<InvoiceSettings>) => {
      if (!activeOrgId) throw new Error("Organization required");

      const { data, error } = await (supabase as any)
        .from("invoice_settings")
        .update(updates)
        .eq("org_id", activeOrgId)
        .select()
        .single();

      if (error) throw error;
      return data as InvoiceSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-settings"] });
      toast.success("Invoice settings updated successfully");
    },
    onError: (error: any) => {
      console.error("Error updating settings:", error);
      toast.error(error.message || "Failed to update settings");
    },
  });

  // Helper: Get next invoice number
  const getNextInvoiceNumber = async (): Promise<string> => {
    if (!activeOrgId) throw new Error("Organization required");

    const { data, error } = await (supabase as any).rpc("get_next_invoice_number", {
      org_id_param: activeOrgId,
    });

    if (error) throw error;
    return (data as string) ?? "";
  };

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutateAsync,
    getNextInvoiceNumber,
  };
}

// Hook for clone invoice functionality
export function useCloneInvoice() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useActiveOrg();
  const queryClientLocal = useQueryClient();

  const cloneInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await (supabase as any).rpc("clone_invoice", {
        invoice_id_param: invoiceId,
      });

      if (error) throw error;
      return data as string; // Returns new invoice ID
    },
    onSuccess: () => {
      queryClientLocal.invalidateQueries({ queryKey: ["invoices", activeOrgId] });
      toast.success("Invoice cloned successfully");
    },
    onError: (error: any) => {
      console.error("Error cloning invoice:", error);
      toast.error(error.message || "Failed to clone invoice");
    },
  });

  return {
    cloneInvoice: cloneInvoice.mutateAsync,
    isCloning: cloneInvoice.isPending,
  };
}
