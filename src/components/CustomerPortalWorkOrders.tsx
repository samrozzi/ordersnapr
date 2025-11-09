import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, FileText, CheckCircle, Eye } from "lucide-react";

interface WorkOrder {
  id: string;
  job_id: string | null;
  customer_name: string;
  address: string | null;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  notes: string | null;
  completion_notes: string | null;
  created_at: string;
  photos: string[] | null;
  type: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface CustomerPortalWorkOrdersProps {
  workOrders: WorkOrder[];
}

export function CustomerPortalWorkOrders({ workOrders }: CustomerPortalWorkOrdersProps) {
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { label: "Pending", variant: "secondary" as const, color: "text-yellow-600" },
      scheduled: { label: "Scheduled", variant: "default" as const, color: "text-blue-600" },
      "in-progress": { label: "In Progress", variant: "default" as const, color: "text-purple-600" },
      completed: { label: "Completed", variant: "success" as const, color: "text-green-600" },
      cancelled: { label: "Cancelled", variant: "destructive" as const, color: "text-red-600" },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  if (workOrders.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">No Work Orders</p>
          <p className="text-muted-foreground">
            You don't have any work orders yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workOrders.map((order) => {
          const statusConfig = getStatusConfig(order.status);
          return (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {order.job_id || `Job #${order.id.slice(0, 8)}`}
                    </CardTitle>
                    {order.type && (
                      <CardDescription className="mt-1">
                        {order.type}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant={statusConfig.variant} className="ml-2">
                    {statusConfig.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{order.address}</span>
                  </div>
                )}

                {order.scheduled_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {format(new Date(order.scheduled_date), "MMM d, yyyy")}
                      {order.scheduled_time && ` at ${order.scheduled_time}`}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Created {format(new Date(order.created_at), "MMM d, yyyy")}
                  </span>
                </div>

                {order.status === "completed" && order.profiles?.full_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">
                      Completed by {order.profiles.full_name}
                    </span>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => setSelectedOrder(order)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Work Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Work Order Details
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedOrder.job_id || `Job #${selectedOrder.id.slice(0, 8)}`}
                  </h3>
                  {selectedOrder.type && (
                    <p className="text-muted-foreground mt-1">{selectedOrder.type}</p>
                  )}
                </div>
                <Badge variant={getStatusConfig(selectedOrder.status).variant}>
                  {getStatusConfig(selectedOrder.status).label}
                </Badge>
              </div>

              <Separator />

              {/* Details */}
              <div className="space-y-4">
                {selectedOrder.address && (
                  <div>
                    <p className="text-sm font-medium mb-1">Address</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.address}</p>
                  </div>
                )}

                {selectedOrder.scheduled_date && (
                  <div>
                    <p className="text-sm font-medium mb-1">Scheduled</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedOrder.scheduled_date), "MMMM d, yyyy")}
                      {selectedOrder.scheduled_time && ` at ${selectedOrder.scheduled_time}`}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-1">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedOrder.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedOrder.notes}
                    </p>
                  </div>
                )}

                {selectedOrder.completion_notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Completion Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedOrder.completion_notes}
                    </p>
                  </div>
                )}

                {selectedOrder.profiles?.full_name && (
                  <div>
                    <p className="text-sm font-medium mb-1">Completed By</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.profiles.full_name}
                      {selectedOrder.profiles.email && ` (${selectedOrder.profiles.email})`}
                    </p>
                  </div>
                )}

                {selectedOrder.photos && selectedOrder.photos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Photos</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedOrder.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Work order photo ${index + 1}`}
                          className="rounded-lg border w-full h-48 object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
