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
  Calendar,
  Plus,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/DateRangePicker";
import { RevenueDashboard } from "@/components/RevenueDashboard";
import { PaymentAnalyticsDashboard } from "@/components/PaymentAnalyticsDashboard";
import { InvoiceAnalyticsDashboard } from "@/components/InvoiceAnalyticsDashboard";
import { AgingReport } from "@/components/AgingReport";
import { ReportBuilderDialog } from "@/components/ReportBuilderDialog";
import { SavedReportsManager } from "@/components/SavedReportsManager";
import { ReportVisualization } from "@/components/ReportVisualization";
import { ReportScheduleDialog } from "@/components/ReportScheduleDialog";
import { ReportSchedulesManager } from "@/components/ReportSchedulesManager";
import { useExecuteReport, useSavedReports, useReportSchedules } from "@/hooks/use-report-builder";
import { useToast } from "@/hooks/use-toast";
import type { ReportConfiguration, ReportResults, SavedReport, ReportSchedule } from "@/lib/report-builder-types";

const Reports = () => {
  const { activeOrg } = useActiveOrg();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});

  // Custom Reports State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<ReportResults | null>(null);
  const [editingReport, setEditingReport] = useState<Partial<ReportConfiguration> | undefined>();
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [schedulingReport, setSchedulingReport] = useState<SavedReport | null>(null);

  const { executeReport, isExecuting } = useExecuteReport();
  const { saveReport } = useSavedReports();
  const { createSchedule } = useReportSchedules();

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

  // Custom Report Handlers
  const handleExecuteReport = async (config: ReportConfiguration) => {
    try {
      const results = await executeReport(config);
      setCurrentReport(results);
      setIsBuilderOpen(false);
      toast({
        title: "Report Generated",
        description: `Successfully generated ${results.totalRows} rows`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute report",
        variant: "destructive",
      });
    }
  };

  const handleSaveReport = async (config: ReportConfiguration) => {
    try {
      await saveReport({ configuration: config, name: config.name, description: config.description });
      setIsBuilderOpen(false);
      toast({
        title: "Report Saved",
        description: `"${config.name}" has been saved`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save report",
        variant: "destructive",
      });
    }
  };

  const handleRunSavedReport = async (report: SavedReport) => {
    try {
      const results = await executeReport(report.configuration as ReportConfiguration);
      setCurrentReport(results);
      toast({
        title: "Report Executed",
        description: `"${report.name}" executed successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute report",
        variant: "destructive",
      });
    }
  };

  const handleEditSavedReport = (report: SavedReport) => {
    setEditingReport(report.configuration);
    setIsBuilderOpen(true);
  };

  const handleCreateNew = () => {
    setEditingReport(undefined);
    setIsBuilderOpen(true);
  };

  const handleScheduleReport = (report: SavedReport) => {
    setSchedulingReport(report);
    setIsScheduleDialogOpen(true);
  };

  const handleSaveSchedule = async (schedule: Partial<ReportSchedule>) => {
    try {
      await createSchedule(schedule);
      setIsScheduleDialogOpen(false);
      setSchedulingReport(null);
      toast({
        title: "Schedule Created",
        description: "Report schedule has been created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create schedule",
        variant: "destructive",
      });
    }
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
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Custom
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

          <TabsContent value="custom" className="space-y-4">
            {/* Custom Reports Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Custom Reports</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Create and manage custom reports with advanced filtering and visualization
                </p>
              </div>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </div>

            {/* Current Report Results */}
            {currentReport && (
              <ReportVisualization results={currentReport} isLoading={isExecuting} />
            )}

            {/* Saved Reports */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Saved Reports</h3>
              <SavedReportsManager
                onRunReport={handleRunSavedReport}
                onEditReport={handleEditSavedReport}
                onScheduleReport={handleScheduleReport}
              />
            </div>

            {/* Scheduled Reports */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Scheduled Reports</h3>
              <ReportSchedulesManager />
            </div>
          </TabsContent>
        </Tabs>

        {/* Report Builder Dialog */}
        <ReportBuilderDialog
          open={isBuilderOpen}
          onOpenChange={setIsBuilderOpen}
          onExecute={handleExecuteReport}
          onSave={handleSaveReport}
          initialConfig={editingReport}
        />

        {/* Report Schedule Dialog */}
        <ReportScheduleDialog
          open={isScheduleDialogOpen}
          onOpenChange={setIsScheduleDialogOpen}
          report={schedulingReport}
          onSave={handleSaveSchedule}
        />
      </div>
    </PremiumFeatureGuard>
  );
};

export default Reports;
