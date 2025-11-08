import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (!session) {
        navigate("/auth");
        setLoading(false);
        return;
      }

      // Check if user is approved or is an admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("id", session.user.id)
        .single();

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      const isAdmin = !!roles;
      const isApproved = profile?.approval_status === "approved";

      // Check if user has completed onboarding
      const onboardingComplete = localStorage.getItem(`onboarding_completed_${session.user.id}`);

      // If not approved and not admin, check if they've completed onboarding
      if (!isApproved && !isAdmin) {
        // If they haven't completed onboarding, send to onboarding or pending
        if (!onboardingComplete) {
          navigate("/pending-approval");
          setLoading(false);
          return;
        }
        // If they have completed onboarding, allow access with free tier limits
        // They'll be able to use the app with restrictions
      }

      setApproved(true);
      setLoading(false);
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
  }, [navigate]);

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
