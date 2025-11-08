import { useFreeTierLimits, FreeTierLimits } from "@/hooks/use-free-tier-limits";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface FreeTierUsageBannerProps {
  only?: (keyof FreeTierLimits)[];
}

const RESOURCE_LABELS: Record<keyof FreeTierLimits, string> = {
  work_orders: "Work Orders",
  properties: "Properties",
  forms: "Form Templates",
  calendar_events: "Calendar Events",
};

export function FreeTierUsageBanner({ only }: FreeTierUsageBannerProps) {
  const { usage, limits, isApproved, loading } = useFreeTierLimits();

  // Don't show for approved org users or while loading
  if (isApproved || loading) {
    return null;
  }

  const resourcesToShow = only || (Object.keys(limits) as (keyof FreeTierLimits)[]);

  return (
    <Alert className="bg-muted/50 border-border">
      <InfoIcon className="h-4 w-4" />
      <AlertDescription className="text-sm">
        <strong className="font-semibold">Free Tier Limits:</strong>{" "}
        {resourcesToShow.map((resource, index) => {
          const used = usage[resource];
          const limit = limits[resource];
          const isAtLimit = used >= limit;
          
          return (
            <span key={resource}>
              {index > 0 && " • "}
              <span className={isAtLimit ? "text-destructive font-medium" : ""}>
                {RESOURCE_LABELS[resource]}: {used}/{limit}
              </span>
            </span>
          );
        })}
      </AlertDescription>
    </Alert>
  );
}
