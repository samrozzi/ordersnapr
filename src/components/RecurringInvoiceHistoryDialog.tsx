import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRecurringInvoiceHistory } from "@/hooks/use-recurring-invoices";
import { format } from "date-fns";
import { Eye, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecurringInvoiceHistoryDialogProps {
  scheduleId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RecurringInvoiceHistoryDialog({ scheduleId, isOpen, onClose }: RecurringInvoiceHistoryDialogProps) {
  const { history, isLoading } = useRecurringInvoiceHistory(scheduleId);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      sent: "default",
      paid: "default",
      void: "destructive",
    };

    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Generation History</DialogTitle>
          <DialogDescription>
            View all invoices generated from this recurring schedule
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading history...</div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No invoices generated yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Generation Date</TableHead>
                <TableHead>Billing Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auto-sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.invoice?.number || "Draft"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(record.generation_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {record.period_start && record.period_end ? (
                      <span className="text-sm">
                        {format(new Date(record.period_start), "MMM d")} -{" "}
                        {format(new Date(record.period_end), "MMM d, yyyy")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(record.invoice?.total_cents || 0)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(record.invoice?.status || "draft")}
                  </TableCell>
                  <TableCell>
                    {record.auto_sent ? (
                      <Badge variant="outline" className="gap-1">
                        <Mail className="h-3 w-3" />
                        Yes
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">No</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
