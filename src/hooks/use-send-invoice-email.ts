import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useActiveOrg } from "@/hooks/use-active-org";
import { toast } from "sonner";
import { generateInvoicePDF } from "@/lib/invoice-pdf-generator";

export interface InvoiceEmail {
  id: string;
  org_id: string;
  invoice_id: string;
  template_id: string | null;
  sent_to: string;
  cc: string | null;
  bcc: string | null;
  subject: string;
  body: string;
  status: "pending" | "sent" | "failed" | "bounced";
  sent_at: string | null;
  opened_at: string | null;
  error_message: string | null;
  sent_by: string | null;
  created_at: string;
}

export interface SendInvoiceEmailParams {
  invoiceId: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  templateId?: string;
  includePdf?: boolean;
}

export function useInvoiceEmailHistory(invoiceId?: string) {
  const { organization } = useAuth();

  const { data: emailHistory = [], isLoading } = useQuery({
    queryKey: ["invoice-emails", organization?.id, invoiceId],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from("invoice_emails")
        .select("*")
        .eq("org_id", organization.id)
        .order("created_at", { ascending: false });

      if (invoiceId) {
        query = query.eq("invoice_id", invoiceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InvoiceEmail[];
    },
    enabled: !!organization?.id,
  });

  return {
    emailHistory,
    isLoading,
  };
}

export function useSendInvoiceEmail() {
  const { user, organization } = useAuth();
  const queryClient = useQueryClient();

  const sendEmail = useMutation({
    mutationFn: async (params: SendInvoiceEmailParams) => {
      if (!organization?.id || !user?.id) {
        throw new Error("Organization or user not found");
      }

      // First, fetch the invoice data to generate PDF
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          *,
          customer:customers(*)
        `)
        .eq("id", params.invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      let pdfBase64: string | undefined;

      // Generate PDF if requested
      if (params.includePdf !== false) {
        try {
          // Prepare invoice data for PDF generation
          const pdfData = {
            number: invoice.number,
            issue_date: invoice.invoice_date || invoice.created_at,
            due_date: invoice.payment_due_date,
            status: invoice.status,
            line_items: invoice.line_items || [],
            subtotal_cents: invoice.subtotal_cents || 0,
            tax_cents: invoice.tax_cents || 0,
            discount_cents: invoice.discount_cents || 0,
            total_cents: invoice.total_cents || 0,
            paid_at: invoice.paid_at,
            paid_amount_cents: invoice.paid_amount_cents,
            customer_name: invoice.customer?.name || invoice.customer?.email || "Customer",
            customer_email: invoice.customer?.email,
            customer_phone: invoice.customer?.phone,
            customer_address: invoice.customer?.address,
            organization_name: organization.name,
            notes: invoice.notes,
            terms: invoice.terms,
          };

          const pdf = await generateInvoicePDF(pdfData);
          pdfBase64 = pdf.output("datauristring").split(",")[1]; // Get base64 part only
        } catch (error) {
          console.error("Failed to generate PDF:", error);
          toast.error("Failed to generate PDF attachment");
        }
      }

      // Create email record
      const { data: emailRecord, error: emailError } = await supabase
        .from("invoice_emails")
        .insert([
          {
            org_id: organization.id,
            invoice_id: params.invoiceId,
            template_id: params.templateId || null,
            sent_to: params.to,
            cc: params.cc || null,
            bcc: params.bcc || null,
            subject: params.subject,
            body: params.body,
            status: "pending",
            sent_by: user.id,
          },
        ])
        .select()
        .single();

      if (emailError) throw emailError;

      // Call Supabase Edge Function to send email
      try {
        const { data: sendResult, error: sendError } = await supabase.functions.invoke(
          "send-invoice-email",
          {
            body: {
              to: params.to,
              cc: params.cc,
              bcc: params.bcc,
              subject: params.subject,
              body: params.body,
              pdfAttachment: pdfBase64,
              invoiceNumber: invoice.number,
            },
          }
        );

        if (sendError) throw sendError;

        // Update email record as sent
        await supabase
          .from("invoice_emails")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", emailRecord.id);

        // Update invoice status to sent if it was draft
        if (invoice.status === "draft") {
          await supabase
            .from("invoices")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", params.invoiceId);
        }

        return { emailRecord, sendResult };
      } catch (error) {
        // Update email record as failed
        await supabase
          .from("invoice_emails")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", emailRecord.id);

        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-emails"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice email sent successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to send invoice email: ${error.message}`);
    },
  });

  return {
    sendEmail: sendEmail.mutateAsync,
    isSending: sendEmail.isPending,
  };
}
