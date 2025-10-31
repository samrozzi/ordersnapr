-- Create RLS policies for work-order-photos storage bucket

-- Users can upload photos to their own folder
CREATE POLICY "Users can upload own photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'work-order-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view own photos and organization photos
CREATE POLICY "Users can view organization photos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'work-order-photos' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid()
      AND p2.id::text = (storage.foldername(name))[1]
      AND p1.organization_id IS NOT NULL
    )
  )
);

-- Users can delete own photos
CREATE POLICY "Users can delete own photos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'work-order-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);