import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export function useWaterTracker() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: todayIntake, isLoading } = useQuery({
    queryKey: ["water-intake", user?.id, today],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("water_intake_log")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // If no entry exists, create one
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("water_intake_log")
          .insert({
            user_id: user.id,
            date: today,
            oz_consumed: 0,
            daily_goal: 64,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newData;
      }

      return data;
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

      const { data, error } = await supabase
        .from("water_intake_log")
        .update(updates)
        .eq("id", todayIntake.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["water-intake", user?.id, today] });
    },
    onError: (error) => {
      toast.error("Failed to update water intake");
      console.error("Water intake update error:", error);
    },
  });

  const { data: weekHistory } = useQuery({
    queryKey: ["water-intake-week", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      const { data, error } = await supabase
        .from("water_intake_log")
        .select("date, oz_consumed, daily_goal")
        .eq("user_id", user.id)
        .gte("date", sevenDaysAgo.toISOString().split('T')[0])
        .order("date", { ascending: true });

      if (error) throw error;
      return data || [];
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
