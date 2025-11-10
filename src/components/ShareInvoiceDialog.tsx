import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useInvoicePublicLinks } from "@/hooks/use-public-invoice-links";
import { Copy, Check, ExternalLink } from "lucide-react";

interface ShareInvoiceDialogProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareInvoiceDialog({ invoice, isOpen, onClose }: ShareInvoiceDialogProps) {
  const { generateLink, getPublicUrl, isGenerating } = useInvoicePublicLinks();
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    expiresInDays: 30,
    maxViews: 0,
    allowPayment: true,
  });

  const handleGenerate = async () => {
    try {
      const token = await generateLink({
        invoiceId: invoice.id,
        expiresInDays: settings.expiresInDays > 0 ? settings.expiresInDays : undefined,
        maxViews: settings.maxViews > 0 ? settings.maxViews : undefined,
      });

      const url = getPublicUrl(token);
      setShareUrl(url);
    } catch (error) {
      console.error("Failed to generate link:", error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Invoice {invoice.number}</DialogTitle>
          <DialogDescription>
            Generate a secure link to share this invoice with your customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Expires In (Days)</Label>
            <Input
              type="number"
              value={settings.expiresInDays}
              onChange={(e) => setSettings({ ...settings, expiresInDays: parseInt(e.target.value) || 0 })}
              placeholder="0 = Never expires"
            />
            <p className="text-xs text-muted-foreground">
              Set to 0 for a link that never expires
            </p>
          </div>

          <div className="space-y-2">
            <Label>Maximum Views</Label>
            <Input
              type="number"
              value={settings.maxViews}
              onChange={(e) => setSettings({ ...settings, maxViews: parseInt(e.target.value) || 0 })}
              placeholder="0 = Unlimited"
            />
            <p className="text-xs text-muted-foreground">
              Set to 0 for unlimited views
            </p>
          </div>

          {!shareUrl && (
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? "Generating..." : "Generate Shareable Link"}
            </Button>
          )}

          {shareUrl && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Shareable Link</Label>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="font-mono text-sm" />
                  <Button size="icon" variant="outline" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(shareUrl, "_blank")}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Link
                </Button>
                <Button onClick={handleGenerate} variant="outline" className="flex-1">
                  Generate New Link
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
