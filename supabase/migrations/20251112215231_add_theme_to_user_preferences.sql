-- Add theme column to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';

-- Update existing rows to have 'light' as default
UPDATE user_preferences
SET theme = 'light'
WHERE theme IS NULL;
