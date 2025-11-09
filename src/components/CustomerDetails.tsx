import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Mail, Phone, MapPin, FileText, ClipboardList, DollarSign, X } from "lucide-react";
import { type Customer } from "@/hooks/use-customers";
import { supabase } from "@/integrations/supabase/client";
import { SendPortalLinkEmailButton } from "@/components/SendPortalLinkEmailButton";
import { SharePortalLinkButton } from "@/components/SharePortalLinkButton";
import { format } from "date-fns";

interface CustomerDetailsProps {
  customer: Customer;
  onEdit: () => void;
  onClose: () => void;
}

export function CustomerDetails({ customer, onEdit, onClose }: CustomerDetailsProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerData = async () => {
      setLoading(true);

      // Fetch invoices
      const { data: invoicesData } = await supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", customer.id)
        .order("issue_date", { ascending: false });

      if (invoicesData) setInvoices(invoicesData);

      // Fetch work orders
      const { data: ordersData } = await supabase
        .from("work_orders")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (ordersData) setWorkOrders(ordersData);

      setLoading(false);
    };

    fetchCustomerData();
  }, [customer.id]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" }> = {
      draft: { label: "Draft", variant: "secondary" },
      sent: { label: "Sent", variant: "default" },
      paid: { label: "Paid", variant: "success" },
      void: { label: "Void", variant: "destructive" },
      cancelled: { label: "Cancelled", variant: "outline" },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_cents || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount_cents || 0), 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  return (
    <div className="space-y-6">
      {/* Header with Customer Info */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{customer.name}</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {customer.address.street && `${customer.address.street}, `}
                    {customer.address.city && `${customer.address.city}, `}
                    {customer.address.state} {customer.address.zip}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Customer
          </Button>
          {customer.email && (
            <>
              <SharePortalLinkButton
                customerId={customer.id}
                customerName={customer.name}
                variant="outline"
                size="sm"
              />
              <SendPortalLinkEmailButton
                customerId={customer.id}
                customerName={customer.name}
                customerEmail={customer.email}
                variant="outline"
                size="sm"
              />
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoiced</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvoiced)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices.filter(inv => inv.status === 'paid').length} paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'void').length} unpaid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Invoices and Work Orders */}
      <Tabs defaultValue="invoices" className="w-full">
        <TabsList>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" />
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="work-orders">
            <ClipboardList className="h-4 w-4 mr-2" />
            Work Orders ({workOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4 mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found for this customer
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <Card key={invoice.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{invoice.number || "Draft"}</span>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.issue_date && `Issued ${format(new Date(invoice.issue_date), "MMM d, yyyy")}`}
                        {invoice.due_date && ` • Due ${format(new Date(invoice.due_date), "MMM d, yyyy")}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(invoice.total_cents || 0)}</div>
                      {invoice.paid_amount_cents > 0 && invoice.status !== 'paid' && (
                        <div className="text-xs text-green-600">
                          {formatCurrency(invoice.paid_amount_cents)} paid
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="work-orders" className="space-y-4 mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : workOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No work orders found for this customer
            </div>
          ) : (
            <div className="space-y-2">
              {workOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium mb-1">
                          {order.customer_name || "Unnamed Job"}
                        </div>
                        {order.address && (
                          <div className="text-sm text-muted-foreground flex items-start gap-1">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{order.address}</span>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {order.created_at && format(new Date(order.created_at), "MMM d, yyyy")}
                        </div>
                      </div>
                      {order.linked_invoice_id && (
                        <Badge variant="outline" className="text-xs">
                          Invoiced
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Close Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
      </div>
    </div>
  );
}
