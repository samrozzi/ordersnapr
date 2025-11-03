-- Fix storage policies for form-attachments to work with org-based folder structure
-- Drop old policies
DROP POLICY IF EXISTS "Users can upload form attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view org form attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own form attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own form attachments" ON storage.objects;

-- Create new policies that work with orgs/{orgId}/forms/{submissionId} structure
CREATE POLICY "Approved users can upload to their org form attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'form-attachments' AND
  is_user_approved(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Approved users can view their org form attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'form-attachments' AND
  is_user_approved(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Approved users can delete their org form attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'form-attachments' AND
  is_user_approved(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Approved users can update their org form attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'form-attachments' AND
  is_user_approved(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id::text = (storage.foldername(name))[2]
  )
);