import { useState, useEffect } from "react";
import { useInvoiceSettings } from "@/hooks/use-invoice-settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export function InvoiceSettingsDialog() {
  const { settings, isLoading, updateSettings } = useInvoiceSettings();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    invoice_prefix: "INV",
    invoice_number_padding: 4,
    default_payment_terms_days: 30,
    default_terms: "Payment due within 30 days",
    default_notes: "",
    default_tax_rate: 0,
    tax_label: "Tax",
    send_copy_to_sender: true,
    auto_send_reminders: false,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        invoice_prefix: settings.invoice_prefix,
        invoice_number_padding: settings.invoice_number_padding,
        default_payment_terms_days: settings.default_payment_terms_days,
        default_terms: settings.default_terms || "",
        default_notes: settings.default_notes || "",
        default_tax_rate: settings.default_tax_rate,
        tax_label: settings.tax_label,
        send_copy_to_sender: settings.send_copy_to_sender,
        auto_send_reminders: settings.auto_send_reminders,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings(formData);
      setOpen(false);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Invoice Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Settings</DialogTitle>
          <DialogDescription>
            Configure default settings for all invoices in your organization
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="numbering" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="numbering">Numbering</TabsTrigger>
            <TabsTrigger value="defaults">Defaults</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="numbering" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prefix">Invoice Number Prefix</Label>
              <Input
                id="prefix"
                value={formData.invoice_prefix}
                onChange={(e) =>
                  setFormData({ ...formData, invoice_prefix: e.target.value.toUpperCase() })
                }
                placeholder="INV"
              />
              <p className="text-sm text-muted-foreground">
                Format: {formData.invoice_prefix}-
                {"0".repeat(formData.invoice_number_padding - 1)}1
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="padding">Number Padding</Label>
              <Input
                id="padding"
                type="number"
                min="1"
                max="10"
                value={formData.invoice_number_padding}
                onChange={(e) =>
                  setFormData({ ...formData, invoice_number_padding: parseInt(e.target.value) || 4 })
                }
              />
              <p className="text-sm text-muted-foreground">
                Number of digits with leading zeros (e.g., 4 = 0001)
              </p>
            </div>

            {settings && (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm font-medium mb-1">Next Invoice Number</p>
                <p className="text-2xl font-bold">
                  {formData.invoice_prefix}-
                  {settings.next_invoice_number.toString().padStart(formData.invoice_number_padding, "0")}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="defaults" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Default Payment Terms (Days)</Label>
              <Input
                id="payment_terms"
                type="number"
                value={formData.default_payment_terms_days}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_payment_terms_days: parseInt(e.target.value) || 30,
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Due date will be set to this many days from invoice date
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms_text">Default Terms Text</Label>
              <Textarea
                id="terms_text"
                value={formData.default_terms}
                onChange={(e) => setFormData({ ...formData, default_terms: e.target.value })}
                placeholder="e.g., Payment due within 30 days"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_notes">Default Notes</Label>
              <Textarea
                id="default_notes"
                value={formData.default_notes}
                onChange={(e) => setFormData({ ...formData, default_notes: e.target.value })}
                placeholder="Default notes to appear on all invoices"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_rate">Default Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  value={formData.default_tax_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, default_tax_rate: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_label">Tax Label</Label>
                <Input
                  id="tax_label"
                  value={formData.tax_label}
                  onChange={(e) => setFormData({ ...formData, tax_label: e.target.value })}
                  placeholder="e.g., Tax, VAT, GST"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send Copy to Sender</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a copy of invoices you send
                </p>
              </div>
              <Switch
                checked={formData.send_copy_to_sender}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, send_copy_to_sender: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Send Payment Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send payment reminders for overdue invoices
                </p>
              </div>
              <Switch
                checked={formData.auto_send_reminders}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, auto_send_reminders: checked })
                }
              />
            </div>

            {formData.auto_send_reminders && (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Reminders will be sent 7, 14, and 30 days after the due date if the invoice is still unpaid.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
