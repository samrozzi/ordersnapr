-- Add organization_id column to properties table
ALTER TABLE public.properties 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_properties_organization_id ON public.properties(organization_id);

-- Update existing properties to set organization_id based on user's org membership
UPDATE public.properties p
SET organization_id = pr.organization_id
FROM public.profiles pr
WHERE p.user_id = pr.id 
  AND pr.organization_id IS NOT NULL;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view properties (free+org)" ON public.properties;
DROP POLICY IF EXISTS "Users can create properties (free)" ON public.properties;
DROP POLICY IF EXISTS "Users can update properties (free+org)" ON public.properties;
DROP POLICY IF EXISTS "Users can delete properties (free+org)" ON public.properties;

-- Create new context-aware RLS policies
CREATE POLICY "Users can view properties (free+org)" 
ON public.properties FOR SELECT
USING (
  -- Personal workspace: own properties with no org
  (auth.uid() = user_id AND organization_id IS NULL)
  OR 
  -- Org workspace: properties in the org
  (organization_id IN (
    SELECT org_id FROM org_memberships 
    WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create properties (free+org)" 
ON public.properties FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    -- Personal: no org_id
    organization_id IS NULL
    OR
    -- Org: user is member
    organization_id IN (
      SELECT org_id FROM org_memberships 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update properties (free+org)" 
ON public.properties FOR UPDATE
USING (
  (auth.uid() = user_id AND organization_id IS NULL)
  OR 
  (organization_id IN (
    SELECT org_id FROM org_memberships 
    WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Users can delete properties (free+org)" 
ON public.properties FOR DELETE
USING (
  (auth.uid() = user_id AND organization_id IS NULL)
  OR 
  (organization_id IN (
    SELECT org_id FROM org_memberships 
    WHERE user_id = auth.uid()
  ))
);