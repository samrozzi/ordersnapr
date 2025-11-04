-- Add scope column to form_templates
ALTER TABLE form_templates 
ADD COLUMN scope text DEFAULT 'user' CHECK (scope IN ('global', 'organization', 'user'));

-- Update existing records: global templates stay global, others become organization-scoped
UPDATE form_templates 
SET scope = CASE 
  WHEN is_global = true THEN 'global'
  ELSE 'organization'
END;

-- Create index for better query performance
CREATE INDEX idx_form_templates_scope ON form_templates(scope);
CREATE INDEX idx_form_templates_org_scope ON form_templates(org_id, scope);

-- Update RLS policies to enforce scope-based access
DROP POLICY IF EXISTS "Org admins can manage templates" ON form_templates;
DROP POLICY IF EXISTS "Super admins can manage all templates" ON form_templates;
DROP POLICY IF EXISTS "Org members can view active templates" ON form_templates;

-- Super admins can manage all templates
CREATE POLICY "Super admins can manage all templates"
ON form_templates
FOR ALL
USING (is_super_admin(auth.uid()));

-- Org admins can create organization-scoped templates
CREATE POLICY "Org admins can create org templates"
ON form_templates
FOR INSERT
WITH CHECK (
  scope = 'organization' 
  AND is_org_admin(auth.uid(), org_id)
);

-- Org admins can update/delete organization-scoped templates in their org
CREATE POLICY "Org admins can manage org templates"
ON form_templates
FOR ALL
USING (
  scope = 'organization' 
  AND is_org_admin(auth.uid(), org_id)
);

-- Users can create user-scoped templates
CREATE POLICY "Users can create personal templates"
ON form_templates
FOR INSERT
WITH CHECK (
  scope = 'user' 
  AND created_by = auth.uid()
  AND org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Users can manage their own user-scoped templates
CREATE POLICY "Users can manage own templates"
ON form_templates
FOR ALL
USING (
  scope = 'user' 
  AND created_by = auth.uid()
);

-- View access: users can see global, org, and their own templates
CREATE POLICY "Users can view applicable templates"
ON form_templates
FOR SELECT
USING (
  is_active = true
  AND (
    scope = 'global'
    OR (scope = 'organization' AND org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    OR (scope = 'user' AND created_by = auth.uid())
  )
);