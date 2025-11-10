import { useState } from "react";
import { Plus, Play, Pause, X as XIcon, MoreVertical, Calendar, Zap, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  useRecurringInvoices,
  formatFrequency,
  type RecurringInvoiceSchedule,
} from "@/hooks/use-recurring-invoices";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RecurringInvoiceForm } from "@/components/RecurringInvoiceForm";
import { RecurringInvoiceHistoryDialog } from "@/components/RecurringInvoiceHistoryDialog";
import { format } from "date-fns";

export function RecurringInvoiceManager() {
  const {
    schedules,
    pauseSchedule,
    resumeSchedule,
    cancelSchedule,
    deleteSchedule,
    generateInvoiceNow,
    isGenerating,
  } = useRecurringInvoices();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RecurringInvoiceSchedule | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingSchedule(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (schedule: RecurringInvoiceSchedule) => {
    setEditingSchedule(schedule);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingSchedule(null);
  };

  const handlePause = async (id: string) => {
    try {
      await pauseSchedule(id);
    } catch (error) {
      console.error("Failed to pause schedule:", error);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resumeSchedule(id);
    } catch (error) {
      console.error("Failed to resume schedule:", error);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelSchedule(id);
    } catch (error) {
      console.error("Failed to cancel schedule:", error);
    }
  };

  const handleDelete = (id: string) => {
    setScheduleToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    try {
      await deleteSchedule(scheduleToDelete);
      setDeleteConfirmOpen(false);
      setScheduleToDelete(null);
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    }
  };

  const handleGenerateNow = async (id: string) => {
    try {
      await generateInvoiceNow(id);
    } catch (error) {
      console.error("Failed to generate invoice:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      paused: "secondary",
      completed: "outline",
      cancelled: "destructive",
    };

    const icons: Record<string, React.ReactNode> = {
      active: <Play className="h-3 w-3" />,
      paused: <Pause className="h-3 w-3" />,
      completed: <Calendar className="h-3 w-3" />,
      cancelled: <XIcon className="h-3 w-3" />,
    };

    return (
      <Badge variant={variants[status] || "outline"} className="gap-1">
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const calculateTotalAmount = (lineItems: any[]): number => {
    return lineItems.reduce((sum, item) => sum + (item.amount_cents || 0), 0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recurring Invoices</CardTitle>
            <CardDescription>
              Automate invoice generation with recurring schedules and subscriptions
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No recurring schedules yet</p>
            <p className="text-sm">Create your first recurring invoice schedule to automate billing</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Next Invoice</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{schedule.name}</div>
                      {schedule.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {schedule.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{schedule.customer?.name || "Unknown"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-muted-foreground" />
                      {formatFrequency(schedule.frequency, schedule.interval_count)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(calculateTotalAmount(schedule.line_items))}
                  </TableCell>
                  <TableCell>
                    {schedule.status === "active"
                      ? format(new Date(schedule.next_generation_date), "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{schedule.total_invoices_generated}</div>
                      <div className="text-muted-foreground text-xs">invoices</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingHistoryId(schedule.id)}>
                          <History className="h-4 w-4 mr-2" />
                          View History
                        </DropdownMenuItem>

                        {schedule.status === "active" && (
                          <DropdownMenuItem
                            onClick={() => handleGenerateNow(schedule.id)}
                            disabled={isGenerating}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Generate Now
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {schedule.status === "active" && (
                          <DropdownMenuItem onClick={() => handlePause(schedule.id)}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                        )}

                        {schedule.status === "paused" && (
                          <DropdownMenuItem onClick={() => handleResume(schedule.id)}>
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                          </DropdownMenuItem>
                        )}

                        {(schedule.status === "active" || schedule.status === "paused") && (
                          <DropdownMenuItem onClick={() => handleCancel(schedule.id)}>
                            <XIcon className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleDelete(schedule.id)}
                          className="text-destructive"
                        >
                          <XIcon className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? "Edit Recurring Schedule" : "Create Recurring Schedule"}
              </DialogTitle>
              <DialogDescription>
                Set up automated invoice generation on a recurring basis
              </DialogDescription>
            </DialogHeader>
            <RecurringInvoiceForm schedule={editingSchedule} onSuccess={handleFormClose} />
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Recurring Schedule</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this recurring schedule? This will not affect
                previously generated invoices, but will stop future automatic generation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {viewingHistoryId && (
          <RecurringInvoiceHistoryDialog
            scheduleId={viewingHistoryId}
            isOpen={!!viewingHistoryId}
            onClose={() => setViewingHistoryId(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
