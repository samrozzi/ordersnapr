import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Reminder {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  user_id: string;
  assigned_to: string | null;
  organization_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    full_name: string | null;
    email: string | null;
  } | null;
  assignee?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export interface CreateReminderData {
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  assigned_to?: string;
  organization_id?: string;
}

export interface UpdateReminderData {
  title?: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  status?: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high" | "urgent";
  assigned_to?: string;
}

// Get user's active org context
const getActiveOrgId = async (userId: string): Promise<string | null> => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_org_id")
    .eq("id", userId)
    .single();

  return profile?.active_org_id || null;
};

// Hook to fetch reminders
export const useReminders = (userId: string | null) => {
  return useQuery({
    queryKey: ["reminders", userId],
    queryFn: async () => {
      if (!userId) return [];

      const activeOrgId = await getActiveOrgId(userId);

      let query = supabase
        .from("reminders")
        .select(`
          *,
          creator:profiles!reminders_user_id_fkey(full_name, email),
          assignee:profiles!reminders_assigned_to_fkey(full_name, email)
        `)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("priority", { ascending: false });

      if (activeOrgId === null) {
        // Personal workspace: user's own reminders with no organization
        query = query.eq("user_id", userId).is("organization_id", null);
      } else {
        // Organization workspace: all reminders for that org
        query = query.eq("organization_id", activeOrgId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!userId,
  });
};

// Hook to create a reminder
export const useCreateReminder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (reminderData: CreateReminderData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // If no organization_id provided, get active org
      let orgId = reminderData.organization_id;
      if (orgId === undefined) {
        orgId = await getActiveOrgId(user.id);
      }

      const { data, error } = await supabase
        .from("reminders")
        .insert({
          user_id: user.id,
          title: reminderData.title,
          description: reminderData.description || null,
          due_date: reminderData.due_date || null,
          due_time: reminderData.due_time || null,
          priority: reminderData.priority || "medium",
          assigned_to: reminderData.assigned_to || null,
          organization_id: orgId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast({
        title: "Success",
        description: "Reminder created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create reminder",
        variant: "destructive",
      });
    },
  });
};

// Hook to update a reminder
export const useUpdateReminder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateReminderData }) => {
      const updateData: any = { ...updates };

      // If marking as completed, set completed_at and completed_by
      if (updates.status === "completed") {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user?.id;
      }

      const { data, error } = await supabase
        .from("reminders")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast({
        title: "Success",
        description: "Reminder updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reminder",
        variant: "destructive",
      });
    },
  });
};

// Hook to delete a reminder
export const useDeleteReminder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast({
        title: "Success",
        description: "Reminder deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete reminder",
        variant: "destructive",
      });
    },
  });
};

// Hook to get org members for @mentions
export const useOrgMembers = (orgId: string | null) => {
  return useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("org_memberships")
        .select(`
          user_id,
          profiles:profiles(
            id,
            full_name,
            email
          )
        `)
        .eq("org_id", orgId);

      if (error) throw error;

      return data.map(m => ({
        id: m.profiles?.id,
        full_name: m.profiles?.full_name,
        email: m.profiles?.email,
      })).filter(m => m.id);
    },
    enabled: !!orgId,
  });
};
