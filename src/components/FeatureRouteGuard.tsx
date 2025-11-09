import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureContext } from "@/contexts/FeatureContext";
import { FeatureModule } from "@/hooks/use-features";
import { supabase } from "@/integrations/supabase/client";

interface FeatureRouteGuardProps {
  module: FeatureModule;
  children: ReactNode;
}

export const FeatureRouteGuard = ({ module, children }: FeatureRouteGuardProps) => {
  const { hasFeature, isLoading } = useFeatureContext();
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Check super admin status
  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("id", session.user.id)
        .single();

      setIsSuperAdmin(profile?.is_super_admin || false);
    };

    checkSuperAdmin();
  }, []);

  useEffect(() => {
    // Super admins bypass all feature checks
    if (isSuperAdmin) return;

    if (!isLoading && !hasFeature(module)) {
      navigate("/dashboard", { replace: true });
    }
  }, [hasFeature, isLoading, module, navigate, isSuperAdmin]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Super admins have access to everything
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (!hasFeature(module)) {
    return null;
  }

  return <>{children}</>;
};
