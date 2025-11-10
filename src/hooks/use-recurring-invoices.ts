import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveOrg } from "@/hooks/use-active-org";
import { toast } from "sonner";

export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "bi_weekly"
  | "monthly"
  | "quarterly"
  | "semi_annually"
  | "annually";

export type RecurringStatus = "active" | "paused" | "completed" | "cancelled";

export interface RecurringInvoiceSchedule {
  id: string;
  org_id: string;
  customer_id: string;
  name: string;
  description: string | null;
  frequency: RecurringFrequency;
  interval_count: number;
  invoice_template_id: string | null;
  line_items: any[];
  payment_terms_days: number;
  terms: string | null;
  notes: string | null;
  tax_rate: number;
  start_date: string;
  end_date: string | null;
  next_generation_date: string;
  last_generated_at: string | null;
  status: RecurringStatus;
  auto_send_email: boolean;
  email_template_id: string | null;
  total_invoices_generated: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringInvoiceHistory {
  id: string;
  schedule_id: string;
  invoice_id: string;
  generation_date: string;
  period_start: string | null;
  period_end: string | null;
  generated_at: string;
  auto_sent: boolean;
}

export type RecurringInvoiceScheduleCreate = Omit<
  RecurringInvoiceSchedule,
  "id" | "org_id" | "last_generated_at" | "total_invoices_generated" | "created_by" | "created_at" | "updated_at"
>;

export type RecurringInvoiceScheduleUpdate = Partial<RecurringInvoiceScheduleCreate>;

export function useRecurringInvoices() {
  const { user } = { user: null as any } as any; // user optional for typing
  const { activeOrgId } = useActiveOrg();
  const queryClient = useQueryClient();

  // Fetch all recurring schedules
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["recurring-invoice-schedules", activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];

      const { data, error } = await (supabase as any)
        .from("recurring_invoice_schedules")
        .select(`
          *,
          customer:customers(id, name, email)
        `)
        .eq("org_id", activeOrgId)
        .order("next_generation_date", { ascending: true });

      if (error) throw error;
      return data as (RecurringInvoiceSchedule & { customer: any })[];
    },
    enabled: !!activeOrgId,
  });

  // Get active schedules
  const activeSchedules = schedules.filter((s) => s.status === "active");

  // Create new recurring schedule
  const createSchedule = useMutation({
    mutationFn: async (scheduleData: RecurringInvoiceScheduleCreate) => {
      if (!activeOrgId || !user?.id) {
        throw new Error("Organization or user not found");
      }

      const { data, error } = await (supabase as any)
        .from("recurring_invoice_schedules")
        .insert([
          {
            ...scheduleData,
            org_id: activeOrgId,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data as RecurringInvoiceSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-schedules"] });
      toast.success("Recurring invoice schedule created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create schedule: ${error.message}`);
    },
  });

  // Update schedule
  const updateSchedule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: RecurringInvoiceScheduleUpdate }) => {
      const { data, error } = await (supabase as any)
        .from("recurring_invoice_schedules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as RecurringInvoiceSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-schedules"] });
      toast.success("Recurring schedule updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    },
  });

  // Delete schedule
  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("recurring_invoice_schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-schedules"] });
      toast.success("Recurring schedule deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete schedule: ${error.message}`);
    },
  });

  // Pause schedule
  const pauseSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any)
        .from("recurring_invoice_schedules")
        .update({ status: "paused" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-schedules"] });
      toast.success("Recurring schedule paused");
    },
    onError: (error: Error) => {
      toast.error(`Failed to pause schedule: ${error.message}`);
    },
  });

  // Resume schedule
  const resumeSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any)
        .from("recurring_invoice_schedules")
        .update({ status: "active" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-schedules"] });
      toast.success("Recurring schedule resumed");
    },
    onError: (error: Error) => {
      toast.error(`Failed to resume schedule: ${error.message}`);
    },
  });

  // Cancel schedule
  const cancelSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any)
        .from("recurring_invoice_schedules")
        .update({ status: "cancelled" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-schedules"] });
      toast.success("Recurring schedule cancelled");
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel schedule: ${error.message}`);
    },
  });

  // Generate invoice now (manual trigger)
  const generateInvoiceNow = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { data, error } = await (supabase as any).rpc("generate_invoice_from_schedule", {
        schedule_id_param: scheduleId,
      });

      if (error) throw error;
      return (data as string) || ""; // Returns invoice ID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-invoice-history"] });
      toast.success("Invoice generated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate invoice: ${error.message}`);
    },
  });

  return {
    schedules,
    activeSchedules,
    isLoading,
    createSchedule: createSchedule.mutateAsync,
    updateSchedule: updateSchedule.mutateAsync,
    deleteSchedule: deleteSchedule.mutateAsync,
    pauseSchedule: pauseSchedule.mutateAsync,
    resumeSchedule: resumeSchedule.mutateAsync,
    cancelSchedule: cancelSchedule.mutateAsync,
    generateInvoiceNow: generateInvoiceNow.mutateAsync,
    isCreating: createSchedule.isPending,
    isUpdating: updateSchedule.isPending,
    isDeleting: deleteSchedule.isPending,
    isGenerating: generateInvoiceNow.isPending,
  };
}

export function useRecurringInvoiceHistory(scheduleId: string) {
  const { activeOrgId } = useActiveOrg();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["recurring-invoice-history", scheduleId],
    queryFn: async () => {
      if (!activeOrgId || !scheduleId) return [];

      const { data, error } = await (supabase as any)
        .from("recurring_invoice_history")
        .select(`
          *,
          invoice:invoices(id, number, status, total_cents, created_at)
        `)
        .eq("schedule_id", scheduleId)
        .order("generation_date", { ascending: false });

      if (error) throw error;
      return data as (RecurringInvoiceHistory & { invoice: any })[];
    },
    enabled: !!activeOrgId && !!scheduleId,
  });

  return {
    history,
    isLoading,
  };
}

// Helper function to format frequency for display
export function formatFrequency(frequency: RecurringFrequency, intervalCount: number = 1): string {
  const frequencyLabels: Record<RecurringFrequency, string> = {
    daily: "Day",
    weekly: "Week",
    bi_weekly: "2 Weeks",
    monthly: "Month",
    quarterly: "Quarter",
    semi_annually: "6 Months",
    annually: "Year",
  };

  if (intervalCount === 1) {
    return frequencyLabels[frequency];
  }

  return `${intervalCount} ${frequencyLabels[frequency]}${intervalCount > 1 ? 's' : ''}`;
}
