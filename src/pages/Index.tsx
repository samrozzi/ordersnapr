import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Home, Calendar as CalendarIcon, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSessionTimeout } from "@/hooks/use-session-timeout";
import WorkOrders from "./WorkOrders";
import Forms from "./Forms";
import PropertyInfo from "./PropertyInfo";
import ordersnaprLogo from "@/assets/ordersnapr-horizontal.png";
import { useActiveOrg } from "@/hooks/use-active-org";

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { orgLogoUrl } = useActiveOrg();
  
  // Enforce 6-hour session timeout
  useSessionTimeout(session);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkApprovalStatus = async () => {
    if (!session?.user) return;

    try {
      // Check approval status and organization
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("approval_status, organization_id")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;

      setApprovalStatus(profileData?.approval_status || null);

      // Fetch organization logo if user belongs to an org
      if (profileData?.organization_id) {
        const { data: orgSettings } = await supabase
          .from("organization_settings")
          .select("logo_url")
          .eq("organization_id", profileData.organization_id)
          .maybeSingle();

        if (orgSettings?.logo_url) {
          setOrgLogoUrl(orgSettings.logo_url);
        }
      }

      // Check if user is admin or org admin
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "org_admin"]);

      const hasAdminRole = rolesData?.some(r => r.role === "admin");
      const hasOrgAdminRole = rolesData?.some(r => r.role === "org_admin");

      setIsAdmin(!!hasAdminRole);
      setIsOrgAdmin(!!hasOrgAdminRole);

      // Redirect to pending approval page if not approved and not admin
      if (profileData?.approval_status !== 'approved' && !hasAdminRole) {
        navigate("/pending-approval");
      }
    } catch (error) {
      console.error("Error checking approval status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      checkApprovalStatus();
    }
  }, [session]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="work-orders" className="w-full">
        <header className="border-b overflow-x-hidden">
          <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
              <button 
                onClick={() => navigate("/")}
                className="relative cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                aria-label="Go to home page"
              >
                <img src={ordersnaprLogo} alt="ordersnapr" className="h-12 sm:h-16 relative z-10" />
              </button>
              {orgLogoUrl && (
                <button
                  onClick={() => navigate("/")}
                  className="cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                  aria-label="Go to home page"
                >
                  <img 
                    src={orgLogoUrl} 
                    alt="Organization logo" 
                    className="h-auto max-h-12 sm:max-h-16 max-w-[120px] sm:max-w-[200px] object-contain"
                  />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 sm:gap-4 overflow-x-auto">
              <TooltipProvider>
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate("/dashboard")}
                        aria-label="Dashboard"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                      >
                        <Home className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Dashboard</TooltipContent>
                  </Tooltip>
                  
                  <TabsList className="h-8 sm:h-10">
                    <TabsTrigger value="work-orders" className="text-xs sm:text-sm px-2 sm:px-3">Work Orders</TabsTrigger>
                    <TabsTrigger value="property-info" className="text-xs sm:text-sm px-2 sm:px-3">Property Info</TabsTrigger>
                    <TabsTrigger value="forms" className="text-xs sm:text-sm px-2 sm:px-3">Forms</TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {(isAdmin || isOrgAdmin) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigate(isAdmin ? "/admin" : "/org-admin")}
                          aria-label={isAdmin ? "Admin" : "Org Admin"}
                          className="h-8 w-8 sm:h-10 sm:w-10"
                        >
                          <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isAdmin ? "Admin" : "Org Admin"}</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate("/calendar")}
                        aria-label="Calendar"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                      >
                        <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Calendar</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate("/profile")}
                        aria-label="Profile"
                        className="h-8 w-8 sm:h-10 sm:w-10"
                      >
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Profile</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <TabsContent value="work-orders">
            <WorkOrders />
          </TabsContent>

          <TabsContent value="property-info">
            <PropertyInfo />
          </TabsContent>

          <TabsContent value="forms">
            <Forms />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
};

export default Index;
