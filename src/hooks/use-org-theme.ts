import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { hexToHSL } from "@/lib/color-utils";

export const useOrgTheme = () => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    const applyTheme = async () => {
      try {
        // Get user's organization
        const { data: profileData } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", session.user.id)
          .single();

        if (!profileData?.organization_id) return;

        // Get organization settings
        const { data: settingsData } = await supabase
          .from("organization_settings")
          .select("custom_theme_color, logo_url")
          .eq("organization_id", profileData.organization_id)
          .maybeSingle();

        if (settingsData?.custom_theme_color) {
          const hsl = hexToHSL(settingsData.custom_theme_color);
          document.documentElement.style.setProperty("--primary", hsl);
          
          // Store in localStorage for instant loading on next visit
          localStorage.setItem("org_theme_color", hsl);
        }
      } catch (error) {
        console.error("Error applying theme:", error);
      }
    };

    applyTheme();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("organization_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organization_settings",
        },
        (payload) => {
          console.log("Theme updated:", payload);
          if (payload.new && (payload.new as any).custom_theme_color) {
            const hsl = hexToHSL((payload.new as any).custom_theme_color);
            document.documentElement.style.setProperty("--primary", hsl);
            localStorage.setItem("org_theme_color", hsl);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Apply cached theme immediately on mount
  useEffect(() => {
    const cachedColor = localStorage.getItem("org_theme_color");
    if (cachedColor) {
      document.documentElement.style.setProperty("--primary", cachedColor);
    }
  }, []);
};
