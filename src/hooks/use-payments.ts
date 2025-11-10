import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface Payment {
  id: string;
  org_id: string;
  invoice_id: string;
  customer_id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_customer_id: string | null;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded' | 'partially_refunded';
  payment_method_type: string | null;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  failure_reason: string | null;
  failure_message: string | null;
  receipt_url: string | null;
  receipt_number: string | null;
  refunded_amount_cents: number;
  refund_reason: string | null;
  metadata: Record<string, any>;
  notes: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRefund {
  id: string;
  payment_id: string;
  stripe_refund_id: string | null;
  amount_cents: number;
  reason: string | null;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentSettings {
  accept_credit_cards: boolean;
  accept_ach: boolean;
  accept_apple_pay: boolean;
  accept_google_pay: boolean;
  currency: string;
  payment_terms_days: number;
  late_fee_enabled: boolean;
  late_fee_percentage: number;
  payment_instructions: string | null;
}

export function usePayments(invoiceId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch payments for an invoice
  // Disabled: payments table not yet implemented
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", invoiceId],
    queryFn: async () => {
      return [];
    },
    enabled: false,
  });

  // Fetch all payments for organization
  // Disabled: payments table not yet implemented
  const { data: allPayments = [] } = useQuery({
    queryKey: ["payments", "all"],
    queryFn: async () => {
      return [];
    },
    enabled: false,
  });

  // Fetch payment refunds
  // Disabled: payment_refunds table not yet implemented
  const fetchRefunds = async (paymentId: string): Promise<PaymentRefund[]> => {
    return [];
  };

  // Create payment intent (would call Edge Function in production)
  // Disabled: payments table not yet implemented
  const createPaymentIntent = useMutation({
    mutationFn: async () => {
      throw new Error("Payments feature not yet implemented");
    },
    onError: () => {
      toast.error("Payments feature not yet implemented");
    },
  });

  // Record manual payment (cash, check, etc.)
  // Disabled: payments table not yet implemented
  const recordManualPayment = useMutation({
    mutationFn: async () => {
      throw new Error("Payments feature not yet implemented");
    },
    onError: () => {
      toast.error("Payments feature not yet implemented");
    },
  });

  // Process refund
  // Disabled: payments table not yet implemented
  const processRefund = useMutation({
    mutationFn: async () => {
      throw new Error("Refunds feature not yet implemented");
    },
    onError: () => {
      toast.error("Refunds feature not yet implemented");
    },
  });

  // Calculate payment summary
  const getPaymentSummary = (invoiceAmountCents: number) => {
    const totalPaid = payments
      .filter(p => p.status === 'succeeded' || p.status === 'partially_refunded')
      .reduce((sum, p) => sum + (p.amount_cents - p.refunded_amount_cents), 0);

    const totalRefunded = payments
      .reduce((sum, p) => sum + p.refunded_amount_cents, 0);

    const remainingBalance = invoiceAmountCents - totalPaid;

    return {
      totalPaid,
      totalRefunded,
      remainingBalance,
      isPaid: remainingBalance <= 0,
      isPartiallyPaid: totalPaid > 0 && remainingBalance > 0,
    };
  };

  return {
    payments,
    allPayments,
    isLoading,
    createPaymentIntent: createPaymentIntent.mutateAsync,
    recordManualPayment: recordManualPayment.mutateAsync,
    processRefund: processRefund.mutateAsync,
    fetchRefunds,
    getPaymentSummary,
  };
}

// Hook for organization payment settings
export function usePaymentSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["payment-settings"],
    queryFn: async () => {
      // Disabled: payment settings not yet implemented
      return {
        accept_credit_cards: false,
        accept_ach: false,
        accept_apple_pay: false,
        accept_google_pay: false,
        currency: 'usd',
        payment_terms_days: 30,
        late_fee_enabled: false,
        late_fee_percentage: 0,
        payment_instructions: null,
        stripeAccountId: null,
        stripeAccountStatus: null,
        stripeOnboardingCompleted: false,
      };
    },
    enabled: false,
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<PaymentSettings>) => {
      throw new Error("Payment settings not yet implemented");
    },
    onError: (error: any) => {
      toast.error("Payment settings not yet implemented");
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutateAsync,
  };
}
