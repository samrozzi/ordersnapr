import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPreferences } from "@/hooks/use-user-preferences";

/**
 * Component that can be used to restore user preferences from database
 * Currently serves as a placeholder for future preference restoration
 * Should be rendered once in App.tsx
 */
export function ThemeRestorer() {
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

  // This component doesn't render anything
  return null;
}
