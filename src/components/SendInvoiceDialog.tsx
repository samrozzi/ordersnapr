import { useState, useEffect } from "react";
import { Send, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useInvoiceEmailTemplates } from "@/hooks/use-invoice-email-templates";
import { useSendInvoiceEmail } from "@/hooks/use-send-invoice-email";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SendInvoiceDialogProps {
  invoice: any; // Replace with proper Invoice type
  trigger?: React.ReactNode;
}

export function SendInvoiceDialog({ invoice, trigger }: SendInvoiceDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { templates, defaultTemplate, renderTemplate } = useInvoiceEmailTemplates();
  const { sendEmail, isSending } = useSendInvoiceEmail();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [includePdf, setIncludePdf] = useState(true);
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewBody, setPreviewBody] = useState("");

  // Initialize with default template or customer email when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTo(invoice.customer?.email || "");

      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
        setSubject(defaultTemplate.subject);
        setBody(defaultTemplate.body);
        setIncludePdf(defaultTemplate.include_pdf);
      } else {
        setSubject(`Invoice ${invoice.number} from ${invoice.organization?.name || "OrderSnapr"}`);
        setBody(`Dear ${invoice.customer?.name || "Customer"},\n\nPlease find attached invoice ${invoice.number}.\n\nThank you for your business!`);
      }
    }
  }, [isOpen, defaultTemplate, invoice]);

  // Update preview when subject or body changes
  useEffect(() => {
    if (subject && body && invoice.id) {
      renderPreview();
    }
  }, [subject, body, invoice.id]);

  const renderPreview = async () => {
    try {
      const renderedSubject = await renderTemplate({
        templateText: subject,
        invoiceId: invoice.id,
      });
      const renderedBody = await renderTemplate({
        templateText: body,
        invoiceId: invoice.id,
      });
      setPreviewSubject(renderedSubject);
      setPreviewBody(renderedBody);
    } catch (error) {
      console.error("Failed to render preview:", error);
      setPreviewSubject(subject);
      setPreviewBody(body);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      setIncludePdf(template.include_pdf);
    }
  };

  const handleSend = async () => {
    if (!to || !subject || !body) return;

    try {
      await sendEmail({
        invoiceId: invoice.id,
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        body,
        templateId: selectedTemplateId || undefined,
        includePdf,
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Send Invoice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Invoice {invoice.number}</DialogTitle>
          <DialogDescription>
            Compose and send invoice email to {invoice.customer?.name || "customer"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4">
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="template">Email Template</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Select a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        {template.is_default && " (Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="to">To *</Label>
              <Input
                id="to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="customer@example.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cc">CC</Label>
                <Input
                  id="cc"
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bcc">BCC</Label>
                <Input
                  id="bcc"
                  type="email"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Invoice subject"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message *</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                placeholder="Email message body"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="includePdf">Attach PDF Invoice</Label>
              <Switch
                id="includePdf"
                checked={includePdf}
                onCheckedChange={setIncludePdf}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Available variables:</p>
              <p>
                {"{"}
                {"{"}invoice_number{"}"}, {"{"}
                {"{"}customer_name{"}"}, {"{"}
                {"{"}total_amount{"}"}, {"{"}
                {"{"}due_date{"}"}, {"{"}
                {"{"}company_name{"}"}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="space-y-2">
              <Label>To</Label>
              <div className="p-3 bg-muted rounded-md">{to || "Not specified"}</div>
            </div>

            {cc && (
              <div className="space-y-2">
                <Label>CC</Label>
                <div className="p-3 bg-muted rounded-md">{cc}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Subject</Label>
              <div className="p-3 bg-muted rounded-md font-medium">
                {previewSubject || subject}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <div className="p-4 bg-muted rounded-md whitespace-pre-wrap min-h-[200px]">
                {previewBody || body}
              </div>
            </div>

            {includePdf && (
              <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="p-3 bg-muted rounded-md flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>Invoice_{invoice.number}.pdf</span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !to || !subject || !body}>
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : "Send Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
