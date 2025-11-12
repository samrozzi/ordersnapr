-- Create reminders table for task and reminder management
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  due_time TIME,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON reminders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reminders_organization_id ON reminders(organization_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_priority ON reminders(priority);

-- Add RLS policies
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reminders or reminders assigned to them
CREATE POLICY "Users can view own or assigned reminders"
  ON reminders FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = assigned_to
    OR organization_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create reminders
CREATE POLICY "Users can create reminders"
  ON reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reminders or reminders assigned to them
CREATE POLICY "Users can update own or assigned reminders"
  ON reminders FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.uid() = assigned_to
    OR organization_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Policy: Users can delete their own reminders or org admins can delete org reminders
CREATE POLICY "Users can delete own reminders or org admins can delete org reminders"
  ON reminders FOR DELETE
  USING (
    auth.uid() = user_id
    OR organization_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_reminders_updated_at_trigger
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_reminders_updated_at();
