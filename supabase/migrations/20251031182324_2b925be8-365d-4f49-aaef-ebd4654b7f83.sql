-- Create calendar_events table for organization-wide events
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  all_day BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can view events in their organization
CREATE POLICY "Users can view org events"
  ON calendar_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) AND is_user_approved(auth.uid())
  );

-- Users can create events in their organization
CREATE POLICY "Users can create org events"
  ON calendar_events FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) AND created_by = auth.uid() AND is_user_approved(auth.uid())
  );

-- Users can update their own events
CREATE POLICY "Users can update own events"
  ON calendar_events FOR UPDATE
  USING (created_by = auth.uid() AND is_user_approved(auth.uid()));

-- Users can delete their own events
CREATE POLICY "Users can delete own events"
  ON calendar_events FOR DELETE
  USING (created_by = auth.uid() AND is_user_approved(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_calendar_events_org_date ON calendar_events(organization_id, event_date);
CREATE INDEX idx_calendar_events_creator ON calendar_events(created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();