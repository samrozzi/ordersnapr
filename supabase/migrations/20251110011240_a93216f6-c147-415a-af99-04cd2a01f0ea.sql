-- Create storage bucket for note banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-banners', 'note-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for note banners
CREATE POLICY "Users can upload their own note banners"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'note-banners' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Note banners are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'note-banners');

CREATE POLICY "Users can update their own note banners"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'note-banners' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own note banners"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'note-banners' AND
  auth.uid()::text = (storage.foldername(name))[1]
);