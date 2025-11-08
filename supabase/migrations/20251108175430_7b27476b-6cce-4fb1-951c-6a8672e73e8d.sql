-- Free Tier Support Migration (Cloud-run)
-- 1) Allow records without organization
ALTER TABLE public.work_orders ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE public.form_submissions ALTER COLUMN org_id DROP NOT NULL;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='calendar_events' AND column_name='organization_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.calendar_events ALTER COLUMN organization_id DROP NOT NULL';
  END IF;
END $$;

-- 2) Update RLS for work_orders (support free + org users)
DROP POLICY IF EXISTS "Users can view org work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can create org work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update org work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete org work orders" ON public.work_orders;

CREATE POLICY "Users can view work orders (free+org)"
ON public.work_orders
FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    organization_id IS NOT NULL
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND public.is_user_approved(auth.uid())
  )
);

CREATE POLICY "Users can create work orders (free+org)"
ON public.work_orders
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    organization_id IS NULL
    OR (
      organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
      AND public.is_user_approved(auth.uid())
    )
  )
);

CREATE POLICY "Users can update work orders (free+org)"
ON public.work_orders
FOR UPDATE
USING (
  user_id = auth.uid()
  OR (
    organization_id IS NOT NULL
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND public.is_user_approved(auth.uid())
  )
);

CREATE POLICY "Users can delete work orders (free+org)"
ON public.work_orders
FOR DELETE
USING (
  user_id = auth.uid()
  OR (
    organization_id IS NOT NULL
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND public.is_user_approved(auth.uid())
  )
);

-- 3) Update RLS for properties (remove approval requirement, allow free users)
DROP POLICY IF EXISTS "Approved users can create properties" ON public.properties;
DROP POLICY IF EXISTS "Approved users can delete organization properties" ON public.properties;
DROP POLICY IF EXISTS "Approved users can update organization properties" ON public.properties;
DROP POLICY IF EXISTS "Approved users can view organization properties" ON public.properties;

CREATE POLICY "Users can view properties (free+org)"
ON public.properties
FOR SELECT
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);

CREATE POLICY "Users can create properties (free)"
ON public.properties
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can update properties (free+org)"
ON public.properties
FOR UPDATE
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);

CREATE POLICY "Users can delete properties (free+org)"
ON public.properties
FOR DELETE
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);

-- 4) Update RLS for form_submissions (support free + org users)
DROP POLICY IF EXISTS "Org admins can delete submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Org admins can update submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can create submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can delete own drafts" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can mark own submissions as logged" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can update own drafts" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can view org submissions" ON public.form_submissions;

CREATE POLICY "Users can view form submissions (free+org)"
ON public.form_submissions
FOR SELECT
USING (
  created_by = auth.uid()
  OR (org_id IS NOT NULL AND org_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "Users can create form submissions (free+org)"
ON public.form_submissions
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND (
    org_id IS NULL OR org_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own drafts (free)"
ON public.form_submissions
FOR UPDATE
USING (
  created_by = auth.uid() AND status = 'draft'
);

CREATE POLICY "Users can delete own drafts (free)"
ON public.form_submissions
FOR DELETE
USING (
  created_by = auth.uid() AND status = 'draft'
);

-- 5) Update RLS for calendar_events (support free + org users)
DROP POLICY IF EXISTS "Users can create org events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view org events" ON public.calendar_events;

CREATE POLICY "Users can view calendar events (free+org)"
ON public.calendar_events
FOR SELECT
USING (
  created_by = auth.uid()
  OR (organization_id IS NOT NULL AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "Users can create calendar events (free+org)"
ON public.calendar_events
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND (
    organization_id IS NULL OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update calendar events (free+org)"
ON public.calendar_events
FOR UPDATE
USING (
  created_by = auth.uid()
  OR (organization_id IS NOT NULL AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "Users can delete calendar events (free+org)"
ON public.calendar_events
FOR DELETE
USING (
  created_by = auth.uid()
  OR (organization_id IS NOT NULL AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);