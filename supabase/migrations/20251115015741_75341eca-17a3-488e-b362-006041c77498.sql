-- Add org_id to dashboard_widgets
ALTER TABLE dashboard_widgets 
ADD COLUMN org_id uuid REFERENCES organizations(id);

-- Backfill org_id from user's active_org_id (use first org if active_org_id is null)
UPDATE dashboard_widgets dw
SET org_id = COALESCE(
  (SELECT active_org_id FROM profiles WHERE id = dw.user_id),
  (SELECT org_id FROM org_memberships WHERE user_id = dw.user_id LIMIT 1)
)
WHERE dw.org_id IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_org_user 
ON dashboard_widgets(org_id, user_id);

-- Update RLS policies to filter by org_id
DROP POLICY IF EXISTS "Users can view own widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Users can insert own widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Users can update own widgets" ON dashboard_widgets;
DROP POLICY IF EXISTS "Users can delete own widgets" ON dashboard_widgets;

CREATE POLICY "Users can view own org widgets" 
ON dashboard_widgets
FOR SELECT
USING (
  user_id = auth.uid() AND (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert own org widgets" 
ON dashboard_widgets
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can update own org widgets" 
ON dashboard_widgets
FOR UPDATE
USING (
  user_id = auth.uid() AND (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete own org widgets" 
ON dashboard_widgets
FOR DELETE
USING (
  user_id = auth.uid() AND (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  )
);

-- Add org_id to water_intake_log
ALTER TABLE water_intake_log 
ADD COLUMN org_id uuid REFERENCES organizations(id);

-- Backfill org_id
UPDATE water_intake_log wil
SET org_id = COALESCE(
  (SELECT active_org_id FROM profiles WHERE id = wil.user_id),
  (SELECT org_id FROM org_memberships WHERE user_id = wil.user_id LIMIT 1)
)
WHERE wil.org_id IS NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_water_intake_log_org_user 
ON water_intake_log(org_id, user_id, date);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view own water intake" ON water_intake_log;
DROP POLICY IF EXISTS "Users can create own water intake" ON water_intake_log;
DROP POLICY IF EXISTS "Users can update own water intake" ON water_intake_log;

CREATE POLICY "Users can view own org water intake" 
ON water_intake_log
FOR SELECT
USING (
  user_id = auth.uid() AND (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert own org water intake" 
ON water_intake_log
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can update own org water intake" 
ON water_intake_log
FOR UPDATE
USING (
  user_id = auth.uid() AND (
    org_id IS NULL OR
    org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  )
);