import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumFeatureGuard } from "@/components/PremiumFeatureGuard";
import { useFinancialAnalytics } from "@/hooks/use-financial-analytics";
import { useActiveOrg } from "@/hooks/use-active-org";
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Users,
  FileText,
  AlertCircle,
  BarChart3,
  PieChart,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/DateRangePicker";
import { RevenueDashboard } from "@/components/RevenueDashboard";
import { PaymentAnalyticsDashboard } from "@/components/PaymentAnalyticsDashboard";
import { InvoiceAnalyticsDashboard } from "@/components/InvoiceAnalyticsDashboard";
import { AgingReport } from "@/components/AgingReport";

const Reports = () => {
  const { activeOrg } = useActiveOrg();
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});

  const {
    paymentAnalytics,
    invoiceAnalytics,
    arAgingReport,
    revenueTrends,
    customerLTV,
    paymentMethods,
    outstandingSummary,
    isLoading,
    summary,
  } = useFinancialAnalytics(dateRange);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (!activeOrg?.id) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Reports Not Available</CardTitle>
            <CardDescription>
              Financial reporting requires an organization. Please contact your administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <PremiumFeatureGuard feature="reports" featureName="Financial Reports">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Financial Reports</h1>
            <p className="text-muted-foreground">Comprehensive analytics and insights for your business</p>
          </div>

          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Collected payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalInvoiced)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All-time invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(outstandingSummary?.total_outstanding_cents || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {outstandingSummary?.total_outstanding_invoices || 0} invoices unpaid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPercentage(summary.collectionRate)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Payment collection efficiency
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Alert */}
        {outstandingSummary && outstandingSummary.overdue_invoices > 0 && (
          <Card className="border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Overdue Invoices Alert</CardTitle>
              </div>
              <CardDescription>
                You have {outstandingSummary.overdue_invoices} overdue invoices totaling{' '}
                {formatCurrency(outstandingSummary.overdue_amount_cents)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">Oldest overdue invoice:</p>
                  <p className="text-muted-foreground">
                    {outstandingSummary.oldest_overdue_date
                      ? new Date(outstandingSummary.oldest_overdue_date).toLocaleDateString()
                      : 'N/A'
                    } ({outstandingSummary.max_days_overdue || 0} days overdue)
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  View Overdue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabbed Reports */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="aging" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              AR Aging
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
            <RevenueDashboard
              revenueTrends={revenueTrends}
              customerLTV={customerLTV}
              isLoading={isLoading}
              formatCurrency={formatCurrency}
            />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentAnalyticsDashboard
              paymentAnalytics={paymentAnalytics}
              paymentMethods={paymentMethods}
              isLoading={isLoading}
              formatCurrency={formatCurrency}
              formatPercentage={formatPercentage}
            />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <InvoiceAnalyticsDashboard
              invoiceAnalytics={invoiceAnalytics}
              outstandingSummary={outstandingSummary}
              isLoading={isLoading}
              formatCurrency={formatCurrency}
            />
          </TabsContent>

          <TabsContent value="aging" className="space-y-4">
            <AgingReport
              arAgingReport={arAgingReport}
              isLoading={isLoading}
              formatCurrency={formatCurrency}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PremiumFeatureGuard>
  );
};

export default Reports;
