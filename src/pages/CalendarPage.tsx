import { useState } from "react";
import { CalendarView } from "@/components/CalendarView";
import { WorkOrderDetails } from "@/components/WorkOrderDetails";
import { CalendarEventDetails } from "@/components/CalendarEventDetails";
import { AddEventDialog } from "@/components/AddEventDialog";
import { useOrgCalendarData } from "@/hooks/use-org-calendar-data";

const CalendarPage = () => {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const { workOrders, calendarEvents, refetch, loading } = useOrgCalendarData();

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
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">View and manage scheduled work orders and events</p>
        </div>
        <AddEventDialog onEventAdded={refetch} />
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading calendar...</div>
          </div>
        ) : (
          <CalendarView onEventClick={handleEventClick} />
        )}
      </div>

      <WorkOrderDetails
        workOrder={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onUpdate={refetch}
      />

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
