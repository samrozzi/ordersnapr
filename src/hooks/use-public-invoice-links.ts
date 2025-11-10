import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface InvoicePublicLink {
  id: string;
  invoice_id: string;
  org_id: string;
  token: string;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  is_active: boolean;
  allow_payment: boolean;
  created_by: string | null;
  created_at: string;
  last_viewed_at: string | null;
}

export function useInvoicePublicLinks(invoiceId?: string) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  // Fetch links for an invoice or all org links
  const { data: links = [], isLoading } = useQuery({
    queryKey: ["invoice-public-links", organization?.id, invoiceId],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from("invoice_public_links")
        .select("*")
        .eq("org_id", organization.id)
        .order("created_at", { ascending: false });

      if (invoiceId) {
        query = query.eq("invoice_id", invoiceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InvoicePublicLink[];
    },
    enabled: !!organization?.id,
  });

  // Generate shareable link
  const generateLink = useMutation({
    mutationFn: async ({
      invoiceId,
      expiresInDays,
      maxViews,
    }: {
      invoiceId: string;
      expiresInDays?: number;
      maxViews?: number;
    }) => {
      const { data, error } = await supabase.rpc("generate_invoice_public_link", {
        invoice_id_param: invoiceId,
        expires_in_days: expiresInDays || null,
        max_views_param: maxViews || null,
      });

      if (error) throw error;
      return data as string; // Returns token
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-public-links"] });
      toast.success("Shareable link generated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate link: ${error.message}`);
    },
  });

  // Deactivate link
  const deactivateLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("invoice_public_links")
        .update({ is_active: false })
        .eq("id", linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-public-links"] });
      toast.success("Link deactivated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to deactivate link: ${error.message}`);
    },
  });

  // Build full URL from token
  const getPublicUrl = (token: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/invoice/${token}`;
  };

  return {
    links,
    isLoading,
    generateLink: generateLink.mutateAsync,
    deactivateLink: deactivateLink.mutateAsync,
    getPublicUrl,
    isGenerating: generateLink.isPending,
  };
}

// Hook for viewing public invoice (unauthenticated)
export function usePublicInvoice(token: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-invoice", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invoice_by_token", {
        token_param: token,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Invoice not found or link expired");
      }

      return data[0] as {
        invoice_data: any;
        link_data: InvoicePublicLink;
        can_pay: boolean;
      };
    },
    enabled: !!token,
    retry: false,
  });

  return {
    invoice: data?.invoice_data,
    linkData: data?.link_data,
    canPay: data?.can_pay || false,
    isLoading,
    error,
  };
}
