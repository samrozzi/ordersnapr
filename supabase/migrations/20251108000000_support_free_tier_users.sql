-- Migration to support free tier users (users without organization)
-- This allows individual users and standalone users to use the platform

-- ============================================================================
-- 1. Make organization_id nullable for work_orders (allow individual users)
-- ============================================================================

ALTER TABLE public.work_orders
ALTER COLUMN organization_id DROP NOT NULL;

-- ============================================================================
-- 2. Update work_orders RLS policies to support free tier users
-- ============================================================================

DROP POLICY IF EXISTS "Users can view org work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can create org work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update org work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete org work orders" ON public.work_orders;

-- Free tier users can view their own work orders
-- Org users can view org work orders
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

-- Free tier users can create work orders without org
-- Org users can create work orders for their org (if approved)
CREATE POLICY "Users can create work orders"
ON public.work_orders
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- Free tier: no org required
    organization_id IS NULL
    OR (
      -- Org users: must be approved and in org
      organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
      AND is_user_approved(auth.uid())
    )
  )
);

-- Free tier users can update their own work orders
-- Org users can update org work orders (if approved)
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

-- Free tier users can delete their own work orders
-- Org users can delete org work orders (if approved)
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
-- 3. Update properties RLS policies to support free tier users
-- ============================================================================

DROP POLICY IF EXISTS "Approved users can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Approved users can create own properties" ON public.properties;
DROP POLICY IF EXISTS "Approved users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Approved users can delete own properties" ON public.properties;

-- Allow free tier users (unapproved) to view their own properties
CREATE POLICY "Users can view own properties"
ON public.properties
FOR SELECT
USING (auth.uid() = user_id);

-- Allow free tier users (unapproved) to create properties
CREATE POLICY "Users can create own properties"
ON public.properties
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow free tier users (unapproved) to update their properties
CREATE POLICY "Users can update own properties"
ON public.properties
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow free tier users (unapproved) to delete their properties
CREATE POLICY "Users can delete own properties"
ON public.properties
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Make org_id nullable for form_submissions (allow individual users)
-- ============================================================================

ALTER TABLE public.form_submissions
ALTER COLUMN org_id DROP NOT NULL;

-- ============================================================================
-- 5. Update form_templates RLS policies to support free tier users
-- ============================================================================

DROP POLICY IF EXISTS "Org members can view active templates" ON public.form_templates;

-- Allow free tier users to view global templates and their own custom templates
CREATE POLICY "Users can view templates"
ON public.form_templates
FOR SELECT
USING (
  is_active = true
  AND (
    is_global = true
    OR org_id IS NULL
    OR org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  )
);

-- ============================================================================
-- 6. Update form_submissions RLS policies to support free tier users
-- ============================================================================

DROP POLICY IF EXISTS "Users can view org submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can create submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can update own drafts" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can delete own drafts" ON public.form_submissions;

-- Free tier users can view their own submissions
-- Org users can view org submissions (if approved)
CREATE POLICY "Users can view submissions"
ON public.form_submissions
FOR SELECT
USING (
  created_by = auth.uid()
  OR (
    org_id IS NOT NULL
    AND org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND is_user_approved(auth.uid())
  )
);

-- Free tier users can create submissions without org
-- Org users can create submissions for their org (if approved)
CREATE POLICY "Users can create submissions"
ON public.form_submissions
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (
    -- Free tier: no org required
    org_id IS NULL
    OR (
      -- Org users: must be approved and in org
      org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
      AND is_user_approved(auth.uid())
    )
  )
);

-- Free tier users can update their own drafts
-- Org users can update their own drafts (if approved)
CREATE POLICY "Users can update own submissions"
ON public.form_submissions
FOR UPDATE
USING (
  auth.uid() = created_by
  AND (status = 'draft' OR org_id IS NULL)
);

-- Free tier users can delete their own drafts
-- Org users can delete their own drafts (if approved)
CREATE POLICY "Users can delete own submissions"
ON public.form_submissions
FOR DELETE
USING (
  auth.uid() = created_by
  AND (status = 'draft' OR org_id IS NULL)
);

-- Keep org admin policies
CREATE POLICY "Org admins can update submissions"
ON public.form_submissions
FOR UPDATE
USING (
  org_id IS NOT NULL
  AND (is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid()))
  AND is_user_approved(auth.uid())
);

CREATE POLICY "Org admins can delete submissions"
ON public.form_submissions
FOR DELETE
USING (
  org_id IS NOT NULL
  AND (is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid()))
  AND is_user_approved(auth.uid())
);

-- ============================================================================
-- 7. Update calendar_events RLS policies (if they exist)
-- ============================================================================

DO $$
BEGIN
  -- Check if calendar_events table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
    -- Drop existing policies
    EXECUTE 'DROP POLICY IF EXISTS "Users can view org events" ON public.calendar_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create org events" ON public.calendar_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update org events" ON public.calendar_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete org events" ON public.calendar_events';

    -- Check if organization_id column exists and make it nullable
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'calendar_events'
      AND column_name = 'organization_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.calendar_events ALTER COLUMN organization_id DROP NOT NULL';
    END IF;

    -- Create new policies supporting free tier
    EXECUTE '
    CREATE POLICY "Users can view own events"
    ON public.calendar_events
    FOR SELECT
    USING (
      user_id = auth.uid()
      OR (
        organization_id IS NOT NULL
        AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
      )
    )';

    EXECUTE '
    CREATE POLICY "Users can create events"
    ON public.calendar_events
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
    )';

    EXECUTE '
    CREATE POLICY "Users can update own events"
    ON public.calendar_events
    FOR UPDATE
    USING (
      user_id = auth.uid()
      OR (
        organization_id IS NOT NULL
        AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND is_user_approved(auth.uid())
      )
    )';

    EXECUTE '
    CREATE POLICY "Users can delete own events"
    ON public.calendar_events
    FOR DELETE
    USING (
      user_id = auth.uid()
      OR (
        organization_id IS NOT NULL
        AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND is_user_approved(auth.uid())
      )
    )';
  END IF;
END $$;
