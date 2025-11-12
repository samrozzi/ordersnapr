import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useFeatureContext } from "@/contexts/FeatureContext";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useFreeTierLimits } from "@/hooks/use-free-tier-limits";
import { useFeatureNavigation } from "@/hooks/use-feature-navigation";
import { useActiveOrg } from "@/hooks/use-active-org";
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
  Bell,
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
  reminders: { icon: Bell, path: "/reminders", defaultLabel: "Reminder" },
  appointments: { icon: Users, path: "/appointments", defaultLabel: "Appointment" },
  inventory: { icon: Package, path: "/inventory", defaultLabel: "Inventory Item" },
  invoicing: { icon: DollarSign, path: "/invoices", defaultLabel: "Invoice" },
  reports: { icon: BarChart3, path: "/reports", defaultLabel: "Report" },
  files: { icon: FolderOpen, path: "/files", defaultLabel: "File" },
  customer_portal: { icon: Users, path: "/portal", defaultLabel: "Portal Access" },
  pos: { icon: ShoppingCart, path: "/pos", defaultLabel: "Sale" },
  customers: { icon: Users, path: "/customers", defaultLabel: "Customer" },
};

export function QuickAddButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { features, getFeatureConfig } = useFeatureContext();
  const { data: userPreferences, isLoading: prefsLoading } = useUserPreferences(user?.id || null);
  const { isAtLimit } = useFreeTierLimits();
  const { enabledNavItems } = useFeatureNavigation();
  const { activeOrgId } = useActiveOrg();

  // Helper function to get org-aware localStorage key
  const getUserFeaturesKey = (userId: string, activeOrgId: string | null): string => {
    if (activeOrgId === null) {
      return `user_features_${userId}_personal`;
    }
    return `user_features_${userId}_org_${activeOrgId}`;
  };

  // Don't render until preferences are loaded to prevent flash of wrong items
  if (prefsLoading) {
    return null;
  }

  // Check if Quick Add is disabled by user
  if (userPreferences?.quick_add_enabled === false) {
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
    // Free tier user - check localStorage with org-aware key
    const storageKey = getUserFeaturesKey(user.id, activeOrgId);
    const userFeaturesJson = localStorage.getItem(storageKey);
    if (userFeaturesJson) {
      try {
        userFeatureModules = JSON.parse(userFeaturesJson) as FeatureModule[];
      } catch (e) {
        console.error("Error parsing user features:", e);
      }
    }
    // Fallback defaults if nothing stored or parsing failed
    if (!userFeaturesJson || userFeatureModules.length === 0) {
      userFeatureModules = ["work_orders", "properties", "forms", "calendar"] as FeatureModule[];
    }
  }

  // Get allowed modules from enabled navigation items
  const allowedModules = enabledNavItems.map(item => item.module);

  // Determine which modules to show in Quick Add
  // ONLY show items that are explicitly selected in preferences
  let selectedModules: FeatureModule[];

  if (userPreferences?.quick_add_items && Array.isArray(userPreferences.quick_add_items) && userPreferences.quick_add_items.length > 0) {
    // User has explicitly configured Quick Add - ONLY show what they selected
    selectedModules = (userPreferences.quick_add_items as FeatureModule[])
      .filter(m => userFeatureModules.includes(m));
  } else if (userPreferences?.quick_add_items && Array.isArray(userPreferences.quick_add_items) && userPreferences.quick_add_items.length === 0) {
    // User explicitly cleared all items - show nothing
    selectedModules = [];
  } else {
    // First-time user with no preferences saved - show sensible defaults
    // Only show first 3 enabled features as a starter set
    selectedModules = userFeatureModules.slice(0, 3);
  }

  // Build actions array from selected modules
  const actions: QuickAction[] = selectedModules
    .map((module) => {
      const config = FEATURE_CONFIG[module];
      if (!config) return null;
      // Get custom label from navigation or feature config  
      const featureConfig = getFeatureConfig(module);
      const navItem = enabledNavItems.find(item => item.module === module);
      const label = navItem?.label || featureConfig?.display_name || config.defaultLabel;
      
      return {
        label,
        path: config.path,
        icon: config.icon,
        feature: module,
      };
    })
    .filter((action): action is QuickAction => action !== null);

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
                <div className="flex items-center gap-2">
                  {action.icon && <Icon className="h-4 w-4" />}
                  <span>{action.label}</span>
                </div>
                {limitResource && (
                  <FreeTierBadge resource={limitResource} />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
