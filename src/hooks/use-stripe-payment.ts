import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PaymentIntent {
  id: string;
  org_id: string;
  invoice_id: string;
  customer_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "canceled" | "refunded";
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  receipt_url: string | null;
  error_message: string | null;
  created_at: string;
}

export interface CreatePaymentParams {
  invoiceId: string;
  amountCents: number;
  paymentMethodType?: string;
  customerEmail?: string;
}

export function useStripePayment() {
  const queryClient = useQueryClient();
  const supabaseAny = supabase as any;

  // Create payment intent
  const createPaymentIntent = useMutation({
    mutationFn: async (params: CreatePaymentParams) => {
      // In a real implementation, this would call a Supabase Edge Function
      // that creates a Stripe PaymentIntent on the server side
      // For now, we'll create a placeholder record

      const { data: invoiceData, error: invoiceError } = await supabaseAny
        .from("invoices")
        .select("org_id, customer_id")
        .eq("id", params.invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      // Call Supabase Edge Function to create Stripe PaymentIntent
      const { data: paymentIntent, error: paymentError } = await supabaseAny.functions.invoke(
        "create-payment-intent",
        {
          body: {
            invoiceId: params.invoiceId,
            amountCents: params.amountCents,
            customerEmail: params.customerEmail,
          },
        }
      );

      if (paymentError) {
        // Fallback: Create payment intent record directly (for development)
        const { data, error } = await supabaseAny
          .from("payment_intents")
          .insert([
            {
              org_id: invoiceData.org_id,
              invoice_id: params.invoiceId,
              customer_id: invoiceData.customer_id,
              amount_cents: params.amountCents,
              currency: "usd",
              payment_method_type: params.paymentMethodType || "card",
              status: "pending",
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data as PaymentIntent;
      }

      return paymentIntent as PaymentIntent;
    },
    onSuccess: () => {
      toast.success("Payment initiated");
    },
    onError: (error: Error) => {
      toast.error(`Payment failed: ${error.message}`);
    },
  });

  // Confirm payment (after Stripe confirmation)
  const confirmPayment = useMutation({
    mutationFn: async ({
      paymentIntentId,
      stripePaymentIntentId,
      paymentMethodLast4,
      paymentMethodBrand,
      receiptUrl,
    }: {
      paymentIntentId: string;
      stripePaymentIntentId: string;
      paymentMethodLast4?: string;
      paymentMethodBrand?: string;
      receiptUrl?: string;
    }) => {
      const { data, error } = await supabaseAny
        .from("payment_intents")
        .update({
          stripe_payment_intent_id: stripePaymentIntentId,
          status: "succeeded",
          payment_method_last4: paymentMethodLast4,
          payment_method_brand: paymentMethodBrand,
          receipt_url: receiptUrl,
          succeeded_at: new Date().toISOString(),
        })
        .eq("id", paymentIntentId)
        .select()
        .single();

      if (error) throw error;

      // Update invoice as paid
      const { data: paymentIntent } = await supabaseAny
        .from("payment_intents")
        .select("invoice_id, amount_cents")
        .eq("id", paymentIntentId)
        .single();

      if (paymentIntent) {
        await supabaseAny
          .from("invoices")
          .update({
            status: "paid",
            paid_amount_cents: (paymentIntent as any).amount_cents,
          })
          .eq("id", (paymentIntent as any).invoice_id);
      }

      return data as PaymentIntent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["public-invoice"] });
      toast.success("Payment confirmed successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Payment confirmation failed: ${error.message}`);
    },
  });

  // Record payment failure
  const failPayment = useMutation({
    mutationFn: async ({
      paymentIntentId,
      errorMessage,
    }: {
      paymentIntentId: string;
      errorMessage: string;
    }) => {
      const { data, error } = await supabaseAny
        .from("payment_intents")
        .update({
          status: "failed",
          error_message: errorMessage,
          failed_at: new Date().toISOString(),
        })
        .eq("id", paymentIntentId)
        .select()
        .single();

      if (error) throw error;
      return data as PaymentIntent;
    },
  });

  return {
    createPaymentIntent: createPaymentIntent.mutateAsync,
    confirmPayment: confirmPayment.mutateAsync,
    failPayment: failPayment.mutateAsync,
    isCreating: createPaymentIntent.isPending,
    isConfirming: confirmPayment.isPending,
  };
}

// Mock Stripe integration for development
// In production, you would use @stripe/stripe-js and Stripe Elements
export function useStripeElements() {
  // This would initialize Stripe.js in a real implementation
  // const stripe = await loadStripe(process.env.STRIPE_PUBLISHABLE_KEY);

  return {
    // Placeholder for Stripe Elements integration
    isReady: true,
  };
}
