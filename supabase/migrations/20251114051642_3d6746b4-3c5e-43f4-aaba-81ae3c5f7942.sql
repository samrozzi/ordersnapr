-- Create water intake log table for water tracker widget
CREATE TABLE IF NOT EXISTS public.water_intake_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  oz_consumed INTEGER DEFAULT 0,
  daily_goal INTEGER DEFAULT 64,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.water_intake_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own water intake"
  ON public.water_intake_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own water intake"
  ON public.water_intake_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own water intake"
  ON public.water_intake_log
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user_page ON public.dashboard_widgets(user_id, page_path);
CREATE INDEX IF NOT EXISTS idx_work_orders_org_status ON public.work_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON public.invoices(org_id, status);
CREATE INDEX IF NOT EXISTS idx_water_intake_user_date ON public.water_intake_log(user_id, date);