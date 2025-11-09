import { useState, useEffect } from "react";
import { useCustomerPortalTokens } from "@/hooks/use-customer-portal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, Copy, Plus, Trash2, Ban, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { SendPortalLinkEmailButton } from "@/components/SendPortalLinkEmailButton";
import { supabase } from "@/integrations/supabase/client";

interface PortalLinkManagerProps {
  customerId: string;
  customerName: string;
}

export function PortalLinkManager({ customerId, customerName }: PortalLinkManagerProps) {
  const { tokens, isLoading, generateToken, deactivateToken, deleteToken, getPortalUrl } =
    useCustomerPortalTokens(customerId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expirationDays, setExpirationDays] = useState<string>("never");
  const [customerEmail, setCustomerEmail] = useState<string>("");

  useEffect(() => {
    const fetchCustomerEmail = async () => {
      const { data } = await supabase
        .from("customers")
        .select("email")
        .eq("id", customerId)
        .single();

      if (data?.email) {
        setCustomerEmail(data.email);
      }
    };
    fetchCustomerEmail();
  }, [customerId]);

  const handleGenerateToken = async () => {
    try {
      const expiresInDays = expirationDays === "never" ? undefined : parseInt(expirationDays);
      await generateToken({ customerId, expiresInDays });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error generating token:", error);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = getPortalUrl(token);
    navigator.clipboard.writeText(url);
    toast.success("Portal link copied to clipboard");
  };

  const handleOpenLink = (token: string) => {
    const url = getPortalUrl(token);
    window.open(url, "_blank");
  };

  const handleDeactivate = async (tokenId: string) => {
    if (confirm("Are you sure you want to revoke this portal link?")) {
      await deactivateToken(tokenId);
    }
  };

  const handleDelete = async (tokenId: string) => {
    if (confirm("Are you sure you want to delete this portal link? This action cannot be undone.")) {
      await deleteToken(tokenId);
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Customer Portal Access</CardTitle>
            <CardDescription>
              Manage portal links for {customerName}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {customerEmail && (
              <SendPortalLinkEmailButton
                customerId={customerId}
                customerName={customerName}
                customerEmail={customerEmail}
                size="sm"
              />
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Link
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Portal Link</DialogTitle>
                <DialogDescription>
                  Create a secure link for {customerName} to access their work orders and invoices.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
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
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateToken}>
                  Generate Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading portal links...
          </div>
        ) : !tokens || tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No portal links generated yet.</p>
            <p className="text-sm mt-2">Click "Generate Link" to create one.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Last Accessed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => {
                  const expired = isExpired(token.expires_at);
                  return (
                    <TableRow key={token.id}>
                      <TableCell className="text-sm">
                        {format(new Date(token.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {token.expires_at
                          ? format(new Date(token.expires_at), "MMM d, yyyy")
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {token.last_accessed_at
                          ? format(new Date(token.last_accessed_at), "MMM d, h:mm a")
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {!token.is_active ? (
                          <Badge variant="destructive">Revoked</Badge>
                        ) : expired ? (
                          <Badge variant="outline">Expired</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {token.is_active && !expired && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyLink(token.token)}
                                title="Copy link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenLink(token.token)}
                                title="Open in new tab"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeactivate(token.id)}
                                title="Revoke access"
                              >
                                <Ban className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(token.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
