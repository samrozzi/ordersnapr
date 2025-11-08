import { useEffect, useState } from "react";
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
        .select("approval_status, onboarding_completed, organization_id")
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
      const onboardingComplete = profile?.onboarding_completed === true;
      const hasOrg = !!profile?.organization_id;

      // If not approved and not admin, route based on onboarding and org status
      if (!isApproved && !isAdmin) {
        if (!onboardingComplete) {
          // New user needs to complete onboarding first
          navigate("/onboarding");
          setLoading(false);
          return;
        }

        if (!hasOrg) {
          // Free-tier user (no organization) who completed onboarding - grant full access
          setApproved(true);
          setLoading(false);
          return;
        }

        // Org user who completed onboarding but isn't approved yet
        navigate("/pending-approval");
        setLoading(false);
        return;
      }

      // Approved or admin users can access protected routes
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
