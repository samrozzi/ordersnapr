import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateInvoicePDF } from "@/lib/invoice-pdf-generator";
import { toast } from "sonner";

export function useInvoicePDF() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async (invoice: any) => {
    setIsGenerating(true);
    try {
      // Fetch organization details if available
      let organizationName: string | undefined;

      if (invoice.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", invoice.organization_id)
          .single();

        if (org) organizationName = org.name;
      }

      // Fetch customer details if available
      let customerEmail: string | undefined;
      let customerPhone: string | undefined;
      let customerAddress: any;

      if (invoice.customer_id) {
        const { data: customer } = await supabase
          .from("customers")
          .select("email, phone, address")
          .eq("id", invoice.customer_id)
          .single();

        if (customer) {
          customerEmail = customer.email || undefined;
          customerPhone = customer.phone || undefined;
          customerAddress = customer.address;
        }
      }

      // Generate PDF
      const pdf = await generateInvoicePDF({
        number: invoice.number || "Draft",
        issue_date: invoice.issue_date || new Date().toISOString(),
        due_date: invoice.due_date,
        status: invoice.status,
        line_items: invoice.line_items || [],
        subtotal_cents: invoice.subtotal_cents || 0,
        tax_cents: invoice.tax_cents || 0,
        discount_cents: invoice.discount_cents || 0,
        total_cents: invoice.total_cents || 0,
        paid_at: invoice.paid_at,
        paid_amount_cents: invoice.paid_amount_cents,
        customer_name: invoice.customer_name,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        organization_name: organizationName,
        notes: invoice.notes,
        terms: invoice.terms,
      });

      return pdf;
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async (invoice: any) => {
    try {
      const pdf = await generatePDF(invoice);
      const filename = `invoice-${invoice.number || 'draft'}-${new Date().getTime()}.pdf`;
      pdf.save(filename);
      toast.success("Invoice PDF downloaded!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const getPDFBase64 = async (invoice: any): Promise<string> => {
    try {
      const pdf = await generatePDF(invoice);
      // Get PDF as base64 string (remove the data URL prefix)
      const base64 = pdf.output('dataurlstring').split(',')[1];
      return base64;
    } catch (error) {
      console.error("Error getting PDF base64:", error);
      throw error;
    }
  };

  const previewPDF = async (invoice: any) => {
    try {
      const pdf = await generatePDF(invoice);
      // Open PDF in new tab
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success("Opening PDF preview...");
    } catch (error) {
      console.error("Error previewing PDF:", error);
      toast.error("Failed to preview PDF");
    }
  };

  return {
    generatePDF,
    downloadPDF,
    getPDFBase64,
    previewPDF,
    isGenerating,
  };
}
