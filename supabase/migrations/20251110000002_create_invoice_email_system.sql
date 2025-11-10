-- Invoice Email Templates Table
CREATE TABLE IF NOT EXISTS public.invoice_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT 'Invoice {{invoice_number}} from {{company_name}}',
  body text NOT NULL DEFAULT 'Dear {{customer_name}},

Please find attached invoice {{invoice_number}} for {{total_amount}}.

Payment is due by {{due_date}}.

Thank you for your business!

Best regards,
{{company_name}}',
  is_default boolean DEFAULT false,
  include_pdf boolean DEFAULT true,
  cc_sender boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invoice Emails Tracking Table
CREATE TABLE IF NOT EXISTS public.invoice_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.invoice_email_templates(id) ON DELETE SET NULL,
  sent_to text NOT NULL,
  cc text,
  bcc text,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  sent_at timestamptz,
  opened_at timestamptz,
  error_message text,
  sent_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_email_templates_org_id ON public.invoice_email_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_invoice_email_templates_default ON public.invoice_email_templates(org_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_invoice_emails_org_id ON public.invoice_emails(org_id);
CREATE INDEX IF NOT EXISTS idx_invoice_emails_invoice_id ON public.invoice_emails(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_emails_status ON public.invoice_emails(status);
CREATE INDEX IF NOT EXISTS idx_invoice_emails_sent_at ON public.invoice_emails(sent_at);

-- RLS Policies for invoice_email_templates
ALTER TABLE public.invoice_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's email templates"
  ON public.invoice_email_templates FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create email templates for their org"
  ON public.invoice_email_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org's email templates"
  ON public.invoice_email_templates FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org's email templates"
  ON public.invoice_email_templates FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for invoice_emails
ALTER TABLE public.invoice_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's invoice emails"
  ON public.invoice_emails FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoice emails for their org"
  ON public.invoice_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org's invoice emails"
  ON public.invoice_emails FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Function to render email template with variables
CREATE OR REPLACE FUNCTION render_invoice_email_template(
  template_text text,
  invoice_id_param uuid
)
RETURNS text AS $$
DECLARE
  invoice_record RECORD;
  customer_record RECORD;
  org_record RECORD;
  rendered_text text;
BEGIN
  -- Get invoice data
  SELECT * INTO invoice_record FROM public.invoices WHERE id = invoice_id_param;

  -- Get customer data
  SELECT * INTO customer_record FROM public.customers WHERE id = invoice_record.customer_id;

  -- Get organization data
  SELECT * INTO org_record FROM public.organizations WHERE id = invoice_record.org_id;

  -- Replace template variables
  rendered_text := template_text;
  rendered_text := REPLACE(rendered_text, '{{invoice_number}}', invoice_record.number);
  rendered_text := REPLACE(rendered_text, '{{customer_name}}', COALESCE(customer_record.name, customer_record.email, 'Customer'));
  rendered_text := REPLACE(rendered_text, '{{company_name}}', COALESCE(org_record.name, 'Our Company'));
  rendered_text := REPLACE(rendered_text, '{{total_amount}}', '$' || (invoice_record.total_cents / 100.0)::numeric(10,2)::text);
  rendered_text := REPLACE(rendered_text, '{{due_date}}', COALESCE(invoice_record.payment_due_date::text, 'upon receipt'));
  rendered_text := REPLACE(rendered_text, '{{issue_date}}', COALESCE(invoice_record.invoice_date::text, CURRENT_DATE::text));
  rendered_text := REPLACE(rendered_text, '{{amount_due}}', '$' || ((invoice_record.total_cents - invoice_record.paid_amount_cents) / 100.0)::numeric(10,2)::text);

  RETURN rendered_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure only one default template per org
CREATE OR REPLACE FUNCTION ensure_single_default_email_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.invoice_email_templates
    SET is_default = false
    WHERE org_id = NEW.org_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_email_template
  BEFORE INSERT OR UPDATE ON public.invoice_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_email_template();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_invoice_email_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_email_template_timestamp
  BEFORE UPDATE ON public.invoice_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_email_template_timestamp();
