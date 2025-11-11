-- Create mentions table for @mentions functionality
CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  context TEXT
);

CREATE INDEX IF NOT EXISTS idx_mentions_user ON public.mentions(mentioned_user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_mentions_entity ON public.mentions(entity_type, entity_id);

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mentions of themselves"
  ON public.mentions
  FOR SELECT
  USING (auth.uid() = mentioned_user_id OR auth.uid() = mentioned_by);

CREATE POLICY "Users can create mentions"
  ON public.mentions
  FOR INSERT
  WITH CHECK (auth.uid() = mentioned_by);

CREATE POLICY "Users can update their own mentions"
  ON public.mentions
  FOR UPDATE
  USING (auth.uid() = mentioned_user_id);

-- Create comments table for commenting functionality
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.comments(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments they can access"
  ON public.comments
  FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can create comments"
  ON public.comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments
  FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can soft delete own comments"
  ON public.comments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to search users for mentions
CREATE OR REPLACE FUNCTION public.search_users_for_mention(search_query TEXT, org_filter UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'full_name', p.full_name,
      'email', p.email
    )
  ) INTO result
  FROM profiles p
  WHERE p.id != auth.uid()
    AND (org_filter IS NULL OR p.organization_id = org_filter)
    AND (
      p.username ILIKE '%' || search_query || '%'
      OR p.full_name ILIKE '%' || search_query || '%'
      OR p.email ILIKE '%' || search_query || '%'
    )
  LIMIT 10;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;