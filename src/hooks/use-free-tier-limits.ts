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

      // Check if user is approved and has an active org
      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status, organization_id, active_org_id")
        .eq("id", user.id)
        .single();

      // Use active_org_id for multi-org support, fallback to organization_id
      const effectiveOrgId = profile?.active_org_id || profile?.organization_id;
      const hasOrg = !!effectiveOrgId;
      
      // Only approved users IN an organization bypass limits
      const approved = profile?.approval_status === "approved" && hasOrg;
      setIsApproved(approved);

      // If approved in org, no limits apply
      if (approved) {
        setLoading(false);
        return;
      }

      // Count work orders
      const workOrderQuery = supabase
        .from("work_orders")
        .select("*", { count: "exact", head: true });

      if (hasOrg) {
        workOrderQuery.eq("organization_id", effectiveOrgId);
      } else {
        workOrderQuery.eq("user_id", user.id).is("organization_id", null);
      }
      const { count: workOrderCount } = await workOrderQuery;

      // Count properties (properties table only has user_id, not organization_id)
      const propertyQuery = supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: propertyCount } = await propertyQuery;

      // Count forms (form_templates uses org_id, not organization_id)
      // For free users, only count user-scoped templates
      const formQuery = supabase
        .from("form_templates")
        .select("*", { count: "exact", head: true });

      if (hasOrg) {
        formQuery.eq("org_id", effectiveOrgId).eq("scope", "organization");
      } else {
        formQuery.eq("created_by", user.id).is("org_id", null).eq("scope", "user");
      }
      const { count: formCount } = await formQuery;

      // Count calendar events
      const eventQuery = supabase
        .from("calendar_events")
        .select("*", { count: "exact", head: true });

      if (hasOrg) {
        eventQuery.eq("organization_id", effectiveOrgId);
      } else {
        eventQuery.eq("created_by", user.id).is("organization_id", null);
      }
      const { count: eventCount } = await eventQuery;

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
