-- Fix username functions to return correct types
DROP FUNCTION IF EXISTS public.is_username_available(TEXT);
DROP FUNCTION IF EXISTS public.set_username(TEXT);

-- Create corrected is_username_available function that returns JSON
CREATE OR REPLACE FUNCTION public.is_username_available(check_username TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_available BOOLEAN;
BEGIN
  is_available := NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(username) = LOWER(check_username)
  );
  
  RETURN json_build_object('available', is_available);
END;
$$;

-- Recreate set_username with proper error handling
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

-- Create activities table for activity feed
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for querying activities
CREATE INDEX IF NOT EXISTS idx_activities_user_org ON public.activities(user_id, org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities(entity_type, entity_id);

-- Enable RLS on activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for activities
CREATE POLICY "Users can view own activities"
  ON public.activities
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activities"
  ON public.activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to get recent activities
CREATE OR REPLACE FUNCTION public.get_recent_activities(
  limit_count INTEGER DEFAULT 50,
  org_filter UUID DEFAULT NULL
)
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
      'id', a.id,
      'user_id', a.user_id,
      'org_id', a.org_id,
      'action_type', a.action_type,
      'entity_type', a.entity_type,
      'entity_id', a.entity_id,
      'metadata', a.metadata,
      'created_at', a.created_at
    )
  ) INTO result
  FROM activities a
  WHERE a.user_id = auth.uid()
    AND (org_filter IS NULL OR a.org_id = org_filter)
  ORDER BY a.created_at DESC
  LIMIT limit_count;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Create shares table for collaborative features
CREATE TABLE IF NOT EXISTS public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'view',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, shared_with)
);

-- Create index for shares
CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON public.shares(shared_with, entity_type);
CREATE INDEX IF NOT EXISTS idx_shares_entity ON public.shares(entity_type, entity_id);

-- Enable RLS on shares
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for shares
CREATE POLICY "Users can view shares they created or received"
  ON public.shares
  FOR SELECT
  USING (auth.uid() = shared_by OR auth.uid() = shared_with);

CREATE POLICY "Users can create shares for own content"
  ON public.shares
  FOR INSERT
  WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can delete shares they created"
  ON public.shares
  FOR DELETE
  USING (auth.uid() = shared_by);