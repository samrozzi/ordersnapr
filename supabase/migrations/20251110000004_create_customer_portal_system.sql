-- Public Invoice Links Table (for shareable invoice URLs)
CREATE TABLE IF NOT EXISTS public.invoice_public_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Secure token for URL
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Access control
  expires_at timestamptz,
  max_views integer,
  view_count integer DEFAULT 0,
  is_active boolean DEFAULT true,

  -- Payment settings
  allow_payment boolean DEFAULT true,

  -- Metadata
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  last_viewed_at timestamptz,

  UNIQUE(invoice_id, token)
);

-- Payment Intents Table (Stripe payment tracking)
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,

  -- Stripe data
  stripe_payment_intent_id text UNIQUE,
  stripe_customer_id text,

  -- Payment details
  amount_cents bigint NOT NULL,
  currency text DEFAULT 'usd',
  payment_method_type text, -- 'card', 'ach', 'bank_transfer'

  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded'
  )),

  -- Payment metadata
  payment_method_last4 text,
  payment_method_brand text,
  receipt_url text,
  receipt_email text,

  -- Timestamps
  succeeded_at timestamptz,
  failed_at timestamptz,
  error_message text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customer Portal Sessions Table (track customer portal access)
CREATE TABLE IF NOT EXISTS public.customer_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Session token
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Session control
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  is_active boolean DEFAULT true,

  -- Access metadata
  ip_address text,
  user_agent text,

  created_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_public_links_token ON public.invoice_public_links(token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invoice_public_links_invoice_id ON public.invoice_public_links(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_public_links_org_id ON public.invoice_public_links(org_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_invoice_id ON public.payment_intents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe_id ON public.payment_intents(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_customer_id ON public.payment_intents(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_portal_sessions_token ON public.customer_portal_sessions(token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customer_portal_sessions_customer_id ON public.customer_portal_sessions(customer_id);

-- RLS Policies for invoice_public_links
ALTER TABLE public.invoice_public_links ENABLE ROW LEVEL SECURITY;

-- Public access via token (anyone with token can view)
CREATE POLICY "Public can view invoice via valid token"
  ON public.invoice_public_links FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_views IS NULL OR view_count < max_views)
  );

-- Authenticated users can manage their org's links
CREATE POLICY "Users can view their org's invoice links"
  ON public.invoice_public_links FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoice links for their org"
  ON public.invoice_public_links FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org's invoice links"
  ON public.invoice_public_links FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for payment_intents
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's payment intents"
  ON public.payment_intents FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create payment intents for their org"
  ON public.payment_intents FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org's payment intents"
  ON public.payment_intents FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Public can create payment intents (for public invoice payments)
CREATE POLICY "Public can create payment intents"
  ON public.payment_intents FOR INSERT
  WITH CHECK (true);

-- RLS Policies for customer_portal_sessions
ALTER TABLE public.customer_portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own portal sessions via token"
  ON public.customer_portal_sessions FOR SELECT
  USING (
    is_active = true
    AND expires_at > now()
  );

CREATE POLICY "Users can view their org's portal sessions"
  ON public.customer_portal_sessions FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create portal sessions for their org"
  ON public.customer_portal_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Function to generate shareable invoice link
CREATE OR REPLACE FUNCTION generate_invoice_public_link(
  invoice_id_param uuid,
  expires_in_days integer DEFAULT NULL,
  max_views_param integer DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  invoice_record RECORD;
  link_record RECORD;
BEGIN
  -- Get invoice to verify it exists and get org_id
  SELECT * INTO invoice_record FROM public.invoices WHERE id = invoice_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  -- Create or get existing active link
  INSERT INTO public.invoice_public_links (
    invoice_id,
    org_id,
    expires_at,
    max_views,
    created_by
  ) VALUES (
    invoice_id_param,
    invoice_record.org_id,
    CASE WHEN expires_in_days IS NOT NULL
      THEN now() + (expires_in_days || ' days')::interval
      ELSE NULL
    END,
    max_views_param,
    auth.uid()
  )
  ON CONFLICT (invoice_id, token) DO UPDATE
    SET is_active = true
  RETURNING token INTO link_record;

  RETURN link_record.token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record invoice view (increments view count)
CREATE OR REPLACE FUNCTION record_invoice_view(token_param text)
RETURNS void AS $$
BEGIN
  UPDATE public.invoice_public_links
  SET
    view_count = view_count + 1,
    last_viewed_at = now()
  WHERE token = token_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get invoice by public token
CREATE OR REPLACE FUNCTION get_invoice_by_token(token_param text)
RETURNS TABLE(
  invoice_data jsonb,
  link_data jsonb,
  can_pay boolean
) AS $$
DECLARE
  link_record RECORD;
  invoice_record RECORD;
BEGIN
  -- Get link record
  SELECT * INTO link_record
  FROM public.invoice_public_links
  WHERE token = token_param
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_views IS NULL OR view_count < max_views);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired link';
  END IF;

  -- Get invoice with customer and organization data
  SELECT
    i.*,
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'email', c.email,
      'phone', c.phone,
      'address', c.address
    ) as customer,
    jsonb_build_object(
      'id', o.id,
      'name', o.name
    ) as organization
  INTO invoice_record
  FROM public.invoices i
  LEFT JOIN public.customers c ON i.customer_id = c.id
  LEFT JOIN public.organizations o ON i.org_id = o.id
  WHERE i.id = link_record.invoice_id;

  -- Record the view
  PERFORM record_invoice_view(token_param);

  -- Return invoice and link data
  RETURN QUERY
  SELECT
    to_jsonb(invoice_record) as invoice_data,
    to_jsonb(link_record) as link_data,
    (link_record.allow_payment AND invoice_record.payment_status != 'paid') as can_pay;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp trigger for payment_intents
CREATE OR REPLACE FUNCTION update_payment_intent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_intent_timestamp
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_intent_timestamp();
