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
        // Get user's profile with active org and branding data
        const { data: profileData } = await supabase
          .from("profiles")
          .select("organization_id, active_org_id, onboarding_data, approval_status")
          .eq("id", session.user.id)
          .single();

        let primaryColor: string | null = null;
        let secondaryColor: string | null = null;

        // Use active_org_id to determine which workspace we're viewing
        const currentOrgId = profileData?.active_org_id;
        const userBelongsToOrg = !!profileData?.organization_id;

        if (currentOrgId) {
          // Viewing an org workspace - apply org theme
          const { data: settingsData } = await supabase
            .from("organization_settings")
            .select("custom_theme_color, logo_url")
            .eq("organization_id", currentOrgId)
            .maybeSingle();

          if (settingsData?.custom_theme_color) {
            primaryColor = settingsData.custom_theme_color;
          }
          
          // Apply org theme
          if (primaryColor) {
            const hsl = hexToHSL(primaryColor);
            document.documentElement.style.setProperty("--primary", hsl);
            localStorage.setItem("org_theme_color", hsl);
          } else {
            // Org has no custom theme, use default
            document.documentElement.style.setProperty("--primary", "0 0% 0%");
            localStorage.removeItem("org_theme_color");
          }
          localStorage.removeItem("org_secondary_color");
        } else {
          // Personal workspace - use default or user's personal theme
          if (userBelongsToOrg && profileData?.onboarding_data) {
            // User has personal branding from onboarding
            const brandingData = profileData.onboarding_data as any;
            primaryColor = brandingData.primaryColor;
            secondaryColor = brandingData.secondaryColor;
            
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
            // Free user / no branding - default black
            document.documentElement.style.setProperty("--primary", "0 0% 0%");
            localStorage.removeItem("org_theme_color");
            localStorage.removeItem("org_secondary_color");
          }
        }
      } catch (error) {
        console.error("Error applying theme:", error);
      }
    };

    applyTheme();

    // Subscribe to realtime changes for org settings and profile changes
    const settingsChannel = supabase
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
          applyTheme();
        }
      )
      .subscribe();

    const profileChannel = supabase
      .channel("profile_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          console.log("Profile updated (active_org_id changed):", payload);
          applyTheme();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(profileChannel);
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
