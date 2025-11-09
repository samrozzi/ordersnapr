import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, DollarSign, Download, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import type { Invoice } from "@/hooks/use-invoices";

interface CustomerInvoicePaymentProps {
  invoice: Invoice;
  onPaymentClick?: () => void;
}

export function CustomerInvoicePayment({ invoice, onPaymentClick }: CustomerInvoicePaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency || 'USD',
    }).format(cents / 100);
  };

  const isOverdue = () => {
    if (invoice.payment_status === 'paid' || invoice.payment_status === 'refunded') return false;
    if (!invoice.due_date && !invoice.payment_due_date) return false;
    const dueDate = invoice.payment_due_date || invoice.due_date;
    return dueDate ? new Date(dueDate) < new Date() : false;
  };

  const remainingBalance = (invoice.total_cents || 0) - (invoice.paid_amount_cents || 0);
  const isPaid = invoice.payment_status === 'paid' || remainingBalance <= 0;

  const handlePayNow = async () => {
    setIsProcessing(true);
    try {
      if (onPaymentClick) {
        onPaymentClick();
      } else {
        // In production, this would create a Stripe Checkout session
        // and redirect the customer to the payment page
        alert("In production, this would redirect to Stripe Checkout.\n\nCustomers would be able to:\n- Pay with credit/debit card\n- Use Apple Pay or Google Pay\n- Set up ACH bank transfer\n\nThe payment would automatically update the invoice status.");
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Invoice {invoice.number || invoice.invoice_number}
              {invoice.payment_status && (
                <PaymentStatusBadge status={invoice.payment_status} />
              )}
            </CardTitle>
            <CardDescription>
              Issued {format(new Date(invoice.issue_date), "MMMM d, yyyy")}
              {(invoice.due_date || invoice.payment_due_date) && (
                <> • Due {format(new Date(invoice.payment_due_date || invoice.due_date!), "MMMM d, yyyy")}</>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overdue Alert */}
        {isOverdue() && (
          <Alert variant="destructive">
            <AlertDescription>
              This invoice is past due. Please make payment as soon as possible.
            </AlertDescription>
          </Alert>
        )}

        {/* Paid Alert */}
        {isPaid && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              This invoice has been paid in full. Thank you for your payment!
            </AlertDescription>
          </Alert>
        )}

        {/* Line Items */}
        <div className="space-y-3">
          <h4 className="font-medium">Items</h4>
          <div className="space-y-2">
            {invoice.line_items?.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <div>
                  <div>{item.description}</div>
                  <div className="text-muted-foreground">
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

          {invoice.discount_cents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-green-600">-{formatCurrency(invoice.discount_cents)}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(invoice.total_cents || 0)}</span>
          </div>

          {invoice.paid_amount_cents > 0 && (
            <>
              <div className="flex justify-between text-sm text-green-600">
                <span>Paid</span>
                <span>-{formatCurrency(invoice.paid_amount_cents)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Balance Due</span>
                <span>{formatCurrency(remainingBalance)}</span>
              </div>
            </>
          )}
        </div>

        {/* Payment Actions */}
        {!isPaid && (
          <div className="space-y-3 pt-4">
            <Button
              onClick={handlePayNow}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {isProcessing ? "Processing..." : `Pay ${formatCurrency(remainingBalance)}`}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secure payment processing powered by Stripe
            </p>
          </div>
        )}

        {/* Payment Instructions */}
        {invoice.terms && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Payment Instructions</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {invoice.terms}
            </p>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Notes</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {invoice.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
