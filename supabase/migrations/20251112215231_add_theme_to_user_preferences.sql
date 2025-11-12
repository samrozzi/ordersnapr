-- Add theme column to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system';

-- Update existing rows to have 'system' as default
UPDATE user_preferences
SET theme = 'system'
WHERE theme IS NULL;
