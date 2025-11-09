import { useState } from "react";
import { useSendCustomerEmail } from "@/hooks/use-send-customer-email";
import { useCustomerPortalTokens } from "@/hooks/use-customer-portal";
import { useInvoicePDF } from "@/hooks/use-invoice-pdf";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SendInvoiceEmailButtonProps {
  invoice: any;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function SendInvoiceEmailButton({
  invoice,
  variant = "outline",
  size = "sm",
}: SendInvoiceEmailButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(invoice.customer_email || "");
  const [recipientName, setRecipientName] = useState(invoice.customer_name || "");
  const [includePortalLink, setIncludePortalLink] = useState(true);
  const [expirationDays, setExpirationDays] = useState<string>("30");
  const [orgName, setOrgName] = useState<string>("");

  const { sendInvoiceEmail, isSendingInvoice } = useSendCustomerEmail();
  const { generateToken, getPortalUrl, tokens } = useCustomerPortalTokens(
    invoice.customer_id
  );
  const { getPDFBase64, isGenerating } = useInvoicePDF();

  // Load org name
  useState(() => {
    const loadOrgName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", profile.organization_id)
          .single();

        if (org) setOrgName(org.name);
      }
    };
    loadOrgName();
  });

  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientName) {
      return;
    }

    try {
      let portalToken: string | undefined;

      // Generate or get existing portal token if needed
      if (includePortalLink && invoice.customer_id) {
        const activeToken = tokens?.find((t) => {
          if (!t.is_active) return false;
          if (t.expires_at && new Date(t.expires_at) < new Date()) return false;
          return true;
        });

        if (activeToken) {
          portalToken = activeToken.token;
        } else {
          const expiresInDays =
            expirationDays === "never" ? undefined : parseInt(expirationDays);
          const newToken = await generateToken({
            customerId: invoice.customer_id,
            expiresInDays,
          });
          portalToken = newToken.token;
        }
      }

      // Generate PDF and convert to base64
      const pdfBase64 = await getPDFBase64(invoice);

      await sendInvoiceEmail({
        recipientEmail,
        recipientName,
        invoiceNumber: invoice.number || "Draft",
        invoiceData: {
          issue_date: invoice.issue_date || new Date().toISOString(),
          due_date: invoice.due_date,
          total_cents: invoice.total_cents,
          status: invoice.status,
        },
        portalToken,
        organizationName: orgName,
        pdfBase64,
      });

      setIsOpen(false);
    } catch (error) {
      console.error("Error sending invoice email:", error);
    }
  };

  if (!invoice.customer_email && !invoice.customer_id) {
    return null; // Can't send email without customer info
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Mail className="h-4 w-4 mr-2" />
          Email Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email Invoice</DialogTitle>
          <DialogDescription>
            Send this invoice to the customer via email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Customer Name</Label>
            <Input
              id="customer-name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-email">Customer Email</Label>
            <Input
              id="customer-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>

          {invoice.customer_id && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-portal"
                  checked={includePortalLink}
                  onCheckedChange={(checked) =>
                    setIncludePortalLink(checked as boolean)
                  }
                />
                <Label htmlFor="include-portal" className="font-normal cursor-pointer">
                  Include customer portal link
                </Label>
              </div>

              {includePortalLink && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="expiration" className="text-sm">
                    Portal Link Expiration
                  </Label>
                  <Select value={expirationDays} onValueChange={setExpirationDays}>
                    <SelectTrigger id="expiration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="never">Never expires</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="bg-muted/50 p-3 rounded-md text-sm">
            <p className="font-medium mb-1">Email will include:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Invoice number: {invoice.number || "Draft"}</li>
              <li>Amount: ${(invoice.total_cents / 100).toFixed(2)}</li>
              <li>Issue date and due date</li>
              <li>PDF invoice attachment</li>
              {includePortalLink && <li>Secure portal link to view invoice</li>}
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={isSendingInvoice || isGenerating || !recipientEmail || !recipientName}
          >
            {isSendingInvoice || isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isGenerating ? "Generating PDF..." : "Sending..."}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
