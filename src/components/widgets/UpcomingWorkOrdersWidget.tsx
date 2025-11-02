import { useState, useEffect, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { WorkOrderDetails } from "@/components/WorkOrderDetails";

interface WorkOrder {
  id: string;
  customer_name: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  address: string | null;
}

type FilterMode = "day" | "week" | "month";

export const UpcomingWorkOrdersWidget = memo(() => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("week");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    fetchWorkOrders();
  }, [filterMode]);

  const fetchWorkOrders = async () => {
    try {
      const today = new Date();
      let endDate = new Date();

      if (filterMode === "day") {
        endDate.setDate(today.getDate() + 1);
      } else if (filterMode === "week") {
        endDate.setDate(today.getDate() + 7);
      } else {
        endDate.setMonth(today.getMonth() + 1);
      }

      const { data, error } = await supabase
        .from("work_orders")
        .select("id, customer_name, scheduled_date, scheduled_time, status, address")
        .not("scheduled_date", "is", null)
        .gte("scheduled_date", today.toISOString().split("T")[0])
        .lte("scheduled_date", endDate.toISOString().split("T")[0])
        .in("status", ["pending", "scheduled"])
        .order("scheduled_date", { ascending: true })
        .limit(5);

      if (error) throw error;

      setWorkOrders(data || []);
    } catch (error) {
      console.error("Error fetching work orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = async (orderId: string) => {
    const { data } = await supabase
      .from("work_orders")
      .select("*, profiles:user_id(full_name, email)")
      .eq("id", orderId)
      .single();

    if (data) {
      setSelectedOrder(data);
    }
  };

  const cycleFilter = () => {
    setFilterMode((prev) => {
      if (prev === "day") return "week";
      if (prev === "week") return "month";
      return "day";
    });
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Upcoming Work Orders</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={cycleFilter}
            className="h-7 text-xs"
          >
            <Filter className="h-3 w-3 mr-1" />
            {filterMode === "day" && "Today"}
            {filterMode === "week" && "This Week"}
            {filterMode === "month" && "This Month"}
          </Button>
        </div>

        <div className="flex-1 space-y-2 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-xs">Loading...</p>
            </div>
          ) : workOrders.length > 0 ? (
            workOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleOrderClick(order.id)}
                className="flex items-center gap-2 text-xs bg-card/50 rounded p-2 hover:bg-accent/20 transition-colors cursor-pointer border border-transparent hover:border-primary/20"
              >
                <div className="w-1 h-12 rounded-full bg-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{order.customer_name}</div>
                  <div className="text-muted-foreground">
                    {format(new Date(order.scheduled_date), "MMM d, yyyy")}
                    {order.scheduled_time && ` • ${order.scheduled_time}`}
                  </div>
                  {order.address && (
                    <div className="text-muted-foreground truncate text-[10px]">
                      {order.address}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Calendar className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs text-center">No upcoming work orders</p>
              <p className="text-xs text-center mt-1">
                {filterMode === "day" && "for today"}
                {filterMode === "week" && "this week"}
                {filterMode === "month" && "this month"}
              </p>
            </div>
          )}
        </div>
      </div>

      <WorkOrderDetails
        workOrder={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onUpdate={fetchWorkOrders}
      />
    </>
  );
});
