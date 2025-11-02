import { useMemo } from "react";
import { useFeatureContext } from "@/contexts/FeatureContext";
import { FeatureModule } from "./use-features";

export interface NavItem {
  module: FeatureModule;
  label: string;
  path: string;
  icon?: string;
}

const MODULE_NAV_MAP: NavItem[] = [
  { module: "work_orders", label: "Work Orders", path: "/work-orders", icon: "clipboard" },
  { module: "calendar", label: "Calendar", path: "/calendar", icon: "calendar" },
  { module: "properties", label: "Property Info", path: "/property-info", icon: "building" },
  { module: "forms", label: "Forms", path: "/forms", icon: "file-text" },
  { module: "invoicing", label: "Invoices", path: "/invoices", icon: "file-invoice" },
  { module: "inventory", label: "Inventory", path: "/inventory", icon: "package" },
  { module: "reports", label: "Reports", path: "/reports", icon: "bar-chart" },
  { module: "files", label: "Files", path: "/files", icon: "folder" },
  { module: "customer_portal", label: "Portal", path: "/portal", icon: "users" },
];

export const useFeatureNavigation = () => {
  const { hasFeature, isLoading } = useFeatureContext();

  const enabledNavItems = useMemo(() => {
    if (isLoading) return [];
    return MODULE_NAV_MAP.filter((item) => hasFeature(item.module));
  }, [hasFeature, isLoading]);

  const isRouteEnabled = (path: string): boolean => {
    // Dashboard and profile are always enabled
    if (path === "/dashboard" || path === "/profile" || path === "/org-admin") {
      return true;
    }

    const navItem = MODULE_NAV_MAP.find((item) => item.path === path);
    if (!navItem) return false;

    return hasFeature(navItem.module);
  };

  return {
    enabledNavItems,
    isRouteEnabled,
    isLoading,
  };
};
