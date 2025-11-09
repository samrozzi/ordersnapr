-- Add org_id column to user_favorites for organization scoping
ALTER TABLE public.user_favorites
ADD COLUMN org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_user_favorites_org_id ON public.user_favorites(org_id);

-- Migrate existing favorites to set their org_id based on the entity's organization
-- For work_orders
UPDATE public.user_favorites uf
SET org_id = wo.organization_id
FROM public.work_orders wo
WHERE uf.entity_type = 'work_order' 
  AND uf.entity_id = wo.id
  AND uf.org_id IS NULL;

-- For calendar_events
UPDATE public.user_favorites uf
SET org_id = ce.organization_id
FROM public.calendar_events ce
WHERE uf.entity_type = 'calendar_event' 
  AND uf.entity_id = ce.id
  AND uf.org_id IS NULL;

-- For properties (properties don't have org_id, they're tied to users, so leave as NULL for personal)
-- For form_submissions
UPDATE public.user_favorites uf
SET org_id = fs.org_id
FROM public.form_submissions fs
WHERE uf.entity_type = 'form_submission' 
  AND uf.entity_id = fs.id
  AND uf.org_id IS NULL;

-- For form_templates
UPDATE public.user_favorites uf
SET org_id = ft.org_id
FROM public.form_templates ft
WHERE uf.entity_type = 'form_template' 
  AND uf.entity_id = ft.id
  AND uf.org_id IS NULL;

-- For form_drafts (form_drafts don't have org_id, they're personal, leave as NULL)

-- Create function to automatically set org_id when inserting favorites
CREATE OR REPLACE FUNCTION public.set_favorite_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Look up the entity's org_id based on entity type
  IF NEW.entity_type = 'work_order' THEN
    SELECT organization_id INTO NEW.org_id
    FROM work_orders
    WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'calendar_event' THEN
    SELECT organization_id INTO NEW.org_id
    FROM calendar_events
    WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'form_submission' THEN
    SELECT org_id INTO NEW.org_id
    FROM form_submissions
    WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'form_template' THEN
    SELECT org_id INTO NEW.org_id
    FROM form_templates
    WHERE id = NEW.entity_id;
  -- property and form_draft have no org_id, leave as NULL (personal workspace)
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set org_id on insert
CREATE TRIGGER set_favorite_org_id_trigger
BEFORE INSERT ON public.user_favorites
FOR EACH ROW
EXECUTE FUNCTION public.set_favorite_org_id();

-- Update RLS policy to include org filtering
DROP POLICY IF EXISTS "Users can view own favorites" ON public.user_favorites;

CREATE POLICY "Users can view own favorites"
ON public.user_favorites
FOR SELECT
USING (
  auth.uid() = user_id AND (
    -- Personal workspace: only show items with NULL org_id
    (SELECT active_org_id FROM profiles WHERE id = auth.uid()) IS NULL AND org_id IS NULL
    OR
    -- Organization workspace: only show items matching active org
    org_id = (SELECT active_org_id FROM profiles WHERE id = auth.uid())
  )
);

-- Allow UPDATE on user_favorites for reordering
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own favorites" ON public.user_favorites;

CREATE POLICY "Users can update own favorites"
ON public.user_favorites
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);