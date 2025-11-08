import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

// Features available in free tier (with usage limits)
const FREE_TIER_FEATURES = [
  "work_orders",
  "properties",
  "forms",
  "calendar",
] as const;

// Premium-only features (completely locked for free tier)
const PREMIUM_ONLY_FEATURES = [
  "invoicing",
  "inventory",
  "reports",
  "files",
  "pos",
  "customer_portal",
  "customers",
] as const;

export type FeatureType = typeof FREE_TIER_FEATURES[number] | typeof PREMIUM_ONLY_FEATURES[number];

export function usePremiumAccess() {
  const { user } = useAuth();
  const [isApproved, setIsApproved] = useState(false);
  const [hasOrg, setHasOrg] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check approval status
        const { data: profile } = await supabase
          .from("profiles")
          .select("approval_status, organization_id")
          .eq("id", user.id)
          .single();

        const approved = profile?.approval_status === "approved";
        const inOrg = !!profile?.organization_id;

        setIsApproved(approved);
        setHasOrg(inOrg);
      } catch (error) {
        console.error("Error checking premium access:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user]);

  /**
   * Check if a feature is accessible for the current user
   * Free tier users can access FREE_TIER_FEATURES with usage limits
   * Premium users (approved/in org) can access all features
   */
  const canAccessFeature = (feature: string): boolean => {
    // Premium users get everything
    if (isApproved || hasOrg) {
      return true;
    }

    // Free tier users can access free tier features (with limits)
    return FREE_TIER_FEATURES.includes(feature as any);
  };

  /**
   * Check if a feature is premium-only (completely locked for free tier)
   */
  const isPremiumOnly = (feature: string): boolean => {
    return PREMIUM_ONLY_FEATURES.includes(feature as any);
  };

  /**
   * Check if user has premium access (approved or in org)
   */
  const hasPremiumAccess = (): boolean => {
    return isApproved || hasOrg;
  };

  return {
    isApproved,
    hasOrg,
    loading,
    canAccessFeature,
    isPremiumOnly,
    hasPremiumAccess,
  };
}
