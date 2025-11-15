-- Voice Assistant Database Schema
-- Add columns needed for voice assistant and username management features
-- This is a consolidated migration that should be picked up by Lovable

-- 1. Add openai_api_key to user_preferences (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_preferences'
        AND column_name = 'openai_api_key'
    ) THEN
        ALTER TABLE public.user_preferences
        ADD COLUMN openai_api_key TEXT;

        RAISE NOTICE 'Added openai_api_key column to user_preferences';
    ELSE
        RAISE NOTICE 'openai_api_key column already exists';
    END IF;
END $$;

-- 2. Add last_username_change to profiles (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'last_username_change'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN last_username_change TIMESTAMPTZ;

        RAISE NOTICE 'Added last_username_change column to profiles';
    ELSE
        RAISE NOTICE 'last_username_change column already exists';
    END IF;
END $$;

-- 3. Update set_username function with 7-day cooldown
CREATE OR REPLACE FUNCTION public.set_username(new_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  current_username TEXT;
  last_change TIMESTAMPTZ;
  days_since_change NUMERIC;
BEGIN
  -- Get current username and last change time
  SELECT username, last_username_change
  INTO current_username, last_change
  FROM public.profiles
  WHERE id = auth.uid();

  -- If username already exists and hasn't changed, allow (no change needed)
  IF current_username = new_username THEN
    RETURN jsonb_build_object(
      'success', true,
      'username', new_username,
      'message', 'Username unchanged'
    );
  END IF;

  -- Check cooldown period if user has changed username before
  IF last_change IS NOT NULL THEN
    days_since_change := EXTRACT(EPOCH FROM (now() - last_change)) / 86400;

    IF days_since_change < 7 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'You can only change your username once every 7 days',
        'days_remaining', CEIL(7 - days_since_change)
      );
    END IF;
  END IF;

  -- Check if username format is valid
  IF new_username !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{2,29}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Username must be 3-30 characters, start with a letter or number, and contain only letters, numbers, underscores, and hyphens'
    );
  END IF;

  -- Check if username is available
  IF NOT public.is_username_available(new_username) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Username is already taken'
    );
  END IF;

  -- Set the username and update last_username_change
  UPDATE public.profiles
  SET
    username = new_username,
    last_username_change = now()
  WHERE id = auth.uid();

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'username', new_username
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  END IF;
END;
$$;
