import React, { useEffect, useState, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, List as ListIcon, Calendar as CalendarIcon, LayoutGrid, Trash2, UserPlus, CheckCircle2 } from "lucide-react";
import { FreeTierGuard } from "@/components/FreeTierGuard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkOrderForm } from "@/components/WorkOrderForm";
import { WorkOrderTable } from "@/components/WorkOrderTable";
import { WorkOrderDetails } from "@/components/WorkOrderDetails";

// Lazy load heavy subcomponents
const CalendarView = React.lazy(() => import("@/components/CalendarView"));
const JobKanbanBoard = React.lazy(() => import("@/components/JobKanbanBoard"));
import { useToast } from "@/hooks/use-toast";
import { useFeatureContext } from "@/contexts/FeatureContext";
import { ExportButton } from "@/components/ExportButton";
import { ExportColumn, formatDateForExport } from "@/lib/export-csv";
import { FreeTierUsageBanner } from "@/components/FreeTierUsageBanner";
import { BulkActionBar } from "@/components/BulkActionBar";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { PullToRefresh } from "@/components/PullToRefresh";

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
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

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
    console.log('🔄 fetchWorkOrders called');
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No user found');
        setLoading(false);
        return;
      }

      console.log('✅ User found:', user.email);

      // Fetch user's active org context
      const { data: profile } = await supabase
        .from("profiles")
        .select("active_org_id")
        .eq("id", user.id)
        .maybeSingle();

      const currentActiveOrgId = profile?.active_org_id || null;
      setActiveOrgId(currentActiveOrgId);

      console.log('🔍 Fetching work orders:', {
        email: user?.email,
        activeOrgId: currentActiveOrgId,
        isPersonal: currentActiveOrgId === null
      });

      // Build query with org filtering - fetch work orders without relationships
      let query = supabase
        .from("work_orders")
        .select("*");

      if (currentActiveOrgId === null) {
        // Personal workspace: user's own work orders with no organization
        query = query.eq("user_id", user.id).is("organization_id", null);
      } else {
        // Organization workspace: all work orders for that org
        query = query.eq("organization_id", currentActiveOrgId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error('❌ Work orders query error:', error);
        throw error;
      }

      console.log('✅ Work orders fetched successfully:', {
        dataLength: data?.length || 0,
        workspace: currentActiveOrgId ? 'organization' : 'personal'
      });

      // Decorate work orders with creator/assignee profiles
      if (data && data.length > 0) {
        const userIds = new Set<string>();
        data.forEach(order => {
          if (order.user_id) userIds.add(order.user_id);
          if (order.assigned_to) userIds.add(order.assigned_to);
        });

        let profilesMap = new Map<string, { full_name: string | null; email: string | null }>();
        
        if (userIds.size > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", Array.from(userIds));

          if (!profilesError && profiles) {
            profilesMap = new Map(profiles.map(p => [p.id, { full_name: p.full_name, email: p.email }]));
          } else {
            console.warn("Profiles fetch error (non-fatal):", profilesError);
          }
        }

        const decoratedOrders = data.map(order => ({
          ...order,
          creator: profilesMap.get(order.user_id) || null,
          assignee: order.assigned_to ? profilesMap.get(order.assigned_to) || null : null,
        }));

        setWorkOrders(decoratedOrders);
      } else {
        setWorkOrders([]);
      }
    } catch (error: any) {
      console.error("❌ Error fetching work orders:", error);
      toast({
        title: "Error Loading Work Orders",
        description: error.message || "Failed to load work orders. Please try refreshing.",
        variant: "destructive",
      });
      // Set empty array on error so UI can render
      setWorkOrders([]);
    } finally {
      console.log('✅ Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchWorkOrders();
    }
  }, [session]);  // Remove activeOrgId from deps to prevent infinite loop

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

  // Bulk selection - must be called before any early returns
  const pendingOrders = workOrders.filter((order) => order.status === "pending" || order.status === "scheduled");
  const completedOrders = workOrders.filter((order) => order.status === "completed");
  const currentOrders = viewMode === 'list' && listTab === 'completed' ? completedOrders : pendingOrders;
  const bulkSelect = useBulkSelect(currentOrders);

  console.log('🎨 Rendering WorkOrders:', { 
    loading, 
    workOrdersCount: workOrders.length, 
    session: !!session,
    viewMode,
    listTab 
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading work orders...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Checking authentication...</div>
      </div>
    );
  }

  // Bulk action handlers
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${bulkSelect.selectedCount} work order(s)?`)) return;

    try {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .in('id', bulkSelect.selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${bulkSelect.selectedCount} work order(s) deleted`,
      });

      bulkSelect.clearSelection();
      fetchWorkOrders();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete work orders",
        variant: "destructive",
      });
    }
  };

  const handleBulkUpdateStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: newStatus })
        .in('id', bulkSelect.selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${bulkSelect.selectedCount} work order(s) updated to ${newStatus}`,
      });

      bulkSelect.clearSelection();
      fetchWorkOrders();
    } catch (error) {
      console.error('Bulk update error:', error);
      toast({
        title: "Error",
        description: "Failed to update work orders",
        variant: "destructive",
      });
    }
  };

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
    <>
      <PullToRefresh onRefresh={fetchWorkOrders} />

      {/* Sticky header on mobile */}
      <div className="sticky top-12 z-40 bg-background/95 backdrop-blur-sm border-b md:static md:border-b-0 md:bg-transparent pb-4 md:pb-0">
        <div className="container mx-auto space-y-4 md:space-y-6 pt-4 md:pt-0">
          <div className="mb-4">
            <h1 className="text-xl md:text-2xl font-semibold">{displayName}</h1>
          </div>

          <FreeTierUsageBanner only={["work_orders"]} />

          {/* Action buttons row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
        <FreeTierGuard resource="work_orders" onAllowed={() => setIsDrawerOpen(true)}>
          {({ onClick, disabled }) => (
            <>
              <Button size="sm" className="md:h-10" onClick={onClick} disabled={disabled || loading}>
                <Plus className="md:mr-2 h-4 w-4" />
                <span className="hidden md:inline">New {displayName.replace(/s$/, '')}</span>
              </Button>
            </>
          )}
        </FreeTierGuard>

        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
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
            <ListIcon className="h-4 w-4 md:mr-2" />
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
        </div>
      </div>

      {/* Content views */}
      <div className="container mx-auto space-y-4 md:space-y-6">
      {viewMode === 'list' && (
        <>
          {workOrders.length === 0 ? (
            <div className="text-center py-12 bg-muted/50 rounded-lg">
              <p className="text-lg text-muted-foreground">No work orders yet</p>
              <p className="text-sm text-muted-foreground mt-2">Create your first work order to get started</p>
            </div>
          ) : (
            <WorkOrderTable
              workOrders={listTab === 'pending' ? pendingOrders : completedOrders}
              onUpdate={fetchWorkOrders}
              selectedIds={bulkSelect.selected}
              onToggleSelect={bulkSelect.toggleItem}
              onToggleSelectAll={bulkSelect.toggleAll}
              isAllSelected={bulkSelect.isAllSelected}
              isSomeSelected={bulkSelect.isSomeSelected}
            />
          )}
        </>
      )}

      {viewMode === 'calendar' && (
        <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading calendar…</div>}>
          <CalendarView 
            onEventClick={(item) => {
              console.log('📅 Calendar event clicked:', item);
              try {
                if (item.type === 'work_order') {
                  const order = workOrders.find(wo => wo.id === item.id);
                  if (order) setViewingOrderDetails(order);
                }
              } catch (error) {
                console.error('❌ Error handling calendar click:', error);
              }
            }} 
          />
        </Suspense>
      )}

      {viewMode === 'kanban' && (
        <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading board…</div>}>
          <JobKanbanBoard
            workOrders={workOrders}
            statuses={statuses}
            onUpdate={fetchWorkOrders}
            onJobClick={(order) => {
              console.log('📋 Kanban card clicked:', order);
              try {
                setViewingOrderDetails(order as WorkOrder);
              } catch (error) {
                console.error('❌ Error handling kanban click:', error);
              }
            }}
          />
        </Suspense>
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

      {/* Bulk Action Bar */}
      {viewMode === 'list' && bulkSelect?.selectedCount > 0 && (
        <BulkActionBar
          selectedCount={bulkSelect.selectedCount}
          onClearSelection={bulkSelect.clearSelection}
          actions={[
            {
              label: "Mark Complete",
              icon: <CheckCircle2 className="h-4 w-4" />,
              onClick: () => handleBulkUpdateStatus('completed'),
              show: listTab === 'pending',
            },
            {
              label: "Mark Pending",
              icon: <CheckCircle2 className="h-4 w-4" />,
              onClick: () => handleBulkUpdateStatus('pending'),
              show: listTab === 'completed',
            },
            {
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              onClick: handleBulkDelete,
              variant: "destructive" as const,
            },
          ].filter(action => action.show !== false)}
        />
      )}
      </div>
    </>
  );
};

export default WorkOrders;
