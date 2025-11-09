-- Phase 1 & 8: Auto-approve new users and deprecate single-org field

-- Update handle_new_user to auto-approve all new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-approve all new users (free tier by default)
  INSERT INTO public.profiles (id, email, full_name, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'approved'  -- Changed from 'pending' to 'approved'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$function$;

-- Add comment to deprecate profiles.organization_id
COMMENT ON COLUMN profiles.organization_id IS 'DEPRECATED: Use org_memberships table instead. This field is kept for legacy data only.';

-- Ensure samrozzi@gmail.com is a super admin
UPDATE profiles 
SET is_super_admin = true 
WHERE email = 'samrozzi@gmail.com';

-- Add index on org_memberships for better query performance
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON org_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_role ON org_memberships(role);