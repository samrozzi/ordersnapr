import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { User, Calendar, MapPin } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkOrder {
  id: string;
  customer_name: string;
  type?: string | null;
  status: string;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  address?: string | null;
  assigned_to?: string | null;
  [key: string]: any; // Allow additional fields from parent
}

interface JobKanbanBoardProps {
  workOrders: WorkOrder[];
  statuses: string[];
  onUpdate: () => void;
  onJobClick: (order: WorkOrder) => void;
}

function JobCard({ order, onClick }: { order: WorkOrder; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignedName = 
    order.assignee?.full_name || 
    order.assignedProfile?.full_name || 
    order.creator?.full_name || 
    order.profiles?.full_name;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow mb-3"
        onClick={onClick}
      >
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm">{order.customer_name}</h4>
            {order.type && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {order.type}
              </Badge>
            )}
          </div>
          
          {order.address && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{order.address}</span>
            </div>
          )}
          
          {order.scheduled_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(order.scheduled_date), "MMM d, yyyy")}
                {order.scheduled_time && ` at ${order.scheduled_time}`}
              </span>
            </div>
          )}
          
          {assignedName && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{assignedName}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function JobKanbanBoard({ workOrders, statuses, onUpdate, onJobClick }: JobKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const activeOrder = activeId ? workOrders.find(o => o.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const newStatus = over.id as string;
    const orderId = active.id as string;

    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Job moved to ${newStatus}`);
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update job status');
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statuses.map((status) => {
          const statusOrders = workOrders.filter(o => o.status === status);
          
          return (
            <Card key={status} className="min-h-[200px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{status}</span>
                  <Badge variant="outline" className="ml-2">
                    {statusOrders.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SortableContext
                  id={status}
                  items={statusOrders.map(o => o.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {statusOrders.map((order) => (
                      <JobCard
                        key={order.id}
                        order={order}
                        onClick={() => onJobClick(order)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DragOverlay>
        {activeOrder && (
          <Card className="cursor-grabbing shadow-lg">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm">{activeOrder.customer_name}</h4>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
