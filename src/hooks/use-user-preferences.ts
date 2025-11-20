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
  ai_provider?: 'lovable' | 'openai';
  ai_provider_configured?: boolean;
  openai_api_key_encrypted?: string | null;
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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to prevent flicker
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
      aiProvider,
      aiProviderConfigured,
      openaiApiKey,
    }: {
      userId: string;
      quickAddEnabled?: boolean;
      quickAddItems?: FeatureModule[];
      navOrder?: string[];
      theme?: string;
      aiProvider?: 'lovable' | 'openai';
      aiProviderConfigured?: boolean;
      openaiApiKey?: string;
    }) => {
      // Upsert to handle both insert and update - build update object dynamically
      const updateData: any = { user_id: userId };
      if (quickAddEnabled !== undefined) updateData.quick_add_enabled = quickAddEnabled;
      if (quickAddItems !== undefined) updateData.quick_add_items = quickAddItems;
      if (navOrder !== undefined) updateData.nav_order = navOrder;
      if (theme !== undefined) updateData.theme = theme;
      if (aiProvider !== undefined) updateData.ai_provider = aiProvider;
      if (aiProviderConfigured !== undefined) updateData.ai_provider_configured = aiProviderConfigured;
      if (openaiApiKey !== undefined) updateData.openai_api_key_encrypted = openaiApiKey;

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
    onSuccess: async (data, variables) => {
      // CRITICAL: Force immediate refetch to prevent stale UI
      await queryClient.cancelQueries({ queryKey: ["user-preferences", variables.userId] });
      queryClient.setQueryData(["user-preferences", variables.userId], data);
      await queryClient.invalidateQueries({ queryKey: ["user-preferences", variables.userId] });
      await queryClient.refetchQueries({ 
        queryKey: ["user-preferences", variables.userId],
        exact: true 
      });
    },
  });
};
