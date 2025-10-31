-- Add logo_url column to organization_settings
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for organization logos
CREATE POLICY "Organization logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-logos');

CREATE POLICY "Org admins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'organization-logos' 
  AND auth.uid() IN (
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.role = 'org_admin'
  )
);

CREATE POLICY "Org admins can update their org logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'organization-logos'
  AND auth.uid() IN (
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.role = 'org_admin'
  )
);

CREATE POLICY "Org admins can delete their org logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'organization-logos'
  AND auth.uid() IN (
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.role = 'org_admin'
  )
);

-- Enable realtime for organization_settings so theme changes propagate
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_settings;