import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarView } from "@/components/CalendarView";
import { WorkOrderDetails } from "@/components/WorkOrderDetails";
import { CalendarEventDetails } from "@/components/CalendarEventDetails";
import { AddEventDialog } from "@/components/AddEventDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useOrgCalendarData } from "@/hooks/use-org-calendar-data";

const CalendarPage = () => {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const { workOrders, calendarEvents, refetch, loading } = useOrgCalendarData();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Calendar</h1>
            <p className="text-muted-foreground">View and manage scheduled work orders and events</p>
          </div>
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
          <CalendarView />
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
  );
};

export default CalendarPage;
