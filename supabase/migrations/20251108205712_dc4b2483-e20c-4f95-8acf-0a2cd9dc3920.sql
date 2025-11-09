-- Phase 2: Multi-Organization Support Migration

-- Add active_org_id to profiles to track which org context user is currently in
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_active_org_id ON public.profiles(active_org_id);

-- Update RLS policies for work_orders to support multi-org via org_memberships
DROP POLICY IF EXISTS "Users can view work orders (free+org)" ON public.work_orders;
CREATE POLICY "Users can view work orders (free+org)"
ON public.work_orders
FOR SELECT
USING (
  user_id = auth.uid() 
  OR (
    organization_id IS NOT NULL 
    AND organization_id IN (
      SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can create work orders (free+org)" ON public.work_orders;
CREATE POLICY "Users can create work orders (free+org)"
ON public.work_orders
FOR INSERT
WITH CHECK (
  (user_id = auth.uid() AND organization_id IS NULL)
  OR (
    organization_id IS NOT NULL 
    AND organization_id IN (
      SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()
    )
    AND is_user_approved(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update work orders (free+org)" ON public.work_orders;
CREATE POLICY "Users can update work orders (free+org)"
ON public.work_orders
FOR UPDATE
USING (
  user_id = auth.uid() 
  OR (
    organization_id IS NOT NULL 
    AND organization_id IN (
      SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()
    )
    AND is_user_approved(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can delete work orders (free+org)" ON public.work_orders;
CREATE POLICY "Users can delete work orders (free+org)"
ON public.work_orders
FOR DELETE
USING (
  user_id = auth.uid() 
  OR (
    organization_id IS NOT NULL 
    AND organization_id IN (
      SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()
    )
    AND is_user_approved(auth.uid())
  )
);

-- Update RLS policies for calendar_events to support multi-org
DROP POLICY IF EXISTS "Users can view calendar events (free+org)" ON public.calendar_events;
CREATE POLICY "Users can view calendar events (free+org)"
ON public.calendar_events
FOR SELECT
USING (
  created_by = auth.uid() 
  OR (
    organization_id IS NOT NULL 
    AND organization_id IN (
      SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can create calendar events (free+org)" ON public.calendar_events;
CREATE POLICY "Users can create calendar events (free+org)"
ON public.calendar_events
FOR INSERT
WITH CHECK (
  created_by = auth.uid() 
  AND (
    organization_id IS NULL 
    OR organization_id IN (
      SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can update calendar events (free+org)" ON public.calendar_events;
CREATE POLICY "Users can update calendar events (free+org)"
ON public.calendar_events
FOR UPDATE
USING (
  created_by = auth.uid() 
  OR (
    organization_id IS NOT NULL 
    AND organization_id IN (
      SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can delete calendar events (free+org)" ON public.calendar_events;
CREATE POLICY "Users can delete calendar events (free+org)"
ON public.calendar_events
FOR DELETE
USING (
  created_by = auth.uid() 
  OR (
    organization_id IS NOT NULL 
    AND organization_id IN (
      SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()
    )
  )
);

-- Update RLS policies for form_submissions to support multi-org
DROP POLICY IF EXISTS "Users can view form submissions (free+org)" ON public.form_submissions;
CREATE POLICY "Users can view form submissions (free+org)"
ON public.form_submissions
FOR SELECT
USING (
  created_by = auth.uid() 
  OR (
    org_id IS NOT NULL 
    AND org_id IN (
      SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can create form submissions (free+org)" ON public.form_submissions;
CREATE POLICY "Users can create form submissions (free+org)"
ON public.form_submissions
FOR INSERT
WITH CHECK (
  created_by = auth.uid() 
  AND (
    org_id IS NULL 
    OR org_id IN (
      SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid()
    )
  )
);

-- Update handle_new_user function to auto-approve free tier users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-approve users without an organization (free tier)
  -- Users who join an organization will need approval
  INSERT INTO public.profiles (id, email, full_name, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'approved'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$function$;