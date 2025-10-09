import { useState } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Edit, ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { WorkOrderForm } from "./WorkOrderForm";
import { WorkOrderDetails } from "./WorkOrderDetails";

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
  status: string;
  completion_notes: string | null;
  created_at: string;
  photos: string[] | null;
}

interface WorkOrderTableProps {
  workOrders: WorkOrder[];
  onUpdate: () => void;
}

type SortField = "customer_name" | "ban" | "scheduled_date" | "created_at";
type SortDirection = "asc" | "desc";

export function WorkOrderTable({ workOrders, onUpdate }: WorkOrderTableProps) {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<WorkOrder | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const sortedOrders = [...workOrders].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: string | number | null = a[sortField];
    let bValue: string | number | null = b[sortField];

    // Handle null values
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return sortDirection === "asc" ? 1 : -1;
    if (bValue === null) return sortDirection === "asc" ? -1 : 1;

    // Convert to comparable values
    if (sortField === "scheduled_date" || sortField === "created_at") {
      aValue = new Date(aValue as string).getTime();
      bValue = new Date(bValue as string).getTime();
    } else {
      aValue = (aValue as string).toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleComplete = async () => {
    if (!selectedOrder) return;

    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({
          status: "completed",
          completion_notes: completionNotes,
          completed_at: new Date().toISOString(),
        })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Work order marked as complete",
      });

      setSelectedOrder(null);
      setCompletionNotes("");
      onUpdate();
    } catch (error) {
      console.error("Error completing work order:", error);
      toast({
        title: "Error",
        description: "Failed to complete work order",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  if (workOrders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No work orders found
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("customer_name")}
                  className="h-auto p-0 hover:bg-transparent font-semibold"
                >
                  Customer
                  {getSortIcon("customer_name")}
                </Button>
              </TableHead>
              <TableHead>BPC</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("ban")}
                  className="h-auto p-0 hover:bg-transparent font-semibold"
                >
                  BAN
                  {getSortIcon("ban")}
                </Button>
              </TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("scheduled_date")}
                  className="h-auto p-0 hover:bg-transparent font-semibold"
                >
                  Scheduled
                  {getSortIcon("scheduled_date")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("created_at")}
                  className="h-auto p-0 hover:bg-transparent font-semibold"
                >
                  Date Inputted
                  {getSortIcon("created_at")}
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.customer_name}</TableCell>
                <TableCell>{order.bpc || "-"}</TableCell>
                <TableCell>{order.ban || "-"}</TableCell>
                <TableCell>{order.package || "-"}</TableCell>
                <TableCell>{order.job_id || "-"}</TableCell>
                <TableCell>{order.contact_info || "-"}</TableCell>
                <TableCell>
                  {order.scheduled_date
                    ? format(new Date(order.scheduled_date), "MMM dd, yyyy")
                    : "Not yet scheduled"}
                </TableCell>
                <TableCell>
                  {format(new Date(order.created_at), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : order.status === "scheduled"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {order.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingOrder(order)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {order.status !== "completed" && (
                      <>
                        <Dialog open={editingOrder?.id === order.id} onOpenChange={(open) => !open && setEditingOrder(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingOrder(order)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Work Order</DialogTitle>
                            </DialogHeader>
                            <WorkOrderForm
                              workOrder={order}
                              onSuccess={() => {
                                setEditingOrder(null);
                                onUpdate();
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Complete Work Order</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <Label htmlFor="completion-notes">What did you do at the job?</Label>
                                <Textarea
                                  id="completion-notes"
                                  value={completionNotes}
                                  onChange={(e) => setCompletionNotes(e.target.value)}
                                  rows={4}
                                  placeholder="Enter completion notes..."
                                />
                              </div>
                              <Button
                                onClick={handleComplete}
                                disabled={isCompleting}
                                className="w-full"
                              >
                                {isCompleting ? "Completing..." : "Mark as Complete"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <WorkOrderDetails
        workOrder={viewingOrder}
        open={!!viewingOrder}
        onOpenChange={(open) => !open && setViewingOrder(null)}
      />
    </>
  );
}
