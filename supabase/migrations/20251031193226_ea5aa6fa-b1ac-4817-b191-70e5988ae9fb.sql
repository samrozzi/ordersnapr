-- Phase 1: Add organization_id to work_orders and update RLS policies

-- Step 1: Add organization_id column to work_orders
ALTER TABLE public.work_orders 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- Step 2: Backfill organization_id from user's profile
UPDATE public.work_orders wo
SET organization_id = p.organization_id
FROM public.profiles p
WHERE wo.user_id = p.id;

-- Step 3: Make it NOT NULL after backfill
ALTER TABLE public.work_orders 
ALTER COLUMN organization_id SET NOT NULL;

-- Step 4: Add indexes for performance
CREATE INDEX idx_work_orders_org_id ON public.work_orders(organization_id);
CREATE INDEX idx_work_orders_org_scheduled ON public.work_orders(organization_id, scheduled_date) WHERE scheduled_date IS NOT NULL;

-- Step 5: Drop old RLS policies
DROP POLICY IF EXISTS "Approved users can view organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Approved users can create work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Approved users can update organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Approved users can delete organization work orders" ON public.work_orders;

-- Step 6: Create new org-scoped RLS policies
CREATE POLICY "Users can view org work orders" ON public.work_orders
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ) AND is_user_approved(auth.uid())
);

CREATE POLICY "Users can create org work orders" ON public.work_orders
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ) AND user_id = auth.uid() AND is_user_approved(auth.uid())
);

CREATE POLICY "Users can update org work orders" ON public.work_orders
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ) AND is_user_approved(auth.uid())
);

CREATE POLICY "Users can delete org work orders" ON public.work_orders
FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ) AND is_user_approved(auth.uid())
);

-- Step 7: Enable real-time for work_orders and calendar_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;