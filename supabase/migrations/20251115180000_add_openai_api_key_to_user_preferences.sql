-- Add OpenAI API key column to user_preferences for voice assistant feature
-- Allows users to store their API key in the database instead of localStorage
-- This persists across logout/login and different devices

-- Add the column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences'
    AND column_name = 'openai_api_key'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN openai_api_key TEXT;
    COMMENT ON COLUMN user_preferences.openai_api_key IS 'OpenAI API key for voice transcription. Stored encrypted at rest by Supabase. Protected by RLS policies.';
  END IF;
END $$;

-- Also add last_username_change for username cooldown tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'last_username_change'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_username_change TIMESTAMPTZ;
    COMMENT ON COLUMN profiles.last_username_change IS 'Timestamp of last username change for enforcing 7-day cooldown';
  END IF;
END $$;
