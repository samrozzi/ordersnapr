-- Create payment_reminders table for tracking reminder history
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('before_due', 'on_due', 'after_due', 'custom')),
  days_relative integer, -- negative for before, 0 for on due date, positive for after
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid REFERENCES public.profiles(id),
  recipient_email text NOT NULL,
  email_subject text,
  email_body text,
  email_status text DEFAULT 'sent' CHECK (email_status IN ('sent', 'delivered', 'failed', 'bounced')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add reminder settings to organizations payment_settings
COMMENT ON COLUMN public.organizations.payment_settings IS 'Payment configuration including:
- accept_credit_cards, accept_ach, accept_apple_pay, accept_google_pay
- currency, payment_terms_days
- late_fee_enabled, late_fee_percentage
- payment_instructions
- auto_reminders_enabled
- reminder_schedule (days before/after due date)
- reminder_email_template';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice ON public.payment_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_org ON public.payment_reminders(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at ON public.payment_reminders(sent_at);

-- Enable RLS
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organization members can view reminders"
  ON public.payment_reminders
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can insert reminders"
  ON public.payment_reminders
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Grant permissions
GRANT SELECT ON public.payment_reminders TO authenticated;
GRANT INSERT ON public.payment_reminders TO authenticated;

-- Function to get overdue invoices for reminders
CREATE OR REPLACE FUNCTION get_invoices_needing_reminders(
  org_id_param uuid,
  days_threshold integer DEFAULT 7
)
RETURNS TABLE (
  invoice_id uuid,
  customer_email text,
  customer_name text,
  invoice_number text,
  total_cents integer,
  due_date date,
  days_overdue integer,
  last_reminder_sent_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id as invoice_id,
    c.email as customer_email,
    c.name as customer_name,
    i.number as invoice_number,
    i.total_cents,
    i.payment_due_date::date as due_date,
    (CURRENT_DATE - i.payment_due_date::date) as days_overdue,
    (
      SELECT MAX(pr.sent_at)
      FROM public.payment_reminders pr
      WHERE pr.invoice_id = i.id
    ) as last_reminder_sent_at
  FROM public.invoices i
  JOIN public.customers c ON i.customer_id = c.id
  WHERE i.org_id = org_id_param
    AND i.payment_status IN ('unpaid', 'partial')
    AND i.payment_due_date IS NOT NULL
    AND i.payment_due_date::date < CURRENT_DATE
    AND c.email IS NOT NULL
    AND (
      -- No reminder sent yet
      NOT EXISTS (
        SELECT 1 FROM public.payment_reminders pr
        WHERE pr.invoice_id = i.id
      )
      OR
      -- Last reminder was sent more than days_threshold ago
      (
        SELECT MAX(pr.sent_at)
        FROM public.payment_reminders pr
        WHERE pr.invoice_id = i.id
      ) < (now() - (days_threshold || ' days')::interval)
    )
  ORDER BY i.payment_due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get upcoming due invoices for pre-due reminders
CREATE OR REPLACE FUNCTION get_invoices_approaching_due(
  org_id_param uuid,
  days_before integer DEFAULT 3
)
RETURNS TABLE (
  invoice_id uuid,
  customer_email text,
  customer_name text,
  invoice_number text,
  total_cents integer,
  due_date date,
  days_until_due integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id as invoice_id,
    c.email as customer_email,
    c.name as customer_name,
    i.number as invoice_number,
    i.total_cents,
    i.payment_due_date::date as due_date,
    (i.payment_due_date::date - CURRENT_DATE) as days_until_due
  FROM public.invoices i
  JOIN public.customers c ON i.customer_id = c.id
  WHERE i.org_id = org_id_param
    AND i.payment_status IN ('unpaid', 'partial')
    AND i.payment_due_date IS NOT NULL
    AND i.payment_due_date::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + days_before)
    AND c.email IS NOT NULL
    AND NOT EXISTS (
      -- Don't send if we already sent a before_due reminder
      SELECT 1 FROM public.payment_reminders pr
      WHERE pr.invoice_id = i.id
        AND pr.reminder_type = 'before_due'
    )
  ORDER BY i.payment_due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
