import { useParams } from "react-router-dom";
import { usePublicInvoice } from "@/hooks/use-public-invoice-links";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { PaymentDialog } from "@/components/PaymentDialog";
import { generateInvoicePDF } from "@/lib/invoice-pdf-generator";

export default function PublicInvoice() {
  const { token } = useParams<{ token: string }>();
  const { invoice, linkData, canPay, isLoading, error } = usePublicInvoice(token || "");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    const pdfData = {
      number: invoice.number,
      issue_date: invoice.invoice_date || invoice.created_at,
      due_date: invoice.payment_due_date,
      status: invoice.status,
      line_items: invoice.line_items || [],
      subtotal_cents: invoice.subtotal_cents || 0,
      tax_cents: invoice.tax_cents || 0,
      discount_cents: invoice.discount_cents || 0,
      total_cents: invoice.total_cents || 0,
      paid_at: invoice.paid_at,
      paid_amount_cents: invoice.paid_amount_cents,
      customer_name: invoice.customer?.name || invoice.customer?.email || "Customer",
      customer_email: invoice.customer?.email,
      customer_phone: invoice.customer?.phone,
      customer_address: invoice.customer?.address,
      organization_name: invoice.organization?.name,
      notes: invoice.notes,
      terms: invoice.terms,
    };

    const pdf = await generateInvoicePDF(pdfData);
    pdf.save(`Invoice_${invoice.number}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Invalid or Expired Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This invoice link is invalid, has expired, or has reached its view limit.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = invoice.payment_status === "paid";
  const isOverdue = !isPaid && invoice.payment_due_date && new Date(invoice.payment_due_date) < new Date();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  {invoice.organization?.name || "Invoice"}
                </div>
                <CardTitle className="text-3xl">Invoice {invoice.number}</CardTitle>
              </div>
              <div className="flex gap-2">
                {isPaid ? (
                  <Badge className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Paid
                  </Badge>
                ) : isOverdue ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : (
                  <Badge variant="secondary">Unpaid</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bill To */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">BILL TO</div>
              <div className="font-medium">{invoice.customer?.name || invoice.customer?.email}</div>
              {invoice.customer?.email && <div className="text-sm text-muted-foreground">{invoice.customer.email}</div>}
              {invoice.customer?.phone && <div className="text-sm text-muted-foreground">{invoice.customer.phone}</div>}
            </div>

            <Separator />

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Issue Date</div>
                <div className="font-medium">
                  {invoice.invoice_date ? format(new Date(invoice.invoice_date), "MMMM d, yyyy") : "—"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Due Date</div>
                <div className="font-medium">
                  {invoice.payment_due_date ? format(new Date(invoice.payment_due_date), "MMMM d, yyyy") : "—"}
                </div>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-3">ITEMS</div>
              <div className="space-y-2">
                {(invoice.line_items || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{item.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.quantity} × {formatCurrency(item.rate_cents)}
                      </div>
                    </div>
                    <div className="font-medium">{formatCurrency(item.amount_cents)}</div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
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
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total_cents || 0)}</span>
              </div>
              {isPaid && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid</span>
                  <span>{formatCurrency(invoice.paid_amount_cents || invoice.total_cents)}</span>
                </div>
              )}
            </div>

            {invoice.notes && (
              <>
                <Separator />
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">NOTES</div>
                  <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              </>
            )}

            {invoice.terms && (
              <>
                <Separator />
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">PAYMENT TERMS</div>
                  <p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              {canPay && !isPaid && (
                <Button onClick={() => setIsPaymentOpen(true)} className="flex-1">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {canPay && !isPaid && (
          <PaymentDialog
            isOpen={isPaymentOpen}
            onClose={() => setIsPaymentOpen(false)}
            invoice={invoice}
          />
        )}
      </div>
    </div>
  );
}
