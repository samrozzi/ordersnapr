-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'

  -- Link to related entities
  entity_type TEXT, -- 'work_order', 'invoice', 'form_submission', 'calendar_event', etc.
  entity_id UUID,

  -- Notification metadata
  action_url TEXT, -- Where to navigate when clicked
  icon TEXT, -- Icon name from lucide-react

  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Indexes for performance
  CONSTRAINT notifications_type_check CHECK (type IN ('info', 'success', 'warning', 'error'))
);

-- Create indexes
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_org ON notifications(org_id);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-delete old read notifications (keep for 30 days)
CREATE OR REPLACE FUNCTION delete_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
    AND read_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON TABLE notifications IS 'In-app notifications for users';
