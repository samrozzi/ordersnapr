import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Receipt,
  Package,
  Building,
  BarChart3,
  Folder,
  Users,
  Calendar,
  Shield,
  User,
  LogOut,
  Lock,
  StickyNote,
  ChevronDown,
  ChevronRight,
  Sliders,
  Bell,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useFeatureNavigation } from "@/hooks/use-feature-navigation";
import { useFeatureContext } from "@/contexts/FeatureContext";
import { useNotes } from "@/hooks/use-notes";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import ordersnaprLogo from "@/assets/ordersnapr-horizontal.png";
import ordersnaprLogoDark from "@/assets/ordersnapr-horizontal-dark.png";
import ordersnaprIcon from "@/assets/ordersnapr-icon-light.png";
import ordersnaprIconDark from "@/assets/ordersnapr-icon-dark-new.png";
import { Separator } from "@/components/ui/separator";
import { OrgSwitcher } from "./OrgSwitcher";
import { useActiveOrg } from "@/hooks/use-active-org";
import { FeatureLockedModal } from "./FeatureLockedModal";

const iconMap: Record<string, React.ElementType> = {
  clipboard: ClipboardList,
  building: Building,
  "file-text": FileText,
  "file-invoice": Receipt,
  package: Package,
  "bar-chart": BarChart3,
  folder: Folder,
  users: Users,
  bell: Bell,
};

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { enabledNavItems, isLoading: featuresLoading } = useFeatureNavigation();
  const { hasFeature } = useFeatureContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const { activeOrg, orgLogoUrl } = useActiveOrg();
  const orgName = activeOrg?.name || "";
  const [lockedFeatureName, setLockedFeatureName] = useState<string | null>(null);
  const { pinnedNotes, preferences, updatePreferences } = useNotes();
  const [notesDropdownOpen, setNotesDropdownOpen] = useState(preferences?.sidebar_dropdown_open ?? true);
  const [userId, setUserId] = useState<string | null>(null);
  const { data: userPreferences } = useUserPreferences(userId);
  const { enabledToggles, featureToggleVersion } = useSidebarState(userId);
  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // Sync notes dropdown state with preferences
  useEffect(() => {
    if (preferences) {
      setNotesDropdownOpen(preferences.sidebar_dropdown_open);
    }
  }, [preferences]);

  const toggleNotesDropdown = async () => {
    const newState = !notesDropdownOpen;
    setNotesDropdownOpen(newState);
    await updatePreferences({ sidebar_dropdown_open: newState });
  };

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "org_admin"]);

      setIsAdmin(!!rolesData?.some(r => r.role === "admin"));
      setIsOrgAdmin(!!rolesData?.some(r => r.role === "org_admin"));

      // Organization context (logo and name) now provided by useActiveOrg hook; no manual fetch needed.

    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Prefetch page data on hover for instant navigation
  const handlePrefetch = useCallback((path: string) => {
    if (path === "/work-orders") {
      queryClient.prefetchQuery({ queryKey: ["workOrders"] });
    } else if (path === "/property-info") {
      queryClient.prefetchQuery({ queryKey: ["properties"] });
    } else if (path === "/notes") {
      queryClient.prefetchQuery({ queryKey: ["notes"] });
    } else if (path === "/customers") {
      queryClient.prefetchQuery({ queryKey: ["customers"] });
    } else if (path === "/invoices") {
      queryClient.prefetchQuery({ queryKey: ["invoices"] });
    }
  }, [queryClient]);

  // Build ordered nav items based on user preferences and org-aware toggles
  const orderedNavItems = useMemo(() => {
    // Base items (Calendar, Notes)
    const baseItems: Array<{
      id: string;
      label: string;
      path: string;
      icon: string;
      component: React.ElementType;
      isLocked: boolean;
    }> = [];

    // Calendar: must be both feature-enabled and user-enabled
    if (hasFeature("calendar") && enabledToggles.includes("calendar")) {
      baseItems.push({ id: "calendar", label: "Calendar", path: "/calendar", icon: "calendar", component: Calendar, isLocked: false });
    }

    // Notes - always available and not toggle-controlled
    baseItems.push({ id: "notes", label: "Notes", path: "/notes", icon: "notes", component: StickyNote, isLocked: false });

    // Feature items from useFeatureNavigation, further filtered by user toggles
    const featureItems = enabledNavItems
      .filter((item) => enabledToggles.includes(item.module))
      .map((item) => ({
        id: item.path.substring(1),
        label: item.label,
        path: item.path,
        icon: item.icon || "clipboard",
        component: iconMap[item.icon || "clipboard"] || ClipboardList,
        isLocked: item.isLocked || false,
      }));

    const allItems = [...baseItems, ...featureItems];

    // Apply saved navigation order if exists
    if (userPreferences?.nav_order && Array.isArray(userPreferences.nav_order) && userPreferences.nav_order.length > 0) {
      const savedOrder = userPreferences.nav_order as string[];
      const orderedItems = savedOrder
        .map((id) => allItems.find((item) => item.id === id))
        .filter((item): item is typeof allItems[0] => item !== undefined);

      // Add any new items that weren't in saved order
      const newItems = allItems.filter((item) => !savedOrder.includes(item.id));

      return [...orderedItems, ...newItems];
    }

    return allItems;
  }, [enabledNavItems, hasFeature, userPreferences?.nav_order, enabledToggles, featureToggleVersion]);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className={state === "collapsed" ? "border-b py-1 px-1" : "border-b py-4 px-4"}>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          aria-label="Go to dashboard"
        >
          {/* Light mode logos */}
          <img 
            src={ordersnaprIcon} 
            alt="OrderSnapr" 
            className={state === "collapsed" ? "h-12 w-12 object-contain mx-auto block dark:hidden" : "hidden"}
          />
          <img 
            src={ordersnaprLogo} 
            alt="OrderSnapr" 
            className={state === "collapsed" ? "hidden" : "h-[44px] max-w-[220px] object-contain block dark:hidden"}
          />
          {/* Dark mode logos */}
          <img 
            src={ordersnaprIconDark} 
            alt="OrderSnapr" 
            className={state === "collapsed" ? "h-12 w-12 object-contain mx-auto hidden dark:block" : "hidden"}
          />
          <img 
            src={ordersnaprLogoDark} 
            alt="OrderSnapr" 
            className={state === "collapsed" ? "hidden" : "h-[44px] max-w-[220px] object-contain hidden dark:block"}
          />
        </button>
        {state !== "collapsed" && (
          orgLogoUrl ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-3 hover:opacity-80 transition-opacity"
              aria-label="Organization"
            >
              <img
                src={orgLogoUrl}
                alt="Organization logo"
                className="h-auto max-h-10 max-w-[160px] object-contain"
              />
            </button>
          ) : orgName ? (
            <div className="flex items-center gap-3 mt-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {orgName.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium truncate">{orgName}</span>
            </div>
          ) : null
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard always first */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard")}>
                  <NavLink 
                    to="/dashboard" 
                    end 
                    onClick={handleNavClick}
                    onMouseEnter={() => handlePrefetch("/dashboard")}
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Ordered nav items (Calendar, Notes, and enabled features) */}
              {!featuresLoading && orderedNavItems.map((item) => {
                const Icon = item.component;

                // Special handling for Notes with pinned dropdown
                if (item.id === "notes") {
                  return (
                    <SidebarMenuItem key={item.id}>
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <SidebarMenuButton asChild isActive={isActive(item.path)} className="flex-1">
                            <NavLink 
                              to={item.path} 
                              end 
                              onClick={handleNavClick}
                              onMouseEnter={() => handlePrefetch(item.path)}
                            >
                              <Icon className="h-5 w-5" />
                              <span>{item.label}</span>
                            </NavLink>
                          </SidebarMenuButton>
                          {pinnedNotes.length > 0 && state !== "collapsed" && (
                            <button
                              onClick={toggleNotesDropdown}
                              className="px-2 py-2 hover:bg-accent rounded-md"
                            >
                              {notesDropdownOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Pinned Notes Dropdown */}
                        {pinnedNotes.length > 0 && notesDropdownOpen && state !== "collapsed" && (
                          <div className="ml-6 mt-1 space-y-1">
                            {pinnedNotes.map((note) => (
                              <SidebarMenuButton
                                key={note.id}
                                asChild
                                size="sm"
                                className="text-sm"
                              >
                                <NavLink
                                  to={`/notes?id=${note.id}`}
                                  onClick={handleNavClick}
                                >
                                  <span className="truncate">{note.title}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            ))}
                          </div>
                        )}
                      </div>
                    </SidebarMenuItem>
                  );
                }

                // Locked feature
                if (item.isLocked) {
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        onClick={(e) => {
                          e.preventDefault();
                          setLockedFeatureName(item.label);
                        }}
                        isActive={isActive(item.path)}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="flex items-center gap-2">
                          {item.label}
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // Regular nav item
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive(item.path)}>
                      <NavLink 
                        to={item.path} 
                        end 
                        onClick={handleNavClick}
                        onMouseEnter={() => handlePrefetch(item.path)}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Separator className="mb-2" />
        {state !== "collapsed" && (
          <>
            <div className="px-3 pb-2">
              <OrgSwitcher />
            </div>
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
              Powered by OrderSnapr
            </div>
          </>
        )}
        <SidebarMenu>
          {(isAdmin || isOrgAdmin) && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive(isAdmin ? "/admin" : "/org-admin")}>
                <NavLink to={isAdmin ? "/admin" : "/org-admin"} end onClick={handleNavClick}>
                  <Shield className="h-5 w-5" />
                  <span>{isAdmin ? "Admin" : "Org Admin"}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {(isAdmin || isOrgAdmin) && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/custom-fields-admin")}>
                <NavLink to="/custom-fields-admin" end onClick={handleNavClick}>
                  <Sliders className="h-5 w-5" />
                  <span>Custom Fields</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/profile")}>
              <NavLink to="/profile" end onClick={handleNavClick}>
                <User className="h-5 w-5" />
                <span>Profile</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <FeatureLockedModal
        open={!!lockedFeatureName}
        onClose={() => setLockedFeatureName(null)}
        featureName={lockedFeatureName || ""}
      />
    </Sidebar>
  );
}
