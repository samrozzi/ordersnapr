import { format, startOfWeek, addDays } from "date-fns";
import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOrgCalendarData } from "@/hooks/use-org-calendar-data";

// Helper to parse date strings in local timezone (avoids UTC conversion issues)
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const CalendarWidgetMedium = () => {
  const navigate = useNavigate();
  const { items, loading } = useOrgCalendarData();
  const today = new Date();
  const weekStart = startOfWeek(today);
  
  // Get upcoming items (next 5)
  const upcomingItems = items
    .filter(item => parseLocalDate(item.date) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())
    .slice(0, 5);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div
      className="h-full flex flex-col cursor-pointer group"
      onClick={() => navigate("/calendar")}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-muted-foreground uppercase font-medium">
            {format(today, "MMMM yyyy")}
          </div>
          <div className="text-lg font-bold">{format(today, "EEEE, d")}</div>
        </div>
        <Calendar className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Week view */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {weekDays.map((day, i) => {
          const isToday = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
          return (
            <div
              key={i}
              className={cn(
                "text-center rounded-lg p-1",
                isToday && "bg-primary text-primary-foreground"
              )}
            >
              <div className="text-[10px] font-medium">{format(day, "EEE")}</div>
              <div className="text-sm font-bold">{format(day, "d")}</div>
            </div>
          );
        })}
      </div>

      {/* Upcoming events list */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Loading...</p>
          </div>
        ) : upcomingItems.length > 0 ? (
          upcomingItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 text-sm bg-card/50 rounded-lg p-2 group-hover:bg-accent/20 transition-colors"
            >
              <div className={`w-1 h-10 rounded-full ${
                item.type === 'work_order' ? 'bg-primary' : 'bg-green-500'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  {format(parseLocalDate(item.date), "MMM d")} • {item.all_day ? "All day" : item.time || "All day"}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Calendar className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No upcoming events</p>
          </div>
        )}
      </div>
    </div>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
