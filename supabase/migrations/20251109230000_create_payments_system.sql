-- Add Stripe fields to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_account_status text CHECK (stripe_account_status IN ('pending', 'active', 'restricted', 'inactive')),
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_settings jsonb DEFAULT '{
  "accept_credit_cards": true,
  "accept_ach": false,
  "accept_apple_pay": true,
  "accept_google_pay": true,
  "currency": "usd",
  "payment_terms_days": 30,
  "late_fee_enabled": false,
  "late_fee_percentage": 0,
  "payment_instructions": null
}'::jsonb;

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  -- Stripe data
  stripe_payment_intent_id text UNIQUE,
  stripe_charge_id text,
  stripe_customer_id text,

  -- Payment details
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded', 'partially_refunded')),
  payment_method_type text, -- card, ach_debit, apple_pay, google_pay, etc.
  payment_method_last4 text,
  payment_method_brand text, -- visa, mastercard, etc.

  -- Additional data
  failure_reason text,
  failure_message text,
  receipt_url text,
  receipt_number text,

  -- Refund tracking
  refunded_amount_cents integer DEFAULT 0,
  refund_reason text,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  notes text,

  -- Timestamps
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_refunds table for tracking refunds
CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  stripe_refund_id text UNIQUE,
  amount_cents integer NOT NULL,
  reason text,
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add payment fields to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded', 'failed')),
ADD COLUMN IF NOT EXISTS paid_amount_cents integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_due_date date,
ADD COLUMN IF NOT EXISTS last_payment_reminder_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS stripe_invoice_id text;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_org_id ON public.payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON public.payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_id ON public.payment_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON public.invoices(payment_status);

-- Add updated_at triggers
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_refunds_updated_at
  BEFORE UPDATE ON public.payment_refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update invoice payment status
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  invoice_total_cents integer;
  total_paid_cents integer;
BEGIN
  -- Get invoice total
  SELECT total_amount INTO invoice_total_cents FROM public.invoices WHERE id = NEW.invoice_id;

  -- Calculate total paid for this invoice
  SELECT COALESCE(SUM(amount_cents - refunded_amount_cents), 0)
  INTO total_paid_cents
  FROM public.payments
  WHERE invoice_id = NEW.invoice_id
    AND status IN ('succeeded', 'partially_refunded');

  -- Update invoice payment status and paid amount
  UPDATE public.invoices
  SET
    paid_amount_cents = total_paid_cents,
    payment_status = CASE
      WHEN total_paid_cents = 0 THEN 'unpaid'
      WHEN total_paid_cents >= invoice_total_cents THEN 'paid'
      WHEN total_paid_cents > 0 AND total_paid_cents < invoice_total_cents THEN 'partial'
      ELSE 'unpaid'
    END,
    status = CASE
      WHEN total_paid_cents >= invoice_total_cents THEN 'paid'
      ELSE status
    END
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update invoice payment status when payment changes
CREATE TRIGGER update_invoice_on_payment_change
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NEW.status IN ('succeeded', 'partially_refunded', 'refunded'))
  EXECUTE FUNCTION update_invoice_payment_status();

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
CREATE POLICY "Organization members can view payments"
  ON public.payments
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can insert payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Organization admins can update payments"
  ON public.payments
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for payment_refunds
CREATE POLICY "Organization members can view refunds"
  ON public.payment_refunds
  FOR SELECT
  USING (
    payment_id IN (
      SELECT id FROM public.payments
      WHERE org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Organization admins can create refunds"
  ON public.payment_refunds
  FOR INSERT
  WITH CHECK (
    payment_id IN (
      SELECT id FROM public.payments
      WHERE org_id IN (
        SELECT org_id FROM public.organization_members
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
      )
    )
  );

-- Grant permissions
GRANT SELECT ON public.payments TO authenticated;
GRANT INSERT, UPDATE ON public.payments TO authenticated;
GRANT SELECT ON public.payment_refunds TO authenticated;
GRANT INSERT ON public.payment_refunds TO authenticated;

-- Create view for payment analytics
CREATE OR REPLACE VIEW public.payment_analytics AS
SELECT
  p.org_id,
  DATE_TRUNC('month', p.paid_at) as month,
  COUNT(DISTINCT p.id) as payment_count,
  COUNT(DISTINCT p.customer_id) as unique_customers,
  SUM(p.amount_cents - p.refunded_amount_cents) as net_revenue_cents,
  AVG(p.amount_cents) as avg_payment_cents,
  COUNT(DISTINCT CASE WHEN p.payment_method_type = 'card' THEN p.id END) as card_payments,
  COUNT(DISTINCT CASE WHEN p.payment_method_type = 'ach_debit' THEN p.id END) as ach_payments,
  COUNT(DISTINCT CASE WHEN p.status = 'failed' THEN p.id END) as failed_payments
FROM public.payments p
WHERE p.status IN ('succeeded', 'partially_refunded')
  AND p.paid_at IS NOT NULL
GROUP BY p.org_id, DATE_TRUNC('month', p.paid_at);

GRANT SELECT ON public.payment_analytics TO authenticated;
