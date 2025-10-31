import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarView } from "@/components/CalendarView";
import { WorkOrderDetails } from "@/components/WorkOrderDetails";
import { CalendarEventDetails } from "@/components/CalendarEventDetails";
import { AddEventDialog } from "@/components/AddEventDialog";
import { useNavigate } from "react-router-dom";
import { useOrgCalendarData } from "@/hooks/use-org-calendar-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Home, Calendar as CalendarIcon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ordersnaprLogo from "@/assets/ordersnapr-horizontal.png";
import WorkOrders from "./WorkOrders";
import PropertyInfo from "./PropertyInfo";
import Forms from "./Forms";

const CalendarPage = () => {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const { workOrders, calendarEvents, refetch, loading } = useOrgCalendarData();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is admin or org admin
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "org_admin"]);

      setIsAdmin(!!rolesData?.some(r => r.role === "admin"));
      setIsOrgAdmin(!!rolesData?.some(r => r.role === "org_admin"));

      // Fetch organization logo
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
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleEventClick = (item: any) => {
    if (item.type === 'work_order') {
      const order = workOrders.find(wo => wo.id === item.id);
      if (order) {
        setSelectedOrder(order);
      }
    } else if (item.type === 'calendar_event') {
      const event = calendarEvents.find(e => e.id === item.id);
      if (event) {
        setSelectedEvent(event);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="calendar" className="w-full">
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
                        variant="default"
                        size="icon"
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

        <TabsContent value="work-orders" className="mt-0">
          <WorkOrders />
        </TabsContent>

        <TabsContent value="property-info" className="mt-0">
          <PropertyInfo />
        </TabsContent>

        <TabsContent value="forms" className="mt-0">
          <Forms />
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold">Calendar</h1>
                <p className="text-muted-foreground">View and manage scheduled work orders and events</p>
              </div>
              <AddEventDialog onEventAdded={refetch} />
            </div>

            {/* Calendar View */}
            <div className="bg-card rounded-lg border shadow-sm p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-pulse text-muted-foreground">Loading calendar...</div>
                </div>
              ) : (
                <CalendarView onEventClick={handleEventClick} />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Work Order Details Dialog */}
      <WorkOrderDetails
        workOrder={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onUpdate={refetch}
      />

      {/* Calendar Event Details Dialog */}
      <CalendarEventDetails
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        onUpdate={refetch}
      />
    </div>
  );
};

export default CalendarPage;
