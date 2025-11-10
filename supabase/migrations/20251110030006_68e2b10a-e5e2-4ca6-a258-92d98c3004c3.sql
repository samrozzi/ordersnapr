-- Add navigation order preferences to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN nav_order jsonb DEFAULT '[]'::jsonb;