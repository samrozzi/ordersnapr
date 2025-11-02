-- Add unique constraint and index to org_features for efficient upserts
ALTER TABLE public.org_features
  ADD CONSTRAINT org_features_org_module_key UNIQUE (org_id, module);

CREATE INDEX IF NOT EXISTS idx_org_features_org_module 
  ON public.org_features (org_id, module);