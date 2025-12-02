-- Simple, foolproof fix for public overrun access
-- This migration ensures anonymous users can access the overrun template

-- Step 1: Drop ALL existing SELECT policies on form_templates
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'form_templates'
    AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON form_templates', pol.policyname);
  END LOOP;
END $$;

-- Step 2: Create a single comprehensive SELECT policy
CREATE POLICY "form_templates_select_policy"
ON form_templates
FOR SELECT
USING (
  is_active = true
  AND (
    -- Allow if global (no auth required)
    is_global = true
    -- Allow if no org (no auth required)
    OR org_id IS NULL
    -- Allow if user is in the org (auth required)
    OR (auth.uid() IS NOT NULL AND org_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ))
  )
);

-- Step 3: Ensure the overrun template exists and is marked as global
DO $$
BEGIN
  -- Try to update existing template
  UPDATE form_templates
  SET is_global = true, is_active = true
  WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26'::uuid;

  -- If no rows were updated, insert the template
  IF NOT FOUND THEN
    INSERT INTO form_templates (
      id, name, slug, category, is_active, is_global, schema
    ) VALUES (
      '06ef6c3a-84ad-4b01-b18b-be8647e94b26'::uuid,
      'Overrun Report',
      'overrun-report',
      'Operations',
      true,
      true,
      '{"title":"Overrun Report","description":"Track technician overrun incidents","sections":[{"title":"Overrun Details","hideTitle":true,"fields":[{"type":"date","key":"date","label":"Date","required":false,"hideLabel":false},{"type":"time","key":"time","label":"Time","required":false,"hideLabel":false},{"type":"repeating_group","key":"overrun_entries","label":"Technician Entry","required":false,"minInstances":1,"maxInstances":50,"fields":[{"type":"table_layout","key":"technician_info","label":"Technician Information","tableRows":2,"tableColumns":2,"tableCells":{"0-0":{"field":{"label":"Cell 0-0","placeholder":""}},"0-1":{"field":{"label":"Cell 0-1","placeholder":""}},"1-0":{"field":{"label":"Cell 1-0","placeholder":""}},"1-1":{"field":{"label":"Cell 1-1","placeholder":""}}}},{"type":"text","key":"ban_account","label":"BAN/Account Number","placeholder":"","required":false},{"type":"time","key":"rg_activate_time","label":"RG Activate Time","required":false},{"type":"time","key":"call_time","label":"Call time","required":false},{"type":"smart_import","key":"smart_import","label":"Smart Import"}]}]}]}'::jsonb
    ) ON CONFLICT (slug) DO UPDATE
      SET is_global = true, is_active = true;
  END IF;
END $$;
