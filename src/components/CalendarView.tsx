import { useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrgCalendarData } from "@/hooks/use-org-calendar-data";

type ViewMode = "month" | "week" | "day";

// Helper to parse date strings in local timezone (avoids UTC conversion issues)
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface CalendarViewProps {
  onEventClick?: (item: any) => void;
}

export default function CalendarView({ onEventClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const { items, workOrders, calendarEvents, loading } = useOrgCalendarData();

  const scheduledOrders = workOrders.filter(
    (order) => order.scheduled_date && (order.status === "pending" || order.status === "scheduled")
  );

  const getItemsForDate = (date: Date) => {
    return items.filter(item => 
      isSameDay(parseLocalDate(item.date), date)
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
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground p-1 sm:p-2">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dayItems = getItemsForDate(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          
          return (
            <div
              key={day.toString()}
              className={cn(
                "min-h-16 sm:min-h-20 p-1 sm:p-2 border rounded-lg",
                !isCurrentMonth && "opacity-40 bg-muted/30",
                isToday(day) && "border-primary border-2"
              )}
            >
              <div className={cn(
                "text-xs sm:text-sm mb-1",
                isToday(day) ? "font-bold text-primary" : "text-foreground"
              )}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayItems.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(item);
                    }}
                    className={`text-xs p-1 border rounded cursor-pointer truncate ${
                      item.type === 'work_order'
                        ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20'
                        : 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20'
                    }`}
                  >
                    {item.time && !item.all_day && format(new Date(`2000-01-01T${item.time}`), "h:mm a")} {item.title}
                  </div>
                ))}
                {dayItems.length > 2 && (
                  <div className="text-xs text-muted-foreground">+{dayItems.length - 2} more</div>
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
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day) => {
            const dayItems = getItemsForDate(day);
            
            return (
              <div
                key={day.toString()}
                className={cn(
                  "border rounded-lg p-2 sm:p-3",
                  isToday(day) && "border-primary border-2"
                )}
              >
                <div className="text-center mb-2">
                  <div className="text-xs sm:text-sm font-medium">{format(day, "EEE")}</div>
                  <div className={cn(
                    "text-xl sm:text-2xl",
                    isToday(day) ? "font-bold text-primary" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onEventClick?.(item)}
                      className={`text-xs p-2 border rounded cursor-pointer ${
                        item.type === 'work_order'
                          ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20'
                          : 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20'
                      }`}
                    >
                      <div className="font-medium">{item.all_day ? "All day" : item.time && format(new Date(`2000-01-01T${item.time}`), "h:mm a")}</div>
                      <div className="truncate">{item.title}</div>
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
    const dayItems = getItemsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="space-y-2">
        <div className="text-center py-4 border-b">
          <div className="text-sm font-medium">{format(currentDate, "EEEE")}</div>
          <div className="text-2xl sm:text-3xl font-bold">{format(currentDate, "MMMM d, yyyy")}</div>
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {hours.map((hour) => {
            const hourItems = dayItems.filter((item) => {
              if (item.all_day) return hour === 0;
              if (!item.time) return false;
              const itemHour = parseInt(item.time.split(":")[0]);
              return itemHour === hour;
            });

            return (
              <div key={hour} className="flex gap-2 min-h-12 border-b">
                <div className="w-16 sm:w-20 text-xs sm:text-sm text-muted-foreground py-2">
                  {format(new Date(2000, 0, 1, hour), "h:mm a")}
                </div>
                <div className="flex-1 space-y-1 py-1">
                  {hourItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onEventClick?.(item)}
                      className={`p-2 border rounded cursor-pointer ${
                        item.type === 'work_order'
                          ? 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20'
                          : 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20'
                      }`}
                    >
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs">{item.all_day ? "All day" : item.time && format(new Date(`2000-01-01T${item.time}`), "h:mm a")}</div>
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
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500/20 border border-blue-500/40 rounded"></div>
          <span>Work Orders</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500/20 border border-green-500/40 rounded"></div>
          <span>Events</span>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm sm:text-lg font-semibold min-w-40 sm:min-w-48 text-center">
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
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      ) : (
        <>
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
        </>
      )}
    </div>
  );
}
