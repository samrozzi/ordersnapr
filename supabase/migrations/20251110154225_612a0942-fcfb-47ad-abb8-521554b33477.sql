-- Drop existing RLS policies on notes table
DROP POLICY IF EXISTS "Users can create own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can view own notes" ON notes;

-- Create new RLS policies that respect org_id and active_org_id
CREATE POLICY "Users can view own notes in active org"
ON notes
FOR SELECT
USING (
  auth.uid() = user_id 
  AND (
    -- Personal workspace: both org_id and active_org_id are NULL
    (org_id IS NULL AND (SELECT active_org_id FROM profiles WHERE id = auth.uid()) IS NULL)
    OR 
    -- Organization workspace: org_id matches active_org_id
    (org_id = (SELECT active_org_id FROM profiles WHERE id = auth.uid()))
  )
);

CREATE POLICY "Users can create notes in active org"
ON notes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Personal workspace: both org_id and active_org_id are NULL
    (org_id IS NULL AND (SELECT active_org_id FROM profiles WHERE id = auth.uid()) IS NULL)
    OR 
    -- Organization workspace: org_id matches active_org_id
    (org_id = (SELECT active_org_id FROM profiles WHERE id = auth.uid()))
  )
);

CREATE POLICY "Users can update own notes in active org"
ON notes
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND (
    -- Personal workspace: both org_id and active_org_id are NULL
    (org_id IS NULL AND (SELECT active_org_id FROM profiles WHERE id = auth.uid()) IS NULL)
    OR 
    -- Organization workspace: org_id matches active_org_id
    (org_id = (SELECT active_org_id FROM profiles WHERE id = auth.uid()))
  )
);

CREATE POLICY "Users can delete own notes in active org"
ON notes
FOR DELETE
USING (
  auth.uid() = user_id 
  AND (
    -- Personal workspace: both org_id and active_org_id are NULL
    (org_id IS NULL AND (SELECT active_org_id FROM profiles WHERE id = auth.uid()) IS NULL)
    OR 
    -- Organization workspace: org_id matches active_org_id
    (org_id = (SELECT active_org_id FROM profiles WHERE id = auth.uid()))
  )
);