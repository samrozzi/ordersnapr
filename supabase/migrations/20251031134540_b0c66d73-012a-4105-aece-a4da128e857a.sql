-- Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add organization_id to profiles table
ALTER TABLE public.profiles ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete organizations"
  ON public.organizations FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own organization"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.organization_id = organizations.id
    )
  );

-- Add trigger for updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Update properties RLS policies for organization sharing
DROP POLICY IF EXISTS "Approved users can view own properties" ON public.properties;
CREATE POLICY "Approved users can view organization properties"
  ON public.properties FOR SELECT
  USING (
    is_user_approved(auth.uid()) AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
        WHERE p1.id = auth.uid() 
          AND p2.id = properties.user_id 
          AND p1.organization_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Approved users can create own properties" ON public.properties;
CREATE POLICY "Approved users can create properties"
  ON public.properties FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Approved users can update own properties" ON public.properties;
CREATE POLICY "Approved users can update organization properties"
  ON public.properties FOR UPDATE
  USING (
    is_user_approved(auth.uid()) AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
        WHERE p1.id = auth.uid() 
          AND p2.id = properties.user_id 
          AND p1.organization_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Approved users can delete own properties" ON public.properties;
CREATE POLICY "Approved users can delete organization properties"
  ON public.properties FOR DELETE
  USING (
    is_user_approved(auth.uid()) AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
        WHERE p1.id = auth.uid() 
          AND p2.id = properties.user_id 
          AND p1.organization_id IS NOT NULL
      )
    )
  );

-- Update work_orders RLS policies for organization sharing
DROP POLICY IF EXISTS "Approved users can view own work orders" ON public.work_orders;
CREATE POLICY "Approved users can view organization work orders"
  ON public.work_orders FOR SELECT
  USING (
    is_user_approved(auth.uid()) AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
        WHERE p1.id = auth.uid() 
          AND p2.id = work_orders.user_id 
          AND p1.organization_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Approved users can create own work orders" ON public.work_orders;
CREATE POLICY "Approved users can create work orders"
  ON public.work_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Approved users can update own work orders" ON public.work_orders;
CREATE POLICY "Approved users can update organization work orders"
  ON public.work_orders FOR UPDATE
  USING (
    is_user_approved(auth.uid()) AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
        WHERE p1.id = auth.uid() 
          AND p2.id = work_orders.user_id 
          AND p1.organization_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Approved users can delete own work orders" ON public.work_orders;
CREATE POLICY "Approved users can delete organization work orders"
  ON public.work_orders FOR DELETE
  USING (
    is_user_approved(auth.uid()) AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
        WHERE p1.id = auth.uid() 
          AND p2.id = work_orders.user_id 
          AND p1.organization_id IS NOT NULL
      )
    )
  );

-- Update form_drafts RLS policies for organization sharing
DROP POLICY IF EXISTS "Users can view own drafts" ON public.form_drafts;
CREATE POLICY "Users can view organization drafts"
  ON public.form_drafts FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid() 
        AND p2.id = form_drafts.user_id 
        AND p1.organization_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can update own drafts" ON public.form_drafts;
CREATE POLICY "Users can update organization drafts"
  ON public.form_drafts FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid() 
        AND p2.id = form_drafts.user_id 
        AND p1.organization_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can delete own drafts" ON public.form_drafts;
CREATE POLICY "Users can delete organization drafts"
  ON public.form_drafts FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid() 
        AND p2.id = form_drafts.user_id 
        AND p1.organization_id IS NOT NULL
    )
  );