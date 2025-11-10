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
  // Disabled: payment_reminders table not yet implemented
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["payment-reminders", invoiceId],
    queryFn: async () => {
      return [];
    },
    enabled: false,
  });

  // Send payment reminder
  // Disabled: payment_reminders table not yet implemented
  const sendReminder = useMutation({
    mutationFn: async () => {
      throw new Error("Payment reminders feature not yet implemented");
    },
    onError: (error: any) => {
      toast.error("Payment reminders feature not yet implemented");
    },
  });

  // Get overdue invoices
  // Disabled: Database function not yet implemented
  const { data: overdueInvoices = [] } = useQuery({
    queryKey: ["overdue-invoices"],
    queryFn: async () => {
      return [];
    },
    enabled: false,
  });

  // Get upcoming due invoices
  // Disabled: Database function not yet implemented
  const { data: upcomingDueInvoices = [] } = useQuery({
    queryKey: ["upcoming-due-invoices"],
    queryFn: async () => {
      return [];
    },
    enabled: false,
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
