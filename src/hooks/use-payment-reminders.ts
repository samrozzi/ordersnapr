import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface PaymentReminder {
  id: string;
  invoice_id: string;
  org_id: string;
  reminder_type: 'before_due' | 'on_due' | 'after_due' | 'custom';
  days_relative: number | null;
  sent_at: string;
  sent_by: string | null;
  recipient_email: string;
  email_subject: string | null;
  email_body: string | null;
  email_status: 'sent' | 'delivered' | 'failed' | 'bounced';
  metadata: Record<string, any>;
  created_at: string;
}

export function usePaymentReminders(invoiceId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch reminders for a specific invoice
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["payment-reminders", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];

      const { data, error } = await supabase
        .from("payment_reminders")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("sent_at", { ascending: false });

      if (error) {
        console.error("Error fetching payment reminders:", error);
        throw error;
      }

      return data as PaymentReminder[];
    },
    enabled: !!invoiceId,
  });

  // Send payment reminder
  const sendReminder = useMutation({
    mutationFn: async ({
      invoiceId,
      recipientEmail,
      reminderType = 'custom',
      daysRelative,
    }: {
      invoiceId: string;
      recipientEmail: string;
      reminderType?: 'before_due' | 'on_due' | 'after_due' | 'custom';
      daysRelative?: number;
    }) => {
      // In production, this would call a Supabase Edge Function
      // that sends the actual email via SendGrid/Resend/etc.

      const { data, error } = await supabase
        .from("payment_reminders")
        .insert([
          {
            invoice_id: invoiceId,
            recipient_email: recipientEmail,
            reminder_type: reminderType,
            days_relative: daysRelative || null,
            sent_by: user!.id,
            email_status: 'sent',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Also update invoice's last_payment_reminder_sent_at
      await supabase
        .from("invoices")
        .update({ last_payment_reminder_sent_at: new Date().toISOString() })
        .eq("id", invoiceId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment reminder sent successfully");
    },
    onError: (error: any) => {
      console.error("Error sending payment reminder:", error);
      toast.error(error.message || "Failed to send payment reminder");
    },
  });

  // Get overdue invoices
  const { data: overdueInvoices = [] } = useQuery({
    queryKey: ["overdue-invoices"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user!.id)
        .single();

      if (!profile?.organization_id) return [];

      const { data, error } = await supabase.rpc("get_invoices_needing_reminders", {
        org_id_param: profile.organization_id,
        days_threshold: 7,
      });

      if (error) {
        console.error("Error fetching overdue invoices:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user,
  });

  // Get upcoming due invoices
  const { data: upcomingDueInvoices = [] } = useQuery({
    queryKey: ["upcoming-due-invoices"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user!.id)
        .single();

      if (!profile?.organization_id) return [];

      const { data, error } = await supabase.rpc("get_invoices_approaching_due", {
        org_id_param: profile.organization_id,
        days_before: 3,
      });

      if (error) {
        console.error("Error fetching upcoming due invoices:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!user,
  });

  return {
    reminders,
    isLoading,
    sendReminder: sendReminder.mutateAsync,
    isSending: sendReminder.isPending,
    overdueInvoices,
    upcomingDueInvoices,
  };
}
