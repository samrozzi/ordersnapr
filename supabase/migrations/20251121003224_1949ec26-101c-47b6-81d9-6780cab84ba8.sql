-- Phase 1: Clean up duplicate rows in user_preferences table
-- Keep only the most recent row for each (user_id, workspace_id) combination

WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, workspace_id 
      ORDER BY updated_at DESC, created_at DESC
    ) as rn
  FROM user_preferences
)
DELETE FROM user_preferences
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Verify the unique constraint is enforced (already exists from previous migration)
-- CONSTRAINT user_preferences_user_workspace_key UNIQUE (user_id, workspace_id)