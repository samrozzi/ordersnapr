import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

interface FreeRouteProps {
  children: React.ReactNode;
}

/**
 * FreeRoute - Allows authenticated users access without requiring admin approval
 * Used for onboarding and free-tier workspace
 */
export const FreeRoute = ({ children }: FreeRouteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (!session) {
        navigate("/auth");
        setLoading(false);
        return;
      }

      // Check if user has completed onboarding
      const onboardingComplete = localStorage.getItem(`onboarding_completed_${session.user.id}`);

      // If not completed onboarding and not already on onboarding page, redirect
      if (!onboardingComplete && location.pathname !== "/onboarding") {
        navigate("/onboarding");
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        checkAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
};
