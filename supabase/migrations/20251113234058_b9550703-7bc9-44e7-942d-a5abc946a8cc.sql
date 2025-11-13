-- Drop the old restrictive policy that only allows deleting drafts
DROP POLICY IF EXISTS "Users can delete own drafts (free+org)" ON "public"."form_submissions";

-- Create new policy that allows org members to delete any submission in their org
CREATE POLICY "Users can delete own drafts and org members can delete org forms" 
ON "public"."form_submissions"
AS PERMISSIVE FOR DELETE
TO public
USING (
  -- Free tier users can delete own drafts only
  ((created_by = auth.uid()) AND (org_id IS NULL) AND (status = 'draft'::text))
  OR
  -- Org members can delete ANY form in their org (drafts, submitted, logged)
  ((org_id IS NOT NULL) AND (org_id IN (
    SELECT org_memberships.org_id 
    FROM org_memberships 
    WHERE org_memberships.user_id = auth.uid()
  )))
);