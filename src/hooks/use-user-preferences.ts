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

// localStorage fallback key
const STORAGE_KEY = "ordersnapr_user_preferences";

// Helper to get preferences from localStorage
const getLocalPreferences = (userId: string): UserPreferences | null => {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

// Helper to save preferences to localStorage
const setLocalPreferences = (userId: string, prefs: Partial<UserPreferences>) => {
  const existing = getLocalPreferences(userId);
  const updated = {
    id: existing?.id || crypto.randomUUID(),
    user_id: userId,
    quick_add_enabled: prefs.quick_add_enabled ?? true,
    quick_add_items: prefs.quick_add_items ?? [],
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(updated));
  return updated;
};

export const useUserPreferences = (userId: string | null) => {
  return useQuery({
    queryKey: ["user-preferences", userId],
    queryFn: async () => {
      if (!userId) return null;

      // Try database first
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // If no row found (PGRST116), return null to allow first insert
        if (error.code === "PGRST116") {
          return null;
        }
        // If table doesn't exist, use localStorage fallback
        if (error.message?.includes("user_preferences")) {
          return getLocalPreferences(userId);
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
    }: {
      userId: string;
      quickAddEnabled: boolean;
      quickAddItems: FeatureModule[];
    }) => {
      // First, check if preferences exist in database
      const { data: existing, error: checkError } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", userId)
        .single();

      // If table doesn't exist, use localStorage fallback
      if (checkError && checkError.message?.includes("user_preferences")) {
        return setLocalPreferences(userId, {
          quick_add_enabled: quickAddEnabled,
          quick_add_items: quickAddItems,
        });
      }

      if (existing) {
        // Update existing in database
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
        // Insert new in database
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
