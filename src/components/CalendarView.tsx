import { useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface WorkOrder {
  id: string;
  customer_name: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  address: string | null;
}

interface CalendarViewProps {
  workOrders: WorkOrder[];
}

type ViewMode = "month" | "week" | "day";

export function CalendarView({ workOrders }: CalendarViewProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const scheduledOrders = workOrders.filter(
    (order) => order.scheduled_date && (order.status === "pending" || order.status === "scheduled")
  );

  const getOrdersForDate = (date: Date) => {
    return scheduledOrders.filter((order) =>
      isSameDay(new Date(order.scheduled_date!), date)
    );
  };

  const navigatePrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const orders = getOrdersForDate(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          
          return (
            <div
              key={day.toString()}
              className={cn(
                "min-h-20 p-2 border rounded-lg",
                !isCurrentMonth && "opacity-40 bg-muted/30",
                isToday(day) && "border-primary border-2"
              )}
            >
              <div className={cn(
                "text-sm mb-1",
                isToday(day) ? "font-bold text-primary" : "text-foreground"
              )}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {orders.slice(0, 3).map((order) => (
                  <div
                    key={order.id}
                    onClick={() => navigate("/job-audit", { state: { workOrderId: order.id } })}
                    className="text-xs p-1 bg-primary/10 rounded cursor-pointer hover:bg-primary/20 truncate"
                  >
                    {order.scheduled_time && format(new Date(`2000-01-01T${order.scheduled_time}`), "h:mm a")} {order.customer_name}
                  </div>
                ))}
                {orders.length > 3 && (
                  <div className="text-xs text-muted-foreground">+{orders.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const orders = getOrdersForDate(day);
            
            return (
              <div
                key={day.toString()}
                className={cn(
                  "border rounded-lg p-3",
                  isToday(day) && "border-primary border-2"
                )}
              >
                <div className="text-center mb-2">
                  <div className="text-sm font-medium">{format(day, "EEE")}</div>
                  <div className={cn(
                    "text-2xl",
                    isToday(day) ? "font-bold text-primary" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => navigate("/job-audit", { state: { workOrderId: order.id } })}
                      className="text-xs p-2 bg-primary/10 rounded cursor-pointer hover:bg-primary/20"
                    >
                      <div className="font-medium">{order.scheduled_time && format(new Date(`2000-01-01T${order.scheduled_time}`), "h:mm a")}</div>
                      <div className="truncate">{order.customer_name}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const orders = getOrdersForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="space-y-2">
        <div className="text-center py-4 border-b">
          <div className="text-sm font-medium">{format(currentDate, "EEEE")}</div>
          <div className="text-3xl font-bold">{format(currentDate, "MMMM d, yyyy")}</div>
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {hours.map((hour) => {
            const hourOrders = orders.filter((order) => {
              if (!order.scheduled_time) return false;
              const orderHour = parseInt(order.scheduled_time.split(":")[0]);
              return orderHour === hour;
            });

            return (
              <div key={hour} className="flex gap-2 min-h-12 border-b">
                <div className="w-20 text-sm text-muted-foreground py-2">
                  {format(new Date(2000, 0, 1, hour), "h:mm a")}
                </div>
                <div className="flex-1 space-y-1 py-1">
                  {hourOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => navigate("/job-audit", { state: { workOrderId: order.id } })}
                      className="p-2 bg-primary/10 rounded cursor-pointer hover:bg-primary/20"
                    >
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{order.address}</div>
                      <div className="text-xs">{order.scheduled_time && format(new Date(`2000-01-01T${order.scheduled_time}`), "h:mm a")}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold min-w-48 text-center">
            {viewMode === "month" && format(currentDate, "MMMM yyyy")}
            {viewMode === "week" && `${format(startOfWeek(currentDate), "MMM d")} - ${format(endOfWeek(currentDate), "MMM d, yyyy")}`}
            {viewMode === "day" && format(currentDate, "MMMM d, yyyy")}
          </div>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("month")}
          >
            Month
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("week")}
          >
            Week
          </Button>
          <Button
            variant={viewMode === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("day")}
          >
            Day
          </Button>
        </div>
      </div>
      
      {viewMode === "month" && renderMonthView()}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "day" && renderDayView()}
    </div>
  );
}
