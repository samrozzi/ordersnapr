import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, FileText, DollarSign, Clock, CheckCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PremiumFeatureGuard } from "@/components/PremiumFeatureGuard";
import { FreeTierGuard } from "@/components/FreeTierGuard";
import { useInvoices } from "@/hooks/use-invoices";
import { usePremiumAccess } from "@/hooks/use-premium-access";
import { InvoiceForm } from "@/components/InvoiceForm";
import { InvoiceTable } from "@/components/InvoiceTable";
import { InvoiceDetails } from "@/components/InvoiceDetails";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceTemplateManager } from "@/components/InvoiceTemplateManager";
import { InvoiceSettingsDialog } from "@/components/InvoiceSettingsDialog";
import { InvoiceEmailTemplateManager } from "@/components/InvoiceEmailTemplateManager";
import { RecurringInvoiceManager } from "@/components/RecurringInvoiceManager";
import { ExportButton } from "@/components/ExportButton";
import { ExportColumn, formatCurrencyForExport, formatDateForExport } from "@/lib/export-csv";

const Invoices = () => {
  const navigate = useNavigate();
  const { invoices, isLoading, orgId } = useInvoices();
  const { hasPremiumAccess } = usePremiumAccess();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);

  // Filter invoices by status (memoized for performance)
  const draftInvoices = useMemo(() =>
    invoices.filter((inv: any) => inv.status === 'draft'),
    [invoices]
  );

  const sentInvoices = useMemo(() =>
    invoices.filter((inv: any) => inv.status === 'sent'),
    [invoices]
  );

  const paidInvoices = useMemo(() =>
    invoices.filter((inv: any) => inv.status === 'paid'),
    [invoices]
  );

  const overdueInvoices = useMemo(() =>
    invoices.filter((inv: any) => {
      if (inv.status === 'paid' || inv.status === 'void' || inv.status === 'cancelled') return false;
      if (!inv.due_date) return false;
      return new Date(inv.due_date) < new Date();
    }),
    [invoices]
  );

  // Calculate totals (memoized for performance)
  const totalOutstanding = useMemo(() =>
    sentInvoices.reduce((sum: number, inv: any) => sum + (inv.total_cents || 0), 0),
    [sentInvoices]
  );

  const totalPaid = useMemo(() =>
    paidInvoices.reduce((sum: number, inv: any) => sum + (inv.paid_amount_cents || 0), 0),
    [paidInvoices]
  );

  const totalOverdue = useMemo(() =>
    overdueInvoices.reduce((sum: number, inv: any) => sum + (inv.total_cents || 0), 0),
    [overdueInvoices]
  );

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  // Export columns configuration
  const exportColumns: ExportColumn<any>[] = [
    { key: "invoice_number", label: "Invoice #" },
    { key: "customer.name", label: "Customer" },
    { key: "status", label: "Status" },
    {
      key: "total_cents",
      label: "Total Amount",
      format: (value) => formatCurrencyForExport(value ? value / 100 : 0),
    },
    {
      key: "paid_amount_cents",
      label: "Paid Amount",
      format: (value) => formatCurrencyForExport(value ? value / 100 : 0),
    },
    {
      key: "issue_date",
      label: "Issue Date",
      format: (value) => value ? new Date(value).toLocaleDateString() : "",
    },
    {
      key: "due_date",
      label: "Due Date",
      format: (value) => value ? new Date(value).toLocaleDateString() : "",
    },
    {
      key: "created_at",
      label: "Created",
      format: (value) => formatDateForExport(value),
    },
  ];

  const handleEdit = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleView = (invoice: any) => {
    setViewingInvoice(invoice);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedInvoice(null);
  };

  if (!orgId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoicing Not Available</CardTitle>
            <CardDescription>
              Invoicing requires an organization. Please contact your administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <PremiumFeatureGuard feature="invoicing" featureName="Invoicing">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground">Manage your invoices and track payments</p>
          </div>

          <div className="flex gap-2">
            <ExportButton
              data={invoices}
              columns={exportColumns}
              filename="invoices"
              variant="outline"
              disabled={invoices.length === 0}
            />
            <InvoiceSettingsDialog />
            <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
              <SheetTrigger asChild>
                <Button onClick={() => setSelectedInvoice(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    {selectedInvoice ? "Edit Invoice" : "Create Invoice"}
                  </SheetTitle>
                </SheetHeader>
                <InvoiceForm
                  invoice={selectedInvoice}
                  onSuccess={handleFormClose}
                  onCancel={handleFormClose}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground">
                {sentInvoices.length} invoice{sentInvoices.length !== 1 ? 's' : ''} sent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
              <p className="text-xs text-muted-foreground">
                {paidInvoices.length} invoice{paidInvoices.length !== 1 ? 's' : ''} paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <DollarSign className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalOverdue)}</div>
              <p className="text-xs text-muted-foreground">
                {overdueInvoices.length} invoice{overdueInvoices.length !== 1 ? 's' : ''} overdue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{draftInvoices.length}</div>
              <p className="text-xs text-muted-foreground">
                Not yet sent
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({invoices.length})</TabsTrigger>
            <TabsTrigger value="draft">Draft ({draftInvoices.length})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({sentInvoices.length})</TabsTrigger>
            <TabsTrigger value="paid">Paid ({paidInvoices.length})</TabsTrigger>
            <TabsTrigger value="overdue">Overdue ({overdueInvoices.length})</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <InvoiceTable
              invoices={invoices}
              isLoading={isLoading}
              onEdit={handleEdit}
              onView={handleView}
            />
          </TabsContent>

          <TabsContent value="draft" className="mt-4">
            <InvoiceTable
              invoices={draftInvoices}
              isLoading={isLoading}
              onEdit={handleEdit}
              onView={handleView}
            />
          </TabsContent>

          <TabsContent value="sent" className="mt-4">
            <InvoiceTable
              invoices={sentInvoices}
              isLoading={isLoading}
              onEdit={handleEdit}
              onView={handleView}
            />
          </TabsContent>

          <TabsContent value="paid" className="mt-4">
            <InvoiceTable
              invoices={paidInvoices}
              isLoading={isLoading}
              onEdit={handleEdit}
              onView={handleView}
            />
          </TabsContent>

          <TabsContent value="overdue" className="mt-4">
            <InvoiceTable
              invoices={overdueInvoices}
              isLoading={isLoading}
              onEdit={handleEdit}
              onView={handleView}
            />
          </TabsContent>

          <TabsContent value="recurring" className="mt-4">
            <RecurringInvoiceManager />
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <InvoiceTemplateManager />
          </TabsContent>

          <TabsContent value="email-templates" className="mt-4">
            <InvoiceEmailTemplateManager />
          </TabsContent>
        </Tabs>

        {/* Invoice Details Dialog */}
        <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
            </DialogHeader>
            {viewingInvoice && (
              <InvoiceDetails
                invoice={viewingInvoice}
                onEdit={() => {
                  handleEdit(viewingInvoice);
                  setViewingInvoice(null);
                }}
                onClose={() => setViewingInvoice(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PremiumFeatureGuard>
  );
};

export default Invoices;
