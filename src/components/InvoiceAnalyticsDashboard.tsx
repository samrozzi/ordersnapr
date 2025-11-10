import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import type { InvoiceAnalytics, OutstandingInvoicesSummary } from "@/hooks/use-financial-analytics";

interface InvoiceAnalyticsDashboardProps {
  invoiceAnalytics: InvoiceAnalytics[];
  outstandingSummary: OutstandingInvoicesSummary | null;
  isLoading: boolean;
  formatCurrency: (cents: number) => string;
}

export function InvoiceAnalyticsDashboard({
  invoiceAnalytics,
  outstandingSummary,
  isLoading,
  formatCurrency,
}: InvoiceAnalyticsDashboardProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            Loading invoice data...
          </CardContent>
        </Card>
      </div>
    );
  }

  // Aggregate by payment status
  const statusSummary = invoiceAnalytics.reduce((acc, inv) => {
    const status = inv.payment_status;
    if (!acc[status]) {
      acc[status] = {
        count: 0,
        invoiced: 0,
        paid: 0,
        outstanding: 0,
      };
    }
    acc[status].count += inv.invoice_count;
    acc[status].invoiced += inv.total_invoiced_cents;
    acc[status].paid += inv.total_paid_cents;
    acc[status].outstanding += inv.total_outstanding_cents;
    return acc;
  }, {} as Record<string, any>);

  const totalInvoices = Object.values(statusSummary).reduce(
    (sum: number, s: any) => sum + s.count,
    0
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'partial':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'unpaid':
        return <FileText className="h-5 w-5 text-blue-600" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatStatusName = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Monthly invoice summary
  const monthlyData = invoiceAnalytics.reduce((acc, inv) => {
    const monthKey = inv.month;
    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        total_invoices: 0,
        total_invoiced: 0,
        total_paid: 0,
        total_outstanding: 0,
      };
    }
    acc[monthKey].total_invoices += inv.invoice_count;
    acc[monthKey].total_invoiced += inv.total_invoiced_cents;
    acc[monthKey].total_paid += inv.total_paid_cents;
    acc[monthKey].total_outstanding += inv.total_outstanding_cents;
    return acc;
  }, {} as Record<string, any>);

  const monthlyArray = Object.values(monthlyData)
    .sort((a: any, b: any) => new Date(b.month).getTime() - new Date(a.month).getTime())
    .slice(0, 12);

  return (
    <div className="space-y-4">
      {/* Payment Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(statusSummary).map(([status, data]: [string, any]) => {
          const percentage = totalInvoices > 0 ? (data.count / totalInvoices) * 100 : 0;

          return (
            <Card key={status}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {formatStatusName(status)}
                </CardTitle>
                {getStatusIcon(status)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.count}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {percentage.toFixed(1)}% of invoices
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(data.outstanding)} outstanding
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Outstanding Invoice Details */}
      {outstandingSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Invoices Breakdown</CardTitle>
            <CardDescription>
              Current accounts receivable status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Outstanding</div>
                <div className="text-2xl font-bold mt-1">
                  {formatCurrency(outstandingSummary.total_outstanding_cents)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {outstandingSummary.total_outstanding_invoices} invoices
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">Overdue</div>
                <div className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(outstandingSummary.overdue_amount_cents)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {outstandingSummary.overdue_invoices} invoices
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground">Due Future</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {formatCurrency(outstandingSummary.due_future_amount_cents)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {outstandingSummary.due_future_invoices} invoices
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Invoice Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Invoice Activity</CardTitle>
          <CardDescription>
            Invoice creation and payment trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Total Invoiced</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Payment Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyArray.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No invoice data available
                  </TableCell>
                </TableRow>
              ) : (
                monthlyArray.map((data: any) => {
                  const paymentRate = data.total_invoiced > 0
                    ? (data.total_paid / data.total_invoiced) * 100
                    : 0;

                  return (
                    <TableRow key={data.month}>
                      <TableCell className="font-medium">
                        {new Date(data.month).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </TableCell>
                      <TableCell className="text-right">{data.total_invoices}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(data.total_invoiced)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(data.total_paid)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(data.total_outstanding)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={
                          paymentRate >= 80
                            ? "text-green-600"
                            : paymentRate >= 50
                            ? "text-yellow-600"
                            : "text-red-600"
                        }>
                          {paymentRate.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Status Distribution</CardTitle>
          <CardDescription>
            Breakdown by payment status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
                <TableHead className="text-right">Total Invoiced</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(statusSummary).map(([status, data]: [string, any]) => {
                const percentage = totalInvoices > 0 ? (data.count / totalInvoices) * 100 : 0;

                return (
                  <TableRow key={status}>
                    <TableCell className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <span className="font-medium">{formatStatusName(status)}</span>
                    </TableCell>
                    <TableCell className="text-right">{data.count}</TableCell>
                    <TableCell className="text-right">{percentage.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(data.invoiced)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(data.paid)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(data.outstanding)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
