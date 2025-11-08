import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, List, Calendar as CalendarIcon, LayoutGrid } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkOrderForm } from "@/components/WorkOrderForm";
import { WorkOrderTable } from "@/components/WorkOrderTable";
import { WorkOrderDetails } from "@/components/WorkOrderDetails";
import { CalendarView } from "@/components/CalendarView";
import { JobKanbanBoard } from "@/components/JobKanbanBoard";
import { useToast } from "@/hooks/use-toast";
import { useFeatureContext } from "@/contexts/FeatureContext";
import { ExportButton } from "@/components/ExportButton";
import { ExportColumn, formatDateForExport } from "@/lib/export-csv";

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

type ViewMode = 'list' | 'calendar' | 'kanban';
type ListTab = 'pending' | 'completed';

const WorkOrders = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { getFeatureConfig } = useFeatureContext();
  const [session, setSession] = useState<Session | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [listTab, setListTab] = useState<ListTab>('pending');
  const [viewingOrder, setViewingOrder] = useState<WorkOrder | null>(null);
  const [viewingOrderDetails, setViewingOrderDetails] = useState<WorkOrder | null>(null);

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
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 Fetching work orders for user:', {
        email: user?.email,
        id: user?.id?.substring(0, 8)
      });

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
    const workOrderId = searchParams.get('workOrder');
    if (workOrderId && workOrders.length > 0) {
      setSearchParams({});
      toast({
        title: "Work Order",
        description: "Viewing work order from favorites",
      });
    }
  }, [searchParams, workOrders, setSearchParams, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const pendingOrders = workOrders.filter((order) => order.status === "pending" || order.status === "scheduled");
  const completedOrders = workOrders.filter((order) => order.status === "completed");

  // Export columns definition
  const exportColumns: ExportColumn<WorkOrder>[] = [
    { key: "job_number", label: "Job #" },
    { key: "title", label: "Title" },
    { key: "customer_name", label: "Customer" },
    { key: "address", label: "Address" },
    { key: "status", label: "Status" },
    { key: "type", label: "Type" },
    {
      key: "creator.full_name",
      label: "Created By",
      format: (val, row) => row.creator?.full_name || row.creator?.email || "N/A",
    },
    {
      key: "assignee.full_name",
      label: "Assigned To",
      format: (val, row) => row.assignee?.full_name || row.assignee?.email || "Unassigned",
    },
    {
      key: "scheduled_date",
      label: "Scheduled Date",
      format: (val) => val ? new Date(val as string).toLocaleDateString() : "",
    },
    {
      key: "created_at",
      label: "Created",
      format: formatDateForExport,
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">{displayName}</h1>
      </div>

      {/* Action buttons row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="md:h-10">
              <Plus className="md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">New {displayName.replace(/s$/, '')}</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
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

        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">List</span>
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Calendar</span>
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Kanban</span>
          </Button>
        </div>

        <div className="ml-auto">
          <ExportButton
            data={viewMode === 'list' && listTab === 'completed' ? completedOrders : pendingOrders}
            columns={exportColumns}
            filename={`work-orders-${listTab}`}
            variant="outline"
            size="sm"
          />
        </div>
      </div>

      {/* Filter buttons row - only for list view */}
      {viewMode === 'list' && (
        <div className="flex gap-2 mb-3 max-w-md">
          <Button
            variant={listTab === 'pending' ? 'default' : 'outline'}
            onClick={() => setListTab('pending')}
          >
            Pending ({pendingOrders.length})
          </Button>
          <Button
            variant={listTab === 'completed' ? 'default' : 'outline'}
            onClick={() => setListTab('completed')}
          >
            Completed ({completedOrders.length})
          </Button>
        </div>
      )}

      {/* Content views */}
      {viewMode === 'list' && (
        <WorkOrderTable
          workOrders={listTab === 'pending' ? pendingOrders : completedOrders}
          onUpdate={fetchWorkOrders}
        />
      )}

      {viewMode === 'calendar' && (
        <CalendarView onEventClick={(item) => {
          if (item.type === 'work_order') {
            const order = workOrders.find(wo => wo.id === item.id);
            if (order) setViewingOrderDetails(order);
          }
        }} />
      )}

      {viewMode === 'kanban' && (
        <JobKanbanBoard
          workOrders={workOrders}
          statuses={statuses}
          onUpdate={fetchWorkOrders}
          onJobClick={(order) => setViewingOrderDetails(order as WorkOrder)}
        />
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
        onUpdate={fetchWorkOrders}
      />
    </div>
  );
};

export default WorkOrders;
