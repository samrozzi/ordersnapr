import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { WorkOrderForm } from "@/components/WorkOrderForm";
import { WorkOrderTable } from "@/components/WorkOrderTable";
import { WorkOrderDetails } from "@/components/WorkOrderDetails";
import { CalendarView } from "@/components/CalendarView";
import { JobKanbanBoard } from "@/components/JobKanbanBoard";
import { LogOut, Plus, Calendar, List, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFeatureContext } from "@/contexts/FeatureContext";

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
  type?: string | null;
  assigned_to?: string | null;
  custom_data?: any;
  checklist?: any;
  linked_invoice_id?: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
  creator?: {
    full_name: string | null;
    email: string | null;
  } | null;
  assignee?: {
    full_name: string | null;
    email: string | null;
  } | null;
  assignedProfile?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { getFeatureConfig } = useFeatureContext();
  const [session, setSession] = useState<Session | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<WorkOrder | null>(null);
  const [viewingOrderDetails, setViewingOrderDetails] = useState<WorkOrder | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const config = getFeatureConfig('work_orders');
  const displayName = config?.display_name || 'Jobs';
  const statuses = config?.statuses || ['New', 'Scheduled', 'In Progress', 'Complete', 'Cancelled'];

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
          creator:profiles!work_orders_user_id_fkey(full_name, email),
          assignee:profiles!work_orders_assigned_to_fkey(full_name, email)
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

  // Handle opening work order from URL parameter (e.g., from favorites)
  useEffect(() => {
    const openId = searchParams.get('open');
    const viewId = searchParams.get('view');
    
    if (openId && workOrders.length > 0) {
      const orderToOpen = workOrders.find(wo => wo.id === openId);
      if (orderToOpen) {
        setViewingOrder(orderToOpen);
        setSearchParams({});
      }
    } else if (viewId && workOrders.length > 0) {
      const orderToView = workOrders.find(wo => wo.id === viewId);
      if (orderToView) {
        setViewingOrderDetails(orderToView);
        setSearchParams({});
      }
    }
  }, [searchParams, workOrders, setSearchParams]);

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
    <div className="
      flex flex-col h-full
      w-full max-w-screen
      pl-[max(16px,env(safe-area-inset-left))]
      pr-[max(16px,env(safe-area-inset-right))]
      pb-[max(16px,env(safe-area-inset-bottom))]
    ">
      <div className="flex flex-col flex-1 min-h-0 space-y-4 md:space-y-6">
        <div className="flex-shrink-0">
          <h1 className="text-xl md:text-2xl font-semibold">{displayName}</h1>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto w-full">{/* Action buttons row */}
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="md:h-10">
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">New {displayName.replace(/s$/, '')}</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-4 sm:p-6">
              <SheetHeader>
                <SheetTitle>Create New {displayName.replace(/s$/, '')}</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <WorkOrderForm
                  onSuccess={() => {
                    setIsDrawerOpen(false);
                    fetchWorkOrders();
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>

          <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="md:h-10">
                <Calendar className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Calendar View</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>{displayName} Calendar</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
                <CalendarView />
              </div>
            </DialogContent>
          </Dialog>

          {/* View Toggle - now inline with action buttons */}
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-1 md:gap-2"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="gap-1 md:gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </Button>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <JobKanbanBoard
            workOrders={workOrders}
            statuses={statuses}
            onUpdate={fetchWorkOrders}
            onJobClick={(order) => setViewingOrder(order as WorkOrder)}
          />
        ) : (
          <div className="flex-1 min-h-0">
            <Tabs defaultValue="pending" className="w-full h-full flex flex-col">
              <div className="sticky top-0 z-[5] bg-background/95 backdrop-blur px-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] pt-3 pb-3">
                <TabsList className="grid w-full grid-cols-2 gap-2 p-1">
                  <TabsTrigger value="pending" className="w-full text-sm">
                    Pending ({pendingOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="w-full text-sm">
                    Completed ({completedOrders.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="pending" className="flex-1 overflow-y-auto mt-0">
                <div className="py-4">
                  <WorkOrderTable workOrders={pendingOrders} onUpdate={fetchWorkOrders} />
                </div>
              </TabsContent>

              <TabsContent value="completed" className="flex-1 overflow-y-auto mt-0">
                <div className="py-4">
                  <WorkOrderTable workOrders={completedOrders} onUpdate={fetchWorkOrders} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit {displayName.replace(/s$/, '')}</DialogTitle>
            </DialogHeader>
            {viewingOrder && (
              <WorkOrderForm
                workOrder={viewingOrder}
                onSuccess={() => {
                  setViewingOrder(null);
                  fetchWorkOrders();
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        <WorkOrderDetails
          workOrder={viewingOrderDetails}
          open={!!viewingOrderDetails}
          onOpenChange={(open) => !open && setViewingOrderDetails(null)}
          onEdit={(order) => {
            setViewingOrder(order);
            setViewingOrderDetails(null);
          }}
          onUpdate={handleRefresh}
        />
      </div>
    </div>
  );
};

export default Dashboard;
