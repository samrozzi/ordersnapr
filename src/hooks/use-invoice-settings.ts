import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
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
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  // Fetch invoice settings for the organization
  const { data: settings, isLoading } = useQuery({
    queryKey: ["invoice-settings", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;

      const { data, error } = await supabase
        .from("invoice_settings")
        .select("*")
        .eq("org_id", organization.id)
        .single();

      // If no settings exist, create default settings
      if (error && error.code === 'PGRST116') {
        const { data: newSettings, error: createError } = await supabase
          .from("invoice_settings")
          .insert([{ org_id: organization.id }])
          .select()
          .single();

        if (createError) throw createError;
        return newSettings as InvoiceSettings;
      }

      if (error) throw error;
      return data as InvoiceSettings;
    },
    enabled: !!organization?.id,
  });

  // Update settings
  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<InvoiceSettings>) => {
      if (!organization?.id) throw new Error("Organization required");

      const { data, error } = await supabase
        .from("invoice_settings")
        .update(updates)
        .eq("org_id", organization.id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
    if (!organization?.id) throw new Error("Organization required");

    const { data, error } = await supabase.rpc("get_next_invoice_number", {
      org_id_param: organization.id,
    });

    if (error) throw error;
    return data as string;
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
  const { organization } = useAuth();

  const cloneInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.rpc("clone_invoice", {
        invoice_id_param: invoiceId,
      });

      if (error) throw error;
      return data as string; // Returns new invoice ID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", organization?.id] });
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
