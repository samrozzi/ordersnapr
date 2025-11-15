import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useActiveOrg } from "./use-active-org";
import { toast } from "sonner";

interface WaterIntakeLog {
  id: string;
  user_id: string;
  date: string;
  oz_consumed: number;
  daily_goal: number;
  created_at: string;
  updated_at: string;
}

export function useWaterTracker() {
  const { user } = useAuth();
  const { activeOrgId } = useActiveOrg();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: todayIntake, isLoading } = useQuery<WaterIntakeLog | null>({
    queryKey: ["water-intake", user?.id, activeOrgId, today],
    queryFn: async () => {
      if (!user) return null;

      const query = supabase
        .from("water_intake_log")
        .select("*")
        .eq("user_id", user.id);

      const { data, error } = await (activeOrgId
        ? query.eq("org_id", activeOrgId)
        : query.is("org_id", null)
      )
        .eq("date", today)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // If no entry exists, create one
      if (!data) {
        const { data: newData, error: insertError } = await (supabase as any)
          .from("water_intake_log")
          .insert({
            user_id: user.id,
            org_id: activeOrgId,
            date: today,
            oz_consumed: 0,
            daily_goal: 64,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newData as WaterIntakeLog;
      }

      return data as WaterIntakeLog;
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  });

  const updateIntake = useMutation({
    mutationFn: async ({ ozToAdd, newGoal }: { ozToAdd?: number; newGoal?: number }) => {
      if (!user || !todayIntake) return;

      const updates: any = { updated_at: new Date().toISOString() };
      
      if (ozToAdd !== undefined) {
        updates.oz_consumed = Math.max(0, (todayIntake.oz_consumed || 0) + ozToAdd);
      }
      
      if (newGoal !== undefined) {
        updates.daily_goal = newGoal;
      }

      const { data, error } = await (supabase as any)
        .from("water_intake_log")
        .update(updates)
        .eq("id", todayIntake.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["water-intake", user?.id, activeOrgId, today] });
    },
    onError: (error) => {
      toast.error("Failed to update water intake");
      console.error("Water intake update error:", error);
    },
  });

  const { data: weekHistory } = useQuery<Pick<WaterIntakeLog, 'date' | 'oz_consumed' | 'daily_goal'>[]>({
    queryKey: ["water-intake-week", user?.id, activeOrgId],
    queryFn: async () => {
      if (!user) return [];

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      const query = supabase
        .from("water_intake_log")
        .select("date, oz_consumed, daily_goal")
        .eq("user_id", user.id);

      const { data, error } = await (activeOrgId
        ? query.eq("org_id", activeOrgId)
        : query.is("org_id", null)
      )
        .gte("date", sevenDaysAgo.toISOString().split('T')[0])
        .order("date", { ascending: true });

      if (error) throw error;
      return (data || []) as Pick<WaterIntakeLog, 'date' | 'oz_consumed' | 'daily_goal'>[];
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute
  });

  return {
    todayIntake,
    isLoading,
    updateIntake: updateIntake.mutate,
    isUpdating: updateIntake.isPending,
    weekHistory,
  };
}
