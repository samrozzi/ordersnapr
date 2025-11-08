import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useFeatureContext } from "@/contexts/FeatureContext";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useFreeTierLimits } from "@/hooks/use-free-tier-limits";
import { FreeTierBadge } from "@/components/FreeTierBadge";
import { FeatureModule } from "@/hooks/use-features";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Briefcase,
  Home,
  FileText,
  Calendar,
  Users,
  Package,
  DollarSign,
  FolderOpen,
  ShoppingCart,
  BarChart3,
} from "lucide-react";

interface QuickAction {
  label: string;
  path: string;
  icon: typeof Plus;
  feature: FeatureModule;
}

const FEATURE_CONFIG: Record<FeatureModule, { icon: typeof Plus; path: string; defaultLabel: string; limitResource?: "work_orders" | "properties" | "forms" | "calendar_events" }> = {
  work_orders: { icon: Briefcase, path: "/work-orders", defaultLabel: "Work Order", limitResource: "work_orders" },
  properties: { icon: Home, path: "/property-info", defaultLabel: "Property", limitResource: "properties" },
  forms: { icon: FileText, path: "/forms", defaultLabel: "Form", limitResource: "forms" },
  calendar: { icon: Calendar, path: "/calendar", defaultLabel: "Event", limitResource: "calendar_events" },
  appointments: { icon: Users, path: "/appointments", defaultLabel: "Appointment" },
  inventory: { icon: Package, path: "/inventory", defaultLabel: "Inventory Item" },
  invoicing: { icon: DollarSign, path: "/invoices", defaultLabel: "Invoice" },
  reports: { icon: BarChart3, path: "/reports", defaultLabel: "Report" },
  files: { icon: FolderOpen, path: "/files", defaultLabel: "File" },
  customer_portal: { icon: Users, path: "/portal", defaultLabel: "Portal Access" },
  pos: { icon: ShoppingCart, path: "/pos", defaultLabel: "Sale" },
};

export function QuickAddButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { features, getFeatureConfig } = useFeatureContext();
  const { data: preferences } = useUserPreferences(user?.id || null);

  // Check if Quick Add is disabled by user
  if (preferences?.quick_add_enabled === false) {
    return null;
  }

  // Get user's enabled features (from org or localStorage for free tier)
  let userFeatureModules: FeatureModule[] = [];

  if (features && features.length > 0) {
    // Org user - use features from database
    userFeatureModules = features
      .filter(f => f.enabled)
      .map(f => f.module as FeatureModule);
  } else if (user) {
    // Free tier user - check localStorage
    const userFeaturesJson = localStorage.getItem(`user_features_${user.id}`);
    if (userFeaturesJson) {
      try {
        userFeatureModules = JSON.parse(userFeaturesJson) as FeatureModule[];
      } catch (e) {
        console.error("Error parsing user features:", e);
      }
    }
  }

  // Build actions from enabled features
  let actions: QuickAction[] = userFeatureModules
    .filter(featureModule => FEATURE_CONFIG[featureModule])
    .map(featureModule => {
      const config = FEATURE_CONFIG[featureModule];
      const orgConfig = getFeatureConfig(featureModule);

      return {
        label: orgConfig?.display_name || config.defaultLabel,
        path: config.path,
        icon: config.icon,
        feature: featureModule,
      };
    });

  // Filter based on user preferences if they've customized it
  if (preferences?.quick_add_items && preferences.quick_add_items.length > 0) {
    actions = actions.filter(action =>
      preferences.quick_add_items.includes(action.feature)
    );
  }

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Quick Add</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action) => {
            const Icon = action.icon;
            const config = FEATURE_CONFIG[action.feature];
            const limitResource = config.limitResource;

            return (
              <DropdownMenuItem
                key={action.path}
                onClick={() => handleSelect(action.path)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Icon className="mr-2 h-4 w-4" />
                  {action.label}
                </div>
                {limitResource && (
                  <FreeTierBadge resource={limitResource} className="ml-2" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
