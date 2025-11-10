-- Migration: Create Financial Analytics and Reporting Views
-- Date: 2025-11-10
-- Description: Creates database views for comprehensive financial reporting and analytics

-- ============================================================================
-- 1. Invoice Analytics View
-- ============================================================================
-- Provides aggregated invoice statistics by organization, month, and status
CREATE OR REPLACE VIEW public.invoice_analytics AS
SELECT
  i.org_id,
  DATE_TRUNC('month', i.created_at) as month,
  i.status,
  i.payment_status,
  COUNT(DISTINCT i.id) as invoice_count,
  COUNT(DISTINCT i.customer_id) as unique_customers,
  SUM(i.total_cents) as total_invoiced_cents,
  SUM(i.paid_amount_cents) as total_paid_cents,
  SUM(i.total_cents - i.paid_amount_cents) as total_outstanding_cents,
  AVG(i.total_cents) as avg_invoice_cents,
  MIN(i.total_cents) as min_invoice_cents,
  MAX(i.total_cents) as max_invoice_cents
FROM public.invoices i
WHERE i.status != 'void' AND i.status != 'cancelled'
GROUP BY i.org_id, DATE_TRUNC('month', i.created_at), i.status, i.payment_status;

-- ============================================================================
-- 2. AR Aging Report View
-- ============================================================================
-- Provides accounts receivable aging breakdown (current, 30, 60, 90+ days)
CREATE OR REPLACE VIEW public.ar_aging_report AS
SELECT
  i.org_id,
  i.customer_id,
  c.name as customer_name,
  c.email as customer_email,
  COUNT(DISTINCT i.id) as invoice_count,

  -- Current (not yet due)
  SUM(CASE
    WHEN i.payment_due_date IS NULL OR i.payment_due_date >= CURRENT_DATE
    THEN (i.total_cents - i.paid_amount_cents)
    ELSE 0
  END) as current_cents,

  -- 1-30 days overdue
  SUM(CASE
    WHEN i.payment_due_date < CURRENT_DATE
      AND i.payment_due_date >= CURRENT_DATE - INTERVAL '30 days'
    THEN (i.total_cents - i.paid_amount_cents)
    ELSE 0
  END) as overdue_1_30_cents,

  -- 31-60 days overdue
  SUM(CASE
    WHEN i.payment_due_date < CURRENT_DATE - INTERVAL '30 days'
      AND i.payment_due_date >= CURRENT_DATE - INTERVAL '60 days'
    THEN (i.total_cents - i.paid_amount_cents)
    ELSE 0
  END) as overdue_31_60_cents,

  -- 61-90 days overdue
  SUM(CASE
    WHEN i.payment_due_date < CURRENT_DATE - INTERVAL '60 days'
      AND i.payment_due_date >= CURRENT_DATE - INTERVAL '90 days'
    THEN (i.total_cents - i.paid_amount_cents)
    ELSE 0
  END) as overdue_61_90_cents,

  -- 90+ days overdue
  SUM(CASE
    WHEN i.payment_due_date < CURRENT_DATE - INTERVAL '90 days'
    THEN (i.total_cents - i.paid_amount_cents)
    ELSE 0
  END) as overdue_90_plus_cents,

  -- Total outstanding
  SUM(i.total_cents - i.paid_amount_cents) as total_outstanding_cents

FROM public.invoices i
LEFT JOIN public.customers c ON i.customer_id = c.id
WHERE i.payment_status IN ('unpaid', 'partial')
  AND i.status NOT IN ('void', 'cancelled')
GROUP BY i.org_id, i.customer_id, c.name, c.email
HAVING SUM(i.total_cents - i.paid_amount_cents) > 0;

-- ============================================================================
-- 3. Revenue Trends View
-- ============================================================================
-- Provides daily/monthly revenue trends combining invoices and payments
CREATE OR REPLACE VIEW public.revenue_trends AS
SELECT
  i.org_id,
  DATE_TRUNC('day', i.created_at) as date,
  DATE_TRUNC('month', i.created_at) as month,

  -- Invoice metrics
  COUNT(DISTINCT i.id) as invoices_created,
  SUM(i.total_cents) as invoiced_cents,

  -- Payment metrics (from payments on this day)
  COUNT(DISTINCT p.id) as payments_received,
  COALESCE(SUM(p.amount_cents - p.refunded_amount_cents), 0) as revenue_collected_cents,

  -- Status breakdown
  COUNT(DISTINCT CASE WHEN i.payment_status = 'paid' THEN i.id END) as invoices_paid,
  COUNT(DISTINCT CASE WHEN i.payment_status = 'unpaid' THEN i.id END) as invoices_unpaid,
  COUNT(DISTINCT CASE WHEN i.payment_status = 'partial' THEN i.id END) as invoices_partial

FROM public.invoices i
LEFT JOIN public.payments p ON p.invoice_id = i.id
  AND DATE_TRUNC('day', p.paid_at) = DATE_TRUNC('day', i.created_at)
  AND p.status IN ('succeeded', 'partially_refunded')
WHERE i.status NOT IN ('void', 'cancelled')
GROUP BY i.org_id, DATE_TRUNC('day', i.created_at), DATE_TRUNC('month', i.created_at);

