import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Edit, ArrowUpDown, ArrowUp, ArrowDown, Eye, Phone, MessageSquare, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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

interface WorkOrderTableProps {
  workOrders: WorkOrder[];
  onUpdate: () => void;
}

type SortField = "customer_name" | "scheduled_date" | "created_at";
type SortDirection = "asc" | "desc";

export function WorkOrderTable({ workOrders, onUpdate }: WorkOrderTableProps) {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<WorkOrder | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>("scheduled_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [deletingOrder, setDeletingOrder] = useState<WorkOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (sortField === "scheduled_date") {
      // Combine date and time for proper chronological sorting
      const aDateTime = `${aValue}T${a.scheduled_time || '00:00:00'}`;
      const bDateTime = `${bValue}T${b.scheduled_time || '00:00:00'}`;
      aValue = parseISO(aDateTime).getTime();
      bValue = parseISO(bDateTime).getTime();
    } else if (sortField === "created_at") {
      aValue = parseISO(aValue as string).getTime();
      bValue = parseISO(bValue as string).getTime();
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
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("work_orders")
        .update({
          status: "completed",
          completion_notes: completionNotes,
          completed_at: new Date().toISOString(),
          completed_by: user?.id || null,
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

  const handleDelete = async () => {
    if (!deletingOrder) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("work_orders")
        .delete()
        .eq("id", deletingOrder.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Work order deleted successfully",
      });

      setDeletingOrder(null);
      onUpdate();
    } catch (error) {
      console.error("Error deleting work order:", error);
      toast({
        title: "Error",
        description: "Failed to delete work order",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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
      <div className="rounded-md border overflow-x-auto touch-pan-x max-w-full">
        <Table className="min-w-max">
            <TableHeader>
              <TableRow>
              <TableHead className="w-8 px-2"></TableHead>
              <TableHead className="min-w-[150px]">
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
              <TableHead className="min-w-[120px]">
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
              <TableHead className="hidden lg:table-cell min-w-[120px]">Contact</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[140px]">
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
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingOrder(order)}
                    className="h-7 w-7 p-0"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{order.customer_name}</TableCell>
                <TableCell>
                  {order.scheduled_date ? (() => {
                    let dateStr = format(parseISO(order.scheduled_date), "MMM dd, yyyy");
                    if (order.scheduled_time) {
                      const [hours, minutes] = order.scheduled_time.split(':');
                      const hour = parseInt(hours);
                      const period = hour >= 12 ? 'PM' : 'AM';
                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                      dateStr += ` ${displayHour}:${minutes} ${period}`;
                    }
                    return dateStr;
                  })() : "Not yet scheduled"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {order.contact_info ? (
                    <div className="flex items-center gap-1">
                      <span className="mr-1">{order.contact_info}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        asChild
                      >
                        <a href={`tel:${order.contact_info}`}>
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        asChild
                      >
                        <a href={`sms:${order.contact_info}`}>
                          <MessageSquare className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  ) : "-"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 md:gap-2">
                    {order.status !== "completed" && (
                      <>
                        <Dialog open={editingOrder?.id === order.id} onOpenChange={(open) => !open && setEditingOrder(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingOrder(order)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
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
                              className="h-8 w-8 p-0"
                            >
                              <CheckCircle2 className="h-4 w-4" />
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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingOrder(order)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this work order. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeletingOrder(null)}>
                            No
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                          >
                            {isDeleting ? "Deleting..." : "Yes"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
        onEdit={(order) => {
          setEditingOrder(order);
          setViewingOrder(null);
        }}
        onUpdate={onUpdate}
      />
    </>
  );
}
