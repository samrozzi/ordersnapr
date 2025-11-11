-- Add username system to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Function to check if username is available
CREATE OR REPLACE FUNCTION public.is_username_available(check_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(username) = LOWER(check_username)
  );
END;
$$;

-- Function to set username for current user
CREATE OR REPLACE FUNCTION public.set_username(new_username TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Check if username is already taken
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(username) = LOWER(new_username) 
    AND id != current_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Username already taken'
    );
  END IF;
  
  -- Update username
  UPDATE profiles 
  SET username = new_username 
  WHERE id = current_user_id;
  
  RETURN json_build_object(
    'success', true,
    'username', new_username
  );
END;
$$;