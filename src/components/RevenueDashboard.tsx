import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";
import type { RevenueTrend, CustomerLifetimeValue } from "@/hooks/use-financial-analytics";

interface RevenueDashboardProps {
  revenueTrends: RevenueTrend[];
  customerLTV: CustomerLifetimeValue[];
  isLoading: boolean;
  formatCurrency: (cents: number) => string;
}

export function RevenueDashboard({
  revenueTrends,
  customerLTV,
  isLoading,
  formatCurrency,
}: RevenueDashboardProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            Loading revenue data...
          </CardContent>
        </Card>
      </div>
    );
  }

  // Aggregate revenue trends by month
  const monthlyRevenue = revenueTrends.reduce((acc, trend) => {
    const monthKey = trend.month;
    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        invoiced: 0,
        collected: 0,
        invoiceCount: 0,
        paymentCount: 0,
      };
    }
    acc[monthKey].invoiced += trend.invoiced_cents;
    acc[monthKey].collected += trend.revenue_collected_cents;
    acc[monthKey].invoiceCount += trend.invoices_created;
    acc[monthKey].paymentCount += trend.payments_received;
    return acc;
  }, {} as Record<string, any>);

  const monthlyData = Object.values(monthlyRevenue)
    .sort((a: any, b: any) => new Date(b.month).getTime() - new Date(a.month).getTime())
    .slice(0, 12); // Last 12 months

  // Calculate trend (comparing last month to previous month)
  const lastMonth = monthlyData[0] as any;
  const previousMonth = monthlyData[1] as any;
  const revenueTrend = lastMonth && previousMonth
    ? ((lastMonth.collected - previousMonth.collected) / previousMonth.collected) * 100
    : 0;

  const isPositiveTrend = revenueTrend >= 0;

  // Top customers
  const topCustomers = customerLTV.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Monthly Revenue Trend */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>
              Month-over-month comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isPositiveTrend ? (
                <TrendingUp className="h-8 w-8 text-green-600" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-600" />
              )}
              <div>
                <div className="text-2xl font-bold">
                  {isPositiveTrend ? '+' : ''}{revenueTrend.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  vs. previous month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Customers</CardTitle>
            <CardDescription>
              Customers with outstanding invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">
                  {customerLTV.filter(c => c.outstanding_balance_cents > 0).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: {customerLTV.length} customers
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Summary</CardTitle>
          <CardDescription>
            Revenue invoiced vs collected by month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Payments</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Collection Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No revenue data available
                  </TableCell>
                </TableRow>
              ) : (
                monthlyData.map((data: any) => {
                  const collectionRate = data.invoiced > 0
                    ? (data.collected / data.invoiced) * 100
                    : 0;

                  return (
                    <TableRow key={data.month}>
                      <TableCell className="font-medium">
                        {new Date(data.month).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                        })}
                      </TableCell>
                      <TableCell className="text-right">{data.invoiceCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.invoiced)}</TableCell>
                      <TableCell className="text-right">{data.paymentCount}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(data.collected)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={collectionRate >= 80 ? "text-green-600" : "text-yellow-600"}>
                          {collectionRate.toFixed(1)}%
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

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers by Revenue</CardTitle>
          <CardDescription>
            Highest lifetime value customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Lifetime Revenue</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No customer data available
                  </TableCell>
                </TableRow>
              ) : (
                topCustomers.map((customer) => (
                  <TableRow key={customer.customer_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.customer_name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{customer.customer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{customer.total_invoices}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(customer.lifetime_revenue_cents)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(customer.outstanding_balance_cents)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={
                        customer.status === 'current'
                          ? "text-green-600"
                          : "text-yellow-600"
                      }>
                        {customer.status}
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
