-- Customer Portal System
-- Allows customers to access their work orders and invoices via secure token-based links

-- Create customer_portal_tokens table
CREATE TABLE IF NOT EXISTS public.customer_portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  last_accessed_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  meta jsonb DEFAULT '{}'::jsonb
);

-- Add customer_id to work_orders if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'work_orders'
    AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.work_orders
    ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.customer_portal_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_portal_tokens

-- Org members can view their org's customer tokens
CREATE POLICY "org_members_view_customer_tokens"
  ON public.customer_portal_tokens
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE org_id IN (
        SELECT organization_id FROM public.profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Org members can create tokens for their org's customers
CREATE POLICY "org_members_create_customer_tokens"
  ON public.customer_portal_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE org_id IN (
        SELECT organization_id FROM public.profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Org members can update tokens for their org's customers
CREATE POLICY "org_members_update_customer_tokens"
  ON public.customer_portal_tokens
  FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE org_id IN (
        SELECT organization_id FROM public.profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Org members can delete tokens for their org's customers
CREATE POLICY "org_members_delete_customer_tokens"
  ON public.customer_portal_tokens
  FOR DELETE
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM public.customers
      WHERE org_id IN (
        SELECT organization_id FROM public.profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Anonymous users can verify tokens (for portal access)
-- We'll handle the data access through the token validation in the app
CREATE POLICY "anyone_can_verify_token"
  ON public.customer_portal_tokens
  FOR SELECT
  TO anon
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Update work_orders RLS to allow customer portal access
-- Customers can view work orders via valid token
CREATE POLICY "customer_portal_view_work_orders"
  ON public.work_orders
  FOR SELECT
  TO anon
  USING (
    customer_id IN (
      SELECT customer_id FROM public.customer_portal_tokens
      WHERE is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- Update invoices RLS to allow customer portal access
-- Customers can view invoices via valid token
CREATE POLICY "customer_portal_view_invoices"
  ON public.invoices
  FOR SELECT
  TO anon
  USING (
    customer_id IN (
      SELECT customer_id FROM public.customer_portal_tokens
      WHERE is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_portal_tokens_token ON public.customer_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_customer_portal_tokens_customer_id ON public.customer_portal_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_portal_tokens_active ON public.customer_portal_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON public.work_orders(customer_id) WHERE customer_id IS NOT NULL;

-- Function to clean up expired tokens (can be called by a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_portal_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.customer_portal_tokens
  SET is_active = false
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.customer_portal_tokens TO anon;
GRANT ALL ON public.customer_portal_tokens TO authenticated;

COMMENT ON TABLE public.customer_portal_tokens IS 'Token-based access for customers to view their work orders and invoices';
COMMENT ON COLUMN public.customer_portal_tokens.token IS 'Unique UUID token used in portal URL';
COMMENT ON COLUMN public.customer_portal_tokens.expires_at IS 'Optional expiration date. NULL means never expires';
COMMENT ON COLUMN public.customer_portal_tokens.is_active IS 'Can be manually deactivated without deleting';
