-- Phase 1: Enhance existing tables
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS industry text;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

ALTER TABLE dashboard_widgets
  ADD COLUMN IF NOT EXISTS page_path text DEFAULT '/dashboard';

-- Phase 2: Create org_memberships table (explicit RBAC)
CREATE TABLE IF NOT EXISTS org_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'staff', 'viewer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, org_id)
);

ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;

-- Phase 3: Create org_features table (module toggles)
CREATE TABLE IF NOT EXISTS org_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (org_id, module)
);

ALTER TABLE org_features ENABLE ROW LEVEL SECURITY;

-- Phase 4: Create org_pages table (dynamic page configuration)
CREATE TABLE IF NOT EXISTS org_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  path text NOT NULL,
  is_enabled boolean DEFAULT true,
  layout jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (org_id, path)
);

ALTER TABLE org_pages ENABLE ROW LEVEL SECURITY;

-- Phase 5: Create org_page_widgets table (org-level widget defaults)
CREATE TABLE IF NOT EXISTS org_page_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_page_id uuid NOT NULL REFERENCES org_pages(id) ON DELETE CASCADE,
  widget_type text NOT NULL,
  position jsonb NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE org_page_widgets ENABLE ROW LEVEL SECURITY;

-- Phase 6: Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  address jsonb,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Phase 7: Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  start_at timestamptz,
  end_at timestamptz,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'scheduled',
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Phase 8: Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  number text,
  total_cents int NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void', 'cancelled')),
  external_ref text,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Phase 9: Create helper function to check super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM profiles WHERE id = _user_id),
    false
  )
$$;

-- Phase 10: RLS Policies for org_memberships
CREATE POLICY "Users can view own memberships"
  ON org_memberships FOR SELECT
  USING (auth.uid() = user_id OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all memberships"
  ON org_memberships FOR ALL
  USING (is_super_admin(auth.uid()));

-- Phase 11: RLS Policies for org_features
CREATE POLICY "Org members can view features"
  ON org_features FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = org_features.org_id
    ) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can manage features"
  ON org_features FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Org admins can manage features"
  ON org_features FOR INSERT
  WITH CHECK (
    is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org admins can update features"
  ON org_features FOR UPDATE
  USING (
    is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );

-- Phase 12: RLS Policies for org_pages
CREATE POLICY "Org members can view pages"
  ON org_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = org_pages.org_id
    ) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins and org admins can manage pages"
  ON org_pages FOR ALL
  USING (
    is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );

-- Phase 13: RLS Policies for org_page_widgets
CREATE POLICY "Org members can view page widgets"
  ON org_page_widgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_pages 
      JOIN profiles ON profiles.organization_id = org_pages.org_id
      WHERE org_pages.id = org_page_widgets.org_page_id
      AND profiles.id = auth.uid()
    ) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins and org admins can manage widgets"
  ON org_page_widgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_pages 
      WHERE org_pages.id = org_page_widgets.org_page_id
      AND (is_org_admin(auth.uid(), org_pages.org_id) OR is_super_admin(auth.uid()))
    )
  );

-- Phase 14: RLS Policies for customers
CREATE POLICY "Org members can view customers"
  ON customers FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = customers.org_id
    ) AND is_user_approved(auth.uid())) 
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can create customers"
  ON customers FOR INSERT
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = customers.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can update customers"
  ON customers FOR UPDATE
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = customers.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can delete customers"
  ON customers FOR DELETE
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = customers.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

-- Phase 15: RLS Policies for appointments
CREATE POLICY "Org members can view appointments"
  ON appointments FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = appointments.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = appointments.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can update appointments"
  ON appointments FOR UPDATE
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = appointments.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can delete appointments"
  ON appointments FOR DELETE
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = appointments.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

-- Phase 16: RLS Policies for invoices
CREATE POLICY "Org members can view invoices"
  ON invoices FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoices.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can create invoices"
  ON invoices FOR INSERT
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoices.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can update invoices"
  ON invoices FOR UPDATE
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoices.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can delete invoices"
  ON invoices FOR DELETE
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoices.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

-- Phase 17: Update triggers for updated_at
CREATE TRIGGER update_org_features_updated_at
  BEFORE UPDATE ON org_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_org_pages_updated_at
  BEFORE UPDATE ON org_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Phase 18: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON org_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_org_features_org_id ON org_features(org_id);
CREATE INDEX IF NOT EXISTS idx_org_features_module ON org_features(org_id, module);
CREATE INDEX IF NOT EXISTS idx_org_pages_org_id ON org_pages(org_id);
CREATE INDEX IF NOT EXISTS idx_org_pages_path ON org_pages(org_id, path);
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_appointments_org_id ON appointments(org_id);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to ON appointments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_work_order_id ON invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Phase 19: Migrate existing data - create org_memberships from existing profiles
INSERT INTO org_memberships (user_id, org_id, role)
SELECT 
  p.id,
  p.organization_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = 'org_admin') THEN 'admin'
    ELSE 'staff'
  END
FROM profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT (user_id, org_id) DO NOTHING;

-- Phase 20: Create default org_features for existing organizations (all enabled by default)
INSERT INTO org_features (org_id, module, enabled)
SELECT 
  o.id,
  module,
  true
FROM organizations o
CROSS JOIN (
  VALUES 
    ('work_orders'),
    ('calendar'),
    ('properties'),
    ('forms'),
    ('reports')
) AS modules(module)
ON CONFLICT (org_id, module) DO NOTHING;

-- Phase 21: Create default dashboard page for existing organizations
INSERT INTO org_pages (org_id, title, path, is_enabled)
SELECT 
  id,
  'Dashboard',
  '/dashboard',
  true
FROM organizations
ON CONFLICT (org_id, path) DO NOTHING;