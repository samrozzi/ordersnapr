-- Fix RLS policy to allow unauthenticated access to global form templates
-- This enables the public overrun report page to work without authentication

-- Drop the existing policy that requires authentication for all template reads
DROP POLICY IF EXISTS "Org members can view active templates" ON form_templates;

-- Create separate policies for public and org-specific template access
-- Policy 1: Allow anyone (including unauthenticated users) to view global templates
CREATE POLICY "Public can view global templates"
  ON form_templates FOR SELECT
  USING (
    is_global = true
    AND is_active = true
  );

-- Policy 2: Allow authenticated org members to view their org's templates
CREATE POLICY "Org members can view org templates"
  ON form_templates FOR SELECT
  USING (
    org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND is_active = true
  );

-- Ensure the overrun template is marked as global
-- This allows the public overrun page to access it
UPDATE form_templates
SET is_global = true
WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26'
  AND is_global IS NOT TRUE;
