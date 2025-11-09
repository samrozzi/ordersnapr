import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, ExternalLink, CreditCard } from "lucide-react";
import { usePaymentSettings } from "@/hooks/use-payments";

export function StripeConnectOnboarding() {
  const { settings, isLoading } = usePaymentSettings();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // In production, this would call a Supabase Edge Function
      // that creates a Stripe Connect account link and redirects

      // For now, show instructions
      alert("In production, this would redirect to Stripe Connect onboarding.\n\nTo set up:\n1. Create Stripe Connect account\n2. Configure webhooks\n3. Set up payment methods");
    } catch (error) {
      console.error("Error connecting to Stripe:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const getStatusBadge = () => {
    if (!settings?.stripeAccountId) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }

    switch (settings.stripeAccountStatus) {
      case 'active':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'restricted':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Restricted</Badge>;
      default:
        return <Badge variant="secondary">Inactive</Badge>;
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const isConnected = settings?.stripeAccountId && settings?.stripeOnboardingCompleted;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Stripe Connect</CardTitle>
            <CardDescription>
              Accept online payments through Stripe
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <>
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                Connect your Stripe account to start accepting online payments from customers.
                Stripe handles all payment processing, security, and compliance.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">What you'll get:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                <li>• Accept credit cards, debit cards, and ACH payments</li>
                <li>• Apple Pay and Google Pay support</li>
                <li>• Automatic payment receipts</li>
                <li>• Secure payment processing with PCI compliance</li>
                <li>• Real-time payment notifications</li>
                <li>• Automatic reconciliation with your invoices</li>
              </ul>
            </div>

            <Button onClick={handleConnect} disabled={isConnecting}>
              <ExternalLink className="h-4 w-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect with Stripe"}
            </Button>
          </>
        ) : (
          <>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your Stripe account is connected and ready to accept payments.
              </AlertDescription>
            </Alert>

            {settings.stripeAccountId && (
              <div className="text-sm">
                <span className="text-muted-foreground">Account ID:</span>{' '}
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  {settings.stripeAccountId}
                </code>
              </div>
            )}

            <div className="pt-4 border-t space-y-2">
              <h4 className="font-medium">Payment Methods Enabled:</h4>
              <div className="flex flex-wrap gap-2">
                {settings.accept_credit_cards && (
                  <Badge variant="outline">Credit/Debit Cards</Badge>
                )}
                {settings.accept_ach && (
                  <Badge variant="outline">ACH Bank Transfer</Badge>
                )}
                {settings.accept_apple_pay && (
                  <Badge variant="outline">Apple Pay</Badge>
                )}
                {settings.accept_google_pay && (
                  <Badge variant="outline">Google Pay</Badge>
                )}
              </div>
            </div>

            <Button variant="outline" onClick={handleConnect}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Stripe Account
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
