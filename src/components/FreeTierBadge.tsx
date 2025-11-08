import { useFreeTierLimits, FreeTierLimits } from "@/hooks/use-free-tier-limits";
import { Badge } from "@/components/ui/badge";

interface FreeTierBadgeProps {
  resource: keyof FreeTierLimits;
  className?: string;
}

/**
 * FreeTierBadge - Shows usage count for free tier users
 *
 * Usage:
 * <FreeTierBadge resource="work_orders" />
 *
 * Displays: "2/3 used" for free users, nothing for approved users
 */
export function FreeTierBadge({ resource, className }: FreeTierBadgeProps) {
  const { usage, limits, isApproved, loading } = useFreeTierLimits();

  // Don't show badge for approved users or while loading
  if (isApproved || loading) {
    return null;
  }

  const used = usage[resource];
  const limit = limits[resource];
  const isAtLimit = used >= limit;
  const isNearLimit = used >= limit * 0.8;

  return (
    <Badge
      variant={isAtLimit ? "destructive" : isNearLimit ? "secondary" : "outline"}
      className={className}
    >
      {used}/{limit} used
    </Badge>
  );
}
