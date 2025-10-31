import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOrgCalendarData } from "@/hooks/use-org-calendar-data";

export const CalendarWidgetLarge = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { items, loading } = useOrgCalendarData();
  const today = new Date();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getItemsForDay = (day: Date) => {
    return items.filter(item => 
      isSameDay(new Date(item.date), day)
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xl font-bold">{format(currentDate, "MMMM yyyy")}</div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 flex flex-col">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {days.map((day, i) => {
            const dayItems = getItemsForDay(day);
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={i}
                className={cn(
                  "relative rounded-lg p-1 cursor-pointer hover:bg-accent/50 transition-colors",
                  !isCurrentMonth && "opacity-40",
                  isToday && "bg-primary/10 border border-primary"
                )}
                onClick={() => navigate("/calendar")}
              >
                <div
                  className={cn(
                    "text-xs font-medium text-center mb-1",
                    isToday && "text-primary font-bold"
                  )}
                >
                  {format(day, "d")}
                </div>
                {dayItems.length > 0 && (
                  <div className="flex gap-0.5 justify-center flex-wrap">
                    {dayItems.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        className={`w-1 h-1 rounded-full ${
                          item.type === 'work_order' ? 'bg-primary' : 'bg-green-500'
                        }`}
                        title={item.title}
                      />
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-[8px] text-primary font-bold">
                        +{dayItems.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
