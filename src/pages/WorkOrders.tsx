import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WorkOrderForm } from "@/components/WorkOrderForm";
import { WorkOrderTable } from "@/components/WorkOrderTable";
import { WorkOrderDetails } from "@/components/WorkOrderDetails";
import { CalendarView } from "@/components/CalendarView";
import { LogOut, Plus, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkOrder {
  id: string;
  bpc: string | null;
  ban: string | null;
  package: string | null;
  job_id: string | null;
  customer_name: string;
  contact_info: string | null;
  address: string | null;
  notes: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  completion_notes: string | null;
  created_at: string;
  photos: string[] | null;
  access_required: boolean | null;
  access_notes: string | null;
  user_id: string;
  completed_by: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<WorkOrder | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchWorkOrders = async () => {
    try {
      // Log current user before fetch
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 Fetching work orders for user:', {
        email: user?.email,
        id: user?.id?.substring(0, 8)
      });

      // Fetch work orders with user profiles
      const { data, error } = await supabase
        .from("work_orders")
        .select(`
          *,
          profiles:user_id(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('❌ Work orders query error:', error);
        throw error;
      }
      
      // Also get count to verify RLS
      const { count } = await supabase
        .from("work_orders")
        .select("*", { count: 'exact', head: true });
      
      console.log('✅ Work orders fetched:', {
        dataLength: data?.length || 0,
        count: count || 0,
        hasToken: !!(await supabase.auth.getSession()).data.session?.access_token
      });

      if (data?.length === 0 && user) {
        console.warn('⚠️ Token present but 0 rows returned - possible PWA storage issue');
      }
      
      setWorkOrders(data || []);
    } catch (error) {
      console.error("❌ Error fetching work orders:", error);
      toast({
        title: "Error",
        description: "Failed to load work orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchWorkOrders();
    }
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchWorkOrders();
    setTimeout(() => {
      setIsRefreshing(false);
      setPullDistance(0);
    }, 500);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY === 0 || window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartY;
    
    if (distance > 0 && distance < 150) {
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 80 && !isRefreshing) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
    setPullStartY(0);
  };

  const pendingOrders = workOrders.filter((order) => order.status === "pending" || order.status === "scheduled");
  const completedOrders = workOrders.filter((order) => order.status === "completed");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull to refresh indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex justify-center items-center transition-all duration-200 ease-out pointer-events-none"
        style={{ 
          transform: `translateY(${pullDistance > 0 ? pullDistance - 50 : -50}px)`,
          opacity: pullDistance / 80
        }}
      >
        <div className={`text-primary ${isRefreshing ? 'animate-spin' : ''}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </div>

      <main className="space-y-6">
        <h2 className="text-2xl font-semibold">Your Work Orders</h2>
        
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Work Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Work Order</DialogTitle>
              </DialogHeader>
              <WorkOrderForm
                onSuccess={() => {
                  setIsDialogOpen(false);
                  fetchWorkOrders();
                }}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Calendar View
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Work Order Calendar</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
                <CalendarView />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pending">
              Pending / Scheduled ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <WorkOrderTable workOrders={pendingOrders} onUpdate={fetchWorkOrders} />
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <WorkOrderTable workOrders={completedOrders} onUpdate={fetchWorkOrders} />
          </TabsContent>
        </Tabs>

        <WorkOrderDetails
          workOrder={viewingOrder}
          open={!!viewingOrder}
          onOpenChange={(open) => !open && setViewingOrder(null)}
          onUpdate={fetchWorkOrders}
        />
      </main>
    </div>
  );
};

export default Dashboard;
