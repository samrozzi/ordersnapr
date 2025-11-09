import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PremiumFeatureGuard } from "@/components/PremiumFeatureGuard";
import { useCustomers } from "@/hooks/use-customers";
import { CustomerForm } from "@/components/CustomerForm";
import { CustomerTable } from "@/components/CustomerTable";
import { CustomerDetails } from "@/components/CustomerDetails";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomerWithStats } from "@/hooks/use-customers";

const Customers = () => {
  const { customers, isLoading, orgId } = useCustomers({ includeStats: true });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<CustomerWithStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter customers by search query
  const filteredCustomers = customers.filter((customer: CustomerWithStats) => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query)
    );
  });

  // Separate customers with and without email
  const customersWithEmail = filteredCustomers.filter((c: CustomerWithStats) => c.email);
  const customersWithoutEmail = filteredCustomers.filter((c: CustomerWithStats) => !c.email);

  const handleEdit = (customer: CustomerWithStats) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const handleView = (customer: CustomerWithStats) => {
    setViewingCustomer(customer);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedCustomer(null);
  };

  const handleCreateNew = () => {
    setSelectedCustomer(null);
    setIsFormOpen(true);
  };

  // Calculate stats
  const totalCustomers = customers.length;
  const customersWithPortalAccess = customers.filter((c: CustomerWithStats) => c.email).length;
  const totalInvoiced = customers.reduce((sum: number, c: CustomerWithStats) =>
    sum + (c.total_invoiced_cents || 0), 0
  );
  const totalPaid = customers.reduce((sum: number, c: CustomerWithStats) =>
    sum + (c.total_paid_cents || 0), 0
  );

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  if (!orgId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Management Not Available</CardTitle>
            <CardDescription>
              Customer management requires an organization. Please contact your administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <PremiumFeatureGuard feature="customers" featureName="Customers">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-muted-foreground">Manage your customers and portal access</p>
          </div>

          <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
            <SheetTrigger asChild>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                New Customer
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  {selectedCustomer ? "Edit Customer" : "Create Customer"}
                </SheetTitle>
              </SheetHeader>
              <CustomerForm
                customer={selectedCustomer || undefined}
                onSuccess={handleFormClose}
                onCancel={handleFormClose}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                Active customer accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portal Access</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customersWithPortalAccess}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((customersWithPortalAccess / totalCustomers) * 100) || 0}% have email
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalInvoiced)}</div>
              <p className="text-xs text-muted-foreground">
                Across all customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((totalPaid / totalInvoiced) * 100) || 0}% collection rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Customer Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({filteredCustomers.length})</TabsTrigger>
            <TabsTrigger value="with-portal">With Portal Access ({customersWithEmail.length})</TabsTrigger>
            <TabsTrigger value="no-portal">No Portal Access ({customersWithoutEmail.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <CustomerTable
              customers={filteredCustomers}
              isLoading={isLoading}
              onEdit={handleEdit}
              onView={handleView}
              showStats={true}
            />
          </TabsContent>

          <TabsContent value="with-portal" className="mt-4">
            <CustomerTable
              customers={customersWithEmail}
              isLoading={isLoading}
              onEdit={handleEdit}
              onView={handleView}
              showStats={true}
            />
          </TabsContent>

          <TabsContent value="no-portal" className="mt-4">
            <CustomerTable
              customers={customersWithoutEmail}
              isLoading={isLoading}
              onEdit={handleEdit}
              onView={handleView}
              showStats={true}
            />
          </TabsContent>
        </Tabs>

        {/* Customer Details Dialog */}
        <Dialog open={!!viewingCustomer} onOpenChange={(open) => !open && setViewingCustomer(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Customer Details</DialogTitle>
            </DialogHeader>
            {viewingCustomer && (
              <CustomerDetails
                customer={viewingCustomer}
                onEdit={() => {
                  handleEdit(viewingCustomer);
                  setViewingCustomer(null);
                }}
                onClose={() => setViewingCustomer(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PremiumFeatureGuard>
  );
};

export default Customers;
