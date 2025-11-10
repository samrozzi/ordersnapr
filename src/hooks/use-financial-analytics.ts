import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveOrg } from "@/hooks/use-active-org";

// ============================================================================
// Type Definitions
// ============================================================================

export interface PaymentAnalytics {
  org_id: string;
  month: string;
  payment_count: number;
  unique_customers: number;
  net_revenue_cents: number;
  avg_payment_cents: number;
  card_payments: number;
  ach_payments: number;
  failed_payments: number;
}

export interface InvoiceAnalytics {
  org_id: string;
  month: string;
  status: string;
  payment_status: string;
  invoice_count: number;
  unique_customers: number;
  total_invoiced_cents: number;
  total_paid_cents: number;
  total_outstanding_cents: number;
  avg_invoice_cents: number;
  min_invoice_cents: number;
  max_invoice_cents: number;
}

export interface ARAgingReport {
  org_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  invoice_count: number;
  current_cents: number;
  overdue_1_30_cents: number;
  overdue_31_60_cents: number;
  overdue_61_90_cents: number;
  overdue_90_plus_cents: number;
  total_outstanding_cents: number;
}

export interface RevenueTrend {
  org_id: string;
  date: string;
  month: string;
  invoices_created: number;
  invoiced_cents: number;
  payments_received: number;
  revenue_collected_cents: number;
  invoices_paid: number;
  invoices_unpaid: number;
  invoices_partial: number;
}

export interface CustomerLifetimeValue {
  org_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  total_invoices: number;
  total_invoiced_cents: number;
  total_paid_cents: number;
  outstanding_balance_cents: number;
  avg_invoice_cents: number;
  total_payments: number;
  lifetime_revenue_cents: number;
  first_invoice_date: string;
  last_invoice_date: string;
  last_payment_date: string;
  status: "outstanding" | "current";
}

export interface PaymentMethodAnalytics {
  org_id: string;
  month: string;
  payment_method_type: string;
  payment_method_brand: string;
  payment_count: number;
  net_revenue_cents: number;
  avg_payment_cents: number;
  successful_payments: number;
  failed_payments: number;
  refunded_payments: number;
  success_rate_percentage: number;
}

