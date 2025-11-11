-- Create custom_fields table
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('work_orders', 'customers', 'properties', 'invoices')),
  field_name TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'datetime', 'dropdown', 'checkbox', 'textarea', 'file', 'email', 'phone', 'url')),
  field_config JSONB NOT NULL DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(org_id, entity_type, field_key)
);

-- Create custom_field_values table
CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('work_orders', 'customers', 'properties', 'invoices')),
  entity_id UUID NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(custom_field_id, entity_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_fields_org_entity ON public.custom_fields(org_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON public.custom_field_values(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON public.custom_field_values(custom_field_id);

-- Enable RLS
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_fields
CREATE POLICY "Org members can view custom fields"
  ON public.custom_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.organization_id = custom_fields.org_id
    )
  );

CREATE POLICY "Org admins can manage custom fields"
  ON public.custom_fields FOR ALL
  USING (
    is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );

-- RLS Policies for custom_field_values
CREATE POLICY "Org members can view custom field values"
  ON public.custom_field_values FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM custom_fields cf
      JOIN profiles p ON p.organization_id = cf.org_id
      WHERE cf.id = custom_field_values.custom_field_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Org members can manage custom field values"
  ON public.custom_field_values FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM custom_fields cf
      JOIN profiles p ON p.organization_id = cf.org_id
      WHERE cf.id = custom_field_values.custom_field_id
      AND p.id = auth.uid()
      AND is_user_approved(auth.uid())
    )
  );