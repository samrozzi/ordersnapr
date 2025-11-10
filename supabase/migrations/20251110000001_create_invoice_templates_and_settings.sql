-- Migration: Create Invoice Templates and Settings
-- Date: 2025-11-10
-- Description: Adds invoice templates, invoice settings, and productivity features

-- ============================================================================
-- 1. Invoice Templates Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Template metadata
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,

  -- Invoice defaults
  line_items jsonb DEFAULT '[]'::jsonb,
  payment_terms_days integer DEFAULT 30,
  terms text,
  notes text,
  tax_rate numeric(5,2) DEFAULT 0, -- Tax rate as percentage (e.g., 8.25 for 8.25%)

  -- Additional settings
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index for org_id lookups
CREATE INDEX idx_invoice_templates_org_id ON public.invoice_templates(org_id);

-- Add index for default templates
CREATE INDEX idx_invoice_templates_default ON public.invoice_templates(org_id, is_default) WHERE is_default = true;

-- Add updated_at trigger
CREATE TRIGGER update_invoice_templates_updated_at
  BEFORE UPDATE ON public.invoice_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. Invoice Settings Table (Organization-level invoice configuration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Invoice numbering
  invoice_prefix text DEFAULT 'INV',
  next_invoice_number integer DEFAULT 1,
  invoice_number_padding integer DEFAULT 4, -- Number of digits with leading zeros

  -- Default payment terms
  default_payment_terms_days integer DEFAULT 30,
  default_terms text DEFAULT 'Payment due within 30 days',
  default_notes text,

  -- Default tax settings
  default_tax_rate numeric(5,2) DEFAULT 0,
  tax_label text DEFAULT 'Tax',

  -- Invoice appearance
  logo_url text,
  primary_color text,
  show_logo boolean DEFAULT true,

  -- Email settings
  send_copy_to_sender boolean DEFAULT true,
  email_subject_template text DEFAULT 'Invoice {{invoice_number}} from {{org_name}}',
  email_body_template text,

  -- Payment reminders
  auto_send_reminders boolean DEFAULT false,
  reminder_days_before integer[] DEFAULT ARRAY[3], -- Days before due date to send reminders
  reminder_days_after integer[] DEFAULT ARRAY[7, 14, 30], -- Days after due date to send reminders

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index for org_id lookups
CREATE INDEX idx_invoice_settings_org_id ON public.invoice_settings(org_id);

-- Add updated_at trigger
CREATE TRIGGER update_invoice_settings_updated_at
  BEFORE UPDATE ON public.invoice_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. Enable RLS
-- ============================================================================
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies for invoice_templates
-- ============================================================================
CREATE POLICY "Organization members can view templates"
  ON public.invoice_templates
  FOR SELECT
  USING (
    org_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization members can create templates"
  ON public.invoice_templates
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Organization members can update templates"
  ON public.invoice_templates
  FOR UPDATE
  USING (
    org_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization members can delete templates"
  ON public.invoice_templates
  FOR DELETE
  USING (
    org_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 5. RLS Policies for invoice_settings
-- ============================================================================
CREATE POLICY "Organization members can view settings"
  ON public.invoice_settings
  FOR SELECT
  USING (
    org_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can insert settings"
  ON public.invoice_settings
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can update settings"
  ON public.invoice_settings
  FOR UPDATE
  USING (
    org_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 6. Grant Permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoice_settings TO authenticated;

-- ============================================================================
-- 7. Helper Function: Get Next Invoice Number
-- ============================================================================
CREATE OR REPLACE FUNCTION get_next_invoice_number(org_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_record RECORD;
  next_num integer;
  formatted_number text;
BEGIN
  -- Get or create invoice settings for the organization
  SELECT * INTO settings_record
  FROM public.invoice_settings
  WHERE org_id = org_id_param;

  -- If no settings exist, create default settings
  IF NOT FOUND THEN
    INSERT INTO public.invoice_settings (org_id)
    VALUES (org_id_param)
    RETURNING * INTO settings_record;
  END IF;

  -- Get the next number
  next_num := settings_record.next_invoice_number;

  -- Format with leading zeros
  formatted_number := settings_record.invoice_prefix || '-' ||
    LPAD(next_num::text, settings_record.invoice_number_padding, '0');

  -- Increment the counter
  UPDATE public.invoice_settings
  SET next_invoice_number = next_invoice_number + 1
  WHERE org_id = org_id_param;

  RETURN formatted_number;
END;
$$;

-- ============================================================================
-- 8. Helper Function: Clone Invoice
-- ============================================================================
CREATE OR REPLACE FUNCTION clone_invoice(invoice_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_invoice_id uuid;
  original_invoice RECORD;
  new_invoice_number text;
BEGIN
  -- Get the original invoice
  SELECT * INTO original_invoice
  FROM public.invoices
  WHERE id = invoice_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  -- Generate new invoice number
  new_invoice_number := get_next_invoice_number(original_invoice.org_id);

  -- Clone the invoice
  INSERT INTO public.invoices (
    org_id,
    customer_id,
    customer_name,
    number,
    issue_date,
    due_date,
    payment_due_date,
    line_items,
    subtotal_cents,
    tax_cents,
    discount_cents,
    total_cents,
    currency,
    status,
    payment_status,
    notes,
    terms
  )
  VALUES (
    original_invoice.org_id,
    original_invoice.customer_id,
    original_invoice.customer_name,
    new_invoice_number,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '30 days',
    original_invoice.line_items,
    original_invoice.subtotal_cents,
    original_invoice.tax_cents,
    original_invoice.discount_cents,
    original_invoice.total_cents,
    original_invoice.currency,
    'draft',
    'unpaid',
    original_invoice.notes,
    original_invoice.terms
  )
  RETURNING id INTO new_invoice_id;

  RETURN new_invoice_id;
END;
$$;

-- ============================================================================
-- 9. Comments for Documentation
-- ============================================================================
COMMENT ON TABLE public.invoice_templates IS
  'Reusable invoice templates with default line items, terms, and settings';

COMMENT ON TABLE public.invoice_settings IS
  'Organization-level invoice configuration including numbering, defaults, and appearance';

COMMENT ON FUNCTION get_next_invoice_number(uuid) IS
  'Generates the next sequential invoice number for an organization';

COMMENT ON FUNCTION clone_invoice(uuid) IS
  'Creates a duplicate of an invoice with a new number and draft status';
