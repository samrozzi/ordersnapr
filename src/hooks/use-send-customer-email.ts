import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendInvoiceEmailParams {
  recipientEmail: string;
  recipientName: string;
  invoiceNumber: string;
  invoiceData: {
    issue_date: string;
    due_date: string | null;
    total_cents: number;
    status: string;
  };
  portalToken?: string;
  organizationName?: string;
}

interface SendPortalLinkEmailParams {
  recipientEmail: string;
  recipientName: string;
  portalToken: string;
  organizationName?: string;
  message?: string;
}

export function useSendCustomerEmail() {
  const sendInvoiceEmail = useMutation({
    mutationFn: async (params: SendInvoiceEmailParams) => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("send-customer-email", {
        body: {
          type: "invoice",
          data: params,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Invoice email sent successfully!");
    },
    onError: (error: any) => {
      console.error("Error sending invoice email:", error);
      toast.error(error.message || "Failed to send invoice email");
    },
  });

  const sendPortalLinkEmail = useMutation({
    mutationFn: async (params: SendPortalLinkEmailParams) => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("send-customer-email", {
        body: {
          type: "portal_link",
          data: params,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Portal link email sent successfully!");
    },
    onError: (error: any) => {
      console.error("Error sending portal link email:", error);
      toast.error(error.message || "Failed to send portal link email");
    },
  });

  return {
    sendInvoiceEmail: sendInvoiceEmail.mutateAsync,
    sendPortalLinkEmail: sendPortalLinkEmail.mutateAsync,
    isSendingInvoice: sendInvoiceEmail.isPending,
    isSendingPortalLink: sendPortalLinkEmail.isPending,
  };
}
