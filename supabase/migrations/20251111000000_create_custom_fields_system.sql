-- Custom Fields System Migration
-- Allows organizations to add custom fields to any entity type
-- Created: 2025-11-11

-- ============================================================================
-- Table: custom_fields
-- Stores custom field definitions for each organization
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL,
  field_config JSONB DEFAULT '{}'::jsonb,
  display_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,

  -- Constraints
  CONSTRAINT unique_field_key_per_entity UNIQUE (org_id, entity_type, field_key),
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('work_orders', 'customers', 'properties', 'invoices')),
  CONSTRAINT valid_field_type CHECK (field_type IN ('text', 'number', 'date', 'datetime', 'dropdown', 'checkbox', 'textarea', 'file', 'email', 'phone', 'url'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_fields_org_entity ON custom_fields(org_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_custom_fields_active ON custom_fields(org_id, entity_type, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_custom_fields_order ON custom_fields(org_id, entity_type, display_order);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_custom_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_fields_updated_at
  BEFORE UPDATE ON custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_fields_updated_at();

-- ============================================================================
-- Table: custom_field_values
-- Stores actual values for custom fields on entity instances
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_field_per_entity UNIQUE (custom_field_id, entity_id),
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('work_orders', 'customers', 'properties', 'invoices'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON custom_field_values(custom_field_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_value ON custom_field_values USING GIN (value);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_custom_field_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_field_values_updated_at
  BEFORE UPDATE ON custom_field_values
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_field_values_updated_at();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- custom_fields policies
-- ============================================================================

-- Policy: Users can view custom fields for their organization
CREATE POLICY "Users can view custom fields for their org"
  ON custom_fields
  FOR SELECT
  USING (
    org_id IN (
      -- Check if user is member of the org
      SELECT organization_id
      FROM org_memberships
      WHERE user_id = auth.uid()
      UNION
      -- Or if org is their active org
      SELECT active_org_id
      FROM profiles
      WHERE id = auth.uid() AND active_org_id IS NOT NULL
    )
  );

-- Policy: Org admins can create custom fields
CREATE POLICY "Org admins can create custom fields"
  ON custom_fields
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT organization_id
      FROM org_memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'org_admin')
    )
  );

-- Policy: Org admins can update custom fields
CREATE POLICY "Org admins can update custom fields"
  ON custom_fields
  FOR UPDATE
  USING (
    org_id IN (
      SELECT organization_id
      FROM org_memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'org_admin')
    )
  );

-- Policy: Org admins can delete custom fields
CREATE POLICY "Org admins can delete custom fields"
  ON custom_fields
  FOR DELETE
  USING (
    org_id IN (
      SELECT organization_id
      FROM org_memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'org_admin')
    )
  );

-- ============================================================================
-- custom_field_values policies
-- ============================================================================

-- Policy: Users can view custom field values for entities in their org
CREATE POLICY "Users can view custom field values for their org"
  ON custom_field_values
  FOR SELECT
  USING (
    custom_field_id IN (
      SELECT id FROM custom_fields
      WHERE org_id IN (
        SELECT organization_id FROM org_memberships WHERE user_id = auth.uid()
        UNION
        SELECT active_org_id FROM profiles WHERE id = auth.uid() AND active_org_id IS NOT NULL
      )
    )
  );

-- Policy: Users can create custom field values for entities in their org
CREATE POLICY "Users can create custom field values for their org"
  ON custom_field_values
  FOR INSERT
  WITH CHECK (
    custom_field_id IN (
      SELECT id FROM custom_fields
      WHERE org_id IN (
        SELECT organization_id FROM org_memberships WHERE user_id = auth.uid()
        UNION
        SELECT active_org_id FROM profiles WHERE id = auth.uid() AND active_org_id IS NOT NULL
      )
    )
  );

-- Policy: Users can update custom field values for entities in their org
CREATE POLICY "Users can update custom field values for their org"
  ON custom_field_values
  FOR UPDATE
  USING (
    custom_field_id IN (
      SELECT id FROM custom_fields
      WHERE org_id IN (
        SELECT organization_id FROM org_memberships WHERE user_id = auth.uid()
        UNION
        SELECT active_org_id FROM profiles WHERE id = auth.uid() AND active_org_id IS NOT NULL
      )
    )
  );

-- Policy: Users can delete custom field values for entities in their org
CREATE POLICY "Users can delete custom field values for their org"
  ON custom_field_values
  FOR DELETE
  USING (
    custom_field_id IN (
      SELECT id FROM custom_fields
      WHERE org_id IN (
        SELECT organization_id FROM org_memberships WHERE user_id = auth.uid()
        UNION
        SELECT active_org_id FROM profiles WHERE id = auth.uid() AND active_org_id IS NOT NULL
      )
    )
  );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get custom fields with values for a specific entity
CREATE OR REPLACE FUNCTION get_entity_custom_fields(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_org_id UUID
)
RETURNS TABLE (
  field_id UUID,
  field_name TEXT,
  field_key TEXT,
  field_type TEXT,
  field_config JSONB,
  is_required BOOLEAN,
  display_order INTEGER,
  value JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cf.id as field_id,
    cf.field_name,
    cf.field_key,
    cf.field_type,
    cf.field_config,
    cf.is_required,
    cf.display_order,
    COALESCE(cfv.value, 'null'::jsonb) as value
  FROM custom_fields cf
  LEFT JOIN custom_field_values cfv
    ON cfv.custom_field_id = cf.id
    AND cfv.entity_id = p_entity_id
  WHERE cf.org_id = p_org_id
    AND cf.entity_type = p_entity_type
    AND cf.is_active = true
  ORDER BY cf.display_order, cf.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_entity_custom_fields(TEXT, UUID, UUID) TO authenticated;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE custom_fields IS 'Stores custom field definitions for organizations';
COMMENT ON TABLE custom_field_values IS 'Stores custom field values for entity instances';

COMMENT ON COLUMN custom_fields.entity_type IS 'Type of entity this field applies to: work_orders, customers, properties, or invoices';
COMMENT ON COLUMN custom_fields.field_name IS 'User-friendly display name for the field';
COMMENT ON COLUMN custom_fields.field_key IS 'Internal key for the field (lowercase, underscores)';
COMMENT ON COLUMN custom_fields.field_type IS 'Data type: text, number, date, datetime, dropdown, checkbox, textarea, file, email, phone, url';
COMMENT ON COLUMN custom_fields.field_config IS 'Type-specific configuration (validation rules, options, etc.)';
COMMENT ON COLUMN custom_fields.display_order IS 'Order in which field appears in forms (lower numbers first)';

COMMENT ON COLUMN custom_field_values.value IS 'JSONB value storing the actual field data in a flexible format';
