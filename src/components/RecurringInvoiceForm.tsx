import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRecurringInvoices, type RecurringInvoiceSchedule, type RecurringFrequency } from "@/hooks/use-recurring-invoices";
import { useCustomers } from "@/hooks/use-customers";
import { useInvoiceEmailTemplates } from "@/hooks/use-invoice-email-templates";

interface RecurringInvoiceFormProps {
  schedule?: RecurringInvoiceSchedule | null;
  onSuccess: () => void;
}

export function RecurringInvoiceForm({ schedule, onSuccess }: RecurringInvoiceFormProps) {
  const { createSchedule, updateSchedule, isCreating, isUpdating } = useRecurringInvoices();
  const { customers } = useCustomers();
  const { templates } = useInvoiceEmailTemplates();

  const [formData, setFormData] = useState({
    customer_id: schedule?.customer_id || "",
    name: schedule?.name || "",
    description: schedule?.description || "",
    frequency: (schedule?.frequency || "monthly") as RecurringFrequency,
    interval_count: schedule?.interval_count || 1,
    start_date: schedule?.start_date || new Date().toISOString().split("T")[0],
    end_date: schedule?.end_date || "",
    next_generation_date: schedule?.next_generation_date || new Date().toISOString().split("T")[0],
    line_items: schedule?.line_items || [{ description: "", quantity: 1, rate_cents: 0, amount_cents: 0 }],
    payment_terms_days: schedule?.payment_terms_days || 30,
    tax_rate: schedule?.tax_rate || 0,
    terms: schedule?.terms || "",
    notes: schedule?.notes || "",
    auto_send_email: schedule?.auto_send_email || false,
    email_template_id: schedule?.email_template_id || "",
    status: schedule?.status || "active",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (schedule?.id) {
        await updateSchedule({ id: schedule.id, updates: formData });
      } else {
        await createSchedule(formData as any);
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save schedule:", error);
    }
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...formData.line_items];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "quantity" || field === "rate_cents") {
      const qty = field === "quantity" ? value : updated[index].quantity;
      const rate = field === "rate_cents" ? value : updated[index].rate_cents;
      updated[index].amount_cents = qty * rate;
    }

    setFormData({ ...formData, line_items: updated });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: "", quantity: 1, rate_cents: 0, amount_cents: 0 }],
    });
  };

  const removeLineItem = (index: number) => {
    setFormData({ ...formData, line_items: formData.line_items.filter((_, i) => i !== index) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label>Customer *</Label>
          <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name || c.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Schedule Name *</Label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>

        <div className="space-y-2">
          <Label>Frequency *</Label>
          <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v as RecurringFrequency })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Payment Terms (Days)</Label>
          <Input type="number" value={formData.payment_terms_days} onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) })} />
        </div>

        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
        </div>

        <div className="space-y-2">
          <Label>End Date (Optional)</Label>
          <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Line Items</Label>
        {formData.line_items.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <Input placeholder="Description" value={item.description} onChange={(e) => updateLineItem(idx, "description", e.target.value)} className="flex-1" />
            <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateLineItem(idx, "quantity", parseInt(e.target.value))} className="w-20" />
            <Input type="number" placeholder="Rate" value={item.rate_cents / 100} onChange={(e) => updateLineItem(idx, "rate_cents", parseFloat(e.target.value) * 100)} className="w-24" />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(idx)}>×</Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addLineItem} size="sm">+ Add Line Item</Button>
      </div>

      <div className="flex items-center justify-between">
        <Label>Auto-send invoices via email</Label>
        <Switch checked={formData.auto_send_email} onCheckedChange={(v) => setFormData({ ...formData, auto_send_email: v })} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="submit" disabled={isCreating || isUpdating}>
          {isCreating || isUpdating ? "Saving..." : "Save Schedule"}
        </Button>
      </div>
    </form>
  );
}
