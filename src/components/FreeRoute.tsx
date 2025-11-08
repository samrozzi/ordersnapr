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
    let isMounted = true;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!isMounted) return;

      setSession(session);

      if (!session) {
        navigate("/auth");
        setLoading(false);
        return;
      }

      // Check if user is approved and onboarding status
      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status, onboarding_completed")
        .eq("id", session.user.id)
        .single();

      if (!isMounted) return;

      const isApproved = profile?.approval_status === "approved";
      const onboardingComplete = profile?.onboarding_completed === true;

      // Protect onboarding route - only for new users who haven't completed it
      if (location.pathname === "/onboarding") {
        if (isApproved || onboardingComplete) {
          // Approved users or users who already completed onboarding should go to dashboard/workspace
          navigate(isApproved ? "/dashboard" : "/free-workspace");
          setLoading(false);
          return;
        }
      }

      // If approved user tries to access free workspace, redirect to dashboard
      if (location.pathname === "/free-workspace") {
        if (isApproved) {
          navigate("/dashboard");
          setLoading(false);
          return;
        }
        
        // Free tier user accessing free workspace
        if (!onboardingComplete) {
          navigate("/onboarding");
          setLoading(false);
          return;
        }
        
        // Check if user has already seen the free workspace page
        const hasSeenWorkspace = localStorage.getItem(`free_workspace_seen_${session.user.id}`) === "true";
        if (hasSeenWorkspace) {
          // Redirect to dashboard if they've already seen it
          navigate("/dashboard");
          setLoading(false);
          return;
        }
        // All good - allow first-time access
      }

      setLoading(false);
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate, location.pathname]);

  // Separate effect for auth state changes to avoid re-creating listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
