import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ARAgingReport } from "@/hooks/use-financial-analytics";

interface AgingReportProps {
  arAgingReport: ARAgingReport[];
  isLoading: boolean;
  formatCurrency: (cents: number) => string;
}

export function AgingReport({
  arAgingReport,
  isLoading,
  formatCurrency,
}: AgingReportProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            Loading aging report...
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate totals
  const totals = arAgingReport.reduce(
    (acc, customer) => {
      acc.current += customer.current_cents;
      acc.overdue_1_30 += customer.overdue_1_30_cents;
      acc.overdue_31_60 += customer.overdue_31_60_cents;
      acc.overdue_61_90 += customer.overdue_61_90_cents;
      acc.overdue_90_plus += customer.overdue_90_plus_cents;
      acc.total += customer.total_outstanding_cents;
      return acc;
    },
    {
      current: 0,
      overdue_1_30: 0,
      overdue_31_60: 0,
      overdue_61_90: 0,
      overdue_90_plus: 0,
      total: 0,
    }
  );

  const getSeverityColor = (customer: ARAgingReport) => {
    if (customer.overdue_90_plus_cents > 0) return "text-red-600";
    if (customer.overdue_61_90_cents > 0) return "text-orange-600";
    if (customer.overdue_31_60_cents > 0) return "text-yellow-600";
    if (customer.overdue_1_30_cents > 0) return "text-blue-600";
    return "";
  };

  const getSeverityIcon = (customer: ARAgingReport) => {
    if (customer.overdue_90_plus_cents > 0) {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
    if (customer.overdue_61_90_cents > 0) {
      return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    }
    if (customer.overdue_31_60_cents > 0 || customer.overdue_1_30_cents > 0) {
      return <Clock className="h-5 w-5 text-yellow-600" />;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.current)}</div>
            <p className="text-xs text-muted-foreground mt-1">Not yet due</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">1-30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totals.overdue_1_30)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Recently overdue</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">31-60 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(totals.overdue_31_60)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">61-90 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totals.overdue_61_90)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Urgent</p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">90+ Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.overdue_90_plus)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Critical</p>
          </CardContent>
        </Card>
      </div>

      {/* Aging Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts Receivable Aging Detail</CardTitle>
          <CardDescription>
            Customer-level breakdown of outstanding invoices by age
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">1-30 Days</TableHead>
                <TableHead className="text-right">31-60 Days</TableHead>
                <TableHead className="text-right">61-90 Days</TableHead>
                <TableHead className="text-right">90+ Days</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arAgingReport.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No outstanding invoices - all paid up!
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {arAgingReport.map((customer) => (
                    <TableRow key={customer.customer_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(customer)}
                          <div>
                            <div className="font-medium">{customer.customer_name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">
                              {customer.customer_email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{customer.invoice_count}</TableCell>
                      <TableCell className="text-right">
                        {customer.current_cents > 0 ? formatCurrency(customer.current_cents) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={customer.overdue_1_30_cents > 0 ? "text-blue-600" : ""}>
                          {customer.overdue_1_30_cents > 0
                            ? formatCurrency(customer.overdue_1_30_cents)
                            : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={customer.overdue_31_60_cents > 0 ? "text-yellow-600" : ""}>
                          {customer.overdue_31_60_cents > 0
                            ? formatCurrency(customer.overdue_31_60_cents)
                            : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={customer.overdue_61_90_cents > 0 ? "text-orange-600" : ""}>
                          {customer.overdue_61_90_cents > 0
                            ? formatCurrency(customer.overdue_61_90_cents)
                            : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={customer.overdue_90_plus_cents > 0 ? "text-red-600 font-bold" : ""}>
                          {customer.overdue_90_plus_cents > 0
                            ? formatCurrency(customer.overdue_90_plus_cents)
                            : '-'}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${getSeverityColor(customer)}`}>
                        {formatCurrency(customer.total_outstanding_cents)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Contact
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {arAgingReport.reduce((sum, c) => sum + c.invoice_count, 0)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.current)}</TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(totals.overdue_1_30)}
                    </TableCell>
                    <TableCell className="text-right text-yellow-600">
                      {formatCurrency(totals.overdue_31_60)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(totals.overdue_61_90)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(totals.overdue_90_plus)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {totals.overdue_90_plus > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-600">Action Required</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              You have {formatCurrency(totals.overdue_90_plus)} in invoices overdue 90+ days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700">
              Recommended actions: Send payment reminders, contact customers directly, or consider
              collection agencies for severely overdue accounts.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
