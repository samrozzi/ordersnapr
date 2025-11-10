-- Create storage bucket for note images
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload note images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own note images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own note images" ON storage.objects;
DROP POLICY IF EXISTS "Note images are publicly accessible" ON storage.objects;

-- RLS policies for note images
CREATE POLICY "Users can upload note images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own note images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own note images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Note images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'note-images');