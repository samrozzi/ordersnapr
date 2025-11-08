import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureContext } from "@/contexts/FeatureContext";
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
} from "lucide-react";

interface QuickAction {
  label: string;
  path: string;
  icon: typeof Plus;
  feature?: string; // Optional feature flag to check
}

export function QuickAddButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { hasFeature, getFeatureConfig } = useFeatureContext();

  // Get custom display names from org feature configs
  const workOrdersConfig = getFeatureConfig('work_orders');
  const propertiesConfig = getFeatureConfig('properties');
  const formsConfig = getFeatureConfig('forms');
  const calendarConfig = getFeatureConfig('calendar');

  const actions: QuickAction[] = [
    {
      label: workOrdersConfig?.display_name?.replace(/s$/, '') || "Work Order",
      path: "/work-orders",
      icon: Briefcase,
      feature: "work_orders",
    },
    {
      label: propertiesConfig?.display_name?.replace(/s$/, '') || "Property",
      path: "/property-info",
      icon: Home,
      feature: "properties",
    },
    {
      label: formsConfig?.display_name?.replace(/s$/, '') || "Form",
      path: "/forms",
      icon: FileText,
      feature: "forms",
    },
    {
      label: calendarConfig?.display_name?.replace(/s$/, '') || "Event",
      path: "/calendar",
      icon: Calendar,
      feature: "calendar",
    },
  ];

  // Filter actions based on enabled features
  const availableActions = actions.filter(
    (action) => !action.feature || hasFeature(action.feature)
  );

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

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
          {availableActions.map((action) => {
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
