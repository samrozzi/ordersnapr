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
        // Get user's profile with organization and branding data
        const { data: profileData } = await supabase
          .from("profiles")
          .select("organization_id, onboarding_data, approval_status")
          .eq("id", session.user.id)
          .single();

        let primaryColor: string | null = null;
        let secondaryColor: string | null = null;

        // Only users in an organization can use custom branding
        const canUseBranding = !!profileData?.organization_id;

        if (canUseBranding) {
          // If user has personal branding, use that first
          if (profileData?.onboarding_data) {
            const brandingData = profileData.onboarding_data as any;
            primaryColor = brandingData.primaryColor;
            secondaryColor = brandingData.secondaryColor;
          }

          // If no personal branding, check org settings
          if (!primaryColor && profileData?.organization_id) {
            const { data: settingsData } = await supabase
              .from("organization_settings")
              .select("custom_theme_color, logo_url")
              .eq("organization_id", profileData.organization_id)
              .maybeSingle();

            if (settingsData?.custom_theme_color) {
              primaryColor = settingsData.custom_theme_color;
            }
          }

          // Apply colors for org users
          if (primaryColor) {
            const hsl = hexToHSL(primaryColor);
            document.documentElement.style.setProperty("--primary", hsl);
            localStorage.setItem("org_theme_color", hsl);
          }

          if (secondaryColor) {
            const hsl = hexToHSL(secondaryColor);
            document.documentElement.style.setProperty("--secondary-brand", hsl);
            localStorage.setItem("org_secondary_color", hsl);
          }
        } else {
          // Free users get default black primary
          document.documentElement.style.setProperty("--primary", "0 0% 0%");
          localStorage.removeItem("org_theme_color");
          localStorage.removeItem("org_secondary_color");
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
    const cachedSecondary = localStorage.getItem("org_secondary_color");
    if (cachedColor) {
      document.documentElement.style.setProperty("--primary", cachedColor);
    }
    if (cachedSecondary) {
      document.documentElement.style.setProperty("--secondary-brand", cachedSecondary);
    }
  }, []);
};
