import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (!session) {
        navigate("/auth");
        setLoading(false);
        return;
      }

      try {
        // Check onboarding status
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .single();

        const onboardingComplete = profile?.onboarding_completed === true;

        // Only redirect to onboarding once if incomplete
        if (!onboardingComplete) {
          if (!redirectedRef.current && location.pathname !== "/onboarding") {
            redirectedRef.current = true;
            navigate("/onboarding", { replace: true });
          }
          setLoading(false);
          return;
        }

        // All users who completed onboarding have access
        setApproved(true);
        setLoading(false);
      } catch (error) {
        console.error("Error checking profile:", error);
        // On error, assume onboarding incomplete and redirect once
        if (!redirectedRef.current && location.pathname !== "/onboarding") {
          redirectedRef.current = true;
          navigate("/onboarding", { replace: true });
        }
        setLoading(false);
      }
    };

    checkAccess();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        checkAccess();
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

  if (!session || !approved) {
    return null;
  }

  return <>{children}</>;
};
