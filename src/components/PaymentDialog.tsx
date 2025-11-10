import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStripePayment } from "@/hooks/use-stripe-payment";
import { CheckCircle, CreditCard } from "lucide-react";

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

export function PaymentDialog({ isOpen, onClose, invoice }: PaymentDialogProps) {
  const { createPaymentIntent, confirmPayment, isCreating, isConfirming } = useStripePayment();
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [cardData, setCardData] = useState({
    number: "",
    expiry: "",
    cvc: "",
    email: invoice.customer?.email || "",
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const paymentIntent = await createPaymentIntent({
        invoiceId: invoice.id,
        amountCents: invoice.total_cents,
        customerEmail: cardData.email,
      });

      await confirmPayment({
        paymentIntentId: paymentIntent.id,
        stripePaymentIntentId: "pi_mock_" + Date.now(),
        paymentMethodLast4: cardData.number.slice(-4),
        paymentMethodBrand: "visa",
      });

      setPaymentSuccess(true);

      setTimeout(() => {
        onClose();
        setPaymentSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Payment error:", error);
    }
  };

  if (paymentSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground">
              Thank you for your payment. A receipt has been sent to your email.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Invoice {invoice.number}</DialogTitle>
          <DialogDescription>
            Amount due: {formatCurrency(invoice.total_cents)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handlePayment} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={cardData.email}
              onChange={(e) => setCardData({ ...cardData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Card Number</Label>
            <div className="relative">
              <Input
                type="text"
                placeholder="4242 4242 4242 4242"
                value={cardData.number}
                onChange={(e) => setCardData({ ...cardData, number: e.target.value.replace(/\s/g, "").slice(0, 16) })}
                maxLength={16}
                required
              />
              <CreditCard className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Test card: 4242 4242 4242 4242</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expiry (MM/YY)</Label>
              <Input
                type="text"
                placeholder="12/25"
                value={cardData.expiry}
                onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                maxLength={5}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>CVC</Label>
              <Input
                type="text"
                placeholder="123"
                value={cardData.cvc}
                onChange={(e) => setCardData({ ...cardData, cvc: e.target.value })}
                maxLength={4}
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" disabled={isCreating || isConfirming}>
              {isCreating || isConfirming ? "Processing..." : `Pay ${formatCurrency(invoice.total_cents)}`}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Powered by Stripe • Secure payment processing
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
