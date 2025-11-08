import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export interface FreeTierLimits {
  work_orders: number;
  properties: number;
  forms: number;
  calendar_events: number;
}

export interface FreeTierUsage {
  work_orders: number;
  properties: number;
  forms: number;
  calendar_events: number;
}

// Free tier limits
export const FREE_TIER_LIMITS: FreeTierLimits = {
  work_orders: 3,
  properties: 2,
  forms: 2,
  calendar_events: 5,
};

export function useFreeTierLimits() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<FreeTierUsage>({
    work_orders: 0,
    properties: 0,
    forms: 0,
    calendar_events: 0,
  });
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLimits = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user is approved
      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("id", user.id)
        .single();

      const approved = profile?.approval_status === "approved";
      setIsApproved(approved);

      // If approved, no limits apply
      if (approved) {
        setLoading(false);
        return;
      }

      // Get user's organization
      const { data: membership } = await supabase
        .from("org_memberships")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!membership) {
        setLoading(false);
        return;
      }

      const orgId = membership.org_id;

      // Count work orders
      const { count: workOrderCount } = await supabase
        .from("work_orders")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId);

      // Count properties
      const { count: propertyCount } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId);

      // Count forms
      const { count: formCount } = await supabase
        .from("form_templates")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId);

      // Count calendar events
      const { count: eventCount } = await supabase
        .from("calendar_events")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId);

      setUsage({
        work_orders: workOrderCount || 0,
        properties: propertyCount || 0,
        forms: formCount || 0,
        calendar_events: eventCount || 0,
      });

      setLoading(false);
    };

    checkLimits();
  }, [user]);

  const canCreate = (resource: keyof FreeTierLimits): boolean => {
    // Approved users have no limits
    if (isApproved) return true;

    // Check if under limit
    return usage[resource] < FREE_TIER_LIMITS[resource];
  };

  const getUsagePercent = (resource: keyof FreeTierLimits): number => {
    if (isApproved) return 0;
    return (usage[resource] / FREE_TIER_LIMITS[resource]) * 100;
  };

  const getRemainingCount = (resource: keyof FreeTierLimits): number => {
    if (isApproved) return Infinity;
    return Math.max(0, FREE_TIER_LIMITS[resource] - usage[resource]);
  };

  const isAtLimit = (resource: keyof FreeTierLimits): boolean => {
    if (isApproved) return false;
    return usage[resource] >= FREE_TIER_LIMITS[resource];
  };

  return {
    usage,
    limits: FREE_TIER_LIMITS,
    isApproved,
    loading,
    canCreate,
    getUsagePercent,
    getRemainingCount,
    isAtLimit,
  };
}
