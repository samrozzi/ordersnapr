import { useState } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

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
}

interface WorkOrderTableProps {
  workOrders: WorkOrder[];
  onUpdate: () => void;
}

export function WorkOrderTable({ workOrders, onUpdate }: WorkOrderTableProps) {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

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
              <TableHead>Customer</TableHead>
              <TableHead>BPC</TableHead>
              <TableHead>BAN</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Job ID</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workOrders.map((order) => (
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
                  {order.status !== "completed" && (
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
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
