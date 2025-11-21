-- Drop old unique constraint that only allows one preference row per user
ALTER TABLE user_preferences 
DROP CONSTRAINT IF EXISTS user_preferences_user_id_key;

-- Add new composite unique constraint for (user_id, workspace_id)
-- This allows multiple rows per user - one for each workspace (personal + orgs)
ALTER TABLE user_preferences 
ADD CONSTRAINT user_preferences_user_workspace_key 
UNIQUE (user_id, workspace_id);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_workspace 
ON user_preferences(user_id, workspace_id);

-- Add helpful comment explaining the constraint
COMMENT ON CONSTRAINT user_preferences_user_workspace_key ON user_preferences IS 
'Ensures each user can have one set of preferences per workspace. NULL workspace_id = personal workspace.';