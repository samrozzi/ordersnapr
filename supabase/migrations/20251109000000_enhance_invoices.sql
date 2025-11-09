-- Migration: Enhance invoices table for full invoicing functionality
-- Date: 2025-11-09
-- Description: Adds line items, notes, and other missing invoice fields

-- Add line items as JSONB (flexible structure for invoice items)
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb;

-- Add subtotal, tax, discount for easier querying
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS subtotal_cents INTEGER DEFAULT 0;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS tax_cents INTEGER DEFAULT 0;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS discount_cents INTEGER DEFAULT 0;

-- Add notes fields
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS terms TEXT;

-- Add payment fields
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS paid_amount_cents INTEGER DEFAULT 0;

-- Add issue date (separate from created_at)
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE;

-- Add customer name denormalization for easier querying
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Add index for invoice number lookups
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(number);

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- Add index for due date queries (find overdue invoices)
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date) WHERE status != 'paid';

-- Add comments for documentation
COMMENT ON COLUMN public.invoices.line_items IS
  'JSONB array of line items: [{ description, quantity, rate_cents, amount_cents }]';

COMMENT ON COLUMN public.invoices.subtotal_cents IS
  'Sum of all line items before tax and discount';

COMMENT ON COLUMN public.invoices.tax_cents IS
  'Total tax amount in cents';

COMMENT ON COLUMN public.invoices.discount_cents IS
  'Total discount amount in cents (positive number)';

COMMENT ON COLUMN public.invoices.total_cents IS
  'Final total: subtotal + tax - discount';

COMMENT ON COLUMN public.invoices.paid_amount_cents IS
  'Amount actually paid (may differ from total for partial payments)';

COMMENT ON COLUMN public.invoices.customer_name IS
  'Denormalized customer name for easier display (synced from customers table)';
