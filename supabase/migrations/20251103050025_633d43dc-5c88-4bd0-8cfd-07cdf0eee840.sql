-- Add created_by tracking to form_templates
ALTER TABLE form_templates 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Backfill existing templates with first user from org
UPDATE form_templates 
SET created_by = (
  SELECT id FROM profiles 
  WHERE organization_id = form_templates.org_id 
  LIMIT 1
) 
WHERE created_by IS NULL;

-- Add org admin flag to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_org_admin boolean DEFAULT false;

-- Update RLS policy for template deletion
DROP POLICY IF EXISTS "Org admins can manage templates" ON form_templates;

CREATE POLICY "Org admins can manage templates"
ON form_templates
FOR ALL
TO authenticated
USING (
  is_org_admin(auth.uid(), org_id) 
  OR is_super_admin(auth.uid())
  OR created_by = auth.uid()
);

-- Add comment for documentation
COMMENT ON COLUMN form_templates.created_by IS 'User who created this template';
COMMENT ON COLUMN profiles.is_org_admin IS 'Whether user is an admin for their organization';