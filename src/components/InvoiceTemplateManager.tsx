import { useState } from "react";
import { useInvoiceTemplates } from "@/hooks/use-invoice-templates";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, Star, Pencil, Trash2, FileText } from "lucide-react";
import type { InvoiceTemplate } from "@/hooks/use-invoice-templates";
import type { InvoiceLineItem } from "@/hooks/use-invoices";

interface TemplateFormData {
  name: string;
  description: string;
  line_items: InvoiceLineItem[];
  payment_terms_days: number;
  terms: string;
  notes: string;
  tax_rate: number;
}

export function InvoiceTemplateManager() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, setDefaultTemplate } =
    useInvoiceTemplates();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    description: "",
    line_items: [],
    payment_terms_days: 30,
    terms: "Payment due within 30 days",
    notes: "",
    tax_rate: 0,
  });

  const [lineItemInput, setLineItemInput] = useState({
    description: "",
    quantity: 1,
    rate_cents: 0,
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      line_items: [],
      payment_terms_days: 30,
      terms: "Payment due within 30 days",
      notes: "",
      tax_rate: 0,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (template: InvoiceTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      line_items: template.line_items,
      payment_terms_days: template.payment_terms_days,
      terms: template.terms || "",
      notes: template.notes || "",
      tax_rate: template.tax_rate,
    });
    setIsDialogOpen(true);
  };

  const handleAddLineItem = () => {
    if (!lineItemInput.description) return;

    const newLineItem: InvoiceLineItem = {
      description: lineItemInput.description,
      quantity: lineItemInput.quantity,
      rate_cents: lineItemInput.rate_cents * 100, // Convert to cents
      amount_cents: lineItemInput.quantity * lineItemInput.rate_cents * 100,
    };

    setFormData({
      ...formData,
      line_items: [...formData.line_items, newLineItem],
    });

    setLineItemInput({
      description: "",
      quantity: 1,
      rate_cents: 0,
    });
  };

  const handleRemoveLineItem = (index: number) => {
    setFormData({
      ...formData,
      line_items: formData.line_items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingTemplate) {
        await updateTemplate({
          id: editingTemplate.id,
          updates: formData,
        });
      } else {
        await createTemplate(formData);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      try {
        await deleteTemplate(id);
      } catch (error) {
        console.error("Error deleting template:", error);
      }
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultTemplate(id);
    } catch (error) {
      console.error("Error setting default template:", error);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Invoice Templates</CardTitle>
            <CardDescription>
              Create reusable templates with default line items and settings
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading templates...</p>
        ) : templates.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No templates yet</p>
            <Button onClick={handleOpenCreate} variant="outline">
              Create Your First Template
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Line Items</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {template.name}
                      {template.is_default && (
                        <Badge variant="secondary">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {template.description || "-"}
                  </TableCell>
                  <TableCell>{template.line_items.length} items</TableCell>
                  <TableCell>Net {template.payment_terms_days} days</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(template)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {!template.is_default && (
                          <DropdownMenuItem onClick={() => handleSetDefault(template.id)}>
                            <Star className="h-4 w-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(template.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Template Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Create Template"}
              </DialogTitle>
              <DialogDescription>
                Templates help you quickly create invoices with predefined items and settings
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Template Info */}
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Service Invoice"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this template"
                />
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <Label>Default Line Items</Label>
                {formData.line_items.length > 0 && (
                  <div className="border rounded-md p-4 space-y-2">
                    {formData.line_items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex-1">
                          <p className="font-medium">{item.description}</p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity} × {formatCurrency(item.rate_cents)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{formatCurrency(item.amount_cents)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveLineItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Item description"
                    value={lineItemInput.description}
                    onChange={(e) =>
                      setLineItemInput({ ...lineItemInput, description: e.target.value })
                    }
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={lineItemInput.quantity}
                    onChange={(e) =>
                      setLineItemInput({ ...lineItemInput, quantity: parseInt(e.target.value) || 1 })
                    }
                    className="w-20"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Rate"
                    value={lineItemInput.rate_cents}
                    onChange={(e) =>
                      setLineItemInput({ ...lineItemInput, rate_cents: parseFloat(e.target.value) || 0 })
                    }
                    className="w-32"
                  />
                  <Button type="button" onClick={handleAddLineItem}>Add</Button>
                </div>
              </div>

              {/* Payment Terms */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_terms_days">Payment Terms (Days)</Label>
                  <Input
                    id="payment_terms_days"
                    type="number"
                    value={formData.payment_terms_days}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 30 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              {/* Terms and Notes */}
              <div className="space-y-2">
                <Label htmlFor="terms">Payment Terms Text</Label>
                <Textarea
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="e.g., Payment due within 30 days"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Default Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any default notes for invoices using this template"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.name}>
                {editingTemplate ? "Update Template" : "Create Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
