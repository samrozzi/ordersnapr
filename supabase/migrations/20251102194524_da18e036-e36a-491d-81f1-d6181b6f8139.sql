-- Phase 1.2: Seed default features (all disabled) for existing orgs and new orgs

-- Insert missing features for existing orgs (all disabled by default)
INSERT INTO org_features (org_id, module, enabled, config)
SELECT o.id, m.module, false, '{}'::jsonb
FROM organizations o
CROSS JOIN (
  SELECT unnest(ARRAY[
    'work_orders', 'calendar', 'properties', 'forms', 'reports',
    'appointments', 'invoicing', 'inventory', 'customer_portal', 'pos', 'files'
  ]) AS module
) m
ON CONFLICT (org_id, module) DO NOTHING;

-- Function to auto-seed features when new org is created
CREATE OR REPLACE FUNCTION seed_org_features()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO org_features (org_id, module, enabled, config)
  VALUES
    (NEW.id, 'work_orders', false, '{}'::jsonb),
    (NEW.id, 'calendar', false, '{}'::jsonb),
    (NEW.id, 'properties', false, '{}'::jsonb),
    (NEW.id, 'forms', false, '{}'::jsonb),
    (NEW.id, 'reports', false, '{}'::jsonb),
    (NEW.id, 'appointments', false, '{}'::jsonb),
    (NEW.id, 'invoicing', false, '{}'::jsonb),
    (NEW.id, 'inventory', false, '{}'::jsonb),
    (NEW.id, 'customer_portal', false, '{}'::jsonb),
    (NEW.id, 'pos', false, '{}'::jsonb),
    (NEW.id, 'files', false, '{}'::jsonb);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to seed features on org creation
CREATE TRIGGER on_org_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_org_features();

-- Utility function: check if user is member of org
CREATE OR REPLACE FUNCTION is_member_of_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id AND organization_id = _org_id
  )
$$;