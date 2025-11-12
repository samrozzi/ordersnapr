import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { useUserPreferences } from "@/hooks/use-user-preferences";

/**
 * Component that restores theme from user_preferences database
 * Should be rendered once in App.tsx inside ThemeProvider
 */
export function ThemeRestorer() {
  const { setTheme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const { data: userPreferences } = useUserPreferences(userId);

  // Get user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // Restore theme from database when preferences load
  useEffect(() => {
    if (userPreferences?.theme) {
      console.log('🎨 Restoring theme from database:', userPreferences.theme);
      setTheme(userPreferences.theme);
    }
  }, [userPreferences?.theme, setTheme]);

  // This component doesn't render anything
  return null;
}
