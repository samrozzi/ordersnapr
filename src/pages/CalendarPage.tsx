import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CalendarView } from "@/components/CalendarView";
import { WorkOrderDetails } from "@/components/WorkOrderDetails";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WorkOrder {
  id: string;
  bpc: string | null;
  ban: string | null;
  package: string | null;
  job_id: string | null;
  customer_name: string;
  address: string | null;
  contact_info: string | null;
  notes: string | null;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  user_id: string;
  created_at: string;
  updated_at?: string;
  completion_notes: string | null;
  photos: string[] | null;
  access_required: boolean | null;
  access_notes: string | null;
  completed_by: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

const CalendarPage = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order("scheduled_date");

      if (error) throw error;

      setWorkOrders(data as WorkOrder[]);
    } catch (error: any) {
      console.error("Error fetching work orders:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWorkOrderClick = (workOrderId: string) => {
    const order = workOrders.find(wo => wo.id === workOrderId);
    if (order) {
      setSelectedOrder(order);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">View and manage your scheduled work orders</p>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-card rounded-lg border shadow-sm p-6">
        <CalendarView workOrders={workOrders} onWorkOrderClick={handleWorkOrderClick} />
      </div>

      {/* Work Order Details Dialog */}
      <WorkOrderDetails
        workOrder={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onUpdate={fetchWorkOrders}
      />
    </div>
  );
};

export default CalendarPage;
