import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate_cents: number;
  amount_cents: number;
}

export interface Invoice {
  id: string;
  org_id: string;
  work_order_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  number: string | null;
  invoice_number?: string; // Add for compatibility
  issue_date: string;
  due_date: string | null;
  line_items: InvoiceLineItem[];
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  total_amount?: number; // Add for compatibility
  paid_amount_cents: number;
  currency: string | null;
  status: 'draft' | 'sent' | 'paid' | 'void' | 'cancelled';
  payment_status?: 'unpaid' | 'partial' | 'paid' | 'refunded' | 'failed';
  payment_due_date?: string | null;
  last_payment_reminder_sent_at?: string | null;
  stripe_invoice_id?: string | null;
  notes: string | null;
  terms: string | null;
  paid_at: string | null;
  external_ref: string | null;
  created_at: string;
  updated_at: string;
}

export function useInvoices() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchOrgId = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      setOrgId(profile?.organization_id || null);
    };

    fetchOrgId();
  }, [user]);

  // Fetch all invoices for the organization
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          customer:customers(id, name, email, phone),
          work_order:work_orders(id, customer_name, address)
        `)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching invoices:", error);
        throw error;
      }

      return data as any[];
    },
    enabled: !!orgId && !!user,
  });

  // Create invoice mutation
  const createInvoice = useMutation({
    mutationFn: async (invoiceData: Partial<Invoice>) => {
      if (!orgId) throw new Error("Organization required");

      const { data, error } = await supabase
        .from("invoices")
        .insert([
          {
            ...invoiceData,
            org_id: orgId,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId] });
      toast.success("Invoice created successfully");
    },
    onError: (error: any) => {
      console.error("Error creating invoice:", error);
      toast.error(error.message || "Failed to create invoice");
    },
  });

  // Update invoice mutation
  const updateInvoice = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", id)
        .eq("org_id", orgId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId] });
      toast.success("Invoice updated successfully");
    },
    onError: (error: any) => {
      console.error("Error updating invoice:", error);
      toast.error(error.message || "Failed to update invoice");
    },
  });

  // Delete invoice mutation
  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id)
        .eq("org_id", orgId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId] });
      toast.success("Invoice deleted successfully");
    },
    onError: (error: any) => {
      console.error("Error deleting invoice:", error);
      toast.error(error.message || "Failed to delete invoice");
    },
  });

  // Mark invoice as sent
  const markAsSent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "sent" })
        .eq("id", id)
        .eq("org_id", orgId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId] });
      toast.success("Invoice marked as sent");
    },
  });

  // Mark invoice as paid
  const markAsPaid = useMutation({
    mutationFn: async ({ id, amount_cents }: { id: string; amount_cents?: number }) => {
      const updates: any = {
        status: "paid",
        paid_at: new Date().toISOString(),
      };

      if (amount_cents !== undefined) {
        updates.paid_amount_cents = amount_cents;
      }

      const { error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", id)
        .eq("org_id", orgId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId] });
      toast.success("Invoice marked as paid");
    },
  });

  return {
    invoices,
    isLoading,
    orgId,
    createInvoice: createInvoice.mutateAsync,
    updateInvoice: updateInvoice.mutateAsync,
    deleteInvoice: deleteInvoice.mutateAsync,
    markAsSent: markAsSent.mutateAsync,
    markAsPaid: markAsPaid.mutateAsync,
  };
}

// Hook for generating invoice numbers
export function useInvoiceNumber() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrgId = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      setOrgId(profile?.organization_id || null);
    };

    fetchOrgId();
  }, [user]);

  const generateInvoiceNumber = async (prefix: string = "INV"): Promise<string> => {
    if (!orgId) throw new Error("Organization required");

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
    return `${prefix}-${nextNumber.toString().padStart(4, "0")}`;
  };

  return {
    generateInvoiceNumber,
    orgId,
  };
}