-- ============================================================================
-- 4. Customer Lifetime Value View
-- ============================================================================
-- Provides customer-level analytics for revenue contribution
CREATE OR REPLACE VIEW public.customer_lifetime_value AS
SELECT
  c.org_id,
  c.id as customer_id,
  c.name as customer_name,
  c.email as customer_email,

  -- Invoice metrics
  COUNT(DISTINCT i.id) as total_invoices,
  SUM(i.total_cents) as total_invoiced_cents,
  SUM(i.paid_amount_cents) as total_paid_cents,
  SUM(i.total_cents - i.paid_amount_cents) as outstanding_balance_cents,
  AVG(i.total_cents) as avg_invoice_cents,

  -- Payment metrics
  COUNT(DISTINCT p.id) as total_payments,
  COALESCE(SUM(p.amount_cents - p.refunded_amount_cents), 0) as lifetime_revenue_cents,

  -- Dates
  MIN(i.created_at) as first_invoice_date,
  MAX(i.created_at) as last_invoice_date,
  MAX(p.paid_at) as last_payment_date,

  -- Status
  CASE
    WHEN SUM(i.total_cents - i.paid_amount_cents) > 0 THEN 'outstanding'
    ELSE 'current'
  END as status

FROM public.customers c
LEFT JOIN public.invoices i ON i.customer_id = c.id
  AND i.status NOT IN ('void', 'cancelled')
LEFT JOIN public.payments p ON p.customer_id = c.id
  AND p.status IN ('succeeded', 'partially_refunded')
GROUP BY c.org_id, c.id, c.name, c.email;

-- ============================================================================
-- 5. Payment Method Analytics View
-- ============================================================================
-- Provides breakdown of payment methods and success rates
CREATE OR REPLACE VIEW public.payment_method_analytics AS
SELECT
  p.org_id,
  DATE_TRUNC('month', p.created_at) as month,
  p.payment_method_type,
  p.payment_method_brand,

  COUNT(DISTINCT p.id) as payment_count,
  SUM(p.amount_cents - p.refunded_amount_cents) as net_revenue_cents,
  AVG(p.amount_cents) as avg_payment_cents,

  -- Success metrics
  COUNT(DISTINCT CASE WHEN p.status = 'succeeded' THEN p.id END) as successful_payments,
  COUNT(DISTINCT CASE WHEN p.status = 'failed' THEN p.id END) as failed_payments,
  COUNT(DISTINCT CASE WHEN p.status IN ('refunded', 'partially_refunded') THEN p.id END) as refunded_payments,

  -- Success rate
  CASE
    WHEN COUNT(DISTINCT p.id) > 0
    THEN ROUND(
      (COUNT(DISTINCT CASE WHEN p.status = 'succeeded' THEN p.id END)::numeric / COUNT(DISTINCT p.id)::numeric) * 100,
      2
    )
    ELSE 0
  END as success_rate_percentage

FROM public.payments p
GROUP BY p.org_id, DATE_TRUNC('month', p.created_at), p.payment_method_type, p.payment_method_brand;

-- ============================================================================
-- 6. Outstanding Invoices Summary
-- ============================================================================
-- Provides real-time summary of outstanding invoices by organization
CREATE OR REPLACE VIEW public.outstanding_invoices_summary AS
SELECT
  i.org_id,

  -- Count metrics
  COUNT(DISTINCT i.id) as total_outstanding_invoices,
  COUNT(DISTINCT CASE WHEN i.payment_due_date < CURRENT_DATE THEN i.id END) as overdue_invoices,
  COUNT(DISTINCT CASE WHEN i.payment_due_date >= CURRENT_DATE THEN i.id END) as due_future_invoices,

  -- Amount metrics
  SUM(i.total_cents - i.paid_amount_cents) as total_outstanding_cents,
  SUM(CASE WHEN i.payment_due_date < CURRENT_DATE THEN (i.total_cents - i.paid_amount_cents) ELSE 0 END) as overdue_amount_cents,
  SUM(CASE WHEN i.payment_due_date >= CURRENT_DATE THEN (i.total_cents - i.paid_amount_cents) ELSE 0 END) as due_future_amount_cents,

  -- Oldest overdue invoice
  MIN(CASE WHEN i.payment_due_date < CURRENT_DATE THEN i.payment_due_date END) as oldest_overdue_date,
  MAX(CASE WHEN i.payment_due_date < CURRENT_DATE THEN (CURRENT_DATE - i.payment_due_date) END) as max_days_overdue

FROM public.invoices i
WHERE i.payment_status IN ('unpaid', 'partial')
  AND i.status NOT IN ('void', 'cancelled')
GROUP BY i.org_id;

-- ============================================================================
-- Grant Permissions
-- ============================================================================
GRANT SELECT ON public.invoice_analytics TO authenticated;
GRANT SELECT ON public.ar_aging_report TO authenticated;
GRANT SELECT ON public.revenue_trends TO authenticated;
GRANT SELECT ON public.customer_lifetime_value TO authenticated;
GRANT SELECT ON public.payment_method_analytics TO authenticated;
GRANT SELECT ON public.outstanding_invoices_summary TO authenticated;

-- ============================================================================
-- Add Comments for Documentation
-- ============================================================================
COMMENT ON VIEW public.invoice_analytics IS
  'Aggregated invoice statistics by organization, month, status, and payment status';

COMMENT ON VIEW public.ar_aging_report IS
  'Accounts receivable aging breakdown (current, 30, 60, 90+ days overdue) by customer';

COMMENT ON VIEW public.revenue_trends IS
  'Daily and monthly revenue trends combining invoice creation and payment collection';

COMMENT ON VIEW public.customer_lifetime_value IS
  'Customer-level lifetime value analytics including total revenue and outstanding balance';

COMMENT ON VIEW public.payment_method_analytics IS
  'Payment method breakdown with success rates and revenue by method type';

COMMENT ON VIEW public.outstanding_invoices_summary IS
  'Real-time summary of outstanding and overdue invoices by organization';
