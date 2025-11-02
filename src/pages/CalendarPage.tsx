import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarView } from "@/components/CalendarView";
import { WorkOrderDetails } from "@/components/WorkOrderDetails";
import { CalendarEventDetails } from "@/components/CalendarEventDetails";
import { AddEventDialog } from "@/components/AddEventDialog";
import { useOrgCalendarData } from "@/hooks/use-org-calendar-data";
import { AppHeader } from "@/components/AppHeader";

const CalendarPage = () => {
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
      <AppHeader 
        orgLogoUrl={orgLogoUrl}
        isAdmin={isAdmin}
        isOrgAdmin={isOrgAdmin}
        currentPage="calendar"
        showHomeButton={true}
        showNavTabs={true}
      />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
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
      </main>

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
