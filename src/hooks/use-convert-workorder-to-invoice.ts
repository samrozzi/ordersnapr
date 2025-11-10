import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { InvoiceLineItem } from "./use-invoices";

interface WorkOrder {
  id: string;
  organization_id: string;
  customer_name: string;
  customer_id?: string | null;
  address?: string | null;
  notes?: string | null;
  scheduled_date?: string | null;
  type?: string | null;
  custom_data?: Record<string, any>;
  [key: string]: any;
}

interface ConversionOptions {
  lineItemDescription?: string;
  lineItemRate?: number;
  dueInDays?: number;
}

export function useConvertWorkOrderToInvoice() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const generateInvoiceNumber = async (orgId: string): Promise<string> => {
    // Get the latest invoice number for this org
    const { data: latestInvoice } = await supabase
      .from("invoices")
      .select("number")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;

    if (latestInvoice?.number) {
      // Extract number from format like "INV-0001"
      const match = latestInvoice.number.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format with leading zeros (e.g., "INV-0001")
    return `INV-${nextNumber.toString().padStart(4, "0")}`;
  };

  const convertToInvoice = useMutation({
    mutationFn: async ({
      workOrder,
      options = {},
    }: {
      workOrder: WorkOrder;
      options?: ConversionOptions;
    }) => {
      const {
        lineItemDescription = `Service: ${workOrder.type || 'Work Order'} - ${workOrder.customer_name}`,
        lineItemRate = 0, // Default $0, user will need to fill in
        dueInDays = 30,
      } = options;

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber(workOrder.organization_id);

      // Create line item from work order
      const lineItems: InvoiceLineItem[] = [
        {
          description: lineItemDescription,
          quantity: 1,
          rate_cents: lineItemRate * 100, // Convert dollars to cents
          amount_cents: lineItemRate * 100,
        },
      ];

      // If there's an address, add it as a second line item detail
      if (workOrder.address) {
        lineItems[0].description += `\nLocation: ${workOrder.address}`;
      }

      // Calculate dates
      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueInDays);

      // Calculate totals
      const subtotal_cents = lineItems.reduce((sum, item) => sum + item.amount_cents, 0);
      const tax_cents = 0; // No tax by default
      const discount_cents = 0; // No discount by default
      const total_cents = subtotal_cents + tax_cents - discount_cents;

      // Create invoice data
      const invoiceData = {
        org_id: workOrder.organization_id,
        work_order_id: workOrder.id,
        customer_id: workOrder.customer_id || null,
        customer_name: workOrder.customer_name,
        number: invoiceNumber,
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        payment_due_date: dueDate.toISOString().split('T')[0],
        line_items: lineItems,
        subtotal_cents,
        tax_cents,
        discount_cents,
        total_cents,
        paid_amount_cents: 0,
        currency: 'usd',
        status: 'draft' as const,
        payment_status: 'unpaid' as const,
        notes: workOrder.notes || `Converted from Work Order\n\nWork Order Details:\n${JSON.stringify(workOrder.custom_data || {}, null, 2)}`,
        terms: 'Payment due within 30 days',
      };

      // Insert invoice
      const { data, error } = await supabase
        .from("invoices")
        .insert([invoiceData])
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Work order converted to invoice successfully!");

      // Navigate to invoices page
      navigate("/invoices");
    },
    onError: (error: any) => {
      console.error("Error converting work order to invoice:", error);
      toast.error(error.message || "Failed to convert work order to invoice");
    },
  });

  return {
    convertToInvoice: convertToInvoice.mutateAsync,
    isConverting: convertToInvoice.isPending,
  };
}
