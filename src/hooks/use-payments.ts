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
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching payments:", error);
        throw error;
      }

      return data as Payment[];
    },
    enabled: !!invoiceId,
  });

  // Fetch all payments for organization
  const { data: allPayments = [] } = useQuery({
    queryKey: ["payments", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          invoice:invoices(invoice_number, total_amount),
          customer:customers(name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching all payments:", error);
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });

  // Fetch payment refunds
  const fetchRefunds = async (paymentId: string): Promise<PaymentRefund[]> => {
    const { data, error } = await supabase
      .from("payment_refunds")
      .select("*")
      .eq("payment_id", paymentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching refunds:", error);
      return [];
    }

    return data as PaymentRefund[];
  };

  // Create payment intent (would call Edge Function in production)
  const createPaymentIntent = useMutation({
    mutationFn: async ({
      invoiceId,
      amountCents,
      currency = 'usd',
    }: {
      invoiceId: string;
      amountCents: number;
      currency?: string;
    }) => {
      // This would call a Supabase Edge Function that creates a Stripe Payment Intent
      // For now, we'll create a placeholder payment record
      const { data, error } = await supabase
        .from("payments")
        .insert([
          {
            invoice_id: invoiceId,
            amount_cents: amountCents,
            currency,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payment initiated");
    },
    onError: (error: any) => {
      console.error("Error creating payment intent:", error);
      toast.error(error.message || "Failed to create payment");
    },
  });

  // Record manual payment (cash, check, etc.)
  const recordManualPayment = useMutation({
    mutationFn: async ({
      invoiceId,
      customerId,
      amountCents,
      paymentMethod,
      notes,
      paidAt,
    }: {
      invoiceId: string;
      customerId: string;
      amountCents: number;
      paymentMethod: string;
      notes?: string;
      paidAt?: string;
    }) => {
      const { data, error } = await supabase
        .from("payments")
        .insert([
          {
            invoice_id: invoiceId,
            customer_id: customerId,
            amount_cents: amountCents,
            currency: 'usd',
            status: 'succeeded',
            payment_method_type: paymentMethod,
            notes,
            paid_at: paidAt || new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment recorded successfully");
    },
    onError: (error: any) => {
      console.error("Error recording payment:", error);
      toast.error(error.message || "Failed to record payment");
    },
  });

  // Process refund
  const processRefund = useMutation({
    mutationFn: async ({
      paymentId,
      amountCents,
      reason,
    }: {
      paymentId: string;
      amountCents: number;
      reason?: string;
    }) => {
      // This would call a Supabase Edge Function that creates a Stripe Refund
      // For now, we'll create a refund record and update the payment
      const { data: refund, error: refundError } = await supabase
        .from("payment_refunds")
        .insert([
          {
            payment_id: paymentId,
            amount_cents: amountCents,
            reason,
            status: 'succeeded',
            created_by: user!.id,
          },
        ])
        .select()
        .single();

      if (refundError) throw refundError;

      // Update payment refunded amount
      const { data: payment } = await supabase
        .from("payments")
        .select("amount_cents, refunded_amount_cents")
        .eq("id", paymentId)
        .single();

      if (payment) {
        const newRefundedAmount = (payment.refunded_amount_cents || 0) + amountCents;
        const newStatus = newRefundedAmount >= payment.amount_cents ? 'refunded' : 'partially_refunded';

        await supabase
          .from("payments")
          .update({
            refunded_amount_cents: newRefundedAmount,
            status: newStatus,
            refunded_at: new Date().toISOString(),
          })
          .eq("id", paymentId);
      }

      return refund;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Refund processed successfully");
    },
    onError: (error: any) => {
      console.error("Error processing refund:", error);
      toast.error(error.message || "Failed to process refund");
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
      const { data, error } = await supabase
        .from("organizations")
        .select("payment_settings, stripe_account_id, stripe_account_status, stripe_onboarding_completed")
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching payment settings:", error);
        throw error;
      }

      return {
        ...data.payment_settings as PaymentSettings,
        stripeAccountId: data.stripe_account_id,
        stripeAccountStatus: data.stripe_account_status,
        stripeOnboardingCompleted: data.stripe_onboarding_completed,
      };
    },
    enabled: !!user,
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<PaymentSettings>) => {
      const { data, error } = await supabase
        .from("organizations")
        .update({
          payment_settings: newSettings,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-settings"] });
      toast.success("Payment settings updated");
    },
    onError: (error: any) => {
      console.error("Error updating payment settings:", error);
      toast.error(error.message || "Failed to update settings");
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutateAsync,
  };
}
