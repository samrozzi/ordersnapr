-- Recurring Invoice Schedules Table
CREATE TABLE IF NOT EXISTS public.recurring_invoice_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  -- Schedule details
  name text NOT NULL,
  description text,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'bi_weekly', 'monthly', 'quarterly', 'semi_annually', 'annually')),
  interval_count integer DEFAULT 1 CHECK (interval_count > 0),

  -- Invoice template data
  invoice_template_id uuid REFERENCES public.invoice_templates(id) ON DELETE SET NULL,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_terms_days integer DEFAULT 30,
  terms text,
  notes text,
  tax_rate numeric(5,2) DEFAULT 0,

  -- Schedule timing
  start_date date NOT NULL,
  end_date date,
  next_generation_date date NOT NULL,
  last_generated_at timestamptz,

  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),

  -- Auto-send settings
  auto_send_email boolean DEFAULT false,
  email_template_id uuid REFERENCES public.invoice_email_templates(id) ON DELETE SET NULL,

  -- Metadata
  total_invoices_generated integer DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Generated Invoices Tracking (junction table)
CREATE TABLE IF NOT EXISTS public.recurring_invoice_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.recurring_invoice_schedules(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  generation_date date NOT NULL,
  period_start date,
  period_end date,
  generated_at timestamptz DEFAULT now(),
  auto_sent boolean DEFAULT false,

  UNIQUE(schedule_id, invoice_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_org_id ON public.recurring_invoice_schedules(org_id);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_customer_id ON public.recurring_invoice_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_status ON public.recurring_invoice_schedules(status);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_next_gen_date ON public.recurring_invoice_schedules(next_generation_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recurring_history_schedule_id ON public.recurring_invoice_history(schedule_id);
CREATE INDEX IF NOT EXISTS idx_recurring_history_invoice_id ON public.recurring_invoice_history(invoice_id);

-- RLS Policies for recurring_invoice_schedules
ALTER TABLE public.recurring_invoice_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's recurring schedules"
  ON public.recurring_invoice_schedules FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recurring schedules for their org"
  ON public.recurring_invoice_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org's recurring schedules"
  ON public.recurring_invoice_schedules FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org's recurring schedules"
  ON public.recurring_invoice_schedules FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for recurring_invoice_history
ALTER TABLE public.recurring_invoice_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's recurring history"
  ON public.recurring_invoice_history FOR SELECT
  TO authenticated
  USING (
    schedule_id IN (
      SELECT id FROM public.recurring_invoice_schedules
      WHERE org_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create recurring history for their org"
  ON public.recurring_invoice_history FOR INSERT
  TO authenticated
  WITH CHECK (
    schedule_id IN (
      SELECT id FROM public.recurring_invoice_schedules
      WHERE org_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Function to calculate next generation date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_generation_date(
  current_date date,
  frequency_param text,
  interval_count_param integer DEFAULT 1
)
RETURNS date AS $$
BEGIN
  CASE frequency_param
    WHEN 'daily' THEN
      RETURN current_date + (interval_count_param || ' days')::interval;
    WHEN 'weekly' THEN
      RETURN current_date + (interval_count_param || ' weeks')::interval;
    WHEN 'bi_weekly' THEN
      RETURN current_date + (interval_count_param * 2 || ' weeks')::interval;
    WHEN 'monthly' THEN
      RETURN current_date + (interval_count_param || ' months')::interval;
    WHEN 'quarterly' THEN
      RETURN current_date + (interval_count_param * 3 || ' months')::interval;
    WHEN 'semi_annually' THEN
      RETURN current_date + (interval_count_param * 6 || ' months')::interval;
    WHEN 'annually' THEN
      RETURN current_date + (interval_count_param || ' years')::interval;
    ELSE
      RETURN current_date + (interval_count_param || ' months')::interval;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate invoice from recurring schedule
CREATE OR REPLACE FUNCTION generate_invoice_from_schedule(schedule_id_param uuid)
RETURNS uuid AS $$
DECLARE
  schedule_record RECORD;
  customer_record RECORD;
  new_invoice_id uuid;
  new_invoice_number text;
  period_start_date date;
  period_end_date date;
BEGIN
  -- Get schedule data
  SELECT * INTO schedule_record FROM public.recurring_invoice_schedules WHERE id = schedule_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found';
  END IF;

  IF schedule_record.status != 'active' THEN
    RAISE EXCEPTION 'Schedule is not active';
  END IF;

  -- Get customer data
  SELECT * INTO customer_record FROM public.customers WHERE id = schedule_record.customer_id;

  -- Generate new invoice number
  new_invoice_number := get_next_invoice_number(schedule_record.org_id);

  -- Calculate period dates
  period_start_date := schedule_record.next_generation_date;
  period_end_date := calculate_next_generation_date(
    period_start_date,
    schedule_record.frequency,
    schedule_record.interval_count
  ) - interval '1 day';

  -- Create invoice
  INSERT INTO public.invoices (
    org_id,
    customer_id,
    number,
    invoice_date,
    payment_due_date,
    line_items,
    subtotal_cents,
    tax_cents,
    discount_cents,
    total_cents,
    status,
    payment_status,
    terms,
    notes
  ) VALUES (
    schedule_record.org_id,
    schedule_record.customer_id,
    new_invoice_number,
    CURRENT_DATE,
    CURRENT_DATE + schedule_record.payment_terms_days,
    schedule_record.line_items,
    (
      SELECT COALESCE(SUM((item->>'amount_cents')::numeric), 0)
      FROM jsonb_array_elements(schedule_record.line_items) AS item
    )::bigint,
    (
      SELECT COALESCE(SUM((item->>'amount_cents')::numeric), 0) * schedule_record.tax_rate / 100
      FROM jsonb_array_elements(schedule_record.line_items) AS item
    )::bigint,
    0,
    (
      SELECT (
        COALESCE(SUM((item->>'amount_cents')::numeric), 0) *
        (1 + schedule_record.tax_rate / 100)
      )::bigint
      FROM jsonb_array_elements(schedule_record.line_items) AS item
    ),
    CASE
      WHEN schedule_record.auto_send_email THEN 'sent'
      ELSE 'draft'
    END,
    'unpaid',
    schedule_record.terms,
    COALESCE(
      schedule_record.notes || E'\n\nBilling Period: ' ||
      period_start_date::text || ' to ' || period_end_date::text,
      'Billing Period: ' || period_start_date::text || ' to ' || period_end_date::text
    )
  ) RETURNING id INTO new_invoice_id;

  -- Record in history
  INSERT INTO public.recurring_invoice_history (
    schedule_id,
    invoice_id,
    generation_date,
    period_start,
    period_end,
    auto_sent
  ) VALUES (
    schedule_id_param,
    new_invoice_id,
    CURRENT_DATE,
    period_start_date,
    period_end_date,
    schedule_record.auto_send_email
  );

  -- Update schedule
  UPDATE public.recurring_invoice_schedules
  SET
    next_generation_date = calculate_next_generation_date(
      next_generation_date,
      frequency,
      interval_count
    ),
    last_generated_at = now(),
    total_invoices_generated = total_invoices_generated + 1,
    status = CASE
      WHEN end_date IS NOT NULL AND calculate_next_generation_date(
        next_generation_date,
        frequency,
        interval_count
      ) > end_date THEN 'completed'
      ELSE status
    END
  WHERE id = schedule_id_param;

  RETURN new_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process all due recurring schedules (to be called by cron/scheduler)
CREATE OR REPLACE FUNCTION process_recurring_schedules()
RETURNS TABLE(schedule_id uuid, invoice_id uuid, success boolean, error_message text) AS $$
DECLARE
  schedule_record RECORD;
  generated_invoice_id uuid;
BEGIN
  FOR schedule_record IN
    SELECT id
    FROM public.recurring_invoice_schedules
    WHERE status = 'active'
      AND next_generation_date <= CURRENT_DATE
    ORDER BY next_generation_date
  LOOP
    BEGIN
      generated_invoice_id := generate_invoice_from_schedule(schedule_record.id);

      schedule_id := schedule_record.id;
      invoice_id := generated_invoice_id;
      success := true;
      error_message := null;

      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      schedule_id := schedule_record.id;
      invoice_id := null;
      success := false;
      error_message := SQLERRM;

      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_recurring_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recurring_schedule_timestamp
  BEFORE UPDATE ON public.recurring_invoice_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_schedule_timestamp();
