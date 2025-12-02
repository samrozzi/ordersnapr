-- CRITICAL FIX: Allow anonymous access to overrun template
-- This migration MUST run to enable public access to /private/overrun

-- Step 1: Remove ALL existing SELECT policies on form_templates
DROP POLICY IF EXISTS "Users can view templates" ON form_templates;
DROP POLICY IF EXISTS "Public can view global templates" ON form_templates;
DROP POLICY IF EXISTS "Org members can view org templates" ON form_templates;
DROP POLICY IF EXISTS "Org members can view active templates" ON form_templates;
DROP POLICY IF EXISTS "Allow template access" ON form_templates;
DROP POLICY IF EXISTS "form_templates_select_policy" ON form_templates;

-- Step 2: Create ONE policy that allows both anonymous and authenticated access
CREATE POLICY "allow_template_reads"
ON form_templates FOR SELECT
USING (
  is_active = true
  AND (
    is_global = true
    OR org_id IS NULL
    OR (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.organization_id = form_templates.org_id
      )
    )
  )
);

-- Step 3: Mark the overrun template as global (CRITICAL)
UPDATE form_templates
SET
  is_global = true,
  is_active = true
WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26'::uuid;

-- Step 4: Verify the update worked (for logging)
DO $$
DECLARE
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count
  FROM form_templates
  WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26'::uuid
    AND is_global = true;

  IF template_count = 0 THEN
    RAISE WARNING 'Overrun template not found or is_global not set to true';
  ELSE
    RAISE NOTICE 'Overrun template successfully marked as global';
  END IF;
END $$;
