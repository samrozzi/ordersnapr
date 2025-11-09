import { useState } from "react";
import { useSendCustomerEmail } from "@/hooks/use-send-customer-email";
import { useCustomerPortalTokens } from "@/hooks/use-customer-portal";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SendPortalLinkEmailButtonProps {
  customerId: string;
  customerName: string;
  customerEmail?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function SendPortalLinkEmailButton({
  customerId,
  customerName,
  customerEmail,
  variant = "outline",
  size = "sm",
}: SendPortalLinkEmailButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(customerEmail || "");
  const [customMessage, setCustomMessage] = useState("");
  const [expirationDays, setExpirationDays] = useState<string>("30");
  const [orgName, setOrgName] = useState<string>("");

  const { sendPortalLinkEmail, isSendingPortalLink } = useSendCustomerEmail();
  const { generateToken, tokens } = useCustomerPortalTokens(customerId);

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
    if (!recipientEmail) {
      return;
    }

    try {
      // Check for existing active token
      const activeToken = tokens?.find((t) => {
        if (!t.is_active) return false;
        if (t.expires_at && new Date(t.expires_at) < new Date()) return false;
        return true;
      });

      let portalToken: string;

      if (activeToken) {
        portalToken = activeToken.token;
      } else {
        const expiresInDays =
          expirationDays === "never" ? undefined : parseInt(expirationDays);
        const newToken = await generateToken({
          customerId,
          expiresInDays,
        });
        portalToken = newToken.token;
      }

      await sendPortalLinkEmail({
        recipientEmail,
        recipientName: customerName,
        portalToken,
        organizationName: orgName,
        message: customMessage || undefined,
      });

      setIsOpen(false);
      setCustomMessage("");
    } catch (error) {
      console.error("Error sending portal link email:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Mail className="h-4 w-4 mr-2" />
          Email Portal Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email Customer Portal Link</DialogTitle>
          <DialogDescription>
            Send a secure portal access link to {customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Customer Email</Label>
            <Input
              id="email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Textarea
              id="message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal message to include in the email..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiration">Portal Link Expiration</Label>
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

          <div className="bg-muted/50 p-3 rounded-md text-sm">
            <p className="font-medium mb-1">Email will include:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Secure portal access link</li>
              <li>Information about what they can view</li>
              <li>No password required - one-click access</li>
              {customMessage && <li>Your custom message</li>}
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={isSendingPortalLink || !recipientEmail}
          >
            {isSendingPortalLink ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
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
