-- ============================================================================
-- Advanced Reporting & Analytics System
-- Tables for saved reports, report schedules, and report execution history
-- ============================================================================

-- Saved Reports Table
CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  configuration JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  run_count INTEGER DEFAULT 0,

  CONSTRAINT saved_reports_org_or_user CHECK (
    organization_id IS NOT NULL OR created_by IS NOT NULL
  )
);

-- Report Schedules Table
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES saved_reports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  time TIME NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'xlsx', 'csv')),
  recipients TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  CONSTRAINT schedule_frequency_check CHECK (
    (frequency = 'weekly' AND day_of_week IS NOT NULL) OR
    (frequency = 'monthly' AND day_of_month IS NOT NULL) OR
    (frequency = 'daily')
  )
);

-- Report Execution History Table
CREATE TABLE IF NOT EXISTS report_execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES saved_reports(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES report_schedules(id) ON DELETE SET NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  execution_time_ms INTEGER,
  row_count INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  generated_file_url TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_saved_reports_org ON saved_reports(organization_id);
CREATE INDEX idx_saved_reports_user ON saved_reports(created_by);
CREATE INDEX idx_saved_reports_favorite ON saved_reports(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_report_schedules_org ON report_schedules(organization_id);
CREATE INDEX idx_report_schedules_active ON report_schedules(is_active, next_run_at) WHERE is_active = true;
CREATE INDEX idx_report_execution_org ON report_execution_history(organization_id);
CREATE INDEX idx_report_execution_report ON report_execution_history(report_id);

-- RLS Policies for saved_reports
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports in their organization"
  ON saved_reports FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM org_memberships
      WHERE user_id = auth.uid()
    )
    OR (is_public = true AND organization_id IS NULL)
  );

CREATE POLICY "Users can create reports in their organization"
  ON saved_reports FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM org_memberships
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own reports"
  ON saved_reports FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete their own reports"
  ON saved_reports FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for report_schedules
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view schedules in their organization"
  ON report_schedules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM org_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage schedules"
  ON report_schedules FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM org_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM org_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- RLS Policies for report_execution_history
ALTER TABLE report_execution_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view execution history in their organization"
  ON report_execution_history FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM org_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_saved_reports_updated_at
  BEFORE UPDATE ON saved_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_schedules_updated_at
  BEFORE UPDATE ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next run time for schedules
CREATE OR REPLACE FUNCTION calculate_next_run_time(
  p_frequency TEXT,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER,
  p_time TIME,
  p_from_time TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  v_next_run TIMESTAMP WITH TIME ZONE;
  v_target_date DATE;
  v_current_dow INTEGER;
BEGIN
  -- Combine date and time
  v_target_date := p_from_time::DATE;
  v_next_run := v_target_date + p_time;

  -- If the time has already passed today, start from tomorrow
  IF v_next_run <= p_from_time THEN
    v_target_date := v_target_date + INTERVAL '1 day';
    v_next_run := v_target_date + p_time;
  END IF;

  CASE p_frequency
    WHEN 'daily' THEN
      -- Already calculated above
      RETURN v_next_run;

    WHEN 'weekly' THEN
      -- Find next occurrence of the target day of week
      v_current_dow := EXTRACT(DOW FROM v_target_date);
      IF v_current_dow <= p_day_of_week THEN
        v_target_date := v_target_date + (p_day_of_week - v_current_dow);
      ELSE
        v_target_date := v_target_date + (7 - v_current_dow + p_day_of_week);
      END IF;
      RETURN v_target_date + p_time;

    WHEN 'monthly' THEN
      -- Find next occurrence of the target day of month
      IF EXTRACT(DAY FROM v_target_date) <= p_day_of_month THEN
        v_target_date := DATE_TRUNC('month', v_target_date) + (p_day_of_month - 1) * INTERVAL '1 day';
      ELSE
        v_target_date := DATE_TRUNC('month', v_target_date + INTERVAL '1 month') + (p_day_of_month - 1) * INTERVAL '1 day';
      END IF;
      RETURN v_target_date + p_time;

    ELSE
      RETURN v_next_run;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to automatically set next_run_at on insert/update
CREATE OR REPLACE FUNCTION set_next_run_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active THEN
    NEW.next_run_at := calculate_next_run_time(
      NEW.frequency,
      NEW.day_of_week,
      NEW.day_of_month,
      NEW.time,
      COALESCE(NEW.last_run_at, now())
    );
  ELSE
    NEW.next_run_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_report_schedule_next_run
  BEFORE INSERT OR UPDATE ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION set_next_run_time();

-- Comments for documentation
COMMENT ON TABLE saved_reports IS 'User-created custom reports with saved configurations';
COMMENT ON TABLE report_schedules IS 'Automated report generation schedules';
COMMENT ON TABLE report_execution_history IS 'History of report executions for auditing and debugging';
