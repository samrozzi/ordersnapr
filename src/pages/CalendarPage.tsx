import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarView } from "@/components/CalendarView";
import { WorkOrderDetails } from "@/components/WorkOrderDetails";
import { CalendarEventDetails } from "@/components/CalendarEventDetails";
import { AddEventDialog } from "@/components/AddEventDialog";
import { AppHeader } from "@/components/AppHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useOrgCalendarData } from "@/hooks/use-org-calendar-data";

const CalendarPage = () => {
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const { workOrders, calendarEvents, refetch, loading } = useOrgCalendarData();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check admin status
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin"]);

      setIsAdmin(!!rolesData?.some(r => r.role === "admin"));

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
      <AppHeader orgLogoUrl={orgLogoUrl} isAdmin={isAdmin} currentPage="calendar" />
      
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Navigation Tabs */}
        <Tabs value="calendar" className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="work-orders" onClick={() => navigate("/work-orders")}>
              Work Orders
            </TabsTrigger>
            <TabsTrigger value="property-info" onClick={() => navigate("/property-info")}>
              Property Info
            </TabsTrigger>
            <TabsTrigger value="forms" onClick={() => navigate("/forms")}>
              Forms
            </TabsTrigger>
            <TabsTrigger value="calendar">
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>

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
    </div>
  );
};

export default CalendarPage;
