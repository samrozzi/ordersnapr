import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOrgCalendarData } from "@/hooks/use-org-calendar-data";

// Helper to parse date strings in local timezone (avoids UTC conversion issues)
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const CalendarWidgetSmall = () => {
  const navigate = useNavigate();
  const { items, loading } = useOrgCalendarData();
  const today = new Date();
  
  // Get upcoming items (next 2)
  const upcomingItems = items
    .filter(item => parseLocalDate(item.date) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())
    .slice(0, 2);

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
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-xs">Loading...</p>
          </div>
        ) : upcomingItems.length > 0 ? (
          upcomingItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 text-xs bg-card/50 rounded p-2 group-hover:bg-accent/20 transition-colors"
            >
              <div className={`w-1 h-8 rounded-full ${
                item.type === 'work_order' ? 'bg-primary' : 'bg-green-500'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                <div className="text-muted-foreground">
                  {item.all_day ? "All day" : item.time || "All day"}
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
