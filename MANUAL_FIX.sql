-- ============================================================================
-- MANUAL FIX FOR FREE TIER USERS
-- Run this SQL in your Supabase SQL Editor to fix all free tier issues
-- ============================================================================

-- ============================================================================
-- PART 1: Make organization_id nullable and update RLS policies
-- ============================================================================

-- Make organization_id nullable for work_orders
ALTER TABLE public.work_orders
ALTER COLUMN organization_id DROP NOT NULL;

-- Make org_id nullable for form_submissions
ALTER TABLE public.form_submissions
ALTER COLUMN org_id DROP NOT NULL;

-- Make organization_id nullable for calendar_events (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'calendar_events'
    AND column_name = 'organization_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.calendar_events ALTER COLUMN organization_id DROP NOT NULL';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Update work_orders RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Approved users can view own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Approved users can create own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Approved users can update own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Approved users can delete own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can view org work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can create org work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update org work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete org work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can view own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can create work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete own work orders" ON public.work_orders;

CREATE POLICY "Users can view own work orders"
ON public.work_orders
FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    organization_id IS NOT NULL
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can create work orders"
ON public.work_orders
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    organization_id IS NULL
    OR (
      organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
      AND is_user_approved(auth.uid())
    )
  )
);

CREATE POLICY "Users can update own work orders"
ON public.work_orders
FOR UPDATE
USING (
  user_id = auth.uid()
  OR (
    organization_id IS NOT NULL
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND is_user_approved(auth.uid())
  )
);

CREATE POLICY "Users can delete own work orders"
ON public.work_orders
FOR DELETE
USING (
  user_id = auth.uid()
  OR (
    organization_id IS NOT NULL
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND is_user_approved(auth.uid())
  )
);

-- ============================================================================
-- PART 3: Update properties RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Approved users can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Approved users can create own properties" ON public.properties;
DROP POLICY IF EXISTS "Approved users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Approved users can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can create own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;

CREATE POLICY "Users can view own properties"
ON public.properties
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own properties"
ON public.properties
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own properties"
ON public.properties
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own properties"
ON public.properties
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- PART 4: Update form_templates RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Org members can view active templates" ON public.form_templates;
DROP POLICY IF EXISTS "Users can view templates" ON public.form_templates;

CREATE POLICY "Users can view templates"
ON public.form_templates
FOR SELECT
USING (
  is_active = true
  AND (
    is_global = true
    OR user_id = auth.uid()
    OR org_id IS NULL
    OR org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  )
);

-- Allow free tier users to create templates
DROP POLICY IF EXISTS "Users can create templates" ON public.form_templates;
CREATE POLICY "Users can create templates"
ON public.form_templates
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- ============================================================================
-- PART 5: Update form_submissions RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view org submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can create submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can update own drafts" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can delete own drafts" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can view submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can update own submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can delete own submissions" ON public.form_submissions;

CREATE POLICY "Users can view submissions"
ON public.form_submissions
FOR SELECT
USING (
  created_by = auth.uid()
  OR (
    org_id IS NOT NULL
    AND org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can create submissions"
ON public.form_submissions
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (
    org_id IS NULL
    OR org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update own submissions"
ON public.form_submissions
FOR UPDATE
USING (
  auth.uid() = created_by
  AND (status = 'draft' OR org_id IS NULL)
);

CREATE POLICY "Users can delete own submissions"
ON public.form_submissions
FOR DELETE
USING (
  auth.uid() = created_by
  AND (status = 'draft' OR org_id IS NULL)
);

-- ============================================================================
-- PART 6: Add onboarding tracking columns
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- PART 7: Auto-approve free tier users (no organization)
-- ============================================================================

-- Update existing free tier users to approved status
UPDATE public.profiles
SET approval_status = 'approved',
    onboarding_completed = true
WHERE organization_id IS NULL
  AND approval_status = 'pending';

-- Update the trigger function to auto-approve free tier users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, approval_status, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'approved',  -- Default to approved (free tier)
    false        -- Onboarding not completed yet
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- DONE! Free tier users should now work
-- ============================================================================
