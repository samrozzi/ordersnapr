import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { useInvoices, useInvoiceNumber, InvoiceLineItem } from "@/hooks/use-invoices";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InvoiceFormProps {
  invoice?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InvoiceForm({ invoice, onSuccess, onCancel }: InvoiceFormProps) {
  const { createInvoice, updateInvoice, orgId } = useInvoices();
  const { generateInvoiceNumber } = useInvoiceNumber();
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [taxPercent, setTaxPercent] = useState(0);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      customer_id: invoice?.customer_id || "",
      work_order_id: invoice?.work_order_id || "",
      number: invoice?.number || "",
      issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
      due_date: invoice?.due_date || "",
      notes: invoice?.notes || "",
      terms: invoice?.terms || "Payment due within 30 days",
      discount_cents: invoice?.discount_cents || 0,
    }
  });

  // Load customers and work orders
  useEffect(() => {
    const fetchData = async () => {
      if (!orgId) return;

      // Fetch customers
      const { data: customersData } = await supabase
        .from("customers")
        .select("*")
        .eq("org_id", orgId)
        .order("name");

      if (customersData) setCustomers(customersData);

      // Fetch work orders without invoices
      const { data: ordersData } = await supabase
        .from("work_orders")
        .select("id, customer_name, job_id, address")
        .eq("organization_id", orgId)
        .is("linked_invoice_id", null)
        .order("created_at", { ascending: false });

      if (ordersData) setWorkOrders(ordersData);
    };

    fetchData();
  }, [orgId]);

  // Load existing line items or create a default one
  useEffect(() => {
    if (invoice?.line_items && Array.isArray(invoice.line_items)) {
      setLineItems(invoice.line_items);
    } else {
      setLineItems([{ description: "", quantity: 1, rate_cents: 0, amount_cents: 0 }]);
    }
  }, [invoice]);

  // Generate invoice number for new invoices
  useEffect(() => {
    if (!invoice && orgId) {
      generateInvoiceNumber().then(number => {
        setValue("number", number);
      });
    }
  }, [invoice, orgId]);

  // Calculate line item amount when quantity or rate changes
  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate amount
    if (field === 'quantity' || field === 'rate_cents') {
      newItems[index].amount_cents = newItems[index].quantity * newItems[index].rate_cents;
    }

    setLineItems(newItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, rate_cents: 0, amount_cents: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Calculate totals
  const subtotal_cents = lineItems.reduce((sum, item) => sum + item.amount_cents, 0);
  const discount_cents = watch("discount_cents") || 0;
  const tax_cents = Math.round((subtotal_cents - discount_cents) * (taxPercent / 100));
  const total_cents = subtotal_cents + tax_cents - discount_cents;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const onSubmit = async (data: any) => {
    if (lineItems.length === 0 || !lineItems.some(item => item.description)) {
      toast.error("Please add at least one line item");
      return;
    }

    setLoading(true);

    try {
      // Find customer name for denormalization
      const customer = customers.find(c => c.id === data.customer_id);

      const invoiceData = {
        ...data,
        line_items: lineItems,
        subtotal_cents,
        tax_cents,
        discount_cents: Number(data.discount_cents) || 0,
        total_cents,
        customer_name: customer?.name || null,
        status: invoice?.status || 'draft',
      };

      if (invoice) {
        await updateInvoice({ id: invoice.id, updates: invoiceData });
      } else {
        await createInvoice(invoiceData);
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
      {/* Invoice Header */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="number">Invoice Number</Label>
          <Input
            id="number"
            {...register("number", { required: "Invoice number is required" })}
            placeholder="INV-0001"
          />
          {errors.number && (
            <p className="text-sm text-destructive mt-1">{String(errors.number.message)}</p>
          )}
        </div>

        <div>
          <Label htmlFor="customer_id">Customer</Label>
          <Select
            value={watch("customer_id")}
            onValueChange={(value) => setValue("customer_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="issue_date">Issue Date</Label>
          <Input
            id="issue_date"
            type="date"
            {...register("issue_date")}
          />
        </div>

        <div>
          <Label htmlFor="due_date">Due Date</Label>
          <Input
            id="due_date"
            type="date"
            {...register("due_date")}
          />
        </div>
      </div>

      {/* Optional Work Order Link */}
      <div>
        <Label htmlFor="work_order_id">Link to Work Order (Optional)</Label>
        <Select
          value={watch("work_order_id") || "none"}
          onValueChange={(value) => setValue("work_order_id", value === "none" ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select work order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No work order</SelectItem>
            {workOrders.map((order) => (
              <SelectItem key={order.id} value={order.id}>
                {order.job_id || order.id.slice(0, 8)} - {order.customer_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Line Items</CardTitle>
          <Button type="button" size="sm" onClick={addLineItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-5">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Qty"
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Rate"
                  min="0"
                  step="0.01"
                  value={item.rate_cents / 100}
                  onChange={(e) => updateLineItem(index, 'rate_cents', Math.round(parseFloat(e.target.value) * 100) || 0)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={formatCurrency(item.amount_cents)}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="col-span-1 flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal_cents)}</span>
          </div>

          <div className="flex justify-between items-center gap-4">
            <span className="text-sm text-muted-foreground">Tax %</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxPercent}
                onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                className="w-20"
              />
              <span className="text-sm font-medium min-w-[80px] text-right">
                {formatCurrency(tax_cents)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center gap-4">
            <span className="text-sm text-muted-foreground">Discount</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              {...register("discount_cents")}
              onChange={(e) => setValue("discount_cents", Math.round(parseFloat(e.target.value) * 100) || 0)}
              className="w-32"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span>{formatCurrency(total_cents)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notes and Terms */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            {...register("notes")}
            placeholder="Additional notes or instructions"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="terms">Payment Terms</Label>
          <Textarea
            id="terms"
            {...register("terms")}
            placeholder="Payment terms and conditions"
            rows={2}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Saving..." : invoice ? "Update Invoice" : "Create Invoice"}
        </Button>
      </div>
    </form>
  );
}
