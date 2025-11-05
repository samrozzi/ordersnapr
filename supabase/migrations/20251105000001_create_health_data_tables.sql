-- Create tables for Apple Health data storage

-- Health imports tracking table
CREATE TABLE IF NOT EXISTS public.health_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_mb DECIMAL(10, 2) NOT NULL,
  record_count INTEGER NOT NULL,
  filter_date TIMESTAMPTZ,
  import_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health records table (stores individual health data points)
CREATE TABLE IF NOT EXISTS public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.health_imports(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  value TEXT,
  unit TEXT,
  record_date TIMESTAMPTZ NOT NULL,
  source_name TEXT,
  device TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_health_imports_org_id ON public.health_imports(org_id);
CREATE INDEX IF NOT EXISTS idx_health_imports_user_id ON public.health_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_health_imports_import_date ON public.health_imports(import_date);

CREATE INDEX IF NOT EXISTS idx_health_records_import_id ON public.health_records(import_id);
CREATE INDEX IF NOT EXISTS idx_health_records_org_id ON public.health_records(org_id);
CREATE INDEX IF NOT EXISTS idx_health_records_type ON public.health_records(record_type);
CREATE INDEX IF NOT EXISTS idx_health_records_date ON public.health_records(record_date);
CREATE INDEX IF NOT EXISTS idx_health_records_type_date ON public.health_records(record_type, record_date);

-- Enable Row Level Security
ALTER TABLE public.health_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_imports
CREATE POLICY "Users can view health imports in their org"
  ON public.health_imports FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT ur.organization_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own health imports"
  ON public.health_imports FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    org_id IN (
      SELECT ur.organization_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own health imports"
  ON public.health_imports FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own health imports"
  ON public.health_imports FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for health_records
CREATE POLICY "Users can view health records in their org"
  ON public.health_records FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT ur.organization_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert health records for their imports"
  ON public.health_records FOR INSERT
  TO authenticated
  WITH CHECK (
    import_id IN (
      SELECT hi.id
      FROM health_imports hi
      WHERE hi.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete health records from their imports"
  ON public.health_records FOR DELETE
  TO authenticated
  USING (
    import_id IN (
      SELECT hi.id
      FROM health_imports hi
      WHERE hi.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_health_imports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_imports_updated_at
  BEFORE UPDATE ON public.health_imports
  FOR EACH ROW
  EXECUTE FUNCTION update_health_imports_updated_at();
