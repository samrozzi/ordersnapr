import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureContext } from "@/contexts/FeatureContext";
import { useAuth } from "@/hooks/use-auth";
import { useUserPreferences } from "@/hooks/use-user-preferences";
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
  FileSignature,
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

// Feature configuration mapping
const FEATURE_CONFIG: Record<FeatureModule, { icon: typeof Plus; path: string; defaultLabel: string }> = {
  work_orders: { icon: Briefcase, path: "/work-orders", defaultLabel: "Work Order" },
  properties: { icon: Home, path: "/property-info", defaultLabel: "Property" },
  forms: { icon: FileText, path: "/forms", defaultLabel: "Form" },
  calendar: { icon: Calendar, path: "/calendar", defaultLabel: "Event" },
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
  const { features, hasFeature, getFeatureConfig } = useFeatureContext();
  const { data: preferences } = useUserPreferences(user?.id || null);

  // Check if Quick Add is disabled by user
  if (preferences?.quick_add_enabled === false) {
    return null;
  }

  // Build actions from all enabled features
  let actions: QuickAction[] = features
    .filter(feature => feature.enabled && FEATURE_CONFIG[feature.module as FeatureModule])
    .map(feature => {
      const featureModule = feature.module as FeatureModule;
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
    return null; // Don't show button if no features enabled
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
            return (
              <DropdownMenuItem
                key={action.path}
                onClick={() => handleSelect(action.path)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {action.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
