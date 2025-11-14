-- Add pin functionality to form_submissions
ALTER TABLE form_submissions 
ADD COLUMN is_pinned BOOLEAN DEFAULT false,
ADD COLUMN pinned_at TIMESTAMPTZ;

CREATE INDEX idx_form_submissions_pinned 
ON form_submissions(is_pinned, pinned_at DESC) 
WHERE is_pinned = true;

-- Add custom template support to note_templates
ALTER TABLE note_templates
ADD COLUMN created_by UUID REFERENCES auth.users(id),
ADD COLUMN org_id UUID REFERENCES organizations(id),
ADD COLUMN visibility TEXT DEFAULT 'global' CHECK (visibility IN ('global', 'org', 'personal')),
ADD COLUMN preview_image TEXT,
ADD COLUMN theme_config JSONB DEFAULT '{}'::jsonb;

-- Create index for template lookups
CREATE INDEX idx_note_templates_org ON note_templates(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_note_templates_creator ON note_templates(created_by) WHERE created_by IS NOT NULL;

-- Update RLS policies for note_templates to allow admins to create templates
DROP POLICY IF EXISTS "Anyone can view templates" ON note_templates;

CREATE POLICY "Anyone can view templates" 
ON note_templates 
FOR SELECT 
USING (
  is_system = true 
  OR visibility = 'global'
  OR (visibility = 'org' AND org_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ))
  OR (visibility = 'personal' AND created_by = auth.uid())
);

CREATE POLICY "Admins and org admins can create templates" 
ON note_templates 
FOR INSERT 
WITH CHECK (
  is_super_admin(auth.uid()) 
  OR (
    visibility IN ('org', 'personal')
    AND (
      is_org_admin(auth.uid(), org_id)
      OR created_by = auth.uid()
    )
  )
);

CREATE POLICY "Admins and org admins can update templates" 
ON note_templates 
FOR UPDATE 
USING (
  is_super_admin(auth.uid())
  OR (created_by = auth.uid())
  OR (org_id IS NOT NULL AND is_org_admin(auth.uid(), org_id))
);

CREATE POLICY "Admins and org admins can delete templates" 
ON note_templates 
FOR DELETE 
USING (
  is_super_admin(auth.uid())
  OR (created_by = auth.uid())
  OR (org_id IS NOT NULL AND is_org_admin(auth.uid(), org_id))
);