import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePayments } from "@/hooks/use-payments";
import { toast } from "sonner";
import { format } from "date-fns";
import { RotateCcw, ExternalLink, Receipt } from "lucide-react";

interface PaymentHistoryProps {
  invoiceId: string;
  invoiceTotalCents: number;
}

export function PaymentHistory({ invoiceId, invoiceTotalCents }: PaymentHistoryProps) {
  const { payments, processRefund, getPaymentSummary } = usePayments(invoiceId);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  const summary = getPaymentSummary(invoiceTotalCents);

  const handleRefundClick = (payment: any) => {
    setSelectedPayment(payment);
    const maxRefund = (payment.amount_cents - payment.refunded_amount_cents) / 100;
    setRefundAmount(maxRefund.toFixed(2));
    setRefundDialogOpen(true);
  };

  const handleProcessRefund = async () => {
    if (!selectedPayment || !refundAmount) return;

    setIsProcessingRefund(true);
    try {
      // Disabled: payments feature not yet implemented
      toast.error("Refunds feature not yet implemented");
      setIsProcessingRefund(false);
      return;

      setRefundDialogOpen(false);
      setSelectedPayment(null);
      setRefundAmount("");
      setRefundReason("");
    } catch (error) {
      console.error("Error processing refund:", error);
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const getPaymentMethodDisplay = (payment: any) => {
    if (payment.payment_method_brand && payment.payment_method_last4) {
      return `${payment.payment_method_brand} •••• ${payment.payment_method_last4}`;
    }
    return payment.payment_method_type || 'Unknown';
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: any }> = {
      succeeded: { label: 'Success', variant: 'default' },
      pending: { label: 'Pending', variant: 'secondary' },
      processing: { label: 'Processing', variant: 'secondary' },
      failed: { label: 'Failed', variant: 'destructive' },
      canceled: { label: 'Canceled', variant: 'secondary' },
      refunded: { label: 'Refunded', variant: 'secondary' },
      partially_refunded: { label: 'Partial Refund', variant: 'secondary' },
    };

    const { label, variant } = config[status] || { label: status, variant: 'secondary' };
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>No payments recorded yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            {payments.length} payment{payments.length !== 1 ? 's' : ''} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Total Paid</div>
              <div className="text-2xl font-bold text-green-600">
                ${(summary.totalPaid / 100).toFixed(2)}
              </div>
            </div>
            {summary.totalRefunded > 0 && (
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Total Refunded</div>
                <div className="text-2xl font-bold text-purple-600">
                  ${(summary.totalRefunded / 100).toFixed(2)}
                </div>
              </div>
            )}
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Remaining Balance</div>
              <div className="text-2xl font-bold">
                ${(summary.remainingBalance / 100).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Payment Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {payment.paid_at ? format(new Date(payment.paid_at), "MMM d, yyyy h:mm a") :
                     format(new Date(payment.created_at), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        ${(payment.amount_cents / 100).toFixed(2)}
                      </div>
                      {payment.refunded_amount_cents > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Refunded: ${(payment.refunded_amount_cents / 100).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getPaymentMethodDisplay(payment)}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {payment.receipt_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(payment.receipt_url!, '_blank')}
                        >
                          <Receipt className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                      )}
                      {payment.status === 'succeeded' &&
                       payment.amount_cents > payment.refunded_amount_cents && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRefundClick(payment)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Refund
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Refund payment from {selectedPayment?.paid_at ?
                format(new Date(selectedPayment.paid_at), "MMM d, yyyy") : 'this payment'}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Payment Amount:</span>{' '}
                  <span className="font-medium">${(selectedPayment.amount_cents / 100).toFixed(2)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Already Refunded:</span>{' '}
                  <span className="font-medium">${(selectedPayment.refunded_amount_cents / 100).toFixed(2)}</span>
                </div>
                <div className="text-sm font-semibold">
                  <span className="text-muted-foreground">Available to Refund:</span>{' '}
                  <span className="text-primary">
                    ${((selectedPayment.amount_cents - selectedPayment.refunded_amount_cents) / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refund-amount">Refund Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="refund-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={(selectedPayment.amount_cents - selectedPayment.refunded_amount_cents) / 100}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refund-reason">Reason (Optional)</Label>
                <Textarea
                  id="refund-reason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Reason for refund..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleProcessRefund}
              disabled={isProcessingRefund || !refundAmount || parseFloat(refundAmount) <= 0}
            >
              {isProcessingRefund ? "Processing..." : "Process Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
