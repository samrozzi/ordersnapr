import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WorkOrder {
  id: string;
  customer_name: string;
  scheduled_date: string;
  scheduled_time?: string;
}

interface CalendarWidgetSmallProps {
  workOrders: WorkOrder[];
}

export const CalendarWidgetSmall = ({ workOrders }: CalendarWidgetSmallProps) => {
  const navigate = useNavigate();
  const today = new Date();
  const upcomingOrders = workOrders.slice(0, 2);

  return (
    <div
      className="h-full flex flex-col cursor-pointer group"
      onClick={() => navigate("/calendar")}
    >
      {/* Header - Large date */}
      <div className="bg-accent/10 rounded-lg p-3 mb-3">
        <div className="text-xs text-muted-foreground uppercase font-medium mb-1">
          {format(today, "EEEE")}
        </div>
        <div className="text-4xl font-bold text-foreground">
          {format(today, "d")}
        </div>
      </div>

      {/* Upcoming events */}
      <div className="flex-1 space-y-2 overflow-hidden">
        {upcomingOrders.length > 0 ? (
          upcomingOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center gap-2 text-xs bg-card/50 rounded p-2 group-hover:bg-accent/20 transition-colors"
            >
              <div className="w-1 h-8 bg-primary rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{order.customer_name}</div>
                <div className="text-muted-foreground">
                  {order.scheduled_time || "All day"}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Calendar className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs">No upcoming events</p>
          </div>
        )}
      </div>
    </div>
  );
};
