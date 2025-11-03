-- Create storage bucket for form attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-attachments',
  'form-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf', 'video/mp4', 'video/quicktime']
);

-- Storage policies for form attachments
CREATE POLICY "Users can upload form attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'form-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  is_user_approved(auth.uid())
);

CREATE POLICY "Users can view org form attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'form-attachments' AND
  is_user_approved(auth.uid())
);

CREATE POLICY "Users can delete own form attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'form-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  is_user_approved(auth.uid())
);

CREATE POLICY "Users can update own form attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'form-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  is_user_approved(auth.uid())
);