-- Drop existing restrictive UPDATE policy that only allows draft status
DROP POLICY IF EXISTS "Users can update own drafts (free)" ON form_submissions;

-- Create new UPDATE policy that allows submitting forms (changing status from draft to submitted)
CREATE POLICY "Users can update own submissions (free+org)"
ON form_submissions
FOR UPDATE
USING (
  (created_by = auth.uid()) OR 
  (org_id IS NOT NULL AND org_id IN (
    SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
  ))
)
WITH CHECK (
  (created_by = auth.uid()) OR 
  (org_id IS NOT NULL AND org_id IN (
    SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
  ))
);

-- Ensure DELETE policy allows deleting drafts
DROP POLICY IF EXISTS "Users can delete own drafts (free)" ON form_submissions;

CREATE POLICY "Users can delete own drafts (free+org)"
ON form_submissions
FOR DELETE
USING (
  ((created_by = auth.uid()) AND (status = 'draft')) OR
  ((org_id IS NOT NULL) AND (org_id IN (
    SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
  )) AND (status = 'draft'))
);