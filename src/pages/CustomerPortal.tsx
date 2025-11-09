import { useParams } from "react-router-dom";
import { useCustomerPortalAccess } from "@/hooks/use-customer-portal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CustomerPortalWorkOrders } from "@/components/CustomerPortalWorkOrders";
import { CustomerPortalInvoices } from "@/components/CustomerPortalInvoices";
import { Building2, AlertCircle, Loader2 } from "lucide-react";
import ordersnaprLogo from "@/assets/ordersnapr-horizontal.png";
import ordersnaprLogoDark from "@/assets/ordersnapr-horizontal-dark.png";

const CustomerPortal = () => {
  const { token } = useParams<{ token: string }>();
  const { portalData, isLoading, error } = useCustomerPortalAccess(token);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your portal...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>
              {error?.message || "This portal link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please contact your service provider for a new portal link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { customer, workOrders, invoices } = portalData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Light mode logo */}
            <img
              src={ordersnaprLogo}
              alt="OrderSnapr"
              className="h-10 object-contain block dark:hidden"
            />
            {/* Dark mode logo */}
            <img
              src={ordersnaprLogoDark}
              alt="OrderSnapr"
              className="h-10 object-contain hidden dark:block"
            />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Customer Portal</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Welcome, {customer.name}</CardTitle>
                <CardDescription className="mt-1">
                  View your work orders and invoices
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                Read-only Access
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {customer.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
              )}
              {customer.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Work Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{workOrders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {workOrders.filter((wo: any) => wo.status === "completed").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{invoices.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Work Orders and Invoices */}
        <Tabs defaultValue="work-orders" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="work-orders">
              Work Orders ({workOrders.length})
            </TabsTrigger>
            <TabsTrigger value="invoices">
              Invoices ({invoices.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="work-orders" className="mt-6">
            <CustomerPortalWorkOrders workOrders={workOrders} />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <CustomerPortalInvoices invoices={invoices} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 bg-background/95">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by OrderSnapr</p>
          <p className="mt-1">
            Questions? Contact your service provider.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CustomerPortal;
