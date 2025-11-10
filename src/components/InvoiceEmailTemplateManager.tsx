import { useState } from "react";
import { Plus, Pencil, Trash2, Star, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  useInvoiceEmailTemplates,
  type InvoiceEmailTemplate,
  type InvoiceEmailTemplateCreate,
} from "@/hooks/use-invoice-email-templates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function InvoiceEmailTemplateManager() {
  const {
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefaultTemplate,
    isCreating,
    isUpdating,
    isDeleting,
  } = useInvoiceEmailTemplates();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceEmailTemplate | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<InvoiceEmailTemplateCreate>({
    name: "",
    subject: "Invoice {{invoice_number}} from {{company_name}}",
    body: `Dear {{customer_name}},

Please find attached invoice {{invoice_number}} for {{total_amount}}.

Payment is due by {{due_date}}.

Thank you for your business!

Best regards,
{{company_name}}`,
    is_default: false,
    include_pdf: true,
    cc_sender: false,
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      subject: "Invoice {{invoice_number}} from {{company_name}}",
      body: `Dear {{customer_name}},

Please find attached invoice {{invoice_number}} for {{total_amount}}.

Payment is due by {{due_date}}.

Thank you for your business!

Best regards,
{{company_name}}`,
      is_default: false,
      include_pdf: true,
      cc_sender: false,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (template: InvoiceEmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      is_default: template.is_default,
      include_pdf: template.include_pdf,
      cc_sender: template.cc_sender,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await updateTemplate({ id: editingTemplate.id, updates: formData });
      } else {
        await createTemplate(formData);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to save template:", error);
    }
  };

  const handleDelete = async (id: string) => {
    setTemplateToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteTemplate(templateToDelete);
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultTemplate(id);
    } catch (error) {
      console.error("Failed to set default template:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>
              Create reusable email templates for sending invoices to customers
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No email templates yet. Create your first template to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Settings</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {template.name}
                      {template.is_default && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Default
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {template.include_pdf && (
                        <Badge variant="outline">Include PDF</Badge>
                      )}
                      {template.cc_sender && (
                        <Badge variant="outline">CC Sender</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Email Template" : "Create Email Template"}
              </DialogTitle>
              <DialogDescription>
                Use variables like {"{"}
                {"{"}invoice_number{"}"}, {"{"}
                {"{"}customer_name{"}"}, {"{"}
                {"{"}total_amount{"}"}, {"{"}
                {"{"}due_date{"}"}, {"{"}
                {"{"}company_name{"}"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Invoice Email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Invoice {{invoice_number}} from {{company_name}}"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Email Body</Label>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  rows={12}
                  placeholder="Enter email content with variables..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="include_pdf">Include PDF Attachment</Label>
                  <Switch
                    id="include_pdf"
                    checked={formData.include_pdf}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, include_pdf: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="cc_sender">CC Sender</Label>
                  <Switch
                    id="cc_sender"
                    checked={formData.cc_sender}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, cc_sender: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_default">Set as Default Template</Label>
                  <Switch
                    id="is_default"
                    checked={formData.is_default}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_default: checked })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isCreating || isUpdating || !formData.name || !formData.subject}
              >
                {isCreating || isUpdating ? "Saving..." : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Email Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this email template? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
