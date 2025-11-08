import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
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
import ordersnaprLogo from "@/assets/ordersnapr-horizontal.png";
import ordersnaprLogoDark from "@/assets/ordersnapr-horizontal-dark.png";
import ordersnaprIcon from "@/assets/ordersnapr-icon-light.png";
import ordersnaprIconDark from "@/assets/ordersnapr-icon-dark-new.png";
import { Separator } from "@/components/ui/separator";
import { OrgSwitcher } from "./OrgSwitcher";

const iconMap: Record<string, React.ElementType> = {
  clipboard: ClipboardList,
  building: Building,
  "file-text": FileText,
  "file-invoice": Receipt,
  package: Package,
  "bar-chart": BarChart3,
  folder: Folder,
  users: Users,
};

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { enabledNavItems, isLoading: featuresLoading } = useFeatureNavigation();
  const { hasFeature } = useFeatureContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");

  useEffect(() => {
    fetchUserData();
  }, []);

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profileData?.organization_id) {
        const { data: orgSettings } = await supabase
          .from("organization_settings")
          .select("logo_url")
          .eq("organization_id", profileData.organization_id)
          .maybeSingle();

        if (orgSettings?.logo_url) {
          setOrgLogoUrl(orgSettings.logo_url);
        }

        const { data: orgData } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", profileData.organization_id)
          .maybeSingle();

        if (orgData?.name) {
          setOrgName(orgData.name);
        }
      }
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard")}>
                  <NavLink to="/dashboard" end onClick={handleNavClick}>
                    <LayoutDashboard className="h-5 w-5" />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!featuresLoading && enabledNavItems.map((item) => {
                const Icon = item.icon ? iconMap[item.icon] : ClipboardList;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive(item.path)}>
                      <NavLink to={item.path} end onClick={handleNavClick}>
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
          {!featuresLoading && hasFeature("calendar") && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/calendar")}>
                <NavLink to="/calendar" end onClick={handleNavClick}>
                  <Calendar className="h-5 w-5" />
                  <span>Calendar</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

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
    </Sidebar>
  );
}
