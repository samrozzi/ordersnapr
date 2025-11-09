import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, Download, Send, Check, Eye, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { SharePortalLinkButton } from "@/components/SharePortalLinkButton";
import { SendInvoiceEmailButton } from "@/components/SendInvoiceEmailButton";
import { useInvoicePDF } from "@/hooks/use-invoice-pdf";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { PaymentHistory } from "@/components/PaymentHistory";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";

interface InvoiceDetailsProps {
  invoice: any;
  onEdit: () => void;
  onClose: () => void;
}

export function InvoiceDetails({ invoice, onEdit, onClose }: InvoiceDetailsProps) {
  const { downloadPDF, previewPDF, isGenerating } = useInvoicePDF();
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Draft", variant: "secondary" as const },
      sent: { label: "Sent", variant: "default" as const },
      paid: { label: "Paid", variant: "success" as const },
      void: { label: "Void", variant: "destructive" as const },
      cancelled: { label: "Cancelled", variant: "outline" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isOverdue = () => {
    if (invoice.status === 'paid' || invoice.status === 'void' || invoice.status === 'cancelled') return false;
    if (!invoice.due_date) return false;
    return new Date(invoice.due_date) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{invoice.number || "Draft Invoice"}</h2>
          <p className="text-muted-foreground mt-1">
            Issued {invoice.issue_date ? format(new Date(invoice.issue_date), "MMMM d, yyyy") : "—"}
          </p>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(invoice.status)}
          {invoice.payment_status && (
            <PaymentStatusBadge status={invoice.payment_status} />
          )}
          {isOverdue() && (
            <Badge variant="destructive">Overdue</Badge>
          )}
        </div>
      </div>

      {/* Customer & Work Order Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">
                {invoice.customer_name || invoice.customer?.name || "No customer"}
              </p>
              {invoice.customer?.email && (
                <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>
              )}
              {invoice.customer?.phone && (
                <p className="text-sm text-muted-foreground">{invoice.customer.phone}</p>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="font-medium">
                {invoice.due_date ? format(new Date(invoice.due_date), "MMMM d, yyyy") : "—"}
              </p>
            </div>
          </div>

          {invoice.work_order && (
            <div>
              <p className="text-sm text-muted-foreground">Linked Work Order</p>
              <p className="font-medium">
                {invoice.work_order.job_id || invoice.work_order.id.slice(0, 8)}
              </p>
              {invoice.work_order.address && (
                <p className="text-sm text-muted-foreground">{invoice.work_order.address}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Quantity</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>

            {/* Items */}
            {invoice.line_items?.map((item: any, index: number) => (
              <div key={index} className="grid grid-cols-12 gap-4 text-sm py-2">
                <div className="col-span-6">{item.description}</div>
                <div className="col-span-2 text-right">{item.quantity}</div>
                <div className="col-span-2 text-right">{formatCurrency(item.rate_cents)}</div>
                <div className="col-span-2 text-right font-medium">{formatCurrency(item.amount_cents)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(invoice.subtotal_cents || 0)}</span>
          </div>

          {invoice.tax_cents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(invoice.tax_cents)}</span>
            </div>
          )}

          {invoice.discount_cents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-destructive">-{formatCurrency(invoice.discount_cents)}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between text-lg font-bold pt-2">
            <span>Total</span>
            <span>{formatCurrency(invoice.total_cents || 0)}</span>
          </div>

          {invoice.status === 'paid' && (
            <div className="flex justify-between text-sm text-green-600 pt-2">
              <span>Paid</span>
              <div className="text-right">
                <div>{formatCurrency(invoice.paid_amount_cents || 0)}</div>
                {invoice.paid_at && (
                  <div className="text-xs">
                    {format(new Date(invoice.paid_at), "MMM d, yyyy")}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes & Terms */}
      {(invoice.notes || invoice.terms) && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {invoice.notes && (
              <div>
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}

            {invoice.terms && (
              <div>
                <p className="text-sm font-medium mb-1">Payment Terms</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {invoice.status !== 'draft' && invoice.status !== 'void' && invoice.status !== 'cancelled' && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Payments</h3>
            {invoice.payment_status !== 'paid' && invoice.payment_status !== 'refunded' && (
              <Button onClick={() => setRecordPaymentOpen(true)} size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}
          </div>
          <PaymentHistory
            invoiceId={invoice.id}
            invoiceTotalCents={invoice.total_cents || 0}
          />
        </>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <div className="flex gap-2">
          {/* PDF Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => previewPDF(invoice)}
            disabled={isGenerating}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadPDF(invoice)}
            disabled={isGenerating}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>

          {/* Customer Portal Actions */}
          {invoice.customer_id && (
            <>
              <SharePortalLinkButton
                customerId={invoice.customer_id}
                variant="outline"
                size="sm"
              />
              <SendInvoiceEmailButton
                invoice={invoice}
                variant="outline"
                size="sm"
              />
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {invoice.status === 'draft' && (
            <Button onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        invoice={invoice}
      />
    </div>
  );
}
