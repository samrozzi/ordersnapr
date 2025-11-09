import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { FileText, Eye, Calendar, DollarSign, Clock, Download } from "lucide-react";
import { useInvoicePDF } from "@/hooks/use-invoice-pdf";
import { CustomerInvoicePayment } from "@/components/CustomerInvoicePayment";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";

interface Invoice {
  id: string;
  number: string | null;
  invoice_number?: string;
  status: string;
  payment_status?: 'unpaid' | 'partial' | 'paid' | 'refunded' | 'failed';
  issue_date: string | null;
  due_date: string | null;
  payment_due_date?: string | null;
  total_cents: number;
  paid_amount_cents: number | null;
  paid_at: string | null;
  line_items: any[];
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  notes: string | null;
  terms: string | null;
  currency?: string | null;
}

interface CustomerPortalInvoicesProps {
  invoices: Invoice[];
}

export function CustomerPortalInvoices({ invoices }: CustomerPortalInvoicesProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { downloadPDF, isGenerating } = useInvoicePDF();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      draft: { label: "Draft", variant: "secondary" as const },
      sent: { label: "Sent", variant: "default" as const },
      paid: { label: "Paid", variant: "success" as const },
      void: { label: "Void", variant: "destructive" as const },
      cancelled: { label: "Cancelled", variant: "outline" as const },
    };
    return configs[status as keyof typeof configs] || configs.draft;
  };

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === "paid" || invoice.status === "void" || invoice.status === "cancelled") {
      return false;
    }
    if (!invoice.due_date) return false;
    return new Date(invoice.due_date) < new Date();
  };

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">No Invoices</p>
          <p className="text-muted-foreground">
            You don't have any invoices yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {invoices.map((invoice) => {
          const statusConfig = getStatusConfig(invoice.status);
          const overdue = isOverdue(invoice);

          return (
            <Card
              key={invoice.id}
              className={`hover:shadow-md transition-shadow ${
                overdue ? "border-destructive" : ""
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {invoice.number || invoice.invoice_number || "Draft"}
                    </CardTitle>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {invoice.payment_status && (
                      <PaymentStatusBadge status={invoice.payment_status} className="text-xs" />
                    )}
                    {!invoice.payment_status && (
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    )}
                    {overdue && (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(invoice.total_cents)}
                  </span>
                </div>

                {invoice.issue_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Issued {format(new Date(invoice.issue_date), "MMM d, yyyy")}
                    </span>
                  </div>
                )}

                {invoice.due_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className={overdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                      Due {format(new Date(invoice.due_date), "MMM d, yyyy")}
                    </span>
                  </div>
                )}

                {invoice.status === "paid" && invoice.paid_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">
                      Paid {format(new Date(invoice.paid_at), "MMM d, yyyy")}
                    </span>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedInvoice && (
            <CustomerInvoicePayment invoice={selectedInvoice as any} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
