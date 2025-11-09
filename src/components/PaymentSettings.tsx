import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaymentSettings } from "@/hooks/use-payments";
import { StripeConnectOnboarding } from "./StripeConnectOnboarding";
import { Separator } from "@/components/ui/separator";

export function PaymentSettings() {
  const { settings, updateSettings } = usePaymentSettings();
  const [isSaving, setIsSaving] = useState(false);

  const [acceptCreditCards, setAcceptCreditCards] = useState(settings?.accept_credit_cards ?? true);
  const [acceptACH, setAcceptACH] = useState(settings?.accept_ach ?? false);
  const [acceptApplePay, setAcceptApplePay] = useState(settings?.accept_apple_pay ?? true);
  const [acceptGooglePay, setAcceptGooglePay] = useState(settings?.accept_google_pay ?? true);
  const [currency, setCurrency] = useState(settings?.currency ?? 'usd');
  const [paymentTermsDays, setPaymentTermsDays] = useState(settings?.payment_terms_days ?? 30);
  const [lateFeeEnabled, setLateFeeEnabled] = useState(settings?.late_fee_enabled ?? false);
  const [lateFeePercentage, setLateFeePercentage] = useState(settings?.late_fee_percentage ?? 0);
  const [paymentInstructions, setPaymentInstructions] = useState(settings?.payment_instructions ?? '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        accept_credit_cards: acceptCreditCards,
        accept_ach: acceptACH,
        accept_apple_pay: acceptApplePay,
        accept_google_pay: acceptGooglePay,
        currency,
        payment_terms_days: paymentTermsDays,
        late_fee_enabled: lateFeeEnabled,
        late_fee_percentage: lateFeePercentage,
        payment_instructions: paymentInstructions || null,
      });
    } catch (error) {
      console.error("Error saving payment settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stripe Connect */}
      <StripeConnectOnboarding />

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Choose which payment methods to accept from customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Credit & Debit Cards</Label>
              <p className="text-sm text-muted-foreground">
                Visa, Mastercard, American Express, Discover
              </p>
            </div>
            <Switch
              checked={acceptCreditCards}
              onCheckedChange={setAcceptCreditCards}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>ACH Bank Transfer</Label>
              <p className="text-sm text-muted-foreground">
                Direct bank account payments (lower fees)
              </p>
            </div>
            <Switch
              checked={acceptACH}
              onCheckedChange={setAcceptACH}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Apple Pay</Label>
              <p className="text-sm text-muted-foreground">
                Fast checkout with Apple Pay
              </p>
            </div>
            <Switch
              checked={acceptApplePay}
              onCheckedChange={setAcceptApplePay}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Google Pay</Label>
              <p className="text-sm text-muted-foreground">
                Fast checkout with Google Pay
              </p>
            </div>
            <Switch
              checked={acceptGooglePay}
              onCheckedChange={setAcceptGooglePay}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Terms</CardTitle>
          <CardDescription>
            Default payment terms for new invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD - US Dollar</SelectItem>
                  <SelectItem value="cad">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="eur">EUR - Euro</SelectItem>
                  <SelectItem value="gbp">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-terms">Default Payment Terms</Label>
              <Select
                value={paymentTermsDays.toString()}
                onValueChange={(val) => setPaymentTermsDays(parseInt(val))}
              >
                <SelectTrigger id="payment-terms">
                  <SelectValue placeholder="Select terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Due on receipt</SelectItem>
                  <SelectItem value="7">Net 7 days</SelectItem>
                  <SelectItem value="15">Net 15 days</SelectItem>
                  <SelectItem value="30">Net 30 days</SelectItem>
                  <SelectItem value="45">Net 45 days</SelectItem>
                  <SelectItem value="60">Net 60 days</SelectItem>
                  <SelectItem value="90">Net 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-instructions">Payment Instructions (Optional)</Label>
            <Textarea
              id="payment-instructions"
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Add instructions for customers about how to pay (e.g., wire transfer details, check mailing address)..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              These instructions will appear on invoices and payment pages
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Late Fees */}
      <Card>
        <CardHeader>
          <CardTitle>Late Fees</CardTitle>
          <CardDescription>
            Automatically apply late fees to overdue invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Late Fees</Label>
              <p className="text-sm text-muted-foreground">
                Charge customers for late payments
              </p>
            </div>
            <Switch
              checked={lateFeeEnabled}
              onCheckedChange={setLateFeeEnabled}
            />
          </div>

          {lateFeeEnabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="late-fee">Late Fee Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="late-fee"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={lateFeePercentage}
                    onChange={(e) => setLateFeePercentage(parseFloat(e.target.value) || 0)}
                    className="max-w-[120px]"
                  />
                  <span className="text-sm text-muted-foreground">% of invoice total</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This fee will be added to invoices that are past due
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
