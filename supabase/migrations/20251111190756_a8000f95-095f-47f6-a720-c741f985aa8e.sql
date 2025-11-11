-- Fix username availability check to allow users to keep their own username
DROP FUNCTION IF EXISTS public.is_username_available(text);

CREATE OR REPLACE FUNCTION public.is_username_available(check_username text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_available BOOLEAN;
  current_user_id UUID;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  -- Check if username exists for OTHER users (not the current user)
  is_available := NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(username) = LOWER(check_username)
    AND id != COALESCE(current_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
  
  RETURN json_build_object('available', is_available);
END;
$$;