-- Create customer_portal_tokens table
CREATE TABLE IF NOT EXISTS public.customer_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  meta JSONB DEFAULT '{}'::jsonb
);

-- Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_portal_tokens_token ON public.customer_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_customer_portal_tokens_customer_id ON public.customer_portal_tokens(customer_id);

-- Enable RLS
ALTER TABLE public.customer_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Org members can view portal tokens for customers in their org
CREATE POLICY "Org members can view customer portal tokens"
ON public.customer_portal_tokens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.profiles p ON p.organization_id = c.org_id
    WHERE c.id = customer_portal_tokens.customer_id
    AND p.id = auth.uid()
    AND is_user_approved(auth.uid())
  )
  OR is_super_admin(auth.uid())
);

-- Org members can create portal tokens for customers in their org
CREATE POLICY "Org members can create customer portal tokens"
ON public.customer_portal_tokens
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.profiles p ON p.organization_id = c.org_id
    WHERE c.id = customer_portal_tokens.customer_id
    AND p.id = auth.uid()
    AND is_user_approved(auth.uid())
  )
  OR is_super_admin(auth.uid())
);

-- Org members can update portal tokens for customers in their org
CREATE POLICY "Org members can update customer portal tokens"
ON public.customer_portal_tokens
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.profiles p ON p.organization_id = c.org_id
    WHERE c.id = customer_portal_tokens.customer_id
    AND p.id = auth.uid()
    AND is_user_approved(auth.uid())
  )
  OR is_super_admin(auth.uid())
);

-- Org members can delete portal tokens for customers in their org
CREATE POLICY "Org members can delete customer portal tokens"
ON public.customer_portal_tokens
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.profiles p ON p.organization_id = c.org_id
    WHERE c.id = customer_portal_tokens.customer_id
    AND p.id = auth.uid()
    AND is_user_approved(auth.uid())
  )
  OR is_super_admin(auth.uid())
);

-- Add paid_amount_cents column to invoices table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'paid_amount_cents'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN paid_amount_cents INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create trigger for updated_at on customer_portal_tokens
CREATE OR REPLACE FUNCTION public.update_customer_portal_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: We don't create an updated_at trigger since we're tracking last_accessed_at instead