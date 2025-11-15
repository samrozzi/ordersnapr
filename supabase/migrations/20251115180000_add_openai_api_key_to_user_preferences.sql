-- Add OpenAI API key column to user_preferences for voice assistant feature
-- Allows users to store their API key in the database instead of localStorage
-- This persists across logout/login and different devices

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS openai_api_key TEXT;

COMMENT ON COLUMN user_preferences.openai_api_key IS 'OpenAI API key for voice transcription. Stored encrypted at rest by Supabase. Protected by RLS policies.';
