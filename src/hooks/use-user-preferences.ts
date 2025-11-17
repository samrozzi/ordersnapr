import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FeatureModule } from "./use-features";

export interface UserPreferences {
  id: string;
  user_id: string;
  quick_add_enabled: boolean;
  quick_add_items: FeatureModule[];
  nav_order: string[];
  openai_api_key?: string | null;
  voice_assistant_enabled?: boolean | null;
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
        // If no row found, return null to allow first insert
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }

      return data as UserPreferences;
    },
    enabled: !!userId,
    retry: false,
  });
};

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      quickAddEnabled,
      quickAddItems,
      navOrder,
      theme,
    }: {
      userId: string;
      quickAddEnabled?: boolean;
      quickAddItems?: FeatureModule[];
      navOrder?: string[];
      theme?: string;
    }) => {
      // Upsert to handle both insert and update - build update object dynamically
      const updateData: any = { user_id: userId };
      if (quickAddEnabled !== undefined) updateData.quick_add_enabled = quickAddEnabled;
      if (quickAddItems !== undefined) updateData.quick_add_items = quickAddItems;
      if (navOrder !== undefined) updateData.nav_order = navOrder;
      if (theme !== undefined) updateData.theme = theme;

      const { data, error } = await supabase
        .from("user_preferences")
        .upsert(updateData, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (_, variables) => {
      // Invalidate and refetch the query immediately
      await queryClient.invalidateQueries({ queryKey: ["user-preferences", variables.userId] });
      await queryClient.refetchQueries({ queryKey: ["user-preferences", variables.userId] });
    },
  });
};
