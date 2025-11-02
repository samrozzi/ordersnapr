import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureContext } from "@/contexts/FeatureContext";
import { FeatureModule } from "@/hooks/use-features";

interface FeatureRouteGuardProps {
  module: FeatureModule;
  children: ReactNode;
}

export const FeatureRouteGuard = ({ module, children }: FeatureRouteGuardProps) => {
  const { hasFeature, isLoading } = useFeatureContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !hasFeature(module)) {
      navigate("/dashboard", { replace: true });
    }
  }, [hasFeature, isLoading, module, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!hasFeature(module)) {
    return null;
  }

  return <>{children}</>;
};
