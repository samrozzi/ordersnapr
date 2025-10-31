-- Create a security definer function to check if two users are in the same organization
CREATE OR REPLACE FUNCTION public.in_same_org(_u1 uuid, _u2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p1
    JOIN profiles p2 ON p1.organization_id = p2.organization_id
    WHERE p1.id = _u1
      AND p2.id = _u2
      AND p1.organization_id IS NOT NULL
  )
$$;

-- Update work_orders policies to use the new function
DROP POLICY IF EXISTS "Approved users can view organization work orders" ON work_orders;
CREATE POLICY "Approved users can view organization work orders"
ON work_orders
FOR SELECT
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can update organization work orders" ON work_orders;
CREATE POLICY "Approved users can update organization work orders"
ON work_orders
FOR UPDATE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can delete organization work orders" ON work_orders;
CREATE POLICY "Approved users can delete organization work orders"
ON work_orders
FOR DELETE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

-- Update properties policies to use the new function
DROP POLICY IF EXISTS "Approved users can view organization properties" ON properties;
CREATE POLICY "Approved users can view organization properties"
ON properties
FOR SELECT
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can update organization properties" ON properties;
CREATE POLICY "Approved users can update organization properties"
ON properties
FOR UPDATE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can delete organization properties" ON properties;
CREATE POLICY "Approved users can delete organization properties"
ON properties
FOR DELETE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

-- Update form_drafts policies to use the new function
DROP POLICY IF EXISTS "Users can view organization drafts" ON form_drafts;
CREATE POLICY "Users can view organization drafts"
ON form_drafts
FOR SELECT
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Users can update organization drafts" ON form_drafts;
CREATE POLICY "Users can update organization drafts"
ON form_drafts
FOR UPDATE
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Users can delete organization drafts" ON form_drafts;
CREATE POLICY "Users can delete organization drafts"
ON form_drafts
FOR DELETE
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);