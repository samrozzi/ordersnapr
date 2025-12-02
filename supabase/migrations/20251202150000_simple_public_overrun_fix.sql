-- Simple fix: Allow public access to overrun report
-- Drop and recreate the SELECT policy to allow anonymous access

DROP POLICY IF EXISTS "Users can view templates" ON form_templates;
DROP POLICY IF EXISTS "Public can view global templates" ON form_templates;
DROP POLICY IF EXISTS "Org members can view org templates" ON form_templates;
DROP POLICY IF EXISTS "Org members can view active templates" ON form_templates;

-- One simple policy that works for everyone
CREATE POLICY "Allow template access"
ON form_templates FOR SELECT
USING (
  is_active = true AND (
    is_global = true OR
    org_id IS NULL OR
    auth.uid() IN (SELECT id FROM profiles WHERE organization_id = form_templates.org_id)
  )
);

-- Make overrun template global
UPDATE form_templates
SET is_global = true, is_active = true
WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26';
