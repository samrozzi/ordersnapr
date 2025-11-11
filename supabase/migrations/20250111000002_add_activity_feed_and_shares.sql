-- Activity Feed and Share System
-- Track team activities and enable sharing entities to users

-- Activity Feed Table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'mention',
    'comment',
    'share',
    'assignment',
    'status_change',
    'create',
    'update',
    'delete',
    'complete'
  )),
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'work_order',
    'note',
    'invoice',
    'customer',
    'property',
    'form_submission',
    'comment'
  )),
  entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for activities
CREATE POLICY "Users can view activities in their organization"
  ON public.activities
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activities"
  ON public.activities
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Indexes for faster activity queries
CREATE INDEX activities_org_created_idx ON public.activities (organization_id, created_at DESC);
CREATE INDEX activities_user_idx ON public.activities (user_id);
CREATE INDEX activities_entity_idx ON public.activities (entity_type, entity_id);

-- Shares Table
CREATE TABLE IF NOT EXISTS public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'work_order',
    'note',
    'invoice',
    'customer',
    'property',
    'form_submission'
  )),
  entity_id UUID NOT NULL,
  message TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Prevent duplicate shares
  UNIQUE(sender_id, recipient_id, entity_type, entity_id)
);

ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for shares
CREATE POLICY "Users can view shares sent to them"
  ON public.shares
  FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can view shares they sent"
  ON public.shares
  FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can create shares"
  ON public.shares
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their received shares"
  ON public.shares
  FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Indexes for faster share queries
CREATE INDEX shares_recipient_idx ON public.shares (recipient_id, created_at DESC);
CREATE INDEX shares_sender_idx ON public.shares (sender_id, created_at DESC);
CREATE INDEX shares_entity_idx ON public.shares (entity_type, entity_id);
CREATE INDEX shares_unread_idx ON public.shares (recipient_id, read_at) WHERE read_at IS NULL;

-- Function to create activity on share
CREATE OR REPLACE FUNCTION public.create_activity_on_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create activity for the share
  INSERT INTO public.activities (
    user_id,
    organization_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    NEW.sender_id,
    NEW.organization_id,
    'share',
    NEW.entity_type,
    NEW.entity_id,
    jsonb_build_object(
      'recipient_id', NEW.recipient_id,
      'message', NEW.message
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger to create activity when share is created
CREATE TRIGGER on_share_created_activity
  AFTER INSERT ON public.shares
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_on_share();

-- Function to create activity on comment
CREATE OR REPLACE FUNCTION public.create_activity_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create activity for the comment
  INSERT INTO public.activities (
    user_id,
    organization_id,
    activity_type,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    NEW.user_id,
    NEW.organization_id,
    'comment',
    NEW.entity_type,
    NEW.entity_id,
    jsonb_build_object(
      'comment_id', NEW.id,
      'content_preview', LEFT(NEW.content, 100)
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger to create activity when comment is created
CREATE TRIGGER on_comment_created_activity
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_on_comment();

-- Function to create activity on work order status change
CREATE OR REPLACE FUNCTION public.create_activity_on_work_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create activity if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activities (
      user_id,
      organization_id,
      activity_type,
      entity_type,
      entity_id,
      metadata
    )
    SELECT
      NEW.user_id,
      om.organization_id,
      'status_change',
      'work_order',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'customer_name', NEW.customer_name
      )
    FROM public.organization_members om
    WHERE om.user_id = NEW.user_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to create activity on work order status change
CREATE TRIGGER on_work_order_status_change_activity
  AFTER UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_activity_on_work_order_status_change();

-- Function to get recent activities with user info
CREATE OR REPLACE FUNCTION public.get_recent_activities(org_id UUID, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  user_full_name TEXT,
  user_email TEXT,
  activity_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    p.username,
    p.full_name as user_full_name,
    p.email as user_email,
    a.activity_type,
    a.entity_type,
    a.entity_id,
    a.metadata,
    a.created_at
  FROM public.activities a
  JOIN public.profiles p ON a.user_id = p.id
  WHERE a.organization_id = org_id
  ORDER BY a.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Function to get user's unread shares count
CREATE OR REPLACE FUNCTION public.get_unread_shares_count(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO count
  FROM public.shares
  WHERE recipient_id = user_id_param
    AND read_at IS NULL;

  RETURN count;
END;
$$;
