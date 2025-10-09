-- Fix storage access: Allow public viewing of work order photos
-- Since the bucket is public, photos should be viewable by anyone with the URL

-- Drop the restrictive policy that only allows users to view their own photos
DROP POLICY IF EXISTS "Users can view own work order photos" ON storage.objects;

-- Add a public SELECT policy for the work-order-photos bucket
CREATE POLICY "Public can view work order photos" 
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'work-order-photos');

-- Keep the restrictive policies for INSERT and DELETE (users can only manage their own photos)
-- These already exist and are working correctly