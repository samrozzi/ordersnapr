import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Smartphone, Building } from "lucide-react";
import type { PaymentAnalytics, PaymentMethodAnalytics } from "@/hooks/use-financial-analytics";

interface PaymentAnalyticsDashboardProps {
  paymentAnalytics: PaymentAnalytics[];
  paymentMethods: PaymentMethodAnalytics[];
  isLoading: boolean;
  formatCurrency: (cents: number) => string;
  formatPercentage: (value: number) => string;
}

export function PaymentAnalyticsDashboard({
  paymentAnalytics,
  paymentMethods,
  isLoading,
  formatCurrency,
  formatPercentage,
}: PaymentAnalyticsDashboardProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            Loading payment data...
          </CardContent>
        </Card>
      </div>
    );
  }

  // Aggregate payment methods
  const methodSummary = paymentMethods.reduce((acc, method) => {
    const key = method.payment_method_type || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        type: key,
        count: 0,
        revenue: 0,
        successful: 0,
        failed: 0,
      };
    }
    acc[key].count += method.payment_count;
    acc[key].revenue += method.net_revenue_cents;
    acc[key].successful += method.successful_payments;
    acc[key].failed += method.failed_payments;
    return acc;
  }, {} as Record<string, any>);

  const methodData = Object.values(methodSummary);
  const totalRevenue = methodData.reduce((sum: number, m: any) => sum + m.revenue, 0);

  // Get icon for payment method
  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CreditCard className="h-5 w-5" />;
      case 'ach_debit':
        return <Building className="h-5 w-5" />;
      case 'apple_pay':
      case 'google_pay':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const formatMethodName = (type: string) => {
    switch (type) {
      case 'card':
        return 'Credit/Debit Card';
      case 'ach_debit':
        return 'ACH Bank Transfer';
      case 'apple_pay':
        return 'Apple Pay';
      case 'google_pay':
        return 'Google Pay';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Monthly payment summary
  const monthlyData = paymentAnalytics
    .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())
    .slice(0, 12);

  return (
    <div className="space-y-4">
      {/* Payment Method Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {methodData.map((method: any) => {
          const percentage = totalRevenue > 0 ? (method.revenue / totalRevenue) * 100 : 0;
          const successRate = method.count > 0
            ? (method.successful / method.count) * 100
            : 0;

          return (
            <Card key={method.type}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {formatMethodName(method.type)}
                </CardTitle>
                {getMethodIcon(method.type)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(method.revenue)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatPercentage(percentage)} of revenue
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {method.count} payments, {formatPercentage(successRate)} success
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment Method Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method Performance</CardTitle>
          <CardDescription>
            Success rates and revenue by payment method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Total Payments</TableHead>
                <TableHead className="text-right">Successful</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Success Rate</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methodData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No payment method data available
                  </TableCell>
                </TableRow>
              ) : (
                methodData.map((method: any) => {
                  const successRate = method.count > 0
                    ? (method.successful / method.count) * 100
                    : 0;

                  return (
                    <TableRow key={method.type}>
                      <TableCell className="flex items-center gap-2">
                        {getMethodIcon(method.type)}
                        <span className="font-medium">{formatMethodName(method.type)}</span>
                      </TableCell>
                      <TableCell className="text-right">{method.count}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {method.successful}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {method.failed}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={successRate >= 90 ? "text-green-600" : "text-yellow-600"}>
                          {formatPercentage(successRate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(method.revenue)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Payment Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Payment Activity</CardTitle>
          <CardDescription>
            Payment volume and revenue trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Payments</TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Avg Payment</TableHead>
                <TableHead className="text-right">Card</TableHead>
                <TableHead className="text-right">ACH</TableHead>
                <TableHead className="text-right">Failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No monthly payment data available
                  </TableCell>
                </TableRow>
              ) : (
                monthlyData.map((data) => (
                  <TableRow key={data.month}>
                    <TableCell className="font-medium">
                      {new Date(data.month).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </TableCell>
                    <TableCell className="text-right">{data.payment_count}</TableCell>
                    <TableCell className="text-right">{data.unique_customers}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(data.net_revenue_cents)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(data.avg_payment_cents)}
                    </TableCell>
                    <TableCell className="text-right">{data.card_payments}</TableCell>
                    <TableCell className="text-right">{data.ach_payments}</TableCell>
                    <TableCell className="text-right">
                      <span className={data.failed_payments > 0 ? "text-red-600" : ""}>
                        {data.failed_payments}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
