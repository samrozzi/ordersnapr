-- Fix username availability check to exclude current user
-- This allows users to keep their existing username or change it

CREATE OR REPLACE FUNCTION public.is_username_available(check_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  username_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = LOWER(check_username)
      AND id != auth.uid()  -- Exclude current user
  ) INTO username_exists;

  RETURN NOT username_exists;
END;
$$;

-- Update set_username to handle current user's existing username
CREATE OR REPLACE FUNCTION public.set_username(new_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  current_username TEXT;
BEGIN
  -- Check if username format is valid
  IF new_username !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{2,29}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Username must be 3-30 characters, start with a letter or number, and contain only letters, numbers, underscores, and hyphens'
    );
  END IF;

  -- Get current user's username
  SELECT username INTO current_username
  FROM public.profiles
  WHERE id = auth.uid();

  -- Check if username is available (excluding current user's username)
  IF LOWER(new_username) != LOWER(COALESCE(current_username, ''))
     AND NOT public.is_username_available(new_username) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Username is already taken'
    );
  END IF;

  -- Set the username
  UPDATE public.profiles
  SET username = new_username
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
