import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { FileText, Eye, Calendar, DollarSign, Clock } from "lucide-react";

interface Invoice {
  id: string;
  number: string | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  total_cents: number;
  paid_amount_cents: number | null;
  paid_at: string | null;
  line_items: any[];
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  notes: string | null;
  terms: string | null;
}

interface CustomerPortalInvoicesProps {
  invoices: Invoice[];
}

export function CustomerPortalInvoices({ invoices }: CustomerPortalInvoicesProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

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
                      {invoice.number || "Draft"}
                    </CardTitle>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.label}
                    </Badge>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">
                    {selectedInvoice.number || "Draft Invoice"}
                  </h3>
                  {selectedInvoice.issue_date && (
                    <p className="text-muted-foreground mt-1">
                      Issued {format(new Date(selectedInvoice.issue_date), "MMMM d, yyyy")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge variant={getStatusConfig(selectedInvoice.status).variant}>
                    {getStatusConfig(selectedInvoice.status).label}
                  </Badge>
                  {isOverdue(selectedInvoice) && (
                    <Badge variant="destructive">Overdue</Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                {selectedInvoice.issue_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Issue Date</p>
                    <p className="font-medium">
                      {format(new Date(selectedInvoice.issue_date), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}
                {selectedInvoice.due_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className={`font-medium ${isOverdue(selectedInvoice) ? "text-destructive" : ""}`}>
                      {format(new Date(selectedInvoice.due_date), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-semibold mb-3">Line Items</h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-2 grid grid-cols-12 gap-4 text-sm font-medium">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2 text-right">Quantity</div>
                    <div className="col-span-2 text-right">Rate</div>
                    <div className="col-span-2 text-right">Amount</div>
                  </div>
                  {selectedInvoice.line_items?.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="px-4 py-3 grid grid-cols-12 gap-4 text-sm border-t"
                    >
                      <div className="col-span-6">{item.description}</div>
                      <div className="col-span-2 text-right">{item.quantity}</div>
                      <div className="col-span-2 text-right">
                        {formatCurrency(item.rate_cents)}
                      </div>
                      <div className="col-span-2 text-right font-medium">
                        {formatCurrency(item.amount_cents)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedInvoice.subtotal_cents)}</span>
                </div>

                {selectedInvoice.tax_cents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(selectedInvoice.tax_cents)}</span>
                  </div>
                )}

                {selectedInvoice.discount_cents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-destructive">
                      -{formatCurrency(selectedInvoice.discount_cents)}
                    </span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(selectedInvoice.total_cents)}</span>
                </div>

                {selectedInvoice.status === "paid" && (
                  <div className="flex justify-between text-sm text-green-600 pt-2">
                    <span>Paid</span>
                    <div className="text-right">
                      <div>
                        {formatCurrency(selectedInvoice.paid_amount_cents || 0)}
                      </div>
                      {selectedInvoice.paid_at && (
                        <div className="text-xs">
                          {format(new Date(selectedInvoice.paid_at), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes & Terms */}
              {(selectedInvoice.notes || selectedInvoice.terms) && (
                <div className="space-y-4">
                  {selectedInvoice.notes && (
                    <div>
                      <p className="text-sm font-medium mb-1">Notes</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedInvoice.notes}
                      </p>
                    </div>
                  )}

                  {selectedInvoice.terms && (
                    <div>
                      <p className="text-sm font-medium mb-1">Payment Terms</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedInvoice.terms}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
