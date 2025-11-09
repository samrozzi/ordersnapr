import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Mail, Clock } from "lucide-react";
import { usePaymentReminders } from "@/hooks/use-payment-reminders";
import { format } from "date-fns";
import type { Invoice } from "@/hooks/use-invoices";

interface SendPaymentReminderButtonProps {
  invoice: Invoice;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function SendPaymentReminderButton({
  invoice,
  variant = "outline",
  size = "sm",
}: SendPaymentReminderButtonProps) {
  const { sendReminder, isSending, reminders } = usePaymentReminders(invoice.id);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  // Get customer email from invoice
  const customerEmail = invoice.customer_id ? (invoice as any).customer?.email : null;

  const handleSend = async () => {
    if (!email) return;

    try {
      await sendReminder({
        invoiceId: invoice.id,
        recipientEmail: email,
        reminderType: 'custom',
      });
      setOpen(false);
    } catch (error) {
      console.error("Error sending reminder:", error);
    }
  };

  const isOverdue = () => {
    if (!invoice.payment_due_date && !invoice.due_date) return false;
    const dueDate = invoice.payment_due_date || invoice.due_date;
    return dueDate ? new Date(dueDate) < new Date() : false;
  };

  const lastReminder = invoice.last_payment_reminder_sent_at
    ? new Date(invoice.last_payment_reminder_sent_at)
    : null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => {
          setEmail(customerEmail || "");
          setOpen(true);
        }}
        disabled={!customerEmail}
      >
        <Bell className="h-4 w-4 mr-2" />
        Send Reminder
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Payment Reminder</DialogTitle>
            <DialogDescription>
              Send a payment reminder email to the customer for Invoice {invoice.number || invoice.invoice_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Invoice Info */}
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="text-sm font-medium">Invoice Details</div>
                  <div className="text-xs space-y-0.5">
                    <div>Amount: ${((invoice.total_cents || 0) / 100).toFixed(2)}</div>
                    {(invoice.payment_due_date || invoice.due_date) && (
                      <div>
                        Due: {format(new Date(invoice.payment_due_date || invoice.due_date!), "MMM d, yyyy")}
                        {isOverdue() && <span className="text-destructive ml-2 font-semibold">(Overdue)</span>}
                      </div>
                    )}
                    {invoice.paid_amount_cents > 0 && (
                      <div>
                        Paid: ${(invoice.paid_amount_cents / 100).toFixed(2)} |
                        Balance: ${((invoice.total_cents - invoice.paid_amount_cents) / 100).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Last Reminder Info */}
            {lastReminder && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last reminder sent: {format(lastReminder, "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Email Preview</Label>
              <div className="border rounded-lg p-4 bg-muted/50 text-sm space-y-2">
                <div className="font-semibold">
                  Subject: Payment Reminder - Invoice {invoice.number || invoice.invoice_number}
                </div>
                <div className="text-muted-foreground">
                  <p>Dear Customer,</p>
                  <p className="mt-2">
                    This is a friendly reminder that Invoice {invoice.number || invoice.invoice_number}
                    {isOverdue() ? " is now overdue" : " is due soon"}.
                  </p>
                  <p className="mt-2">
                    Amount Due: ${(((invoice.total_cents || 0) - (invoice.paid_amount_cents || 0)) / 100).toFixed(2)}
                  </p>
                  {(invoice.payment_due_date || invoice.due_date) && (
                    <p>
                      Due Date: {format(new Date(invoice.payment_due_date || invoice.due_date!), "MMMM d, yyyy")}
                    </p>
                  )}
                  <p className="mt-2">
                    Please make your payment at your earliest convenience.
                  </p>
                  <p className="mt-2">Thank you!</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                In production, this email would include a direct payment link and your organization's branding.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !email}
            >
              {isSending ? "Sending..." : "Send Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
