-- Add sidebar_enabled_features column to store user's enabled sidebar items
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS sidebar_enabled_features JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN user_preferences.sidebar_enabled_features IS 'Array of enabled feature modules in sidebar navigation per workspace (e.g. ["work_orders", "forms", "calendar"])';

-- Add workspace_id column to differentiate between personal and org preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS workspace_id TEXT;

COMMENT ON COLUMN user_preferences.workspace_id IS 'Organization ID for org workspace, NULL for personal workspace';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_workspace 
ON user_preferences(user_id, workspace_id);