export interface OutstandingInvoicesSummary {
  org_id: string;
  total_outstanding_invoices: number;
  overdue_invoices: number;
  due_future_invoices: number;
  total_outstanding_cents: number;
  overdue_amount_cents: number;
  due_future_amount_cents: number;
  oldest_overdue_date: string | null;
  max_days_overdue: number | null;
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useFinancialAnalytics(dateRange?: DateRangeFilter) {
  const { activeOrg } = useActiveOrg();

  // Payment Analytics
  const { data: paymentAnalytics = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ["payment-analytics", activeOrg?.id, dateRange],
    queryFn: async () => {
      if (!activeOrg?.id) return [];

      let query = (supabase as any)
        .from("payment_analytics")
        .select("*")
        .eq("org_id", activeOrg.id)
        .order("month", { ascending: false });

      if (dateRange?.startDate) {
        query = query.gte("month", dateRange.startDate);
      }
      if (dateRange?.endDate) {
        query = query.lte("month", dateRange.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PaymentAnalytics[];
    },
    enabled: !!activeOrg?.id,
  });

  // Invoice Analytics
  const { data: invoiceAnalytics = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["invoice-analytics", activeOrg?.id, dateRange],
    queryFn: async () => {
      if (!activeOrg?.id) return [];

      let query = (supabase as any)
        .from("invoice_analytics")
        .select("*")
        .eq("org_id", activeOrg.id)
        .order("month", { ascending: false });

      if (dateRange?.startDate) {
        query = query.gte("month", dateRange.startDate);
      }
      if (dateRange?.endDate) {
        query = query.lte("month", dateRange.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InvoiceAnalytics[];
    },
    enabled: !!activeOrg?.id,
  });

  // AR Aging Report
  const { data: arAgingReport = [], isLoading: isLoadingAR } = useQuery({
    queryKey: ["ar-aging-report", activeOrg?.id],
    queryFn: async () => {
      if (!activeOrg?.id) return [];

      const { data, error } = await (supabase as any)
        .from("ar_aging_report")
        .select("*")
        .eq("org_id", activeOrg.id)
        .order("total_outstanding_cents", { ascending: false });

      if (error) throw error;
      return data as ARAgingReport[];
    },
    enabled: !!activeOrg?.id,
  });

  // Revenue Trends
  const { data: revenueTrends = [], isLoading: isLoadingRevenue } = useQuery({
    queryKey: ["revenue-trends", activeOrg?.id, dateRange],
    queryFn: async () => {
      if (!activeOrg?.id) return [];

      let query = (supabase as any)
        .from("revenue_trends")
        .select("*")
        .eq("org_id", activeOrg.id)
        .order("date", { ascending: false });

      if (dateRange?.startDate) {
        query = query.gte("date", dateRange.startDate);
      }
      if (dateRange?.endDate) {
        query = query.lte("date", dateRange.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RevenueTrend[];
    },
    enabled: !!activeOrg?.id,
  });

  // Customer Lifetime Value
  const { data: customerLTV = [], isLoading: isLoadingLTV } = useQuery({
    queryKey: ["customer-lifetime-value", activeOrg?.id],
    queryFn: async () => {
      if (!activeOrg?.id) return [];

      const { data, error } = await (supabase as any)
        .from("customer_lifetime_value")
        .select("*")
        .eq("org_id", activeOrg.id)
        .order("lifetime_revenue_cents", { ascending: false })
        .limit(50); // Top 50 customers

      if (error) throw error;
      return data as CustomerLifetimeValue[];
    },
    enabled: !!activeOrg?.id,
  });

  // Payment Method Analytics
  const { data: paymentMethods = [], isLoading: isLoadingMethods } = useQuery({
    queryKey: ["payment-method-analytics", activeOrg?.id, dateRange],
    queryFn: async () => {
      if (!activeOrg?.id) return [];

      let query = (supabase as any)
        .from("payment_method_analytics")
        .select("*")
        .eq("org_id", activeOrg.id)
        .order("month", { ascending: false });

      if (dateRange?.startDate) {
        query = query.gte("month", dateRange.startDate);
      }
      if (dateRange?.endDate) {
        query = query.lte("month", dateRange.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PaymentMethodAnalytics[];
    },
    enabled: !!activeOrg?.id,
  });

  // Outstanding Invoices Summary
  const { data: outstandingSummary, isLoading: isLoadingOutstanding } = useQuery({
    queryKey: ["outstanding-invoices-summary", activeOrg?.id],
    queryFn: async () => {
      if (!activeOrg?.id) return null;

      const { data, error } = await (supabase as any)
        .from("outstanding_invoices_summary")
        .select("*")
        .eq("org_id", activeOrg.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data as OutstandingInvoicesSummary | null;
    },
    enabled: !!activeOrg?.id,
  });

  // Computed summary metrics
  const totalRevenue = paymentAnalytics.reduce(
    (sum, item) => sum + (item.net_revenue_cents || 0),
    0
  );

  const totalInvoiced = invoiceAnalytics.reduce(
    (sum, item) => sum + (item.total_invoiced_cents || 0),
    0
  );

  const totalOutstanding = invoiceAnalytics.reduce(
    (sum, item) => sum + (item.total_outstanding_cents || 0),
    0
  );

  const collectionRate =
    totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0;

  return {
    // Raw data
    paymentAnalytics,
    invoiceAnalytics,
    arAgingReport,
    revenueTrends,
    customerLTV,
    paymentMethods,
    outstandingSummary,

    // Loading states
    isLoading:
      isLoadingPayments ||
      isLoadingInvoices ||
      isLoadingAR ||
      isLoadingRevenue ||
      isLoadingLTV ||
      isLoadingMethods ||
      isLoadingOutstanding,

    // Summary metrics
    summary: {
      totalRevenue,
      totalInvoiced,
      totalOutstanding,
      collectionRate,
    },
  };
}
