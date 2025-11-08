import { ReactNode, useState, useEffect } from "react";
import { usePremiumAccess } from "@/hooks/use-premium-access";
import { FeatureLockedModal } from "./FeatureLockedModal";

interface PremiumFeatureGuardProps {
  feature: string;
  featureName: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Guard component for premium features
 * Shows FeatureLockedModal for free tier users trying to access premium features
 * For page-level protection
 */
export function PremiumFeatureGuard({
  feature,
  featureName,
  children,
  fallback,
}: PremiumFeatureGuardProps) {
  const { canAccessFeature, isPremiumOnly, loading } = usePremiumAccess();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // If loading, don't show anything yet
    if (loading) return;

    // If user can't access this feature and it's premium only, show modal
    if (!canAccessFeature(feature) && isPremiumOnly(feature)) {
      setShowModal(true);
    }
  }, [loading, canAccessFeature, isPremiumOnly, feature]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Premium-only feature - show modal and fallback
  if (!canAccessFeature(feature) && isPremiumOnly(feature)) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4 max-w-md">
              <h2 className="text-2xl font-bold">Premium Feature</h2>
              <p className="text-muted-foreground">
                This feature requires an approved account or organization membership.
              </p>
            </div>
          </div>
        )}
        <FeatureLockedModal
          open={showModal}
          onClose={() => setShowModal(false)}
          featureName={featureName}
        />
      </>
    );
  }

  // User has access - show the feature
  return <>{children}</>;
}
