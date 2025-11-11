-- Add username system to profiles table
-- Supports @mention functionality and unique user identification

-- Add username column to profiles
ALTER TABLE public.profiles
ADD COLUMN username TEXT;

-- Create unique index on username (case-insensitive)
CREATE UNIQUE INDEX profiles_username_unique_idx
ON public.profiles (LOWER(username));

-- Add constraint to validate username format
-- Username must be 3-30 characters, alphanumeric plus underscore and hyphen
-- Must start with letter or number
ALTER TABLE public.profiles
ADD CONSTRAINT username_format_check
CHECK (
  username IS NULL OR (
    username ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{2,29}$'
  )
);

-- Function to check if username is available
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
  ) INTO username_exists;

  RETURN NOT username_exists;
END;
$$;

-- Function to validate and set username
CREATE OR REPLACE FUNCTION public.set_username(new_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
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

-- Function to search users by username or email for @mentions
CREATE OR REPLACE FUNCTION public.search_users_for_mention(search_query TEXT, org_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  full_name TEXT,
  display_text TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.email,
    p.full_name,
    CASE
      WHEN p.username IS NOT NULL THEN '@' || p.username
      ELSE p.email
    END as display_text
  FROM public.profiles p
  WHERE
    -- Search by username or email
    (
      p.username ILIKE '%' || search_query || '%' OR
      p.email ILIKE '%' || search_query || '%' OR
      p.full_name ILIKE '%' || search_query || '%'
    )
    -- If org_id provided, filter by organization membership
    AND (
      org_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = p.id AND om.organization_id = org_id
      )
    )
    -- Exclude current user
    AND p.id != auth.uid()
  ORDER BY
    -- Prioritize exact username matches
    CASE WHEN LOWER(p.username) = LOWER(search_query) THEN 0 ELSE 1 END,
    -- Then username partial matches
    CASE WHEN p.username ILIKE search_query || '%' THEN 0 ELSE 1 END,
    -- Then by full name
    p.full_name
  LIMIT 10;
END;
$$;

-- Update handle_new_user function to support username in metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'username'
  );
  RETURN new;
END;
$$;

-- Add RLS policy to allow users to search for other users
CREATE POLICY "Users can search other users for mentions"
  ON public.profiles
  FOR SELECT
  USING (true);  -- Allow all authenticated users to search

-- Add index for faster username/email searches
CREATE INDEX profiles_username_search_idx ON public.profiles (LOWER(username));
CREATE INDEX profiles_email_search_idx ON public.profiles (LOWER(email));

-- Create table for user mentions/tags
CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentioned_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mentioning_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('work_order', 'comment', 'note', 'invoice', 'form_submission')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,

  -- Prevent duplicate mentions
  UNIQUE(mentioned_user_id, entity_type, entity_id)
);

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- RLS policies for mentions
CREATE POLICY "Users can view their own mentions"
  ON public.mentions
  FOR SELECT
  USING (auth.uid() = mentioned_user_id);

CREATE POLICY "Users can create mentions"
  ON public.mentions
  FOR INSERT
  WITH CHECK (auth.uid() = mentioning_user_id);

CREATE POLICY "Users can update their mention read status"
  ON public.mentions
  FOR UPDATE
  USING (auth.uid() = mentioned_user_id);

-- Add index for faster mention queries
CREATE INDEX mentions_user_entity_idx ON public.mentions (mentioned_user_id, entity_type, entity_id);
CREATE INDEX mentions_unread_idx ON public.mentions (mentioned_user_id, read_at) WHERE read_at IS NULL;

-- Function to create mentions from content
CREATE OR REPLACE FUNCTION public.extract_and_create_mentions(
  content TEXT,
  entity_type TEXT,
  entity_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  mention_count INTEGER := 0;
  username_match TEXT;
  user_id_match UUID;
BEGIN
  -- Extract @username mentions using regex
  FOR username_match IN
    SELECT DISTINCT regexp_matches[1]
    FROM regexp_matches(content, '@([a-zA-Z0-9_-]+)', 'g') AS regexp_matches
  LOOP
    -- Find user by username
    SELECT id INTO user_id_match
    FROM public.profiles
    WHERE LOWER(username) = LOWER(username_match);

    -- Create mention if user found
    IF user_id_match IS NOT NULL THEN
      INSERT INTO public.mentions (mentioned_user_id, mentioning_user_id, entity_type, entity_id)
      VALUES (user_id_match, auth.uid(), entity_type, entity_id)
      ON CONFLICT (mentioned_user_id, entity_type, entity_id) DO NOTHING;

      mention_count := mention_count + 1;
    END IF;
  END LOOP;

  RETURN mention_count;
END;
$$;

-- Comments table for work orders, notes, etc.
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('work_order', 'note', 'invoice', 'customer', 'property', 'form_submission')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for comments
CREATE POLICY "Users can view comments in their organization"
  ON public.comments
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can create comments"
  ON public.comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own comments"
  ON public.comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can soft delete own comments"
  ON public.comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at on comments
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Trigger to extract mentions from comments
CREATE OR REPLACE FUNCTION public.handle_comment_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Extract and create mentions from comment content
  PERFORM public.extract_and_create_mentions(NEW.content, 'comment', NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_created_mentions
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_mentions();

-- Add indexes for faster comment queries
CREATE INDEX comments_entity_idx ON public.comments (entity_type, entity_id, deleted_at);
CREATE INDEX comments_user_idx ON public.comments (user_id);
CREATE INDEX comments_org_idx ON public.comments (organization_id);
