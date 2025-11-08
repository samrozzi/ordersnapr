import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FeatureModule } from "./use-features";

export interface UserPreferences {
  id: string;
  user_id: string;
  quick_add_enabled: boolean;
  quick_add_items: FeatureModule[];
  created_at: string;
  updated_at: string;
}

export const useUserPreferences = (userId: string | null) => {
  return useQuery({
    queryKey: ["user-preferences", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // If no preferences exist, return null (we'll create them when saving)
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data as UserPreferences;
    },
    enabled: !!userId,
  });
};

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      quickAddEnabled,
      quickAddItems,
    }: {
      userId: string;
      quickAddEnabled: boolean;
      quickAddItems: FeatureModule[];
    }) => {
      // First, check if preferences exist
      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("user_preferences")
          .update({
            quick_add_enabled: quickAddEnabled,
            quick_add_items: quickAddItems,
          })
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("user_preferences")
          .insert({
            user_id: userId,
            quick_add_enabled: quickAddEnabled,
            quick_add_items: quickAddItems,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences", variables.userId] });
    },
  });
};
