-- Phase 1: Enhanced Audit Logging
-- Add completed_by field to work_orders to track who completed it
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES auth.users(id);

-- Update the audit log trigger to track properties and form_drafts changes
DROP TRIGGER IF EXISTS audit_properties_trigger ON public.properties;
CREATE TRIGGER audit_properties_trigger
  AFTER INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

DROP TRIGGER IF EXISTS audit_form_drafts_trigger ON public.form_drafts;
CREATE TRIGGER audit_form_drafts_trigger
  AFTER INSERT OR UPDATE ON public.form_drafts
  FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

-- Phase 2.1b: Organization Admin Infrastructure (enum already added in previous migration)
-- Create organization_settings table for custom themes
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  custom_theme_color text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on organization_settings
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Create is_org_admin security definer function
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'org_admin'
      AND p.organization_id = _org_id
  )
$$;

-- Create can_manage_org_member security definer function
CREATE OR REPLACE FUNCTION public.can_manage_org_member(_acting_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p1
    JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
    WHERE p1.id = _acting_user_id
      AND p2.id = _target_user_id
      AND p1.organization_id IS NOT NULL
      AND (
        public.has_role(_acting_user_id, 'admin') 
        OR public.is_org_admin(_acting_user_id, p1.organization_id)
      )
  )
$$;

-- RLS Policies for organization_settings
CREATE POLICY "Admins can view all organization settings"
  ON public.organization_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org admins can view own organization settings"
  ON public.organization_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND organization_id = organization_settings.organization_id
        AND public.is_org_admin(auth.uid(), organization_id)
    )
  );

CREATE POLICY "Users can view own organization settings"
  ON public.organization_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND organization_id = organization_settings.organization_id
    )
  );

CREATE POLICY "Admins can insert organization settings"
  ON public.organization_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org admins can insert own organization settings"
  ON public.organization_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND organization_id = organization_settings.organization_id
        AND public.is_org_admin(auth.uid(), organization_id)
    )
  );

CREATE POLICY "Admins can update organization settings"
  ON public.organization_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org admins can update own organization settings"
  ON public.organization_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND organization_id = organization_settings.organization_id
        AND public.is_org_admin(auth.uid(), organization_id)
    )
  );

-- Update profiles RLS policies to allow org admins to manage their org members
CREATE POLICY "Org admins can view members in their organization"
  ON public.profiles FOR SELECT
  USING (
    public.can_manage_org_member(auth.uid(), id)
  );

CREATE POLICY "Org admins can update members in their organization"
  ON public.profiles FOR UPDATE
  USING (
    public.can_manage_org_member(auth.uid(), id)
    AND id != auth.uid()
  )
  WITH CHECK (
    public.can_manage_org_member(auth.uid(), id)
    AND approval_status IN ('approved', 'rejected', 'pending')
  );

-- Add trigger for organization_settings updated_at
CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Phase 3: Email Change Requests
CREATE TABLE IF NOT EXISTS public.email_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_email text NOT NULL,
  requested_email text NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on email_change_requests
ALTER TABLE public.email_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_change_requests
CREATE POLICY "Users can create own email change requests"
  ON public.email_change_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own email change requests"
  ON public.email_change_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all email change requests"
  ON public.email_change_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org admins can view email change requests in their org"
  ON public.email_change_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid()
        AND p2.id = email_change_requests.user_id
        AND public.is_org_admin(auth.uid(), p1.organization_id)
    )
  );

CREATE POLICY "Admins can update email change requests"
  ON public.email_change_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org admins can update email change requests in their org"
  ON public.email_change_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid()
        AND p2.id = email_change_requests.user_id
        AND public.is_org_admin(auth.uid(), p1.organization_id)
    )
  );