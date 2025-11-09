import { useState } from "react";
import { useCustomerPortalTokens } from "@/hooks/use-customer-portal";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SharePortalLinkButtonProps {
  customerId: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
}

export function SharePortalLinkButton({
  customerId,
  variant = "outline",
  size = "sm",
  showIcon = true,
}: SharePortalLinkButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expirationDays, setExpirationDays] = useState<string>("30");
  const [isGenerating, setIsGenerating] = useState(false);

  const { tokens, generateToken, getPortalUrl } = useCustomerPortalTokens(customerId);

  // Get the most recent active token
  const activeToken = tokens?.find((t) => {
    if (!t.is_active) return false;
    if (t.expires_at && new Date(t.expires_at) < new Date()) return false;
    return true;
  });

  const handleGenerateAndCopy = async () => {
    setIsGenerating(true);
    try {
      const expiresInDays = expirationDays === "never" ? undefined : parseInt(expirationDays);
      const newToken = await generateToken({ customerId, expiresInDays });
      const url = getPortalUrl(newToken.token);
      await navigator.clipboard.writeText(url);
      toast.success("Portal link generated and copied to clipboard!");
      setIsOpen(false);
    } catch (error) {
      console.error("Error generating portal link:", error);
      toast.error("Failed to generate portal link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyExisting = async () => {
    if (activeToken) {
      const url = getPortalUrl(activeToken.token);
      await navigator.clipboard.writeText(url);
      toast.success("Portal link copied to clipboard!");
      setIsOpen(false);
    }
  };

  const handleOpenExisting = () => {
    if (activeToken) {
      const url = getPortalUrl(activeToken.token);
      window.open(url, "_blank");
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant={variant} size={size}>
          {showIcon && <ExternalLink className="h-4 w-4 mr-2" />}
          Share Portal Link
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">Customer Portal Link</h4>
            <p className="text-sm text-muted-foreground">
              Share a secure link for this customer to view their work orders and invoices.
            </p>
          </div>

          {activeToken ? (
            <div className="space-y-2">
              <div className="p-3 border rounded-md bg-muted/50">
                <p className="text-sm font-medium mb-1">Active Link Available</p>
                <p className="text-xs text-muted-foreground">
                  {activeToken.expires_at
                    ? `Expires: ${new Date(activeToken.expires_at).toLocaleDateString()}`
                    : "Never expires"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyExisting}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenExisting}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-popover px-2 text-muted-foreground">
                    Or create new
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="expiration">Link Expiration</Label>
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

          <Button
            onClick={handleGenerateAndCopy}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                {activeToken ? "Generate New Link" : "Generate & Copy Link"}
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
